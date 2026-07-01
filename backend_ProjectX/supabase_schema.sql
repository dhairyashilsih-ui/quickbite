-- ==============================================================================
--  QUICKBITE — COMPLETE DATABASE SCHEMA (SUPABASE EDITION)
--  Version: 3.0  |  Updated: April 2026
--
--  HOW TO USE:
--  1. Go to your Supabase project → SQL Editor → New Query
--  2. Paste this ENTIRE script and click RUN
--  3. This is SAFE to re-run — it uses IF NOT EXISTS everywhere
--     and only DROPS tables that need a schema change.
-- ==============================================================================

-- ── Enable required Postgres extensions ───────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ==============================================================================
--  ⚠️  CLEAN SLATE (only run if starting fresh OR rebuilding)
--  Uncomment the block below ONLY if you want to wipe ALL data and rebuild.
-- ==============================================================================
/*
DROP TABLE IF EXISTS magic_links        CASCADE;
DROP TABLE IF EXISTS otps               CASCADE;
DROP TABLE IF EXISTS trusted_devices    CASCADE;
DROP TABLE IF EXISTS security_events    CASCADE;
DROP TABLE IF EXISTS device_behaviors   CASCADE;
DROP TABLE IF EXISTS login_activities   CASCADE;
DROP TABLE IF EXISTS orders             CASCADE;
DROP TABLE IF EXISTS products           CASCADE;
DROP TABLE IF EXISTS seller_profiles    CASCADE;
DROP TABLE IF EXISTS users              CASCADE;
*/


-- ==============================================================================
--  1. SHARED TRIGGER FUNCTION  (auto-update updated_at on every table)
-- ==============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';


-- ==============================================================================
--  2. USERS  (core identity — customers, sellers, super admin)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(255)  NOT NULL,
  email      VARCHAR(255)  UNIQUE NOT NULL,
  password   VARCHAR(255)  NOT NULL,        -- bcrypt hashed
  role       VARCHAR(50)   DEFAULT 'customer', -- 'customer' | 'admin' | 'super_admin'
  status     VARCHAR(50)   DEFAULT 'active',   -- 'active' | 'pending' (seller awaiting approval)
  created_at TIMESTAMPTZ   DEFAULT NOW()
);


-- ==============================================================================
--  3. SELLER PROFILES  (extra business data for role = 'admin')
-- ==============================================================================
CREATE TABLE IF NOT EXISTS seller_profiles (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  business_name  VARCHAR(255) NOT NULL,
  gstin          VARCHAR(50),
  pan            VARCHAR(50),
  fssai          VARCHAR(50),
  bank_details   TEXT,
  address_proof  TEXT,
  upi_id         VARCHAR(100),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
--  4. PRODUCTS  (catalogue owned by sellers)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS products (
  id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id      UUID          REFERENCES users(id) ON DELETE CASCADE,

  -- Basic Information
  name           VARCHAR(255)  NOT NULL,
  description    TEXT,
  category       VARCHAR(100),
  cuisine        VARCHAR(100)  DEFAULT 'Global',
  image          TEXT,                           -- Full image URL
  dietary        VARCHAR(50)   DEFAULT 'Veg',    -- 'Veg' | 'Non-Veg' | 'Egg'

  -- Pricing
  price          NUMERIC(10,2) NOT NULL,         -- Final sale price (after discount)
  original_price NUMERIC(10,2),                  -- Base / MRP price
  mrp            NUMERIC(10,2),
  discount       NUMERIC(5,2)  DEFAULT 0,        -- Percentage, e.g. 20 = 20%

  -- Inventory & Delivery
  stock          INTEGER       DEFAULT 50,
  time           VARCHAR(50)   DEFAULT '20-30 min',
  tags           TEXT[],                          -- e.g. ARRAY['Spicy', 'Chef Special']

  -- Status & Ratings
  status         VARCHAR(50)   DEFAULT 'Active', -- 'Active' | 'Inactive' | 'Out of Stock'
  rating         NUMERIC(3,1)  DEFAULT 0,
  reviews        INTEGER       DEFAULT 0,

  created_at     TIMESTAMPTZ   DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   DEFAULT NOW()
);

-- Auto-update products.updated_at
DROP TRIGGER IF EXISTS trigger_products_updated_at ON products;
CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();


-- ==============================================================================
--  5. ORDERS  (fully integrated with Razorpay live payments)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id             VARCHAR(50)   UNIQUE NOT NULL,  -- e.g. QB12345678 (human-readable)
  user_id              UUID          REFERENCES users(id) ON DELETE CASCADE,

  -- Cart snapshot (JSON array of {id, name, image, price, qty})
  items                TEXT          NOT NULL DEFAULT '[]',

  -- Delivery address (single formatted string)
  address              TEXT          NOT NULL,

  -- Payment
  payment_method       VARCHAR(50)   DEFAULT 'cod',   -- 'razorpay' | 'cod'

  -- ── Razorpay columns (NULL for COD orders) ──
  razorpay_order_id    TEXT          DEFAULT NULL,     -- e.g. order_xxxxxxxxxxxx
  razorpay_payment_id  TEXT          DEFAULT NULL,     -- e.g. pay_xxxxxxxxxxxx

  -- Pricing breakdown
  subtotal             NUMERIC(10,2) DEFAULT 0,
  delivery_fee         NUMERIC(10,2) DEFAULT 0,
  platform_fee         NUMERIC(10,2) DEFAULT 0,
  discount             NUMERIC(10,2) DEFAULT 0,
  total                NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Order lifecycle status
  -- Flow: Placed → Accepted → Processed → Dispatched → Delivered
  -- Or:   Placed → Cancelled
  status               VARCHAR(50)   DEFAULT 'Placed',

  -- JSON object tracking timestamp of each status change
  -- Example: {"Placed":"2026-04-11T09:00:00Z","Accepted":"2026-04-11T09:05:00Z"}
  status_timestamps    TEXT          DEFAULT '{}',

  created_at           TIMESTAMPTZ   DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   DEFAULT NOW()
);

