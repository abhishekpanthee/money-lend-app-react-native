import { useEffect } from 'react';
import { Platform } from 'react-native';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export function useFrameworkReady() {
  useEffect(() => {
    // Only call frameworkReady on web platforms
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // @ts-ignore - TypeScript doesn't know about window.frameworkReady
      window.frameworkReady?.();
    }
  }, []);
}
