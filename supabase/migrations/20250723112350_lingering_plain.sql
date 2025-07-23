/*
  # Create rooms and transactions schema

  1. New Tables
    - `rooms`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `invite_code` (text, unique)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamp)
    - `room_members`
      - `id` (uuid, primary key)
      - `room_id` (uuid, references rooms)
      - `user_id` (uuid, references auth.users)
      - `joined_at` (timestamp)
    - `transactions`
      - `id` (uuid, primary key)
      - `room_id` (uuid, references rooms)
      - `amount` (decimal)
      - `type` (text: borrowed, lent, shared)
      - `description` (text)
      - `from_user_id` (uuid, references auth.users)
      - `to_user_id` (uuid, references auth.users)
      - `status` (text: pending, settled)
      - `settled_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
*/

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  invite_code text UNIQUE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create room_members table
CREATE TABLE IF NOT EXISTS room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('borrowed', 'lent', 'shared')),
  description text NOT NULL,
  from_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'settled')),
  settled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policies for rooms
CREATE POLICY "Users can view rooms they are members of"
  ON rooms FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT room_id FROM room_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create rooms"
  ON rooms FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Policies for room_members
CREATE POLICY "Users can view room members for their rooms"
  ON room_members FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM room_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join rooms"
  ON room_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policies for transactions
CREATE POLICY "Users can view transactions in their rooms"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM room_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transactions in their rooms"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    room_id IN (
      SELECT room_id FROM room_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update transactions they are involved in"
  ON transactions FOR UPDATE
  TO authenticated
  USING (
    (from_user_id = auth.uid() OR to_user_id = auth.uid()) AND
    room_id IN (
      SELECT room_id FROM room_members WHERE user_id = auth.uid()
    )
  );

-- Function to generate invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text AS $$
BEGIN
  RETURN upper(substring(gen_random_uuid()::text from 1 for 8));
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invite codes
CREATE OR REPLACE FUNCTION set_invite_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rooms_invite_code_trigger
  BEFORE INSERT ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION set_invite_code();

-- Auto-add room creator as member
CREATE OR REPLACE FUNCTION add_creator_as_member()
RETURNS trigger AS $$
BEGIN
  INSERT INTO room_members (room_id, user_id)
  VALUES (NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rooms_add_creator_trigger
  AFTER INSERT ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION add_creator_as_member();
