import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'web') {
    // Skip push notifications on web platform
    console.log('Push notifications are not supported on web platform');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }

    try {
      const projectId = '493c8570-bb1a-4fc1-a0d5-0f3b5d45ddf4'; // Hardcoded from app.json

      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log('Push token:', token);
    } catch (e) {
      console.error('Error getting push token:', e);
      token = `${Device.osName}-${Device.osVersion}-${Date.now()}`;
    }
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

export async function savePushTokenToProfile(token: string, userId: string) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);

    if (error) {
      console.error('Error saving push token:', error);
    }
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: any
) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const responseData = await response.json();
    console.log('Push notification sent:', responseData);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

export async function sendTransactionNotification(
  roomId: string,
  transactionData: {
    amount: number;
    type: string;
    description: string;
    fromUserName: string;
    toUserId: string;
  }
) {
  try {
    // Get the recipient's push token
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('push_token, name')
      .eq('id', transactionData.toUserId)
      .single();

    if (error || !profile?.push_token) {
      console.log('No push token found for user or error:', error);
      return;
    }

    const title = 'New Transaction';
    const body = `${transactionData.fromUserName} ${
      transactionData.type === 'lent'
        ? 'lent you'
        : transactionData.type === 'borrowed'
        ? 'borrowed from you'
        : 'shared an expense with you for'
    } $${transactionData.amount} - ${transactionData.description}`;

    await sendPushNotification(profile.push_token, title, body, {
      roomId,
      type: 'transaction',
      transactionData,
    });
  } catch (error) {
    console.error('Error sending transaction notification:', error);
  }
}
