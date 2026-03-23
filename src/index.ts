import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import tourPackageRoutes from './modules/tour-package/tour-package.routes';
import orderRoutes from './modules/order/order.routes';
import orderItemRoutes from './modules/order-item/order-item.routes';
import paymentRoutes from './modules/payment/payment.routes';
import invoiceRoutes from './modules/invoice/invoice.routes';
import visitorCheckinRoutes from './modules/visitor-checkin/visitor-checkin.routes';
import adminNotificationRoutes from './modules/admin-notification/admin-notification.routes';
import authRoutes from './modules/auth/auth.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import uploadRoutes from './modules/upload/upload.routes';
import ticketRoutes from './modules/ticket/ticket.routes';
import packagePriceRoutes from './modules/package-price/package-price.routes';
import { errorHandler } from './middlewares/error-handler';
import { testConnection } from './config/supabase';
import { startExpiredOrdersCron } from './cron/expired-orders.cron';

dotenv.config();

const app = express();
app.set('trust proxy', 1); // Trust proxy agar rate limit bisa baca IP asli di Vercel/VPS
const PORT = process.env.PORT || 8000;

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

if (!process.env.FRONTEND_URL) {
  console.warn('[WARN] FRONTEND_URL tidak diset di .env — CORS akan menolak semua origin browser!');
}
app.use(cors({
  origin: process.env.FRONTEND_URL || false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak request, coba lagi nanti.' },
});
app.use('/api/', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Backend Mangli API is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/tour-packages', tourPackageRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', orderItemRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/visitor-checkins', visitorCheckinRoutes);
app.use('/api/admin-notifications', adminNotificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/package-prices', packagePriceRoutes);

app.use(errorHandler);

// app.listen(PORT, async () => {
//   console.log(`Server running on port ${PORT}`);
//   console.log(`Health check: http://localhost:${PORT}/api/health`);
//   await testConnection();
//   startExpiredOrdersCron();
// });


// INFO DEPLOYMENT VERCEL:
// Karena Vercel menggunakan arsitektur Serverless, idealnya kita tidak menggunakan app.listen().
// Jika terjadi error saat deploy, uncomment block kode di bawah ini dan hapus app.listen di atas.

if (process.env.VERCEL !== '1') {
  app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    await testConnection();
    startExpiredOrdersCron();
  });
} else {
  testConnection();
  // Mode Serverless Vercel (Hanya inisialisasi koneksi tanpa listen)
  // Catatan: Cron Job node-cron tidak bisa berjalan terus-menerus di Vercel.
}

export default app;
