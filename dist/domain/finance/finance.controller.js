"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceController = void 0;
const finance_service_1 = require("./finance.service");
class FinanceController {
    /** POST /finance/invoices/:id/pay — Initiate payment flow */
    static async initiatePayment(req, res, next) {
        try {
            const invoiceId = req.params.id;
            const order = await finance_service_1.FinanceService.initiatePayment(invoiceId);
            res.status(200).json({ success: true, data: order });
        }
        catch (err) {
            next(err);
        }
    }
    /** POST /finance/webhook/:institutionId — Handle Razorpay payment captured events */
    static async handleRazorpayWebhook(req, res, next) {
        try {
            const rawBody = req.body;
            const signature = req.headers['x-razorpay-signature'];
            const institutionId = req.params.institutionId;
            const data = await finance_service_1.FinanceService.processRazorpayWebhook(institutionId, rawBody, signature);
            res.status(200).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
    /** GET /finance/invoices — Fetch current student invoices */
    static async getInvoices(req, res, next) {
        // Basic stub — in production this would fetch based on req.user.profileId
        res.status(200).json({ success: true, data: [] });
    }
}
exports.FinanceController = FinanceController;
