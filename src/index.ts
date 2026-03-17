import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import tourPackageRoutes from './modules/tour-package/tour-package.routes';
import orderRoutes from './modules/order/order.routes';
import orderItemRoutes from './modules/order-item/order-item.routes';
import paymentRoutes from './modules/payment/payment.routes';
import invoiceRoutes from './modules/invoice/invoice.routes';
import visitorCheckinRoutes from './modules/visitor-checkin/visitor-checkin.routes';
import adminNotificationRoutes from './modules/admin-notification/admin-notification.routes';
import authRoutes from './modules/auth/auth.routes';
import { errorHandler } from './middlewares/error-handler';
import { testConnection } from './config/supabase';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Backend Mangli API is running',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tour-packages', tourPackageRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', orderItemRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/visitor-checkins', visitorCheckinRoutes);
app.use('/api/admin-notifications', adminNotificationRoutes);

// Global error handler (must be last)
app.use(errorHandler);

app.listen(PORT,async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  await testConnection();
});

export default app;
