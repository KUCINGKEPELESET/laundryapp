-- Add missing columns for Merchant Dashboard and Driver features
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS driver jsonb,
ADD COLUMN IF NOT EXISTS evidence boolean DEFAULT false;

-- Add missing columns for Production features
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS production_items jsonb,
ADD COLUMN IF NOT EXISTS production_logs jsonb,
ADD COLUMN IF NOT EXISTS production_notes text,
ADD COLUMN IF NOT EXISTS production_count integer;

-- Wallet & Profiles Schema

-- Create Profiles table if not exists (holds balance)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name text,
  balance numeric DEFAULT 0,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Allow users to update their own profile (Caution: ideally restricted, but needed for simple updates if not using RPC)
-- Better: Only allow updates via RPC (Security Definer)
-- But for now keeping it simple or relying on RPC.

-- Create Transactions Table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  amount numeric NOT NULL, -- Positive for TopUp, Negative for Payment
  type text NOT NULL, -- 'topup', 'payment', 'refund'
  status text DEFAULT 'pending', -- 'pending', 'success', 'failed'
  description text,
  external_id text, -- Xendit Invoice ID
  payment_url text, -- Xendit Invoice URL
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own transactions" 
ON public.wallet_transactions FOR SELECT 
USING (auth.uid() = user_id);

-- Trigger to create profile on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, balance, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 0, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid conflicts during multiple runs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RPC Function to Deduct Balance Safely
CREATE OR REPLACE FUNCTION deduct_balance(amount numeric, description text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_bal numeric;
BEGIN
  -- Get current balance
  SELECT balance INTO current_bal FROM public.profiles WHERE id = auth.uid();
  
  -- Check if enough funds
  IF current_bal IS NULL OR current_bal < amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Deduct balance
  UPDATE public.profiles SET balance = balance - amount WHERE id = auth.uid();
  
  -- Record Transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description)
  VALUES (auth.uid(), -amount, 'payment', 'success', description);
END;
$$;
