import { Router } from 'express';
import multer from 'multer';
import { uploadController } from './upload.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipe file tidak didukung. Gunakan JPEG, PNG, WebP, atau GIF.'));
    }
  },
});

router.post('/image', authMiddleware, upload.single('image'), uploadController.uploadImage);

router.delete('/image', authMiddleware, uploadController.deleteImage);

export default router;
