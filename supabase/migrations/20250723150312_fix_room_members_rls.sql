-- Fix room_members RLS policy to allow users to add themselves to rooms

-- Drop the restrictive debug policy
DROP POLICY IF EXISTS "room_members_insert_debug" ON room_members;

-- Create a more permissive policy that allows users to add themselves to any room
CREATE POLICY "room_members_insert_fixed" ON room_members 
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND user_id = auth.uid()
    ); -- Users can only add themselves, but to any room

-- Also ensure the update/delete policies are correct
DROP POLICY IF EXISTS "room_members_update" ON room_members;
DROP POLICY IF EXISTS "room_members_delete" ON room_members;

CREATE POLICY "room_members_delete_fixed" ON room_members 
    FOR DELETE 
    USING (user_id = auth.uid()); -- Users can remove themselves
