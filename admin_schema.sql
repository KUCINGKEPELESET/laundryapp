-- Admin Dashboard Schema Updates

-- 1. Add Role Column to Profiles
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN 
        ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'customer'; 
    END IF; 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN 
        ALTER TABLE public.profiles ADD COLUMN email text; 
    END IF; 
END $$;

-- 2. Update RLS for Profiles (Allow Admin Access)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" 
ON public.profiles FOR UPDATE
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- 3. Update RLS for Wallet Transactions (Allow Admin Access)
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can view all transactions" 
ON public.wallet_transactions FOR SELECT 
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- Allow Admins to insert transactions (for manual adjustments)
DROP POLICY IF EXISTS "Admins can insert transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can insert transactions" 
ON public.wallet_transactions FOR INSERT 
WITH CHECK (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- 4. RPC to Adjust Balance (Admin Only)
-- This ensures the balance update and transaction log happen atomically
CREATE OR REPLACE FUNCTION admin_adjust_balance(
    target_user_id uuid, 
    amount_change numeric, 
    description text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access Denied: Admins only';
  END IF;

  -- Update Balance
  UPDATE public.profiles 
  SET balance = balance + amount_change, updated_at = now()
  WHERE id = target_user_id;

  -- Log Transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description)
  VALUES (
    target_user_id, 
    amount_change, 
    CASE WHEN amount_change >= 0 THEN 'admin_adjustment_add' ELSE 'admin_adjustment_deduct' END, 
    'success', 
    description
  );
END;
$$;

-- IMPORTANT: RUN THIS SEPARATELY TO PROMOTE YOURSELF
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID_HERE';
