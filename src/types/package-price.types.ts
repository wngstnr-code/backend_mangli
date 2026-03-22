export interface CreatePackagePriceDTO {
  tour_package_id: string;
  name: string;
  price: number;
  discount_price?: number;
  is_active?: boolean;
}

export interface UpdatePackagePriceDTO {
  name?: string;
  price?: number;
  discount_price?: number;
  is_active?: boolean;
}
