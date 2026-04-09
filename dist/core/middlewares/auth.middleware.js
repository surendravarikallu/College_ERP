"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const api_error_1 = require("../common/exceptions/api.error");
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-key';
/**
 * Global Authentication Guard to verify JWTs and inject Context into the Request object.
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new api_error_1.APIError('UNAUTHORIZED', 'Authorization header strictly required with Bearer token.'));
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = {
            id: decoded.id,
            institutionId: decoded.institutionId,
            role: decoded.role,
            profileId: decoded.profileId
        };
        req.tenantId = decoded.institutionId;
        next();
    }
    catch (err) {
        next(new api_error_1.APIError('UNAUTHORIZED', 'Invalid or expired token. Refresh required.'));
    }
};
exports.authenticate = authenticate;
/**
 * RBAC Guard to restrict routes by user role.
 */
const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new api_error_1.APIError('FORBIDDEN', 'Access explicitly denied for your role in this tenant segment.'));
        }
        next();
    };
};
exports.authorize = authorize;
