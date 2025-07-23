import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { localStorage } from '@/lib/storage';
import { useAuth } from './useAuth';

interface Room {
  id: string;
  name: string;
  description: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  members?: RoomMember[];
  member_count?: number;
}

interface RoomMember {
  id: string;
  user_id: string;
  joined_at: string;
  user_email?: string;
  user_name?: string;
}

export function useRooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRooms = async () => {
    if (!user) return;
    
    // Try to get cached rooms first
    const cachedRooms = await localStorage.getItem('user_rooms');
    if (cachedRooms) {
      setRooms(cachedRooms);
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          room_members!inner(
            id,
            user_id,
            joined_at
          )
        `)
        .eq('room_members.user_id', user.id);

      if (error) throw error;

      // Get member counts for each room
      const roomsWithCounts = await Promise.all(
        data.map(async (room) => {
          const { count } = await supabase
            .from('room_members')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id);

          return {
            ...room,
            member_count: count || 0,
          };
        })
      );

      setRooms(roomsWithCounts);
      
      // Cache the rooms data
      await localStorage.setItem('user_rooms', roomsWithCounts, true);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      // If online fetch fails, keep cached data
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async (name: string, description: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          name,
          description,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchRooms();
      return data;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (inviteCode: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    try {
      // First, find the room by invite code
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('invite_code', inviteCode.toUpperCase())
        .single();

      if (roomError || !room) {
        throw new Error('Invalid invite code');
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('room_members')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        throw new Error('You are already a member of this room');
      }

      // Add user to room
      const { error: memberError } = await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: user.id,
        });

      if (memberError) throw memberError;

      await fetchRooms();
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getRoomMembers = async (roomId: string): Promise<RoomMember[]> => {
    try {
      const { data, error } = await supabase
        .from('room_members')
        .select(`
          *,
          user_email:user_id(email),
          user_name:user_id(raw_user_meta_data)
        `)
        .eq('room_id', roomId);

      if (error) throw error;

      return data.map(member => ({
        ...member,
        user_email: member.user_email?.email || 'Unknown',
        user_name: member.user_name?.raw_user_meta_data?.name || 
                  member.user_name?.raw_user_meta_data?.full_name || 
                  'Unknown User',
      }));
    } catch (error) {
      console.error('Error fetching room members:', error);
      return [];
    }
  };

  useEffect(() => {
    if (user) {
      fetchRooms();

      // Set up real-time subscription for rooms
      const subscription = supabase
        .channel('rooms_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'rooms' },
          () => fetchRooms()
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'room_members' },
          () => fetchRooms()
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  return {
    rooms,
    createRoom,
    joinRoom,
    getRoomMembers,
    loading,
    refetch: fetchRooms,
  };
}