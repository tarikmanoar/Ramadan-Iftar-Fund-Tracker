-- Migration: Add quantity and unit to expenses
-- Created: 2026-02-19
-- Description: Adds optional quantity and unit fields to expenses table
--              for tracking physical product attributes (e.g., 5kg Dates, 2L Oil)

ALTER TABLE expenses ADD COLUMN quantity REAL DEFAULT NULL;
ALTER TABLE expenses ADD COLUMN unit TEXT DEFAULT NULL;
