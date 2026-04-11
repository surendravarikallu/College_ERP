import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { redisClient } from '../cache/redis.service';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is missing. Security risk: cannot fallback to dev keys.');
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    profileId?: string;
    institutionId?: string;
  };
}

/**
 * JWT Authentication — verifies Bearer token, checks Redis blacklist, and attaches user to request.
 */
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authorization header with Bearer token required.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Check if this token has been blacklisted (e.g., via logout)
    try {
      const isBlacklisted = await redisClient.get(`blacklist:${token}`);
      if (isBlacklisted) {
        return res.status(401).json({ success: false, error: 'Token has been revoked.' });
      }
    } catch { /* Redis failure is non-blocking — allow request through */ }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      profileId: decoded.profileId,
      institutionId: decoded.institutionId,
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
};

/**
 * RBAC Guard — restricts routes by user role.
 * Usage: requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN')
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Access denied for your role.' });
    }
    next();
  };
};

// Re-export legacy names for backward compatibility with existing routes
export { authenticateToken as authenticate };
export const authorize = (roles: string[]) => requireRole(...roles);
