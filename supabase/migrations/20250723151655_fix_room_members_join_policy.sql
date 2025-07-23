-- Fix RLS policy for room_members to allow joining rooms
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "room_members_select_policy" ON room_members;
DROP POLICY IF EXISTS "room_members_insert_policy" ON room_members;
DROP POLICY IF EXISTS "room_members_update_policy" ON room_members;
DROP POLICY IF EXISTS "room_members_delete_policy" ON room_members;

-- Create new RLS policies for room_members
CREATE POLICY "room_members_select_policy" ON room_members
FOR SELECT USING (true);

CREATE POLICY "room_members_insert_policy" ON room_members
FOR INSERT WITH CHECK (
  -- Allow users to join rooms by adding themselves
  auth.uid() = user_id
  OR
  -- Allow room creators to add members
  EXISTS (
    SELECT 1 FROM rooms 
    WHERE rooms.id = room_members.room_id 
    AND rooms.created_by = auth.uid()
  )
);

CREATE POLICY "room_members_update_policy" ON room_members
FOR UPDATE USING (
  -- Allow users to update their own membership
  auth.uid() = user_id
  OR
  -- Allow room creators to update memberships
  EXISTS (
    SELECT 1 FROM rooms 
    WHERE rooms.id = room_members.room_id 
    AND rooms.created_by = auth.uid()
  )
);

CREATE POLICY "room_members_delete_policy" ON room_members
FOR DELETE USING (
  -- Allow users to leave rooms (delete their own membership)
  auth.uid() = user_id
  OR
  -- Allow room creators to remove members
  EXISTS (
    SELECT 1 FROM rooms 
    WHERE rooms.id = room_members.room_id 
    AND rooms.created_by = auth.uid()
  )
);

-- Add delete room function (for room creators only)
-- First, let's make sure we can delete rooms by updating the rooms RLS policy
DROP POLICY IF EXISTS "rooms_delete_policy" ON rooms;

CREATE POLICY "rooms_delete_policy" ON rooms
FOR DELETE USING (
  -- Only room creators can delete their rooms
  auth.uid() = created_by
);

-- Create a function to safely delete a room and all its related data
CREATE OR REPLACE FUNCTION delete_room_safely(room_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  room_creator UUID;
BEGIN
  -- Check if the current user is the room creator
  SELECT created_by INTO room_creator
  FROM rooms
  WHERE id = room_id_param;
  
  IF room_creator IS NULL THEN
    RAISE EXCEPTION 'Room not found';
  END IF;
  
  IF room_creator != auth.uid() THEN
    RAISE EXCEPTION 'Only room creators can delete rooms';
  END IF;
  
  -- Delete related data in correct order (due to foreign key constraints)
  DELETE FROM transactions WHERE room_id = room_id_param;
  DELETE FROM room_members WHERE room_id = room_id_param;
  DELETE FROM rooms WHERE id = room_id_param;
  
  RETURN TRUE;
END;
$$;
