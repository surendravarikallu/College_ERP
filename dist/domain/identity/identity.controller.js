"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityController = void 0;
const identity_service_1 = require("./identity.service");
const api_error_1 = require("../../core/common/exceptions/api.error");
class IdentityController {
    static async login(req, res, next) {
        const { email, institutionId } = req.body;
        console.log(`[Auth] Login attempt for ${email} @ ${institutionId}`);
        try {
            if (!email || !institutionId)
                throw new api_error_1.APIError('BAD_REQUEST', 'Email and Institution ID are required.');
            const data = await identity_service_1.IdentityService.authenticate(institutionId, email, req.body.password);
            console.log(`[Auth] Success: ${email} authenticated for role ${data.user.role}`);
            res.status(200).json({ success: true, data });
        }
        catch (err) {
            console.error(`[Auth Error] ${email} failed:`, err.message || err);
            next(err);
        }
    }
    static async refresh(req, res, next) {
        try {
            const { token } = req.body;
            const data = await identity_service_1.IdentityService.refresh(token);
            res.status(200).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.IdentityController = IdentityController;
