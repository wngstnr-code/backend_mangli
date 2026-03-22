import { Router } from 'express';
import { packagePriceController } from './package-price.controller';
import { validateRequiredFields } from '../../middlewares/validate';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.get('/', packagePriceController.getAll);
router.get('/:id', packagePriceController.getById);

router.post(
  '/',
  authMiddleware,
  validateRequiredFields(['tour_package_id', 'name', 'price']),
  packagePriceController.create
);

router.put('/:id', authMiddleware, packagePriceController.update);

router.delete('/:id', authMiddleware, packagePriceController.delete);

export default router;
