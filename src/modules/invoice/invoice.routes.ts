import { Router } from 'express';
import { invoiceController } from './invoice.controller';
import { validateRequiredFields } from '../../middlewares/validate';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.post(
  '/',
  authMiddleware,
  validateRequiredFields(['order_id']),
  invoiceController.send
);

export default router;
