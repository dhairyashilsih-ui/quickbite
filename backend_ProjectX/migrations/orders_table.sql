-- ==============================================================================
-- MIGRATION: Add Orders Table for QuickBite
-- Run this in Supabase SQL Editor
-- ==============================================================================

-- Drop existing if re-running
DROP TABLE IF EXISTS orders CASCADE;

-- Create Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(20) UNIQUE NOT NULL,          -- e.g. QB12345678
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Order contents
    items TEXT NOT NULL,                           -- JSON: [{id, name, image, price, qty}]
    address TEXT NOT NULL,                         -- Full delivery address string

    -- Payment
    payment_method VARCHAR(50) DEFAULT 'upi',      -- 'upi', 'card', 'cod'

    -- Pricing
    subtotal NUMERIC(10,2) DEFAULT 0,
    delivery_fee NUMERIC(10,2) DEFAULT 0,
    platform_fee NUMERIC(10,2) DEFAULT 0,
    discount NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) NOT NULL,

    -- Status flow: Placed → Accepted → Processed → Dispatched → Delivered
    status VARCHAR(50) DEFAULT 'Placed',

    -- JSON: { "Placed": "2026-04-10T...", "Accepted": "..." }
    status_timestamps TEXT DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-update updated_at on modification
DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
CREATE TRIGGER trigger_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

-- ==============================================================================
-- DONE! Orders table is ready.
-- ==============================================================================
