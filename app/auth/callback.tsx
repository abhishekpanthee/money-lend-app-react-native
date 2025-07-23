import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          router.replace('/');
          return;
        }

        if (data.session) {
          // Successfully authenticated, redirect to main app
          router.replace('/(tabs)');
        } else {
          // No session, redirect to login
          router.replace('/');
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
        router.replace('/');
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  text: {
    fontSize: 16,
    color: '#6b7280',
  },
});