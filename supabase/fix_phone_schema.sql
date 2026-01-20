-- Add address column to profiles (phone was added in driver_schema.sql)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS address text;

-- Redefine handle_new_user to capture phone and address
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, balance, email, role, username, permissions, phone, address)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    0, 
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'customer'),
    new.raw_user_meta_data->>'username',
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(new.raw_user_meta_data->'permissions', '[]'::jsonb))),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'address'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    username = EXCLUDED.username,
    permissions = EXCLUDED.permissions,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
