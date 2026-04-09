"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tracingMiddleware = exports.requestContext = void 0;
const crypto_1 = require("crypto");
const async_hooks_1 = require("async_hooks");
exports.requestContext = new async_hooks_1.AsyncLocalStorage();
const tracingMiddleware = (req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || (0, crypto_1.randomUUID)();
    res.setHeader('X-Correlation-ID', correlationId);
    const store = new Map();
    store.set('correlationId', correlationId);
    store.set('ip', req.ip || req.socket?.remoteAddress || '127.0.0.1');
    exports.requestContext.run(store, () => next());
};
exports.tracingMiddleware = tracingMiddleware;
