import { Request, Response, NextFunction } from 'express';

/**
 * Middleware factory untuk validasi required fields di request body.
 * @param requiredFields - array nama field yang wajib ada
 */
export const validateRequiredFields = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Field berikut wajib diisi: ${missingFields.join(', ')}`,
      });
      return;
    }

    next();
  };
};
