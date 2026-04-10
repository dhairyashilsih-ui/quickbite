-- 1. Unified Users Table
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'customer',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Seller Profiles
CREATE TABLE seller_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  gstin VARCHAR(255),
  pan VARCHAR(255),
  fssai VARCHAR(255),
  bank_details TEXT,
  address_proof TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Trusted Devices
CREATE TABLE trusted_devices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. OTP Auth Limits
CREATE TABLE otps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Magic Links
CREATE TABLE magic_links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Login Activities (Replacing MongoDB)
CREATE TABLE login_activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_brand VARCHAR(255),
  location VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Device Behaviors (Replacing MongoDB)
CREATE TABLE device_behaviors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  usage_count INTEGER DEFAULT 1,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Security Events (Replacing MongoDB)
CREATE TABLE security_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event VARCHAR(255) NOT NULL,
  risk VARCHAR(50) DEFAULT 'low',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DISABLE ROW LEVEL SECURITY (RLS) FOR PURE BACKEND ACCESS
-- Since our Express Node.js Server acts as the gatekeeper, we don't need Supabase UI policies.
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE seller_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE otps DISABLE ROW LEVEL SECURITY;
ALTER TABLE magic_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE login_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE device_behaviors DISABLE ROW LEVEL SECURITY;
ALTER TABLE security_events DISABLE ROW LEVEL SECURITY;

-- MIGRATION: Add tracking fields if seller_profiles table already exists:
-- ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS gstin VARCHAR(255);
-- ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS pan VARCHAR(255);
-- ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS fssai VARCHAR(255);
-- ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS bank_details TEXT;
-- ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS address_proof TEXT;
