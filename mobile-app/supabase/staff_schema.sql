-- Staff & Role Schema Updates

-- 1. Ensure 'role' column exists in profiles
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN 
        ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'customer'; 
    END IF; 
    
    -- 2. Add 'username' column for lighter display than full email
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN 
        ALTER TABLE public.profiles ADD COLUMN username text; 
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
    END IF;

    -- 5. Add 'permissions' column for granular access (e.g. ['cashier', 'production'])
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'permissions') THEN 
        ALTER TABLE public.profiles ADD COLUMN permissions text[] DEFAULT '{}'; 
    END IF;
END $$;

-- 3. Update Policy: Staff can view their own profile
-- (Existing policy "Users can view own profile" usually covers this, but let's be sure)
-- No change needed if "auth.uid() = id" is already there.

-- 4. Admin Policy: Allow Admins to CREATE new users is tricky in pure SQL because it involves auth.users.
-- We will handle user creation via the Client SDK (Admin Dashboard) using a secondary client or server-side logic.
-- But the *Profile* creation is handled by the Trigger `on_auth_user_created` (already in update_schema.sql).
-- We need to ensure that trigger captures the 'role' and 'username' from metadata.

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, balance, email, role, username, permissions)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    0, 
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'customer'), -- Default to customer if not specified
    new.raw_user_meta_data->>'username',
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(new.raw_user_meta_data->'permissions', '[]'::jsonb)))
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    username = EXCLUDED.username,
    permissions = EXCLUDED.permissions;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
