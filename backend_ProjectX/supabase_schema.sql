-- ==============================================================================
-- DATABASE SCHEMA SCRIPT: NexaStore / QuickBite
-- ==============================================================================
-- INSTRUCTIONS: Copy and paste this entirely into your Supabase SQL Editor and run it.
-- ==============================================================================

-- Enable UUID extension just in case it's not active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- DANGER: This will wipe existing tables to guarantee a 100% clean slate without errors.
DROP TABLE IF EXISTS magic_links CASCADE;
DROP TABLE IF EXISTS otps CASCADE;
DROP TABLE IF EXISTS trusted_devices CASCADE;
DROP TABLE IF EXISTS security_events CASCADE;
DROP TABLE IF EXISTS device_behaviors CASCADE;
DROP TABLE IF EXISTS login_activities CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS seller_profiles CASCADE;
-- DROP TABLE IF EXISTS users CASCADE; -- Uncomment this line ONLY if you also want to delete all existing custom users.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CORE USERS & SELLERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Create Users table (System-wide identity)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'customer',     -- 'super_admin', 'admin', 'customer'
    status VARCHAR(50) DEFAULT 'active',    -- 'active', 'pending'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Seller Profiles (Only filled if role = 'admin')
CREATE TABLE IF NOT EXISTS seller_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    gstin VARCHAR(50),
    pan VARCHAR(50),
    fssai VARCHAR(50),
    bank_details TEXT,
    address_proof TEXT,
    upi_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PRODUCTS REGISTRY 
-- ─────────────────────────────────────────────────────────────────────────────

-- Core product logic linking to a specific seller
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    cuisine VARCHAR(100) DEFAULT 'Global',
    image TEXT,                               -- Image URL
    dietary VARCHAR(50) DEFAULT 'Veg',        -- 'Veg', 'Non-Veg', 'Egg'
    
    -- Pricing and Sales 
    price NUMERIC(10,2) NOT NULL,             -- Final Sale Price
    original_price NUMERIC(10,2),             -- The inputted base price
    mrp NUMERIC(10,2),                        -- Maximum Retail Price
    discount NUMERIC(5,2) DEFAULT 0,          -- Example: 20 for 20%
    
    -- Analytics & Inventory
    stock INTEGER DEFAULT 50,
    time VARCHAR(50) DEFAULT '20-30 min',
    tags TEXT[],                              -- Array of strings like ['Spicy', 'Chef Special']
    
    -- Status
    status VARCHAR(50) DEFAULT 'Active',      -- 'Active', 'Inactive', 'Out of Stock'
    
    -- Aggregated Customer Stats
    rating NUMERIC(3,1) DEFAULT 0,            -- User rating scale out of 5
    reviews INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SECURITY & AUTH LOGGING TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS login_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_brand VARCHAR(100),
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_behaviors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    usage_count INTEGER DEFAULT 1,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event VARCHAR(255),
    risk VARCHAR(50) DEFAULT 'low',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trusted_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    otp_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS magic_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optional: Create basic updated_at trigger for products table
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_products_updated_at ON products;
CREATE TRIGGER trigger_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ORDER MANAGEMENT SYSTEM
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    address TEXT NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cod',
    subtotal NUMERIC(10,2) DEFAULT 0,
    delivery_fee NUMERIC(10,2) DEFAULT 0,
    platform_fee NUMERIC(10,2) DEFAULT 0,
    discount NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Placed', -- 'Placed', 'Accepted', 'Processed', 'Dispatched', 'Delivered', 'Cancelled'
    status_timestamps JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
CREATE TRIGGER trigger_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

-- ==============================================================================
-- DONE! System is ready to persist products, synced orders, and track revenue!
-- ==============================================================================
