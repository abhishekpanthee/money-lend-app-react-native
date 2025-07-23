-- Enable RLS on room_members table
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;

-- Room members policies
CREATE POLICY "Users can view room members of rooms they belong to" ON room_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_members rm 
      WHERE rm.room_id = room_members.room_id 
      AND rm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join rooms" ON room_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave rooms they belong to" ON room_members
  FOR DELETE
  USING (user_id = auth.uid());

-- Rooms policies for deletion
CREATE POLICY "Room creators can delete their rooms" ON rooms
  FOR DELETE
  USING (created_by = auth.uid());

CREATE POLICY "Room creators can update their rooms" ON rooms
  FOR UPDATE
  USING (created_by = auth.uid());
