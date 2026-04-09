"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const rateLimiter_middleware_1 = require("./core/middlewares/rateLimiter.middleware");
const pagination_middleware_1 = require("./core/middlewares/pagination.middleware");
const api_error_1 = require("./core/common/exceptions/api.error");
const audit_middleware_1 = require("./core/middlewares/audit.middleware");
const scheduler_1 = require("./core/scheduler");
// Core
const gateway_1 = require("./core/websockets/gateway");
const routes_1 = __importDefault(require("./domain/routes"));
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// 1. Hardened Global Security Layers
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, cors_1.default)({
    origin: (origin, callback) => callback(null, true), // Dynamic Origin for LAN/Multiple IPs
    credentials: true
}));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '5mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// 2. Core Operational Hooks
app.use((req, res, next) => { next(); });
app.use('/api', rateLimiter_middleware_1.globalRateLimiter);
app.use('/api', pagination_middleware_1.paginationGuard);
app.use('/api', audit_middleware_1.auditMiddleware);
// 3. API Sub-Router Binding
app.use('/api/v1', routes_1.default);
// 4. Global Error Filter (must be AFTER routes)
app.use(api_error_1.globalErrorFilter);
// 5. Single-Port Front-End Proxy
const clientBuildPath = path_1.default.join(__dirname, '../client/dist');
app.use(express_1.default.static(clientBuildPath));
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(clientBuildPath, 'index.html'));
});
// 6. Websocket Attachment
const io = (0, gateway_1.configureWebSockets)(httpServer);
const emitter_service_1 = require("./core/websockets/emitter.service");
emitter_service_1.SocketEmitter.setIo(io);
const PORT = Number(process.env.PORT) || 8080;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[ERP Core] Target multiplexer bound on 0.0.0.0:${PORT} (LAN Ready)`);
    (0, scheduler_1.initScheduler)();
});
