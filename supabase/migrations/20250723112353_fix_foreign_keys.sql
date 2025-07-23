-- Fix missing foreign key relationships
-- This migration adds proper foreign key constraints to fix schema cache issues

-- Add foreign key constraints that may be missing
-- Note: Using IF NOT EXISTS equivalent by checking if constraint already exists

-- Check and add foreign key for room_members.user_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'room_members_user_id_fkey' 
        AND table_name = 'room_members'
    ) THEN
        ALTER TABLE room_members ADD CONSTRAINT room_members_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Check and add foreign key for transactions.from_user_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transactions_from_user_id_fkey' 
        AND table_name = 'transactions'
    ) THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_from_user_id_fkey 
        FOREIGN KEY (from_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Check and add foreign key for transactions.to_user_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transactions_to_user_id_fkey' 
        AND table_name = 'transactions'
    ) THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_to_user_id_fkey 
        FOREIGN KEY (to_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Check and add foreign key for rooms.created_by
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'rooms_created_by_fkey' 
        AND table_name = 'rooms'
    ) THEN
        ALTER TABLE rooms ADD CONSTRAINT rooms_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;
