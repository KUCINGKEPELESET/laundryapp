-- Update RLS for profiles to allow staff/admins (and other users) to view profiles (needed for merchant dashboard to see customer names/phones)

-- Drop the restrictive "own profile only" policy if it interferes, or just add a broader one.
-- Supabase policies are OR-ed together. So adding a broader one works.

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a policy that allows any authenticated user to read profiles
-- This is necessary so:
-- 1. Merchant (Staff) can see Customer Name/Phone on orders.
-- 2. Driver (Staff) can see Customer Phone for WhatsApp.
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING ( auth.role() = 'authenticated' );

-- Keep update restricted to self
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE
USING ( auth.uid() = id );
