-- Backfill Email Addresses for existing profiles
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE public.profiles.id = auth.users.id
AND public.profiles.email IS NULL;
