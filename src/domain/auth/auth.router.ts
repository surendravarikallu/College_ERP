import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { authenticateToken, AuthRequest } from '../../core/middlewares/auth.middleware';
import { AuditService } from '../audit/audit.service';
import { authRateLimiter } from '../../core/middlewares/rateLimiter.middleware';

const authRouter = Router();

// POST /api/v1/auth/login
authRouter.post('/login', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const ipAddress = req.ip || req.socket?.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    const result = await AuthService.login(email, password, ipAddress, userAgent);

    // Audit log
    await AuditService.log(result.user.id, 'LOGIN', 'User', result.user.id, null, null, req);

    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, refreshToken } = req.body;
    const tokenToRefresh = refreshToken || token;
    if (!tokenToRefresh) {
      return res.status(400).json({ success: false, error: 'Refresh token required' });
    }

    const result = await AuthService.refreshTokens(tokenToRefresh);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/logout
authRouter.post('/logout', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    const accessToken = req.headers.authorization?.split(' ')[1];
    await AuthService.logout(refreshToken, accessToken);

    if (req.user) {
      await AuditService.log(req.user.id, 'LOGOUT', 'User', req.user.id, null, null, req);
    }

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/forgot-password
authRouter.post('/forgot-password', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const result = await AuthService.forgotPassword(email);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/reset-password
authRouter.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    const result = await AuthService.resetPassword(token, newPassword);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/change-password
authRouter.post('/change-password', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    const result = await AuthService.changePassword(req.user!.id, currentPassword, newPassword);
    await AuditService.log(req.user!.id, 'PASSWORD_CHANGE', 'User', req.user!.id, null, null, req);

    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/me
authRouter.get('/me', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await AuthService.getCurrentUser(req.user!.id);
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

export default authRouter;
