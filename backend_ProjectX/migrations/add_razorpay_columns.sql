-- Migration: Add Razorpay payment tracking columns to orders table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New query)

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS razorpay_order_id   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT DEFAULT NULL;

-- Optional: add an index for quick payment ID lookups
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id ON orders(razorpay_payment_id);
