"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const finance_controller_1 = require("./finance.controller");
const auth_middleware_1 = require("../../core/middlewares/auth.middleware");
const financeRouter = (0, express_1.Router)();
/** Initiate Payment Flow — Student Only */
financeRouter.post('/invoices/:id/pay', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['STUDENT']), finance_controller_1.FinanceController.initiatePayment);
/** Fetch My Invoices — Student Only */
financeRouter.get('/invoices', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['STUDENT']), finance_controller_1.FinanceController.getInvoices);
/** Razorpay Webhook — Public with HMAC Signature Verification */
financeRouter.post('/webhook/:institutionId', finance_controller_1.FinanceController.handleRazorpayWebhook);
exports.default = financeRouter;
