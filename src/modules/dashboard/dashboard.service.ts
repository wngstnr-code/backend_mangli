import { supabase } from '../../config/supabase';
import { AppError } from '../../middlewares/error-handler';

export interface DashboardSummary {
  total_revenue: number;
  total_orders: number;
  total_visitors: number;
  top_packages: { tour_package_id: string; name: string; total_sold: number }[];
  daily_visitors: { date: string; visitors: number }[];
}

export class DashboardService {
  async getSummary(period: string = 'monthly', date?: string): Promise<DashboardSummary> {
    const now = new Date();
    let startDate: string;
    let endDate: string;

    if (period === 'daily') {
      const targetDate = date || now.toISOString().split('T')[0];
      startDate = `${targetDate}T00:00:00.000Z`;
      endDate = `${targetDate}T23:59:59.999Z`;
    } else if (period === 'weekly') {
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startDate = `${startOfWeek.toISOString().split('T')[0]}T00:00:00.000Z`;
      endDate = now.toISOString();
    } else {
      const targetMonth = date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const [year, month] = targetMonth.split('-');
      startDate = `${year}-${month}-01T00:00:00.000Z`;
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;
    }

    const [revenueRes, ordersRes, visitorRes, topRes, dailyRes] = await Promise.all([
      supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'paid')
        .gte('created_at', startDate)
        .lte('created_at', endDate),
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lte('created_at', endDate),
      supabase
        .from('visitor_checkins')
        .select('number_of_visitors')
        .gte('checked_in_at', startDate)
        .lte('checked_in_at', endDate),
      supabase
        .from('order_items')
        .select('tour_package_id, quantity, tour_packages(name), orders!inner(created_at, status)')
        .eq('orders.status', 'paid')
        .gte('orders.created_at', startDate)
        .lte('orders.created_at', endDate),
      supabase
        .from('visitor_checkins')
        .select('checked_in_at, number_of_visitors')
        .gte('checked_in_at', startDate)
        .lte('checked_in_at', endDate)
        .order('checked_in_at', { ascending: true }),
    ]);

    if (revenueRes.error) throw new AppError(revenueRes.error.message, 500);
    if (ordersRes.error) throw new AppError(ordersRes.error.message, 500);
    if (visitorRes.error) throw new AppError(visitorRes.error.message, 500);
    if (topRes.error) throw new AppError(topRes.error.message, 500);
    if (dailyRes.error) throw new AppError(dailyRes.error.message, 500);

    const totalRevenue = revenueRes.data?.reduce((sum, row) => sum + Number(row.total_amount), 0) || 0;
    const totalVisitors = visitorRes.data?.reduce((sum, row) => sum + (row.number_of_visitors || 0), 0) || 0;

    const packageMap = new Map<string, { name: string; total_sold: number }>();
    for (const row of topRes.data || []) {
      const pkgId = row.tour_package_id;
      const pkgName = (row.tour_packages as unknown as { name: string })?.name || 'Unknown';
      const existing = packageMap.get(pkgId);
      if (existing) {
        existing.total_sold += row.quantity;
      } else {
        packageMap.set(pkgId, { name: pkgName, total_sold: row.quantity });
      }
    }

    const topPackages = Array.from(packageMap.entries())
      .map(([tour_package_id, info]) => ({ tour_package_id, ...info }))
      .sort((a, b) => b.total_sold - a.total_sold)
      .slice(0, 5);

    const dailyMap = new Map<string, number>();
    for (const row of dailyRes.data || []) {
      const day = new Date(row.checked_in_at).toISOString().split('T')[0];
      dailyMap.set(day, (dailyMap.get(day) || 0) + (row.number_of_visitors || 0));
    }

    const dailyVisitors = Array.from(dailyMap.entries())
      .map(([date, visitors]) => ({ date, visitors }));

    return {
      total_revenue: totalRevenue,
      total_orders: ordersRes.count || 0,
      total_visitors: totalVisitors,
      top_packages: topPackages,
      daily_visitors: dailyVisitors,
    };
  }
}

export const dashboardService = new DashboardService();
