import { Router } from 'express';
import { tourPackageController } from './tour-package.controller';
import { validateRequiredFields } from '../../middlewares/validate';

const router = Router();

// Public routes
router.get('/', tourPackageController.getAll);
router.get('/:slug', tourPackageController.getBySlug);

// Admin routes (TODO: add auth middleware)
router.post(
  '/',
  validateRequiredFields(['name', 'slug', 'travel_date', 'description', 'price', 'duration_days', 'max_participants', 'location']),
  tourPackageController.create
);
router.put('/:id', tourPackageController.update);
router.delete('/:id', tourPackageController.delete);

export default router;
