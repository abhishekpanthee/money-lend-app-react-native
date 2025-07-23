-- Populate profiles table with existing users
INSERT INTO public.profiles (id, email, name, full_name, created_at, updated_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', email) as name,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email) as full_name,
  created_at,
  updated_at
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE profiles.id = users.id
);