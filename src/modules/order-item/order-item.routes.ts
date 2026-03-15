import { Router } from 'express';
import { orderItemController } from './order-item.controller';
import { validateRequiredFields } from '../../middlewares/validate';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

// All routes require admin auth
// Get items by order
router.get('/orders/:orderId/items', authMiddleware, orderItemController.getByOrderId);

// Add item to order
router.post(
  '/orders/:orderId/items',
  authMiddleware,
  validateRequiredFields(['tour_package_id', 'quantity']),
  orderItemController.create
);

// Update item
router.put('/order-items/:id', authMiddleware, orderItemController.update);

// Delete item
router.delete('/order-items/:id', authMiddleware, orderItemController.delete);

export default router;
