import { Request, Response, NextFunction } from 'express';
import { uploadService } from './upload.service';
import { AppError } from '../../middlewares/error-handler';

export class UploadController {
  async uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError('File gambar wajib diunggah', 400);
      }

      const data = await uploadService.uploadImage(req.file);

      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async deleteImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { file_path } = req.body;

      if (!file_path) {
        throw new AppError('file_path wajib diisi', 400);
      }

      await uploadService.deleteImage(file_path);

      res.json({ success: true, message: 'File berhasil dihapus' });
    } catch (error) {
      next(error);
    }
  }
}

export const uploadController = new UploadController();
