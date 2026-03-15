import { Router } from 'express';
import { authController } from './auth.controller';
import { validateRequiredFields } from '../../middlewares/validate';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

// Public
router.post(
  '/register',
  validateRequiredFields(['name', 'email', 'password']),
  authController.register
);

router.post(
  '/login',
  validateRequiredFields(['email', 'password']),
  authController.login
);

// Protected
router.get('/profile', authMiddleware, authController.getProfile);

export default router;
