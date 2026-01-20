-- Backfill profiles for users who signed up before the trigger was created
INSERT INTO public.profiles (id, full_name, balance)
SELECT id, raw_user_meta_data->>'full_name', 0
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
