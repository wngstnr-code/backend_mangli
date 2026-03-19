import { Router } from 'express';
import { orderItemController } from './order-item.controller';
import { validateRequiredFields } from '../../middlewares/validate';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.get('/orders/:orderId/items', authMiddleware, orderItemController.getByOrderId);

router.post(
  '/orders/:orderId/items',
  authMiddleware,
  validateRequiredFields(['tour_package_id', 'quantity']),
  orderItemController.create
);

router.put('/order-items/:id', authMiddleware, orderItemController.update);

router.delete('/order-items/:id', authMiddleware, orderItemController.delete);

export default router;
