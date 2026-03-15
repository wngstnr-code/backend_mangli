import { Router } from 'express';
import { tourPackageController } from './tour-package.controller';
import { validateRequiredFields } from '../../middlewares/validate';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

// Public routes
router.get('/', tourPackageController.getAll);
router.get('/:slug', tourPackageController.getBySlug);

// Admin routes (protected)
router.post(
  '/',
  authMiddleware,
  validateRequiredFields(['name', 'slug', 'travel_date', 'description', 'price', 'duration_days', 'max_participants', 'location']),
  tourPackageController.create
);
router.put('/:id', authMiddleware, tourPackageController.update);
router.delete('/:id', authMiddleware, tourPackageController.delete);

export default router;
