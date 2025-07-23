-- Add function to leave a room
CREATE OR REPLACE FUNCTION leave_room(room_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove the user from the room
  DELETE FROM room_members 
  WHERE room_id = room_id_param 
  AND user_id = auth.uid();
  
  -- If this was the last member and it's not the creator, delete the room
  -- (Creator should explicitly delete the room if they want to)
  IF NOT EXISTS (
    SELECT 1 FROM room_members 
    WHERE room_id = room_id_param
  ) AND NOT EXISTS (
    SELECT 1 FROM rooms 
    WHERE id = room_id_param 
    AND created_by = auth.uid()
  ) THEN
    -- Delete all transactions first
    DELETE FROM transactions WHERE room_id = room_id_param;
    -- Delete the room
    DELETE FROM rooms WHERE id = room_id_param;
  END IF;
END;
$$;
