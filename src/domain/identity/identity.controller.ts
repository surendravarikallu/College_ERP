import { Request, Response, NextFunction } from 'express';
import { IdentityService } from './identity.service';
import { APIError } from '../../core/common/exceptions/api.error';

export class IdentityController {

  static async login(req: Request, res: Response, next: NextFunction) {
    const { email, institutionId } = req.body;
    console.log(`[Auth] Login attempt for ${email} @ ${institutionId}`);

    try {
      if (!email || !institutionId) throw new APIError('BAD_REQUEST', 'Email and Institution ID are required.');
      
      const data = await IdentityService.authenticate(institutionId, email, req.body.password);
      
      console.log(`[Auth] Success: ${email} authenticated for role ${data.user.role}`);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      console.error(`[Auth Error] ${email} failed:`, err.message || err);
      next(err); 
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      const data = await IdentityService.refresh(token);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
