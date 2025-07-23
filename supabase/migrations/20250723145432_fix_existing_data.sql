-- Fix existing data: add invite codes to rooms and ensure profiles exist

-- Add invite codes to existing rooms that don't have them
UPDATE rooms 
SET invite_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6))
WHERE invite_code IS NULL OR invite_code = '';

-- Ensure all authenticated users have profiles
INSERT INTO profiles (id, email, name, full_name, created_at, updated_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', email) as name,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email) as full_name,
  created_at,
  updated_at
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = users.id
)
ON CONFLICT (id) DO NOTHING;

-- Ensure room creators are members of their own rooms
INSERT INTO room_members (room_id, user_id)
SELECT r.id, r.created_by
FROM rooms r
WHERE NOT EXISTS (
  SELECT 1 FROM room_members rm 
  WHERE rm.room_id = r.id AND rm.user_id = r.created_by
);
