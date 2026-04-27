-- Run this in Neon SQL editor to add business + admin support

-- Create business_users table
CREATE TABLE business_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  business_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create admin_users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ALTER courts table to add business ownership and review fields
ALTER TABLE courts
ADD COLUMN owner_id UUID REFERENCES business_users(id) ON DELETE CASCADE,
ADD COLUMN status TEXT NOT NULL DEFAULT 'approved',
ADD COLUMN submitted_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN reviewed_at TIMESTAMPTZ,
ADD COLUMN review_note TEXT;
