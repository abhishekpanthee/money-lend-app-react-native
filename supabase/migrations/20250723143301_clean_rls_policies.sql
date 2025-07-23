-- Clean up ALL existing RLS policies and create proper ones
-- This will ensure users only see rooms they created or joined

-- First, get a list of all existing policies and drop them
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on all tables
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('rooms', 'room_members', 'transactions', 'profiles')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Ensure RLS is enabled on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES (simple and safe)
CREATE POLICY "profiles_select" ON profiles
    FOR SELECT 
    USING (true); -- Anyone can read profiles (needed for joins and user info)

CREATE POLICY "profiles_insert" ON profiles
    FOR INSERT 
    WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON profiles
    FOR UPDATE 
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ROOMS POLICIES 
-- Users can see rooms they created OR rooms they are members of
CREATE POLICY "rooms_select" ON rooms
    FOR SELECT 
    USING (
        created_by = auth.uid() 
        OR 
        id IN (
            SELECT room_id FROM room_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "rooms_insert" ON rooms
    FOR INSERT 
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "rooms_update" ON rooms
    FOR UPDATE 
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "rooms_delete" ON rooms
    FOR DELETE 
    USING (created_by = auth.uid());

-- ROOM_MEMBERS POLICIES
-- Users can see members of rooms they have access to
CREATE POLICY "room_members_select" ON room_members
    FOR SELECT 
    USING (
        -- User is viewing their own membership
        user_id = auth.uid()
        OR
        -- User is the room creator
        room_id IN (
            SELECT id FROM rooms WHERE created_by = auth.uid()
        )
        OR  
        -- User is a member of the room
        room_id IN (
            SELECT room_id FROM room_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "room_members_insert" ON room_members
    FOR INSERT 
    WITH CHECK (user_id = auth.uid()); -- Users can only add themselves

CREATE POLICY "room_members_delete" ON room_members
    FOR DELETE 
    USING (
        -- Users can remove themselves
        user_id = auth.uid() 
        OR 
        -- Room creators can remove anyone
        room_id IN (
            SELECT id FROM rooms WHERE created_by = auth.uid()
        )
    );

-- TRANSACTIONS POLICIES
-- Users can see transactions in rooms they have access to
CREATE POLICY "transactions_select" ON transactions
    FOR SELECT 
    USING (
        -- User is involved in the transaction
        from_user_id = auth.uid()
        OR 
        to_user_id = auth.uid()
        OR
        -- User is the room creator
        room_id IN (
            SELECT id FROM rooms WHERE created_by = auth.uid()
        )
        OR
        -- User is a member of the room
        room_id IN (
            SELECT room_id FROM room_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "transactions_insert" ON transactions
    FOR INSERT 
    WITH CHECK (
        -- User is creating their own transaction
        from_user_id = auth.uid()
        AND
        -- In a room they have access to
        room_id IN (
            SELECT room_id FROM room_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "transactions_update" ON transactions
    FOR UPDATE 
    USING (
        -- User created the transaction or is the room owner
        from_user_id = auth.uid()
        OR
        room_id IN (
            SELECT id FROM rooms WHERE created_by = auth.uid()
        )
    )
    WITH CHECK (
        -- Same conditions for update
        from_user_id = auth.uid()
        OR
        room_id IN (
            SELECT id FROM rooms WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "transactions_delete" ON transactions
    FOR DELETE 
    USING (
        -- User created the transaction or is the room owner
        from_user_id = auth.uid()
        OR
        room_id IN (
            SELECT id FROM rooms WHERE created_by = auth.uid()
        )
    );
