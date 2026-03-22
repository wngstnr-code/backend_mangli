import { supabase } from '../../config/supabase';
import { CreatePackagePriceDTO, UpdatePackagePriceDTO } from '../../types/package-price.types';
import { PackagePrice } from '../../types/tour-package.types';
import { AppError } from '../../middlewares/error-handler';
import { tourPackageService } from '../tour-package/tour-package.service';

const TABLE = 'package_prices';

export class PackagePriceService {
  async getById(id: string): Promise<PackagePrice> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) throw new AppError('Data harga tiket tidak ditemukan', 404);

    return data as PackagePrice;
  }

  async getAll(tourPackageId?: string): Promise<PackagePrice[]> {
    let query = supabase
      .from(TABLE)
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (tourPackageId) {
      query = query.eq('tour_package_id', tourPackageId);
    }

    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);

    return data as PackagePrice[];
  }

  async create(dto: CreatePackagePriceDTO): Promise<PackagePrice> {
    await tourPackageService.getById(dto.tour_package_id);

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        ...dto,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    return data as PackagePrice;
  }

  async update(id: string, dto: UpdatePackagePriceDTO): Promise<PackagePrice> {
    await this.getById(id);

    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    return data as PackagePrice;
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);

    const { error } = await supabase
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new AppError(error.message, 500);
  }
}

export const packagePriceService = new PackagePriceService();
