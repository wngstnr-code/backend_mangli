import { Router } from 'express';
import { orderController } from './order.controller';
import { validateRequiredFields } from '../../middlewares/validate';

const router = Router();

// Public routes (no auth required)
router.post(
  '/',
  validateRequiredFields(['full_name', 'phone_number', 'email', 'items']),
  orderController.create
);

// Admin routes (TODO: add auth middleware)
router.get('/', orderController.getAll);
router.get('/number/:orderNumber', orderController.getByOrderNumber);
router.get('/:id', orderController.getById);
router.patch(
  '/:id/status',
  validateRequiredFields(['status']),
  orderController.updateStatus
);

export default router;