-- Auto-update orders.updated_at
DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ── Add Razorpay columns to existing tables (safe if already present) ─────────
-- MUST run BEFORE the indexes below that reference these columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id   TEXT DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT DEFAULT NULL;

-- Index for fast Razorpay payment ID lookups
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id ON orders(razorpay_payment_id);

-- Index for customer order history queries
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Index for seller order management (filter by created_at)
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);


-- ==============================================================================
--  6. SECURITY & AUTH LOGGING TABLES
-- ==============================================================================

-- Login activity log (device + location per login)
CREATE TABLE IF NOT EXISTS login_activities (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  device_brand  VARCHAR(100),
  location      VARCHAR(255),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Device usage frequency tracker
CREATE TABLE IF NOT EXISTS device_behaviors (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id    VARCHAR(255) NOT NULL,
  usage_count  INTEGER DEFAULT 1,
  last_used    TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Security event log (new device, otp, etc.)
CREATE TABLE IF NOT EXISTS security_events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  event      VARCHAR(255),                  -- e.g. 'new_device_login', 'device_trusted'
  risk       VARCHAR(50) DEFAULT 'low',     -- 'low' | 'medium' | 'high'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trusted device whitelist (skip OTP if device is trusted)
CREATE TABLE IF NOT EXISTS trusted_devices (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id  VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- One-time passwords (expire after 5 min)
CREATE TABLE IF NOT EXISTS otps (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  otp_hash   VARCHAR(255) NOT NULL,         -- bcrypt hashed OTP
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Magic login links (expire after 15 min)
CREATE TABLE IF NOT EXISTS magic_links (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(255) UNIQUE NOT NULL,  -- random 64-byte hex token
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
--  7. ROW LEVEL SECURITY (RLS)
--  Disabled here — your backend uses the Service Role key which bypasses RLS.
--  Enable only if you switch to Supabase client-side auth.
-- ==============================================================================
ALTER TABLE users             DISABLE ROW LEVEL SECURITY;
ALTER TABLE seller_profiles   DISABLE ROW LEVEL SECURITY;
ALTER TABLE products          DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders            DISABLE ROW LEVEL SECURITY;
ALTER TABLE login_activities  DISABLE ROW LEVEL SECURITY;
ALTER TABLE device_behaviors  DISABLE ROW LEVEL SECURITY;
ALTER TABLE security_events   DISABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices   DISABLE ROW LEVEL SECURITY;
ALTER TABLE otps               DISABLE ROW LEVEL SECURITY;
ALTER TABLE magic_links       DISABLE ROW LEVEL SECURITY;


-- ==============================================================================
--  ✅ DONE!
--  All tables, triggers, indexes and migrations are applied.
--  QuickBite database is fully ready for:
--    - Multi-seller product management
--    - Razorpay Live payment processing
--    - OTP & device trust authentication
--    - Real-time order tracking
-- ==============================================================================
