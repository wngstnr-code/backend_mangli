import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AdminPayload } from '../types/auth.types';

declare global {
  namespace Express {
    interface Request {
      admin?: AdminPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-here';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Token tidak ditemukan. Silakan login terlebih dahulu.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminPayload;
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Token tidak valid atau sudah kedaluwarsa.',
    });
  }
};

export const roleMiddleware = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!allowedRoles.includes(req.admin.role)) {
      res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses untuk fitur ini.',
      });
      return;
    }

    next();
  };
};
