import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await authService.register(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await authService.login(req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.admin!.id;
      const data = await authService.getProfile(adminId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
