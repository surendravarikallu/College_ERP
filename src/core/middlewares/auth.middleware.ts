import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { APIError } from '../common/exceptions/api.error';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-key';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    institutionId: string;
    role: string;
    profileId?: string;
  };
  tenantId?: string;
}

/**
 * Global Authentication Guard to verify JWTs and inject Context into the Request object.
 */
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new APIError('UNAUTHORIZED', 'Authorization header strictly required with Bearer token.'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      institutionId: decoded.institutionId,
      role: decoded.role,
      profileId: decoded.profileId
    };
    req.tenantId = decoded.institutionId;
    next();
  } catch (err) {
    next(new APIError('UNAUTHORIZED', 'Invalid or expired token. Refresh required.'));
  }
};

/**
 * RBAC Guard to restrict routes by user role.
 */
export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new APIError('FORBIDDEN', 'Access explicitly denied for your role in this tenant segment.'));
    }
    next();
  };
};
