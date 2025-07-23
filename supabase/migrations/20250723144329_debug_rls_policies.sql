-- Debug RLS policies - temporarily make them more permissive to test

-- Drop the restrictive policies
DROP POLICY IF EXISTS "rooms_insert" ON rooms;
DROP POLICY IF EXISTS "room_members_insert" ON room_members;

-- Create more permissive policies for debugging
CREATE POLICY "rooms_insert_debug" ON rooms 
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL); -- Just check user is authenticated

CREATE POLICY "room_members_insert_debug" ON room_members 
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL); -- Just check user is authenticated

-- Add some debugging info
-- This will help us see what auth.uid() is returning
CREATE OR REPLACE FUNCTION debug_auth_uid() 
RETURNS uuid 
LANGUAGE sql 
SECURITY DEFINER 
AS $$
  SELECT auth.uid();
$$;
