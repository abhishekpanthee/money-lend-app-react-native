import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { localStorage } from '@/lib/storage';
import type { User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';

// Complete the auth session for web
WebBrowser.maybeCompleteAuthSession();

interface AuthUser extends User {
  email: string;
  user_metadata: {
    name?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

export function useAuth(): AuthContextType {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Try to get cached user first
      const cachedUser = await localStorage.getItem('current_user');
      if (cachedUser) {
        setUser(cachedUser);
      }

      // Get current session from Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
      }

      const currentUser = session?.user as AuthUser || null;
      setUser(currentUser);

      // Cache user data
      if (currentUser) {
        await localStorage.setItem('current_user', currentUser);
      } else {
        await localStorage.removeItem('current_user');
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setLoading(false);
      setInitializing(false);
    }
  };

  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user as AuthUser || null;
        setUser(currentUser);
        
        // Cache user data
        if (currentUser) {
          await localStorage.setItem('current_user', currentUser);
        } else {
          await localStorage.removeItem('current_user');
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      let redirectUrl;
      
      if (Platform.OS === 'web') {
        redirectUrl = `${window.location.origin}/auth/callback`;
      } else {
        redirectUrl = makeRedirectUri({
          scheme: 'myapp',
          path: 'auth/callback',
        });
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;

      // For web, the redirect will handle the rest
      if (Platform.OS === 'web' && data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear cached data
      await localStorage.removeItem('current_user');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    signInWithGoogle,
    signOut,
    loading,
  };
}