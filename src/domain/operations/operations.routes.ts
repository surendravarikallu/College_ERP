import { Router } from 'express';
import { OperationsController } from './operations.controller';
import { authenticate, authorize } from '../../core/middlewares/auth.middleware';

const operationsRouter = Router();
operationsRouter.use(authenticate);

// ===== HOSTEL =====
operationsRouter.get('/hostel/rooms', OperationsController.listRooms);
operationsRouter.post('/hostel/rooms', authorize(['ADMIN', 'SUPERADMIN']), OperationsController.createRoom);
operationsRouter.post('/hostel/allocate', authorize(['ADMIN', 'SUPERADMIN', 'STAFF']), OperationsController.allocateBed);
operationsRouter.put('/hostel/deallocate/:id', authorize(['ADMIN', 'SUPERADMIN', 'STAFF']), OperationsController.deallocateBed);
operationsRouter.get('/hostel/stats', OperationsController.getHostelStats);

// ===== LIBRARY =====
operationsRouter.post('/library/copies', authorize(['ADMIN', 'SUPERADMIN', 'STAFF']), OperationsController.addCopy);
operationsRouter.get('/library/copies', OperationsController.listCopies);
operationsRouter.post('/library/issue', authorize(['ADMIN', 'SUPERADMIN', 'STAFF']), OperationsController.issueBook);
operationsRouter.put('/library/return/:id', authorize(['ADMIN', 'SUPERADMIN', 'STAFF']), OperationsController.returnBook);
operationsRouter.get('/library/transactions', OperationsController.listTransactions);
operationsRouter.get('/library/stats', OperationsController.getLibraryStats);

// ===== TRANSPORT =====
operationsRouter.get('/transport/routes', OperationsController.listRoutes);
operationsRouter.post('/transport/routes', authorize(['ADMIN', 'SUPERADMIN']), OperationsController.createRoute);
operationsRouter.get('/transport/vehicles', OperationsController.listVehicles);
operationsRouter.post('/transport/vehicles', authorize(['ADMIN', 'SUPERADMIN']), OperationsController.createVehicle);
operationsRouter.post('/transport/drivers', authorize(['ADMIN', 'SUPERADMIN']), OperationsController.assignDriver);
operationsRouter.post('/transport/passes', authorize(['ADMIN', 'SUPERADMIN', 'STAFF']), OperationsController.issuePass);
operationsRouter.get('/transport/passes', OperationsController.listPasses);
operationsRouter.delete('/transport/passes/:id', authorize(['ADMIN', 'SUPERADMIN']), OperationsController.revokePass);
operationsRouter.get('/transport/stats', OperationsController.getTransportStats);

// ===== INVENTORY =====
operationsRouter.post('/inventory/assets', authorize(['ADMIN', 'SUPERADMIN', 'STAFF']), OperationsController.createAsset);
operationsRouter.get('/inventory/assets', OperationsController.listAssets);
operationsRouter.post('/inventory/allocate', authorize(['ADMIN', 'SUPERADMIN', 'STAFF']), OperationsController.allocateAsset);
operationsRouter.put('/inventory/return/:id', authorize(['ADMIN', 'SUPERADMIN', 'STAFF']), OperationsController.returnAsset);
operationsRouter.get('/inventory/stats', OperationsController.getInventoryStats);

export default operationsRouter;
