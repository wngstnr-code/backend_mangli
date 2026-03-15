import { Router } from 'express';
import { invoiceController } from './invoice.controller';
import { validateRequiredFields } from '../../middlewares/validate';

const router = Router();

// Send invoice email
router.post(
  '/',
  validateRequiredFields(['order_id']),
  invoiceController.send
);

export default router;
