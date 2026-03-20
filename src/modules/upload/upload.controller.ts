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
      let { file_path, file_url } = req.body;

      if (!file_path && file_url) {
        const bucketName = 'tour-images';
        const parts = file_url.split(`/${bucketName}/`);
        if (parts.length > 1) {
          file_path = parts[1];
        } else {
          file_path = file_url;
        }
      }

      if (!file_path) {
        throw new AppError('file_path atau file_url wajib diisi', 400);
      }

      await uploadService.deleteImage(file_path);

      res.json({ success: true, message: 'File berhasil dihapus' });
    } catch (error) {
      next(error);
    }
  }
}

export const uploadController = new UploadController();
