"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const operations_controller_1 = require("./operations.controller");
const auth_middleware_1 = require("../../core/middlewares/auth.middleware");
const operationsRouter = (0, express_1.Router)();
operationsRouter.use(auth_middleware_1.authenticate);
// ===== HOSTEL =====
operationsRouter.get('/hostel/rooms', operations_controller_1.OperationsController.listRooms);
operationsRouter.post('/hostel/rooms', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), operations_controller_1.OperationsController.createRoom);
operationsRouter.post('/hostel/allocate', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN', 'STAFF']), operations_controller_1.OperationsController.allocateBed);
operationsRouter.put('/hostel/deallocate/:id', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN', 'STAFF']), operations_controller_1.OperationsController.deallocateBed);
operationsRouter.get('/hostel/stats', operations_controller_1.OperationsController.getHostelStats);
// ===== LIBRARY =====
operationsRouter.post('/library/copies', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN', 'STAFF']), operations_controller_1.OperationsController.addCopy);
operationsRouter.get('/library/copies', operations_controller_1.OperationsController.listCopies);
operationsRouter.post('/library/issue', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN', 'STAFF']), operations_controller_1.OperationsController.issueBook);
operationsRouter.put('/library/return/:id', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN', 'STAFF']), operations_controller_1.OperationsController.returnBook);
operationsRouter.get('/library/transactions', operations_controller_1.OperationsController.listTransactions);
operationsRouter.get('/library/stats', operations_controller_1.OperationsController.getLibraryStats);
// ===== TRANSPORT =====
operationsRouter.get('/transport/routes', operations_controller_1.OperationsController.listRoutes);
operationsRouter.post('/transport/routes', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), operations_controller_1.OperationsController.createRoute);
operationsRouter.get('/transport/vehicles', operations_controller_1.OperationsController.listVehicles);
operationsRouter.post('/transport/vehicles', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), operations_controller_1.OperationsController.createVehicle);
operationsRouter.post('/transport/drivers', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), operations_controller_1.OperationsController.assignDriver);
operationsRouter.post('/transport/passes', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN', 'STAFF']), operations_controller_1.OperationsController.issuePass);
operationsRouter.get('/transport/passes', operations_controller_1.OperationsController.listPasses);
operationsRouter.delete('/transport/passes/:id', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), operations_controller_1.OperationsController.revokePass);
operationsRouter.get('/transport/stats', operations_controller_1.OperationsController.getTransportStats);
// ===== INVENTORY =====
operationsRouter.post('/inventory/assets', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN', 'STAFF']), operations_controller_1.OperationsController.createAsset);
operationsRouter.get('/inventory/assets', operations_controller_1.OperationsController.listAssets);
operationsRouter.post('/inventory/allocate', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN', 'STAFF']), operations_controller_1.OperationsController.allocateAsset);
operationsRouter.put('/inventory/return/:id', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN', 'STAFF']), operations_controller_1.OperationsController.returnAsset);
operationsRouter.get('/inventory/stats', operations_controller_1.OperationsController.getInventoryStats);
exports.default = operationsRouter;
