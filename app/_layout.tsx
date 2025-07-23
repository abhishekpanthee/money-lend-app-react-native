import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import {
  registerForPushNotificationsAsync,
  savePushTokenToProfile,
} from '@/lib/notifications';
import { useAuth } from '@/hooks/useAuth';
import NetworkStatus from '@/components/NetworkStatus';
import 'react-native-url-polyfill/auto';

export default function RootLayout() {
  const { user } = useAuth();
  useFrameworkReady();

  // Register for push notifications when user is authenticated
  useEffect(() => {
    if (user) {
      registerForPushNotificationsAsync()
        .then((token) => {
          if (token) {
            savePushTokenToProfile(token, user.id);
          }
        })
        .catch((error) => {
          console.warn('Failed to register for push notifications:', error);
          // Don't throw - notification failure shouldn't crash the app
        });
    }
  }, [user]);

  return (
    <View style={{ flex: 1 }}>
      <NetworkStatus />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="+not-found" />
        <Stack.Screen name="auth/callback" />
      </Stack>
      <StatusBar style="auto" />
    </View>
  );
}
