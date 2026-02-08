-- Migration: Add year field to track Ramadan campaigns
-- Created: 2026-02-08

-- Add year column to donations table
ALTER TABLE donations ADD COLUMN year INTEGER NOT NULL DEFAULT 2026;

-- Add year column to expenses table
ALTER TABLE expenses ADD COLUMN year INTEGER NOT NULL DEFAULT 2026;

-- Create indexes for year-based queries
CREATE INDEX IF NOT EXISTS idx_donations_year ON donations(year);
CREATE INDEX IF NOT EXISTS idx_donations_user_year ON donations(user_id, year);
CREATE INDEX IF NOT EXISTS idx_expenses_year ON expenses(year);
CREATE INDEX IF NOT EXISTS idx_expenses_user_year ON expenses(user_id, year);

-- Update existing records to extract year from date (if any exist)
UPDATE donations SET year = CAST(substr(date, 1, 4) AS INTEGER) WHERE year = 2026;
UPDATE expenses SET year = CAST(substr(date, 1, 4) AS INTEGER) WHERE year = 2026;
