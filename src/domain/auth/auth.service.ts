import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';
import { emailQueue } from '../../core/queues/queue.setup';
import { redisClient } from '../../core/cache/redis.service';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('Required JWT environment variables (JWT_SECRET, JWT_REFRESH_SECRET) are missing. Production failure initiated for security.');
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)(m|h|d)$/);
  if (!match) return 900;
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
   * Uses DB-based refresh tokens and account locking.
   */
  static async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { StudentProfile: true, FacultyProfile: true, student: true, faculty: true },
    });

    if (!user) throw new APIError('UNAUTHORIZED', 'Invalid credentials');
    if (!user.isActive) throw new APIError('FORBIDDEN', 'Account is suspended. Contact administrator.');

    // Check account lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMin = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new APIError('FORBIDDEN', `Account locked. Try again in ${remainingMin} minutes.`);
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const newCount = user.failedLoginCount + 1;
      const updateData: any = { failedLoginCount: newCount };

      if (newCount >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      }

      await prisma.user.update({ where: { id: user.id }, data: updateData });
      throw new APIError('UNAUTHORIZED', 'Invalid credentials');
    }

    // Reset failed count on success
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLogin: new Date() },
    });

    // Resolve name and profileId from either new or legacy profiles
    const name = user.student?.name
      || (user.StudentProfile ? `${user.StudentProfile.firstName} ${user.StudentProfile.lastName}` : null)
      || user.faculty?.name
      || (user.FacultyProfile ? `${user.FacultyProfile.firstName} ${user.FacultyProfile.lastName}` : null)
      || user.email;

    const profileId = user.student?.id || user.StudentProfile?.id || user.faculty?.id || user.FacultyProfile?.id;

    const payload = { id: user.id, role: user.role, profileId, institutionId: user.institutionId };
    const accessToken = jwt.sign(payload, JWT_SECRET as string, { expiresIn: JWT_EXPIRES_IN as any });
    const refreshToken = jwt.sign({ id: user.id, type: 'refresh' }, JWT_REFRESH_SECRET as string, { expiresIn: JWT_REFRESH_EXPIRES_IN as any });

    // Store refresh token in DB
    const refreshExpiresInSecs = parseExpiresIn(JWT_REFRESH_EXPIRES_IN);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + refreshExpiresInSecs * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, role: user.role, name, email: user.email, profileId },
    };
  }

  /**
   * Rotate refresh token: validate old, revoke it, issue new pair.
   */
  static async refreshTokens(refreshToken: string) {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { StudentProfile: true, FacultyProfile: true, student: true, faculty: true } } },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new APIError('UNAUTHORIZED', 'Invalid or expired refresh token');
    }

    const user = storedToken.user;
    if (!user.isActive) throw new APIError('FORBIDDEN', 'Account suspended');

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new pair
    const profileId = user.student?.id || user.StudentProfile?.id || user.faculty?.id || user.FacultyProfile?.id;
    const payload = { id: user.id, role: user.role, profileId, institutionId: user.institutionId };

    const newAccessToken = jwt.sign({ id: user.id, role: user.role, type: 'access' }, JWT_SECRET as string, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ id: user.id, type: 'refresh' }, JWT_REFRESH_SECRET as string, { expiresIn: '7d' });

    const refreshExpiresInSecs = parseExpiresIn(JWT_REFRESH_EXPIRES_IN);
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + refreshExpiresInSecs * 1000),
      },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logout: revoke refresh token.
   */
  static async logout(refreshToken?: string, accessToken?: string) {
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    // Blacklist the access token in Redis until it expires
    if (accessToken) {
      try {
        const decoded = jwt.decode(accessToken) as any;
        if (decoded?.exp) {
          const ttl = decoded.exp - Math.floor(Date.now() / 1000);
          if (ttl > 0) {
            await redisClient.set(`blacklist:${accessToken}`, '1', 'EX', ttl);
          }
        }
      } catch { /* non-blocking */ }
    }
  }

  /**
   * Forgot password — always returns success to prevent enumeration.
   */
  static async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');

      await prisma.passwordReset.create({
        data: {
          token,
          userId: user.id,
          expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        },
      });

      const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

      await emailQueue.add('password-reset', {
        to: user.email,
        subject: 'Password Reset Request',
        html: `
          <h2>Password Reset</h2>
          <p>You requested a password reset. Click the link below:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Regards,<br/>Kits Akshar ERP</p>
        `,
      });
    }

    return { message: 'If the email exists, a reset link has been sent.' };
  }

  /**
   * Reset password using token.
   */
  static async resetPassword(token: string, newPassword: string) {
    const resetRecord = await prisma.passwordReset.findUnique({ where: { token } });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
      throw new APIError('BAD_REQUEST', 'Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all refresh tokens
      prisma.refreshToken.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

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

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password changed successfully. Please login again.' };
  }

  /**
   * Get current user profile.
   */
  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { StudentProfile: true, FacultyProfile: true, student: true, faculty: true },
    });

    if (!user) throw new APIError('NOT_FOUND', 'User not found');

    const name = user.student?.name
      || (user.StudentProfile ? `${user.StudentProfile.firstName} ${user.StudentProfile.lastName}` : null)
      || user.faculty?.name
      || (user.FacultyProfile ? `${user.FacultyProfile.firstName} ${user.FacultyProfile.lastName}` : null)
      || user.email;

    const profileId = user.student?.id || user.StudentProfile?.id || user.faculty?.id || user.FacultyProfile?.id;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name,
      profileId,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    };
  }
}
