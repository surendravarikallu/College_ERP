import { User } from '@prisma/client';

declare global {
  namespace Express {
    export interface Request {
      user?: {
        id: string;
        role: string;
        profileId?: string;
      };
    }
  }
}
