import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string;
          name: string;
          description: string;
          invite_code: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          invite_code?: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          invite_code?: string;
          created_by?: string;
          created_at?: string;
        };
      };
      room_members: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          joined_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          room_id: string;
          amount: number;
          type: 'borrowed' | 'lent' | 'shared';
          description: string;
          from_user_id: string;
          to_user_id: string;
          status: 'pending' | 'settled';
          settled_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          amount: number;
          type: 'borrowed' | 'lent' | 'shared';
          description: string;
          from_user_id: string;
          to_user_id: string;
          status?: 'pending' | 'settled';
          settled_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          amount?: number;
          type?: 'borrowed' | 'lent' | 'shared';
          description?: string;
          from_user_id?: string;
          to_user_id?: string;
          status?: 'pending' | 'settled';
          settled_at?: string | null;
          created_at?: string;
        };
      };
    };
  };
};