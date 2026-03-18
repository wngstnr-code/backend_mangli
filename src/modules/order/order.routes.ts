import { Router } from 'express';
import { orderController } from './order.controller';
import { validateRequiredFields } from '../../middlewares/validate';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

// Public routes (no auth required)
router.post(
  '/',
  validateRequiredFields(['full_name', 'phone_number', 'email', 'visit_date', 'items']),
  orderController.create
);

// Public: lookup by order number (for customer tracking)
router.get('/number/:orderNumber', orderController.getByOrderNumber);

// Admin routes (protected)
router.get('/', authMiddleware, orderController.getAll);
router.get('/:id', authMiddleware, orderController.getById);
router.patch(
  '/:id/status',
  authMiddleware,
  validateRequiredFields(['status']),
  orderController.updateStatus
);
router.patch('/:id/cancel', authMiddleware, orderController.cancelOrder);
router.post('/expire-check', authMiddleware, orderController.expireCheck);

export default router;
