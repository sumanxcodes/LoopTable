-- PostgreSQL schema for LoopTable

-- Enable pgcrypto for UUID generation & encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users (Linked to Airtable User ID)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  subscription_status VARCHAR(50) DEFAULT 'free',
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Credentials (encrypted refresh tokens)
CREATE TABLE IF NOT EXISTS credentials (
  user_id UUID REFERENCES users(id),
  encrypted_refresh_token TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  last_refreshed TIMESTAMP,
  PRIMARY KEY (user_id)
);

-- Schedules
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  base_id VARCHAR(255) NOT NULL,
  table_id VARCHAR(255) NOT NULL,
  template_record_id VARCHAR(255) NOT NULL,
  cron_expression VARCHAR(50) NOT NULL,
  timezone VARCHAR(100) NOT NULL,
  field_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  run_count INT DEFAULT 0,
  last_run_status VARCHAR(50),
  last_run_log TEXT
);
