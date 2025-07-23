import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { localStorage } from '@/lib/storage';

// Temporary component to clear storage - add this to any screen
export function ClearStorageButton() {
  const handleClearStorage = async () => {
    try {
      await localStorage.clear();
      Alert.alert('Success', 'Storage cleared successfully!');
      console.log('✅ Storage cleared successfully!');
    } catch (error) {
      console.error('❌ Error clearing storage:', error);
      Alert.alert('Error', 'Failed to clear storage');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TouchableOpacity
        onPress={handleClearStorage}
        style={{
          backgroundColor: '#ff4444',
          padding: 15,
          borderRadius: 8,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          🧹 Clear All Storage
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Alternative: Add this function to any existing component
export const clearAllStorage = async () => {
  try {
    await localStorage.clear();
    console.log('✅ Storage cleared successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error clearing storage:', error);
    return false;
  }
};
