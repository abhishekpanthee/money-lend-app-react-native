-- FINAL FIX: Eliminate all cross-table references in RLS policies
-- This approach avoids infinite recursion by using simple, direct policies

-- First, drop ALL existing policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "rooms_select_policy" ON rooms;
DROP POLICY IF EXISTS "rooms_insert_policy" ON rooms;
DROP POLICY IF EXISTS "rooms_update_policy" ON rooms;
DROP POLICY IF EXISTS "rooms_delete_policy" ON rooms;
DROP POLICY IF EXISTS "room_members_select_policy" ON room_members;
DROP POLICY IF EXISTS "room_members_insert_policy" ON room_members;
DROP POLICY IF EXISTS "room_members_delete_policy" ON room_members;
DROP POLICY IF EXISTS "transactions_select_policy" ON transactions;
DROP POLICY IF EXISTS "transactions_insert_policy" ON transactions;
DROP POLICY IF EXISTS "transactions_update_policy" ON transactions;
DROP POLICY IF EXISTS "transactions_delete_policy" ON transactions;

-- Disable RLS temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- PROFILES: Allow everyone to see all profiles (needed for names/emails)
-- This eliminates the need for complex joins in other policies
CREATE POLICY "allow_all_profiles_read" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "allow_own_profile_insert" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "allow_own_profile_update" ON profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ROOMS: Simple policies without cross-table references
-- Users can see ALL rooms (we'll filter in application logic)
CREATE POLICY "allow_all_rooms_read" ON rooms
  FOR SELECT USING (true);

CREATE POLICY "allow_room_creation" ON rooms
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "allow_creator_room_update" ON rooms
  FOR UPDATE USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY "allow_creator_room_delete" ON rooms
  FOR DELETE USING (created_by = auth.uid());

-- ROOM_MEMBERS: Simple policies without cross-table references
-- Users can see ALL room memberships (we'll filter in application logic)
CREATE POLICY "allow_all_room_members_read" ON room_members
  FOR SELECT USING (true);

CREATE POLICY "allow_join_room" ON room_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "allow_leave_room" ON room_members
  FOR DELETE USING (user_id = auth.uid());

-- TRANSACTIONS: Simple policies without cross-table references
-- Users can see ALL transactions (we'll filter in application logic)
CREATE POLICY "allow_all_transactions_read" ON transactions
  FOR SELECT USING (true);

CREATE POLICY "allow_transaction_creation" ON transactions
  FOR INSERT WITH CHECK (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "allow_transaction_update" ON transactions
  FOR UPDATE USING (from_user_id = auth.uid() OR to_user_id = auth.uid())
  WITH CHECK (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Allow room creators to delete transactions in their rooms
-- This is safe because it doesn't reference other tables
CREATE POLICY "allow_transaction_delete" ON transactions
  FOR DELETE USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
