import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

// Admin: Dashboard summary
router.get('/summary', authMiddleware, dashboardController.getSummary);

export default router;
