import { Router } from 'express';
import { visitorCheckinController } from './visitor-checkin.controller';
import { validateRequiredFields } from '../../middlewares/validate';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.post(
  '/',
  authMiddleware,
  validateRequiredFields(['order_id', 'number_of_visitors']),
  visitorCheckinController.checkin
);

router.post(
  '/scan',
  authMiddleware,
  validateRequiredFields(['qr_data']),
  visitorCheckinController.scan
);

router.get('/summary', authMiddleware, visitorCheckinController.getSummary);

router.get('/', authMiddleware, visitorCheckinController.getAll);
router.get('/order/:orderId', authMiddleware, visitorCheckinController.getByOrderId);

export default router;
