import { supabase } from '../../config/supabase';
import { AppError } from '../../middlewares/error-handler';

const BUCKET = 'tour-images';

export class UploadService {
  async uploadImage(file: Express.Multer.File): Promise<{ url: string; path: string }> {
    const fileName = `${Date.now()}-${file.originalname.replace(/\s/g, '-')}`;
    const filePath = `uploads/${fileName}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw new AppError(`Upload gagal: ${error.message}`, 500);

    const { data: publicUrl } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    return {
      url: publicUrl.publicUrl,
      path: filePath,
    };
  }

  async deleteImage(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([filePath]);

    if (error) throw new AppError(`Gagal menghapus file: ${error.message}`, 500);
  }
}

export const uploadService = new UploadService();
