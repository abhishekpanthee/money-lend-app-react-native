import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Bell, Download, Trash2, LogOut, Shield, CircleHelp as HelpCircle, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'This will export all your transaction data as a CSV file.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => {} },
      ]
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement, 
    destructive = false 
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    destructive?: boolean;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, destructive && styles.destructiveIcon]}>
          {icon}
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, destructive && styles.destructiveText]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.settingSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      {rightElement || (onPress && <ChevronRight size={20} color="#6b7280" />)}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Profile Section */}
      <View style={styles.section}>
        <View style={styles.profileCard}>
          <View style={styles.profileInfo}>
            <View style={styles.avatar}>
              <User size={32} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.profileName}>
                {user?.email || 'Guest User'}
              </Text>
              <Text style={styles.profileEmail}>
                {user?.email || 'Not signed in'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.sectionContent}>
          <SettingItem
            icon={<Bell size={20} color="#6b7280" />}
            title="Push Notifications"
            subtitle="Get notified about new transactions and payments"
            rightElement={
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{ false: '#e5e7eb', true: '#bfdbfe' }}
                thumbColor={pushNotifications ? '#3b82f6' : '#f3f4f6'}
              />
            }
          />
          <SettingItem
            icon={<Bell size={20} color="#6b7280" />}
            title="Email Notifications"
            subtitle="Receive email summaries and reminders"
            rightElement={
              <Switch
                value={emailNotifications}
                onValueChange={setEmailNotifications}
                trackColor={{ false: '#e5e7eb', true: '#bfdbfe' }}
                thumbColor={emailNotifications ? '#3b82f6' : '#f3f4f6'}
              />
            }
          />
        </View>
      </View>

      {/* Data & Privacy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data & Privacy</Text>
        <View style={styles.sectionContent}>
          <SettingItem
            icon={<Download size={20} color="#6b7280" />}
            title="Export Data"
            subtitle="Download your transaction history"
            onPress={handleExportData}
          />
          <SettingItem
            icon={<Shield size={20} color="#6b7280" />}
            title="Privacy Policy"
            onPress={() => {}}
          />
        </View>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.sectionContent}>
          <SettingItem
            icon={<HelpCircle size={20} color="#6b7280" />}
            title="Help & FAQ"
            onPress={() => {}}
          />
        </View>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionContent}>
          <SettingItem
            icon={<LogOut size={20} color="#ef4444" />}
            title="Sign Out"
            onPress={handleSignOut}
            destructive
          />
          <SettingItem
            icon={<Trash2 size={20} color="#ef4444" />}
            title="Delete Account"
            subtitle="Permanently delete your account and data"
            onPress={handleDeleteAccount}
            destructive
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    marginHorizontal: 24,
  },
  sectionContent: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  destructiveIcon: {
    backgroundColor: '#fef2f2',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  destructiveText: {
    color: '#ef4444',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
});