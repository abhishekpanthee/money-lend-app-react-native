import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import NetworkStatus from '@/components/NetworkStatus';
import 'react-native-url-polyfill/auto';

export default function RootLayout() {
  useFrameworkReady();

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
