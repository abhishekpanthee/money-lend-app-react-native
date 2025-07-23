-- Fix infinite recursion in RLS policies
-- This migration completely removes circular dependencies

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view rooms they are members of" ON rooms;
DROP POLICY IF EXISTS "Users can view their own rooms" ON rooms;
DROP POLICY IF EXISTS "Users can view room members for their rooms" ON room_members;
DROP POLICY IF EXISTS "Users can view room members" ON room_members;
DROP POLICY IF EXISTS "Users can view transactions in their rooms" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions in their rooms" ON transactions;

-- Create completely isolated policies with NO cross-table references

-- Rooms: Only allow viewing rooms created by the user (no room_members reference)
CREATE POLICY "Allow users to view their created rooms"
  ON rooms FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Room Members: Simple policy without recursion
CREATE POLICY "Allow users to view their own memberships"
  ON room_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Transactions: Direct ownership check only
CREATE POLICY "Allow users to view their own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    from_user_id = auth.uid() OR to_user_id = auth.uid()
  );

CREATE POLICY "Allow users to create transactions they are involved in"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = auth.uid() OR to_user_id = auth.uid()
  );