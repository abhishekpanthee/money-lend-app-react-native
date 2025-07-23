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
      // First, get all rooms the user is a member of
      const { data: memberRooms, error: memberError } = await supabase
        .from('room_members')
        .select('room_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const roomIds = memberRooms.map((rm: any) => rm.room_id);

      // Get all rooms where user is creator OR member
      let roomsQuery = supabase.from('rooms').select('*');

      if (roomIds.length > 0) {
        // User is member of some rooms OR creator
        roomsQuery = roomsQuery.or(
          `created_by.eq.${user.id},id.in.(${roomIds.join(',')})`
        );
      } else {
        // User is not a member of any rooms, only show created rooms
        roomsQuery = roomsQuery.eq('created_by', user.id);
      }

      const { data: allRooms, error: roomsError } = await roomsQuery;

      if (roomsError) throw roomsError;

      // Get member counts for each room
      const roomsWithCounts = await Promise.all(
        (allRooms || []).map(async (room: any) => {
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
      // Generate a random invite code
      const inviteCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      const { data, error } = await supabase
        .from('rooms')
        .insert({
          name,
          description,
          created_by: user.id,
          invite_code: inviteCode,
        })
        .select()
        .single();

      if (error) throw error;

      // Add the creator as a member of the room (use upsert to handle duplicates)
      const { error: memberError } = await supabase.from('room_members').upsert(
        {
          room_id: data.id,
          user_id: user.id,
        },
        {
          onConflict: 'room_id,user_id',
        }
      );

      if (memberError) {
        console.error('Error adding creator as member:', memberError);
        // Don't throw error here as room is created successfully
      }

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

      // Add user as member
      const { error: memberError } = await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: user.id,
        });

      if (memberError) throw memberError;

      await fetchRooms();
      return room;
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
        .select(
          `
          *,
          profiles!room_members_user_id_profiles_fkey(
            name,
            email
          )
        `
        )
        .eq('room_id', roomId);

      if (error) throw error;

      return data.map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        joined_at: member.joined_at,
        user_email: Array.isArray(member.profiles)
          ? member.profiles[0]?.email
          : member.profiles?.email,
        user_name: Array.isArray(member.profiles)
          ? member.profiles[0]?.name
          : member.profiles?.name,
      }));
    } catch (error) {
      console.error('Error fetching room members:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchRooms();

    if (user) {
      // Set up real-time subscriptions
      const subscription = supabase
        .channel('rooms_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rooms' },
          () => fetchRooms()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'room_members' },
          () => fetchRooms()
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const deleteRoom = async (roomId: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    try {
      // First delete all room members
      const { error: membersError } = await supabase
        .from('room_members')
        .delete()
        .eq('room_id', roomId);

      if (membersError) throw membersError;

      // Then delete all transactions for this room
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('room_id', roomId);

      if (transactionsError) throw transactionsError;

      // Finally delete the room itself
      const { error: roomError } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId)
        .eq('created_by', user.id); // Only room creator can delete

      if (roomError) throw roomError;

      // Refresh the rooms list
      await fetchRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const leaveRoom = async (roomId: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    try {
      // Call the database function to safely leave the room
      const { error } = await supabase.rpc('leave_room', {
        room_id_param: roomId,
      });

      if (error) throw error;

      // Refresh the rooms list
      await fetchRooms();
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    rooms,
    createRoom,
    joinRoom,
    deleteRoom,
    leaveRoom,
    getRoomMembers,
    loading,
    refetch: fetchRooms,
  };
}
