import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import {
  registerForPushNotificationsAsync,
  savePushTokenToProfile,
} from '@/lib/notifications';
import { useAuth } from '@/hooks/useAuth';
import NetworkStatus from '@/components/NetworkStatus';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import 'react-native-url-polyfill/auto';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { user } = useAuth();
  useFrameworkReady();

  // Hide splash screen when app is ready
  useEffect(() => {
    SplashScreen.hideAsync().catch((err) => {
      console.warn('Error hiding splash screen:', err);
    });
  }, []);

  // Register for push notifications when user is authenticated
  useEffect(() => {
    if (user) {
      try {
        registerForPushNotificationsAsync()
          .then((token) => {
            if (token) {
              return savePushTokenToProfile(token, user.id);
            }
          })
          .catch((error) => {
            console.warn('Failed to register for push notifications:', error);
            // Don't throw - notification failure shouldn't crash the app
          });
      } catch (error) {
        console.warn('Push notification setup error:', error);
      }
    }
  }, [user]);

  return (
    <ErrorBoundary>
      <View style={{ flex: 1 }}>
        <NetworkStatus />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="+not-found" />
          <Stack.Screen name="auth/callback" />
        </Stack>
        <StatusBar style="auto" />
      </View>
    </ErrorBoundary>
  );
}
