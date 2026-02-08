-- Migration: Add available years to users
-- Created: 2026-02-08
-- Description: Adds available_years JSON field to users table for storing user's custom Ramadan years

-- Add available_years column to users table
-- SQLite doesn't support JSON type, but we can store JSON as TEXT
ALTER TABLE users ADD COLUMN available_years TEXT DEFAULT NULL;

-- Update existing users with default years (current year ± 2)
-- This will be NULL initially, and the API will handle defaults
