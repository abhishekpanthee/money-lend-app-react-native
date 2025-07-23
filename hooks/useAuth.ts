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
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<void>;
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
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
      }

      const currentUser = (session?.user as AuthUser) || null;
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = (session?.user as AuthUser) || null;
      setUser(currentUser);

      // Create profile if user just signed up or signed in without profile
      if (
        currentUser &&
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')
      ) {
        try {
          // Check if profile exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', currentUser.id)
            .single();

          // Create profile if it doesn't exist
          if (!existingProfile) {
            const { error } = await supabase.from('profiles').insert({
              id: currentUser.id,
              email: currentUser.email,
              name:
                currentUser.user_metadata.full_name ||
                currentUser.user_metadata.name ||
                currentUser.email,
              full_name:
                currentUser.user_metadata.full_name ||
                currentUser.user_metadata.name ||
                currentUser.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

            if (error && !error.message.includes('duplicate key')) {
              console.error('Error creating profile:', error);
            }
          }
        } catch (error) {
          console.error('Error creating profile:', error);
        }
      }

      // Cache user data
      if (currentUser) {
        await localStorage.setItem('current_user', currentUser);
      } else {
        await localStorage.removeItem('current_user');
      }

      setLoading(false);
    });

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

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // User will be set automatically by the auth state change listener
    } catch (error) {
      console.error('Error signing in with email:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    fullName: string
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            name: fullName,
          },
        },
      });

      if (error) throw error;

      // Check if user needs to confirm email
      if (data.user && !data.session) {
        throw new Error(
          'Please check your email and click the confirmation link to complete signup.'
        );
      }
    } catch (error) {
      console.error('Error signing up with email:', error);
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
    signInWithEmail,
    signUpWithEmail,
    signOut,
    loading,
  };
}
