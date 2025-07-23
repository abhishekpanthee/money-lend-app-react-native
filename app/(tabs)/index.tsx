import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Users, ArrowRight, Share, Eye } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useRooms } from '@/hooks/useRooms';
import { router } from 'expo-router';

interface Room {
  id: string;
  name: string;
  description: string;
  invite_code: string;
  created_at: string;
  member_count?: number;
}

export default function RoomsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, signInWithGoogle, loading } = useAuth();
  const { rooms, createRoom, joinRoom, loading: roomsLoading } = useRooms();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      Alert.alert('Error', 'Please enter a room name');
      return;
    }

    try {
      await createRoom(roomName, roomDescription);
      setShowCreateModal(false);
      setRoomName('');
      setRoomDescription('');
    } catch (error) {
      Alert.alert('Error', 'Failed to create room');
    }
  };

  const handleJoinRoom = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    try {
      await joinRoom(inviteCode);
      setShowJoinModal(false);
      setInviteCode('');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to join room');
    }
  };

  const shareInviteCode = (room: Room) => {
    Alert.alert(
      'Invite Code',
      `Share this code with your roommates:\n\n${room.invite_code}`,
      [{ text: 'OK' }]
    );
  };

  const viewRoom = (room: Room) => {
    router.push(`/room/${room.id}`);
  };

  const renderRoom = ({ item }: { item: Room }) => (
    <TouchableOpacity 
      style={[styles.roomCard, isDark && styles.roomCardDark]}
      onPress={() => viewRoom(item)}
    >
      <View style={styles.roomHeader}>
        <View style={styles.roomInfo}>
          <Text style={[styles.roomName, isDark && styles.roomNameDark]}>
            {item.name}
          </Text>
          <Text style={[styles.roomDescription, isDark && styles.roomDescriptionDark]}>
            {item.description}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => shareInviteCode(item)}
        >
          <Share size={20} color={isDark ? "#9ca3af" : "#6b7280"} />
        </TouchableOpacity>
      </View>
      <View style={styles.roomFooter}>
        <View style={styles.membersInfo}>
          <Users size={16} color={isDark ? "#9ca3af" : "#6b7280"} />
          <Text style={[styles.membersText, isDark && styles.membersTextDark]}>
            {item.member_count || 0} members
          </Text>
        </View>
        <View style={styles.roomActions}>
          <TouchableOpacity
            style={[styles.viewButton, isDark && styles.viewButtonDark]}
            onPress={() => viewRoom(item)}
          >
            <Eye size={16} color={isDark ? "#ffffff" : "#3b82f6"} />
            <Text style={[styles.viewButtonText, isDark && styles.viewButtonTextDark]}>
              View
            </Text>
          </TouchableOpacity>
          <ArrowRight size={20} color={isDark ? "#9ca3af" : "#6b7280"} />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        <View style={styles.authContainer}>
          <Text style={[styles.authTitle, isDark && styles.authTitleDark]}>
            Welcome to RoomMate Tracker
          </Text>
          <Text style={[styles.authSubtitle, isDark && styles.authSubtitleDark]}>
            Track shared expenses and settle debts with your roommates
          </Text>
          <TouchableOpacity 
            style={[styles.signInButton, isDark && styles.signInButtonDark, loading && styles.signInButtonDisabled]}
            onPress={async () => {
              try {
                await signInWithGoogle();
              } catch (error) {
                Alert.alert('Sign In Error', 'Failed to sign in with Google. Please try again.');
              }
            }}
            disabled={loading}
          >
            <Text style={[styles.signInText, isDark && styles.signInTextDark]}>
              {loading ? 'Signing in...' : 'Sign in with Google'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Text style={[styles.title, isDark && styles.titleDark]}>My Rooms</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.actionButton, isDark && styles.actionButtonDark]}
            onPress={() => setShowJoinModal(true)}
          >
            <Text style={[styles.actionButtonText, isDark && styles.actionButtonTextDark]}>
              Join
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton, isDark && styles.primaryButtonDark]}
            onPress={() => setShowCreateModal(true)}
          >
            <Plus size={20} color="#ffffff" />
            <Text style={[styles.primaryButtonText, isDark && styles.primaryButtonTextDark]}>
              Create
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={rooms}
        renderItem={renderRoom}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.roomsList}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Room Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, isDark && styles.modalContainerDark]}>
          <View style={[styles.modalHeader, isDark && styles.modalHeaderDark]}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={[styles.cancelButton, isDark && styles.cancelButtonDark]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
              Create Room
            </Text>
            <TouchableOpacity onPress={handleCreateRoom}>
              <Text style={[styles.saveButton, isDark && styles.saveButtonDark]}>
                Create
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDark && styles.labelDark]}>
                Room Name
              </Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={roomName}
                onChangeText={setRoomName}
                placeholder="e.g., Apartment 4B"
                placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDark && styles.labelDark]}>
                Description (Optional)
              </Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={roomDescription}
                onChangeText={setRoomDescription}
                placeholder="Brief description of this room"
                placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                multiline
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Join Room Modal */}
      <Modal
        visible={showJoinModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, isDark && styles.modalContainerDark]}>
          <View style={[styles.modalHeader, isDark && styles.modalHeaderDark]}>
            <TouchableOpacity onPress={() => setShowJoinModal(false)}>
              <Text style={[styles.cancelButton, isDark && styles.cancelButtonDark]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
              Join Room
            </Text>
            <TouchableOpacity onPress={handleJoinRoom}>
              <Text style={[styles.saveButton, isDark && styles.saveButtonDark]}>
                Join
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDark && styles.labelDark]}>
                Invite Code
              </Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="Enter 8-character code"
                placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                autoCapitalize="characters"
                maxLength={8}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  authTitleDark: {
    color: '#f9fafb',
  },
  authSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  authSubtitleDark: {
    color: '#9ca3af',
  },
  signInButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signInButtonDark: {
    backgroundColor: '#1f2937',
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  signInTextDark: {
    color: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerDark: {
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  titleDark: {
    color: '#f9fafb',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonDark: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  primaryButtonDark: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  actionButtonTextDark: {
    color: '#f9fafb',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  primaryButtonTextDark: {
    color: '#ffffff',
  },
  roomsList: {
    padding: 24,
    gap: 16,
  },
  roomCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  roomCardDark: {
    backgroundColor: '#1f2937',
    shadowColor: '#000',
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  roomNameDark: {
    color: '#f9fafb',
  },
  roomDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  roomDescriptionDark: {
    color: '#9ca3af',
  },
  shareButton: {
    padding: 8,
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viewButtonDark: {
    backgroundColor: '#1e40af',
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3b82f6',
  },
  viewButtonTextDark: {
    color: '#ffffff',
  },
  membersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  membersText: {
    fontSize: 14,
    color: '#6b7280',
  },
  membersTextDark: {
    color: '#9ca3af',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalContainerDark: {
    backgroundColor: '#1f2937',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalHeaderDark: {
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalTitleDark: {
    color: '#f9fafb',
  },
  cancelButton: {
    fontSize: 16,
    color: '#6b7280',
  },
  cancelButtonDark: {
    color: '#9ca3af',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  saveButtonDark: {
    color: '#60a5fa',
  },
  modalContent: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  labelDark: {
    color: '#f9fafb',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  inputDark: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
    color: '#f9fafb',
  },
});