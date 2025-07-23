-- Fix infinite recursion in RLS policies
-- Drop all existing policies that might cause recursion

-- Drop all policies on room_members
DROP POLICY IF EXISTS "Users can view room members of rooms they belong to" ON room_members;
DROP POLICY IF EXISTS "Users can join rooms" ON room_members;
DROP POLICY IF EXISTS "Users can leave rooms they belong to" ON room_members;
DROP POLICY IF EXISTS "room_members_select_policy" ON room_members;
DROP POLICY IF EXISTS "room_members_insert_policy" ON room_members;
DROP POLICY IF EXISTS "room_members_update_policy" ON room_members;
DROP POLICY IF EXISTS "room_members_delete_policy" ON room_members;

-- Drop all policies on rooms
DROP POLICY IF EXISTS "Room creators can delete their rooms" ON rooms;
DROP POLICY IF EXISTS "Room creators can update their rooms" ON rooms;
DROP POLICY IF EXISTS "rooms_delete_policy" ON rooms;

-- Drop all policies on transactions
DROP POLICY IF EXISTS "Users can view transactions in their rooms" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions in their rooms" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;

-- Drop all policies on profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Disable RLS temporarily to clean up
ALTER TABLE room_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies

-- PROFILES: Allow users to see all profiles (needed for displaying names)
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ROOMS: Users can see rooms they created or are members of
CREATE POLICY "rooms_select_policy" ON rooms
  FOR SELECT
  USING (
    created_by = auth.uid() 
    OR 
    id IN (
      SELECT room_id FROM room_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "rooms_insert_policy" ON rooms
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "rooms_update_policy" ON rooms
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "rooms_delete_policy" ON rooms
  FOR DELETE
  USING (created_by = auth.uid());

-- ROOM_MEMBERS: Simple policies without recursion
CREATE POLICY "room_members_select_policy" ON room_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    room_id IN (
      SELECT id FROM rooms WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "room_members_insert_policy" ON room_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "room_members_delete_policy" ON room_members
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    room_id IN (
      SELECT id FROM rooms WHERE created_by = auth.uid()
    )
  );

-- TRANSACTIONS: Users can see transactions in rooms they belong to
CREATE POLICY "transactions_select_policy" ON transactions
  FOR SELECT
  USING (
    room_id IN (
      SELECT room_id FROM room_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "transactions_insert_policy" ON transactions
  FOR INSERT
  WITH CHECK (
    (from_user_id = auth.uid() OR to_user_id = auth.uid())
    AND
    room_id IN (
      SELECT room_id FROM room_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "transactions_update_policy" ON transactions
  FOR UPDATE
  USING (
    (from_user_id = auth.uid() OR to_user_id = auth.uid())
    AND
    room_id IN (
      SELECT room_id FROM room_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    (from_user_id = auth.uid() OR to_user_id = auth.uid())
    AND
    room_id IN (
      SELECT room_id FROM room_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "transactions_delete_policy" ON transactions
  FOR DELETE
  USING (
    room_id IN (
      SELECT id FROM rooms WHERE created_by = auth.uid()
    )
  );
