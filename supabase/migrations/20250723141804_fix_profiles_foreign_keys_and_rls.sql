-- Fix foreign key constraints for profiles table and RLS policies
-- This migration adds proper foreign key constraints between transactions and profiles

-- First, clear all data as requested
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE room_members CASCADE;
TRUNCATE TABLE rooms CASCADE;
TRUNCATE TABLE profiles CASCADE;

-- Add foreign key constraints from transactions to profiles
DO $$ 
BEGIN
    -- Check and add foreign key for transactions.from_user_id -> profiles.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transactions_from_user_id_profiles_fkey' 
        AND table_name = 'transactions'
    ) THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_from_user_id_profiles_fkey 
        FOREIGN KEY (from_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    -- Check and add foreign key for transactions.to_user_id -> profiles.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transactions_to_user_id_profiles_fkey' 
        AND table_name = 'transactions'
    ) THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_to_user_id_profiles_fkey 
        FOREIGN KEY (to_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    -- Check and add foreign key for room_members.user_id -> profiles.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'room_members_user_id_profiles_fkey' 
        AND table_name = 'room_members'
    ) THEN
        ALTER TABLE room_members ADD CONSTRAINT room_members_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    -- Check and add foreign key for rooms.created_by -> profiles.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'rooms_created_by_profiles_fkey' 
        AND table_name = 'rooms'
    ) THEN
        ALTER TABLE rooms ADD CONSTRAINT rooms_created_by_profiles_fkey 
        FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Fix RLS policies to ensure users only see their rooms
DROP POLICY IF EXISTS "Users can view rooms they are members of" ON rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON rooms;
DROP POLICY IF EXISTS "Users can update their own rooms" ON rooms;

-- Create proper RLS policies for rooms
CREATE POLICY "Users can view rooms they are members of" ON rooms
    FOR SELECT 
    USING (
        id IN (
            SELECT room_id FROM room_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create rooms" ON rooms
    FOR INSERT 
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own rooms" ON rooms
    FOR UPDATE 
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Fix RLS policies for room_members
DROP POLICY IF EXISTS "Users can view room members for rooms they belong to" ON room_members;
DROP POLICY IF EXISTS "Users can join rooms" ON room_members;

CREATE POLICY "Users can view room members for rooms they belong to" ON room_members
    FOR SELECT 
    USING (
        room_id IN (
            SELECT room_id FROM room_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join rooms" ON room_members
    FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- Fix RLS policies for transactions
DROP POLICY IF EXISTS "Users can view transactions for rooms they belong to" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;

CREATE POLICY "Users can view transactions for rooms they belong to" ON transactions
    FOR SELECT 
    USING (
        room_id IN (
            SELECT room_id FROM room_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create transactions" ON transactions
    FOR INSERT 
    WITH CHECK (
        from_user_id = auth.uid() AND
        room_id IN (
            SELECT room_id FROM room_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own transactions" ON transactions
    FOR UPDATE 
    USING (
        from_user_id = auth.uid() AND
        room_id IN (
            SELECT room_id FROM room_members WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        from_user_id = auth.uid() AND
        room_id IN (
            SELECT room_id FROM room_members WHERE user_id = auth.uid()
        )
    );

-- Fix RLS policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT 
    USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT 
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE 
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
