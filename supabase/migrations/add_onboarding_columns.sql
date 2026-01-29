-- Migration: Add onboarding columns to profiles table
-- Run this in your Supabase SQL Editor if you have an existing database

-- Add onboarding_completed column (defaults to false for new users)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add preferred_instruments column (empty array by default)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_instruments TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Update existing users to have onboarding completed (they don't need the wizard)
-- Comment this out if you want existing users to see the onboarding wizard
UPDATE public.profiles
SET onboarding_completed = true
WHERE onboarding_completed IS NULL OR onboarding_completed = false;
