-- =============================================
-- Backend Mangli - SQL Migration
-- Database: Supabase (PostgreSQL)
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Table: tour_packages
-- =============================================
CREATE TABLE IF NOT EXISTS tour_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    available_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
    description TEXT,
    price BIGINT NOT NULL,
    discount_price BIGINT,
    duration_days INTEGER NOT NULL,
    max_participants INTEGER NOT NULL,
    location TEXT NOT NULL,
    image_url TEXT,
    gallery_urls TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    blocked_dates DATE[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Index for slug lookup (public detail page)
CREATE INDEX IF NOT EXISTS idx_tour_packages_slug ON tour_packages(slug);
-- Index for active packages
CREATE INDEX IF NOT EXISTS idx_tour_packages_active ON tour_packages(is_active) WHERE deleted_at IS NULL;

-- =============================================
-- Table: orders
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    created_by UUID,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT NOT NULL,
    order_number TEXT NOT NULL UNIQUE,
    payment_method TEXT DEFAULT 'midtrans',
    visit_date DATE NOT NULL,
    status TEXT DEFAULT 'pending',
    total_amount BIGINT NOT NULL DEFAULT 0,
    admin_notes TEXT,
    expired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for order number lookup
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- =============================================
-- Table: order_items
-- =============================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    tour_package_id UUID NOT NULL REFERENCES tour_packages(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price BIGINT NOT NULL,
    subtotal BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for order_id lookup
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- =============================================
-- Table: payments
-- =============================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    gateway_provider TEXT NOT NULL DEFAULT 'midtrans',
    gateway_transaction_id TEXT UNIQUE,
    gateway_order_id TEXT UNIQUE,
    payment_type TEXT,
    payment_channel TEXT,
    status TEXT DEFAULT 'pending',
    amount BIGINT NOT NULL,
    currency TEXT DEFAULT 'IDR',
    redirect_url TEXT,
    snap_token TEXT,
    va_number TEXT,
    payment_code TEXT,
    received_by UUID,
    receipt_number TEXT,
    gateway_response JSONB,
    paid_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for order lookup
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
-- Index for gateway_order_id (Midtrans notification lookup)
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order_id ON payments(gateway_order_id);

-- =============================================
-- Table: visitor_checkins
-- =============================================
CREATE TABLE IF NOT EXISTS visitor_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    checked_in_by TEXT,
    number_of_visitors INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for order lookup
CREATE INDEX IF NOT EXISTS idx_visitor_checkins_order_id ON visitor_checkins(order_id);
-- Unique constraint: one check-in per order
CREATE UNIQUE INDEX IF NOT EXISTS idx_visitor_checkins_order_unique ON visitor_checkins(order_id);

-- =============================================
-- Table: admin_notifications
-- =============================================
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL DEFAULT 'new_order',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON admin_notifications(is_read) WHERE is_read = FALSE;
-- Index for order lookup
CREATE INDEX IF NOT EXISTS idx_admin_notifications_order_id ON admin_notifications(order_id);

-- =============================================
-- Table: admins
-- =============================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    reset_token TEXT,
    reset_token_expires TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookup (login)
CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
