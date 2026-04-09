import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-key';

export class IdentityService {

  static async authenticate(institutionId: string, emailRaw: string, passwordRaw: string) {
    const email = emailRaw.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email },
      include: { studentProfile: true, facultyProfile: true }
    });

    // 1. Basic Verification & Hardened Institution Mapping
    if (!user || user.institutionId !== institutionId) throw new APIError('UNAUTHORIZED', 'Invalid credentials or tenant mismatch.');
    if (!user.isActive) throw new APIError('FORBIDDEN', 'Account dynamically suspended. Contact Admin.');

    const match = await bcrypt.compare(passwordRaw.toLowerCase().trim(), user.passwordHash);
    if (!match) throw new APIError('UNAUTHORIZED', 'Invalid credentials');

    // 2. JWT Generation natively bundling Context
    const payload = {
      id: user.id,
      institutionId: user.institutionId,
      role: user.role,
      profileId: user.studentProfile?.id || user.facultyProfile?.id
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' }); // Short-lived for security
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    return { user: payload, accessToken, refreshToken };
  }

  static async refresh(token: string) {
    try {
      const decoded: any = jwt.verify(token, JWT_REFRESH_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user || !user.isActive) throw new Error('Revoked');
      
      const payload = { id: user.id, institutionId: user.institutionId, role: user.role };
      const newAccess = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
      return { accessToken: newAccess };
    } catch (e) {
      throw new APIError('UNAUTHORIZED', 'Missing or heavily expired refresh token.');
    }
  }
}
