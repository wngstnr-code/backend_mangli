import { Request, Response, NextFunction } from 'express';
import { tourPackageService } from './tour-package.service';

export class TourPackageController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, search, location, is_active } = req.query;

      const result = await tourPackageService.getAll({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search: search as string,
        location: location as string,
        is_active: is_active !== undefined ? is_active === 'true' : undefined,
      });

      res.json({
        success: true,
        data: result.data,
        meta: {
          total: result.count,
          page: page ? Number(page) : 1,
          limit: limit ? Number(limit) : 10,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slug = req.params.slug as string;
      const data = await tourPackageService.getBySlug(slug);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await tourPackageService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await tourPackageService.update(id, req.body);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await tourPackageService.softDelete(id);

      res.json({ success: true, message: 'Paket wisata berhasil dihapus' });
    } catch (error) {
      next(error);
    }
  }
}

export const tourPackageController = new TourPackageController();
