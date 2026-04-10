import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { APIError } from '../common/exceptions/api.error';
import { redisClient } from '../cache/redis.service';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-key';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    profileId?: string;
  };
}

/**
 * JWT Authentication Guard with Redis blacklist checking.
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new APIError('UNAUTHORIZED', 'Authorization header with Bearer token required.'));
  }

  const token = authHeader.split(' ')[1];

  try {
    // Check Redis blacklist (for logged-out tokens)
    try {
      const isBlacklisted = await redisClient.exists(`blacklist:${token}`);
      if (isBlacklisted) {
        return next(new APIError('UNAUTHORIZED', 'Token has been revoked.'));
      }
    } catch {
      // If Redis is down, allow through (fail-open for availability)
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      role: decoded.role,
      profileId: decoded.profileId,
    };
    next();
  } catch (err) {
    next(new APIError('UNAUTHORIZED', 'Invalid or expired token.'));
  }
};

/**
 * RBAC Guard — restricts routes by user role.
 * Usage: authorize(['ADMIN', 'SUPER_ADMIN'])
 */
export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new APIError('FORBIDDEN', 'Access denied for your role.'));
    }
    next();
  };
};

/**
 * Ownership Guard — ensures user can only access their own resources.
 * SUPER_ADMIN and ADMIN bypass this check.
 * Usage: requireOwnership(async (req) => getResourceOwnerId(req.params.id))
 */
export const requireOwnership = (getResourceUserId: (req: AuthRequest) => Promise<string>) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new APIError('UNAUTHORIZED', 'Authentication required.'));
      }

      // Admin roles bypass ownership check
      if (['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
        return next();
      }

      const resourceOwnerId = await getResourceUserId(req);
      if (req.user.id !== resourceOwnerId) {
        return next(new APIError('FORBIDDEN', 'You can only access your own resources.'));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

// Legacy aliases for backward compatibility with existing routes
export { authRateLimiter } from './rateLimiter.middleware';
