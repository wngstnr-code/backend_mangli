import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AdminPayload } from '../types/auth.types';

// Extend Express Request to include admin info
declare global {
  namespace Express {
    interface Request {
      admin?: AdminPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-here';

/**
 * Middleware to verify JWT token and protect admin routes
 */
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
