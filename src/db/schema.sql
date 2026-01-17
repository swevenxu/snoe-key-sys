-- Key System Database Schema
-- Run this to set up your PostgreSQL database

-- Enable UUID extension (optional, we use nanoid for keys)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Main keys table
CREATE TABLE IF NOT EXISTS keys (
    id SERIAL PRIMARY KEY,
    
    -- The actual license key (e.g., "KEY-XXXX-XXXX-XXXX")
    key VARCHAR(64) UNIQUE NOT NULL,
    
    -- Key metadata
    note VARCHAR(255),                    -- Admin note (e.g., "For user John")
    
    -- Status
    is_active BOOLEAN DEFAULT true,       -- Can be disabled/revoked
    
    -- Time-based expiry
    duration_days INTEGER,                -- How many days the key lasts (NULL = lifetime)
    expires_at TIMESTAMP WITH TIME ZONE,  -- Set on first activation
    
    -- HWID binding
    max_hwid_resets INTEGER DEFAULT 0,    -- How many times HWID can be reset (0 = no resets)
    hwid_resets_used INTEGER DEFAULT 0,   -- How many resets have been used
    hwid VARCHAR(255),                    -- Bound hardware ID (NULL = not yet bound)
    
    -- Usage limits
    max_uses INTEGER,                     -- Max number of validations (NULL = unlimited)
    current_uses INTEGER DEFAULT 0,       -- Current validation count
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP WITH TIME ZONE, -- When key was first used
    last_used_at TIMESTAMP WITH TIME ZONE, -- Last validation time
    last_ip VARCHAR(45),                  -- Last IP that used this key
    
    -- Indexes for fast lookups
    CONSTRAINT valid_uses CHECK (max_uses IS NULL OR current_uses <= max_uses)
);

-- Index for fast key lookups
CREATE INDEX IF NOT EXISTS idx_keys_key ON keys(key);
CREATE INDEX IF NOT EXISTS idx_keys_hwid ON keys(hwid);
CREATE INDEX IF NOT EXISTS idx_keys_active ON keys(is_active);

-- Validation logs (optional - for tracking/analytics)
CREATE TABLE IF NOT EXISTS validation_logs (
    id SERIAL PRIMARY KEY,
    key_id INTEGER REFERENCES keys(id) ON DELETE CASCADE,
    hwid VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for log queries
CREATE INDEX IF NOT EXISTS idx_logs_key_id ON validation_logs(key_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON validation_logs(created_at);

-- Admin users table (for dashboard authentication - optional)
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Key claim tracking table (for rate limiting and cooldowns)
CREATE TABLE IF NOT EXISTS key_claims (
    id SERIAL PRIMARY KEY,
    
    -- Identification
    ip_address VARCHAR(45) NOT NULL,           -- User's IP address
    fingerprint VARCHAR(255),                   -- Browser/device fingerprint
    hwid VARCHAR(255),                          -- Hardware ID from Lua script
    visitor_id VARCHAR(255),                    -- Generated visitor ID
    
    -- Claim details
    key_id INTEGER REFERENCES keys(id) ON DELETE SET NULL,
    key_value VARCHAR(64),                      -- Store key value in case key is deleted
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- For detecting suspicious patterns
    user_agent TEXT,
    session_token VARCHAR(255)                  -- Checkpoint session token
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_claims_ip ON key_claims(ip_address);
CREATE INDEX IF NOT EXISTS idx_claims_fingerprint ON key_claims(fingerprint);
CREATE INDEX IF NOT EXISTS idx_claims_hwid ON key_claims(hwid);
CREATE INDEX IF NOT EXISTS idx_claims_created_at ON key_claims(created_at);
CREATE INDEX IF NOT EXISTS idx_claims_ip_created ON key_claims(ip_address, created_at);
