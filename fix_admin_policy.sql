-- Fix Infinite Recursion in RLS

-- 1. Create a Helper Function (Security Definer bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER 
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 2. Update Profiles Policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" 
ON public.profiles FOR UPDATE
USING (is_admin());

-- 3. Update Wallet Transactions Policies
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can view all transactions" 
ON public.wallet_transactions FOR SELECT 
USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can insert transactions" 
ON public.wallet_transactions FOR INSERT 
WITH CHECK (is_admin());
