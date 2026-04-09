"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_client_1 = require("../../core/database/prisma.client");
const api_error_1 = require("../../core/common/exceptions/api.error");
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-key';
class IdentityService {
    static async authenticate(institutionId, emailRaw, passwordRaw) {
        const email = emailRaw.toLowerCase().trim();
        const user = await prisma_client_1.prisma.user.findUnique({
            where: { email },
            include: { studentProfile: true, facultyProfile: true }
        });
        // 1. Basic Verification & Hardened Institution Mapping
        if (!user || user.institutionId !== institutionId)
            throw new api_error_1.APIError('UNAUTHORIZED', 'Invalid credentials or tenant mismatch.');
        if (!user.isActive)
            throw new api_error_1.APIError('FORBIDDEN', 'Account dynamically suspended. Contact Admin.');
        const match = await bcryptjs_1.default.compare(passwordRaw.toLowerCase().trim(), user.passwordHash);
        if (!match)
            throw new api_error_1.APIError('UNAUTHORIZED', 'Invalid credentials');
        // 2. JWT Generation natively bundling Context
        const payload = {
            id: user.id,
            institutionId: user.institutionId,
            role: user.role,
            profileId: user.studentProfile?.id || user.facultyProfile?.id
        };
        const accessToken = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '15m' }); // Short-lived for security
        const refreshToken = jsonwebtoken_1.default.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
        return { user: payload, accessToken, refreshToken };
    }
    static async refresh(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
            const user = await prisma_client_1.prisma.user.findUnique({ where: { id: decoded.id } });
            if (!user || !user.isActive)
                throw new Error('Revoked');
            const payload = { id: user.id, institutionId: user.institutionId, role: user.role };
            const newAccess = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '15m' });
            return { accessToken: newAccess };
        }
        catch (e) {
            throw new api_error_1.APIError('UNAUTHORIZED', 'Missing or heavily expired refresh token.');
        }
    }
}
exports.IdentityService = IdentityService;
