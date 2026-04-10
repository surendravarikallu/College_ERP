import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';
import { CacheManager } from '../../core/cache/cache.manager';
import { redisClient } from '../../core/cache/redis.service';
import { EmailService } from '../notifications/email.service';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)(m|h|d)$/);
  if (!match) return 900; // default 15m in seconds
  const val = parseInt(match[1]);
  switch (match[2]) {
    case 'm': return val * 60;
    case 'h': return val * 3600;
    case 'd': return val * 86400;
    default: return 900;
  }
}

export class AuthService {

  /**
   * Authenticate user and return JWT tokens.
   * Implements account locking after 5 failed attempts via Redis.
   */
  static async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { StudentProfile: true, FacultyProfile: true },
    });

    if (!user) {
      throw new APIError('UNAUTHORIZED', 'Invalid credentials');
    }

    if (!user.isActive) {
      throw new APIError('FORBIDDEN', 'Account is suspended. Contact administrator.');
    }

    // Check account lock in Redis
    const lockedUntilStr = await redisClient.get(`locked_until:${user.id}`);
    if (lockedUntilStr) {
      const lockedUntil = new Date(lockedUntilStr);
      if (lockedUntil > new Date()) {
        const remainingMs = lockedUntil.getTime() - Date.now();
        const remainingMin = Math.ceil(remainingMs / 60000);
        throw new APIError('FORBIDDEN', `Account locked. Try again in ${remainingMin} minutes.`);
      }
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Increment failed count natively in redis
      const failedKey = `failed_login:${user.id}`;
      const failedCount = await redisClient.incr(failedKey);
      
      if (failedCount === 1) {
        await redisClient.expire(failedKey, 3600); // expire fail counts after 1 hour
      }

      if (failedCount >= MAX_FAILED_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
        await redisClient.set(`locked_until:${user.id}`, lockedUntil.toISOString(), 'EX', LOCK_DURATION_MS / 1000);
      }

      throw new APIError('UNAUTHORIZED', 'Invalid credentials');
    }

    // Reset failed count and update lastLogin on success
    await redisClient.del(`failed_login:${user.id}`);
    await redisClient.del(`locked_until:${user.id}`);
    await redisClient.set(`last_login:${user.id}`, new Date().toISOString());

    // Generate tokens
    const name = user.StudentProfile ? `${user.StudentProfile.firstName} ${user.StudentProfile.lastName}` : (user.FacultyProfile ? `${user.FacultyProfile.firstName} ${user.FacultyProfile.lastName}` : user.email);
    const profileId = user.StudentProfile?.id || user.FacultyProfile?.id;

    const payload = {
      id: user.id,
      role: user.role,
      profileId,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
    const refreshToken = jwt.sign({ id: user.id, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN as any });

    // Store refresh token in Redis
    const refreshExpiresInSecs = parseExpiresIn(JWT_REFRESH_EXPIRES_IN);
    await redisClient.set(`rt:${refreshToken}`, user.id, 'EX', refreshExpiresInSecs);
    await redisClient.sadd(`rt_user:${user.id}`, refreshToken);
    await redisClient.expire(`rt_user:${user.id}`, refreshExpiresInSecs);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        role: user.role,
        name,
        email: user.email,
        profileId,
      },
    };
  }

  /**
   * Rotate refresh token: revoke old, issue new pair.
   */
  static async refreshTokens(refreshToken: string) {
    // Find token in Redis
    const userId = await redisClient.get(`rt:${refreshToken}`);

    if (!userId) {
      // Check if it was compromised? We don't have token family arrays in this simplified redis version,
      // but if the token isn't found it's invalid.
      throw new APIError('UNAUTHORIZED', 'Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { StudentProfile: true, FacultyProfile: true } });
    if (!user) {
      throw new APIError('UNAUTHORIZED', 'User not found');
    }

    if (!user.isActive) {
      throw new APIError('FORBIDDEN', 'Account suspended');
    }

    // Revoke old token
    await redisClient.del(`rt:${refreshToken}`);
    await redisClient.srem(`rt_user:${user.id}`, refreshToken);

    // Generate new pair
    const profileId = user.StudentProfile?.id || user.FacultyProfile?.id;

    const payload = {
      id: user.id,
      role: user.role,
      profileId,
    };

    const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
    const newRefreshToken = jwt.sign({ id: user.id, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN as any });

    const refreshExpiresInSecs = parseExpiresIn(JWT_REFRESH_EXPIRES_IN);
    await redisClient.set(`rt:${newRefreshToken}`, user.id, 'EX', refreshExpiresInSecs);
    await redisClient.sadd(`rt_user:${user.id}`, newRefreshToken);
    await redisClient.expire(`rt_user:${user.id}`, refreshExpiresInSecs);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logout: revoke refresh token and blacklist access token.
   */
  static async logout(refreshToken?: string, accessToken?: string) {
    // Revoke refresh token
    if (refreshToken) {
      const userId = await redisClient.get(`rt:${refreshToken}`);
      if (userId) {
        await redisClient.del(`rt:${refreshToken}`);
        await redisClient.srem(`rt_user:${userId}`, refreshToken);
      }
    }

    // Blacklist access token in Redis for its remaining TTL
    if (accessToken) {
      try {
        const decoded = jwt.decode(accessToken) as any;
        if (decoded?.exp) {
          const ttl = decoded.exp - Math.floor(Date.now() / 1000);
          if (ttl > 0) {
            await redisClient.set(`blacklist:${accessToken}`, '1', 'EX', ttl);
          }
        }
      } catch {
        // Ignore decode errors
      }
    }
  }

  /**
   * Request password reset — always return success to prevent email enumeration.
   */
  static async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      
      // Store in Redis with 1 hour expiration
      await redisClient.set(`pwd_reset:${token}`, user.id, 'EX', 3600);

      const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
      
      await EmailService.send(user.email, 'Password Reset Request', `
        <h2>Password Reset</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Regards,<br/>Kits Akshar ERP</p>
      `);
    }

    // Always return success — don't reveal whether email exists
    return { message: 'If the email exists, a reset link has been sent.' };
  }

  /**
   * Reset password using token.
   */
  static async resetPassword(token: string, newPassword: string) {
    const userId = await redisClient.get(`pwd_reset:${token}`);

    if (!userId) {
      throw new APIError('BAD_REQUEST', 'Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Delete token
    await redisClient.del(`pwd_reset:${token}`);

    // Revoke all refresh tokens — force re-login on all devices
    const userTokens = await redisClient.smembers(`rt_user:${userId}`);
    for (const t of userTokens) {
      await redisClient.del(`rt:${t}`);
    }
    await redisClient.del(`rt_user:${userId}`);

    return { message: 'Password reset successfully' };
  }

  /**
   * Change password (authenticated user).
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new APIError('NOT_FOUND', 'User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) throw new APIError('UNAUTHORIZED', 'Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Revoke all refresh tokens to force re-login
    const userTokens = await redisClient.smembers(`rt_user:${userId}`);
    for (const t of userTokens) {
      await redisClient.del(`rt:${t}`);
    }
    await redisClient.del(`rt_user:${userId}`);

    return { message: 'Password changed successfully. Please login again.' };
  }

  /**
   * Get current user profile.
   */
  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { StudentProfile: true, FacultyProfile: true },
    });

    if (!user) throw new APIError('NOT_FOUND', 'User not found');

    const name = user.StudentProfile ? `${user.StudentProfile.firstName} ${user.StudentProfile.lastName}` : (user.FacultyProfile ? `${user.FacultyProfile.firstName} ${user.FacultyProfile.lastName}` : user.email);
    const profileId = user.StudentProfile?.id || user.FacultyProfile?.id;
    
    const lastLogin = await redisClient.get(`last_login:${user.id}`);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name,
      profileId,
      isActive: user.isActive,
      lastLogin: lastLogin ? new Date(lastLogin) : null,
      createdAt: user.createdAt,
    };
  }
}
