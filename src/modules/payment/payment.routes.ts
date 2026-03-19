import { Router } from 'express';
import { paymentController } from './payment.controller';
import { validateRequiredFields } from '../../middlewares/validate';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.post('/midtrans/:orderId', paymentController.createMidtransPayment);

router.post('/midtrans/notification', paymentController.handleNotification);

router.post(
  '/cash/:orderId',
  authMiddleware,
  validateRequiredFields(['amount', 'received_by']),
  paymentController.createCashPayment
);

router.get('/order/:orderId', authMiddleware, paymentController.getByOrderId);

router.get('/', authMiddleware, paymentController.getAll);

router.get('/:id', authMiddleware, paymentController.getById);

export default router;
