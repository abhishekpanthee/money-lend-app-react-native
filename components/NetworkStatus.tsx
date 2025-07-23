import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Wifi, WifiOff } from 'lucide-react-native';
import { localStorage } from '@/lib/storage';

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncQueueLength, setSyncQueueLength] = useState(0);

  useEffect(() => {
    const checkNetworkStatus = () => {
      const online = localStorage.isConnected();
      const queueLength = localStorage.getSyncQueueLength();
      
      setIsOnline(online);
      setSyncQueueLength(queueLength);
    };

    // Check initially
    checkNetworkStatus();

    // Check periodically
    const interval = setInterval(checkNetworkStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  if (isOnline && syncQueueLength === 0) {
    return null; // Don't show anything when everything is normal
  }

  return (
    <View style={[styles.container, !isOnline && styles.offline]}>
      {isOnline ? (
        <Wifi size={16} color="#10b981" />
      ) : (
        <WifiOff size={16} color="#ef4444" />
      )}
      <Text style={[styles.text, !isOnline && styles.offlineText]}>
        {!isOnline 
          ? 'Offline - Changes will sync when connected'
          : `Syncing ${syncQueueLength} items...`
        }
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  offline: {
    backgroundColor: '#fef2f2',
  },
  text: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  offlineText: {
    color: '#ef4444',
  },
});