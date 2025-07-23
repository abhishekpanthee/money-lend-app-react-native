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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Plus, Users, Share, Settings, DollarSign, TrendingUp, TrendingDown, CircleCheck as CheckCircle, Clock, Filter } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useRooms } from '@/hooks/useRooms';
import { useTransactions } from '@/hooks/useTransactions';
import { useSummary } from '@/hooks/useSummary';

interface RoomMember {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  joined_at: string;
}

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();
  const { rooms, getRoomMembers } = useRooms();
  const { transactions, addTransaction, markAsPaid } = useTransactions(id);
  const { balances, totals, settleAll } = useSummary(id);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'summary'>('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [members, setMembers] = useState<RoomMember[]>([]);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'borrowed' | 'lent' | 'shared'>('borrowed');
  const [description, setDescription] = useState('');
  const [targetUserId, setTargetUserId] = useState('');

  const room = rooms.find(r => r.id === id);

  useEffect(() => {
    if (id) {
      loadMembers();
    }
  }, [id]);

  const loadMembers = async () => {
    if (!id) return;
    try {
      const roomMembers = await getRoomMembers(id);
      setMembers(roomMembers);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handleAddTransaction = async () => {
    if (!amount || !description.trim() || !targetUserId) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await addTransaction({
        amount: parseFloat(amount),
        type,
        description,
        target_user_id: targetUserId,
      });
      setShowAddModal(false);
      setAmount('');
      setDescription('');
      setTargetUserId('');
    } catch (error) {
      Alert.alert('Error', 'Failed to add transaction');
    }
  };

  const handleMarkAsPaid = (transactionId: string) => {
    Alert.alert(
      'Mark as Paid',
      'Are you sure you want to mark this transaction as settled?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark Paid', onPress: () => markAsPaid(transactionId) },
      ]
    );
  };

  const handleSettleAll = () => {
    Alert.alert(
      'Settle All Debts',
      'This will mark all your pending transactions as settled. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Settle All', style: 'destructive', onPress: () => settleAll() },
      ]
    );
  };

  const shareInviteCode = () => {
    if (!room) return;
    Alert.alert(
      'Invite Code',
      `Share this code with your roommates:\n\n${room.invite_code}`,
      [{ text: 'OK' }]
    );
  };

  const renderOverview = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Room Info */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>
            Room Information
          </Text>
          <TouchableOpacity onPress={shareInviteCode}>
            <Share size={20} color={isDark ? "#9ca3af" : "#6b7280"} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.roomName, isDark && styles.roomNameDark]}>
          {room?.name}
        </Text>
        <Text style={[styles.roomDescription, isDark && styles.roomDescriptionDark]}>
          {room?.description || 'No description'}
        </Text>
        <View style={styles.roomStats}>
          <View style={styles.statItem}>
            <Users size={16} color={isDark ? "#9ca3af" : "#6b7280"} />
            <Text style={[styles.statText, isDark && styles.statTextDark]}>
              {members.length} members
            </Text>
          </View>
          <View style={styles.statItem}>
            <Clock size={16} color={isDark ? "#9ca3af" : "#6b7280"} />
            <Text style={[styles.statText, isDark && styles.statTextDark]}>
              {transactions.filter(t => t.status === 'pending').length} pending
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Summary */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>
          Your Balance Summary
        </Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <TrendingDown size={20} color="#ef4444" />
            <Text style={styles.summaryLabel}>You Owe</Text>
            <Text style={[styles.summaryAmount, { color: '#ef4444' }]}>
              ${totals.totalYouOwe?.toFixed(2) || '0.00'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <TrendingUp size={20} color="#10b981" />
            <Text style={styles.summaryLabel}>Owed to You</Text>
            <Text style={[styles.summaryAmount, { color: '#10b981' }]}>
              ${totals.totalOwedToYou?.toFixed(2) || '0.00'}
            </Text>
          </View>
        </View>
        <View style={styles.netBalance}>
          <Text style={[styles.netLabel, isDark && styles.netLabelDark]}>
            Net Balance
          </Text>
          <Text style={[
            styles.netAmount,
            { color: totals.netBalance >= 0 ? '#10b981' : '#ef4444' }
          ]}>
            ${Math.abs(totals.netBalance || 0).toFixed(2)}
            {totals.netBalance > 0 ? ' in your favor' : 
             totals.netBalance < 0 ? ' you owe' : ''}
          </Text>
        </View>
      </View>

      {/* Members List */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>
          Room Members
        </Text>
        {members.map((member) => (
          <View key={member.id} style={styles.memberItem}>
            <View style={styles.memberInfo}>
              <View style={[styles.memberAvatar, isDark && styles.memberAvatarDark]}>
                <Text style={[styles.memberInitial, isDark && styles.memberInitialDark]}>
                  {member.user_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={[styles.memberName, isDark && styles.memberNameDark]}>
                  {member.user_name}
                  {member.user_id === user?.id && ' (You)'}
                </Text>
                <Text style={[styles.memberEmail, isDark && styles.memberEmailDark]}>
                  {member.user_email}
                </Text>
              </View>
            </View>
            <Text style={[styles.joinedDate, isDark && styles.joinedDateDark]}>
              Joined {new Date(member.joined_at).toLocaleDateString()}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderTransactions = () => (
    <FlatList
      data={transactions}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.tabContent}
      renderItem={({ item }) => (
        <View style={[styles.transactionCard, isDark && styles.transactionCardDark]}>
          <View style={styles.transactionHeader}>
            <View style={styles.transactionInfo}>
              <View style={styles.transactionMeta}>
                {item.status === 'settled' ? (
                  <CheckCircle size={20} color="#10b981" />
                ) : item.type === 'borrowed' ? (
                  <TrendingDown size={20} color="#ef4444" />
                ) : item.type === 'lent' ? (
                  <TrendingUp size={20} color="#10b981" />
                ) : (
                  <DollarSign size={20} color="#3b82f6" />
                )}
                <Text style={[
                  styles.transactionType,
                  isDark && styles.transactionTypeDark,
                  { color: item.status === 'settled' ? '#6b7280' : 
                           item.type === 'borrowed' ? '#ef4444' :
                           item.type === 'lent' ? '#10b981' : '#3b82f6' }
                ]}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Text>
              </View>
              <Text style={[styles.transactionAmount, isDark && styles.transactionAmountDark]}>
                ${item.amount.toFixed(2)}
              </Text>
            </View>
          </View>
          
          <Text style={[styles.transactionDescription, isDark && styles.transactionDescriptionDark]}>
            {item.description}
          </Text>
          
          <View style={styles.transactionDetails}>
            <Text style={[styles.transactionParties, isDark && styles.transactionPartiesDark]}>
              {item.from_user?.name || 'Unknown'} → {item.to_user?.name || 'Unknown'}
            </Text>
            <Text style={[styles.transactionDate, isDark && styles.transactionDateDark]}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>

          {item.status === 'pending' && 
           (item.from_user_id === user?.id || item.to_user_id === user?.id) && (
            <TouchableOpacity
              style={[styles.markPaidButton, isDark && styles.markPaidButtonDark]}
              onPress={() => handleMarkAsPaid(item.id)}
            >
              <CheckCircle size={16} color="#10b981" />
              <Text style={styles.markPaidText}>Mark as Paid</Text>
            </TouchableOpacity>
          )}

          {item.status === 'settled' && (
            <View style={styles.settledBadge}>
              <CheckCircle size={14} color="#10b981" />
              <Text style={styles.settledText}>
                Settled {item.settled_at ? new Date(item.settled_at).toLocaleDateString() : ''}
              </Text>
            </View>
          )}
        </View>
      )}
      showsVerticalScrollIndicator={false}
    />
  );

  const renderSummary = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Overall Summary */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>
            Overall Balance
          </Text>
          <TouchableOpacity
            style={[styles.settleAllButton, isDark && styles.settleAllButtonDark]}
            onPress={handleSettleAll}
          >
            <CheckCircle size={16} color="#10b981" />
            <Text style={styles.settleAllText}>Settle All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <TrendingDown size={24} color="#ef4444" />
            <Text style={styles.summaryLabel}>Total You Owe</Text>
            <Text style={[styles.summaryAmount, { color: '#ef4444' }]}>
              ${totals.totalYouOwe?.toFixed(2) || '0.00'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <TrendingUp size={24} color="#10b981" />
            <Text style={styles.summaryLabel}>Total Owed to You</Text>
            <Text style={[styles.summaryAmount, { color: '#10b981' }]}>
              ${totals.totalOwedToYou?.toFixed(2) || '0.00'}
            </Text>
          </View>
        </View>
      </View>

      {/* Individual Balances */}
      {balances.map((balance) => (
        <View key={balance.userId} style={[styles.card, isDark && styles.cardDark]}>
          <View style={styles.balanceHeader}>
            <Text style={[styles.balanceName, isDark && styles.balanceNameDark]}>
              {balance.userName}
            </Text>
            <View style={styles.netBalance}>
              {balance.netBalance > 0 ? (
                <TrendingUp size={20} color="#10b981" />
              ) : balance.netBalance < 0 ? (
                <TrendingDown size={20} color="#ef4444" />
              ) : (
                <CheckCircle size={20} color="#6b7280" />
              )}
              <Text style={[
                styles.netAmount,
                { color: balance.netBalance > 0 ? '#10b981' : 
                         balance.netBalance < 0 ? '#ef4444' : '#6b7280' }
              ]}>
                ${Math.abs(balance.netBalance).toFixed(2)}
              </Text>
            </View>
          </View>
          
          <View style={styles.balanceDetails}>
            <View style={styles.balanceItem}>
              <Text style={[styles.balanceLabel, isDark && styles.balanceLabelDark]}>
                You owe them
              </Text>
              <Text style={[styles.balanceAmount, { color: '#ef4444' }]}>
                ${balance.youOwe.toFixed(2)}
              </Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={[styles.balanceLabel, isDark && styles.balanceLabelDark]}>
                They owe you
              </Text>
              <Text style={[styles.balanceAmount, { color: '#10b981' }]}>
                ${balance.owesYou.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  if (!room) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, isDark && styles.errorTextDark]}>
            Room not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={isDark ? "#f9fafb" : "#111827"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
          {room.name}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.addButton, isDark && styles.addButtonDark]}
            onPress={() => setShowAddModal(true)}
          >
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettingsModal(true)}>
            <Settings size={24} color={isDark ? "#f9fafb" : "#111827"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabBar, isDark && styles.tabBarDark]}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'transactions', label: 'Transactions' },
          { key: 'summary', label: 'Summary' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && styles.activeTabButton,
              activeTab === tab.key && isDark && styles.activeTabButtonDark,
            ]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text
              style={[
                styles.tabButtonText,
                isDark && styles.tabButtonTextDark,
                activeTab === tab.key && styles.activeTabButtonText,
                activeTab === tab.key && isDark && styles.activeTabButtonTextDark,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'transactions' && renderTransactions()}
      {activeTab === 'summary' && renderSummary()}

      {/* Add Transaction Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, isDark && styles.modalContainerDark]}>
          <View style={[styles.modalHeader, isDark && styles.modalHeaderDark]}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={[styles.cancelButton, isDark && styles.cancelButtonDark]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
              Add Transaction
            </Text>
            <TouchableOpacity onPress={handleAddTransaction}>
              <Text style={[styles.saveButton, isDark && styles.saveButtonDark]}>
                Add
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.typeSelector}>
              {(['borrowed', 'lent', 'shared'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeButton,
                    isDark && styles.typeButtonDark,
                    type === t && styles.selectedTypeButton,
                    type === t && isDark && styles.selectedTypeButtonDark,
                  ]}
                  onPress={() => setType(t)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      isDark && styles.typeButtonTextDark,
                      type === t && styles.selectedTypeButtonText,
                    ]}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDark && styles.labelDark]}>Amount</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDark && styles.labelDark]}>Description</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={description}
                onChangeText={setDescription}
                placeholder="What was this for?"
                placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDark && styles.labelDark]}>
                {type === 'borrowed' ? 'Borrowed from' : 
                 type === 'lent' ? 'Lent to' : 'Shared with'}
              </Text>
              <View style={styles.memberSelector}>
                {members
                  .filter(member => member.user_id !== user?.id)
                  .map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      style={[
                        styles.memberOption,
                        isDark && styles.memberOptionDark,
                        targetUserId === member.user_id && styles.selectedMemberOption,
                        targetUserId === member.user_id && isDark && styles.selectedMemberOptionDark,
                      ]}
                      onPress={() => setTargetUserId(member.user_id)}
                    >
                      <Text
                        style={[
                          styles.memberOptionText,
                          isDark && styles.memberOptionTextDark,
                          targetUserId === member.user_id && styles.selectedMemberOptionText,
                        ]}
                      >
                        {member.user_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerDark: {
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerTitleDark: {
    color: '#f9fafb',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 8,
  },
  addButtonDark: {
    backgroundColor: '#1d4ed8',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabBarDark: {
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  activeTabButtonDark: {
    borderBottomColor: '#60a5fa',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabButtonTextDark: {
    color: '#9ca3af',
  },
  activeTabButtonText: {
    color: '#3b82f6',
  },
  activeTabButtonTextDark: {
    color: '#60a5fa',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#1f2937',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  cardTitleDark: {
    color: '#f9fafb',
  },
  roomName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  roomNameDark: {
    color: '#f9fafb',
  },
  roomDescription: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  roomDescriptionDark: {
    color: '#9ca3af',
  },
  roomStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#6b7280',
  },
  statTextDark: {
    color: '#9ca3af',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  netBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  netLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  netLabelDark: {
    color: '#9ca3af',
  },
  netAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarDark: {
    backgroundColor: '#1d4ed8',
  },
  memberInitial: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  memberInitialDark: {
    color: '#ffffff',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  memberNameDark: {
    color: '#f9fafb',
  },
  memberEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  memberEmailDark: {
    color: '#9ca3af',
  },
  joinedDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  joinedDateDark: {
    color: '#9ca3af',
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  transactionCardDark: {
    backgroundColor: '#1f2937',
  },
  transactionHeader: {
    marginBottom: 12,
  },
  transactionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionTypeDark: {
    // Color is set dynamically based on type
  },
  transactionAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  transactionAmountDark: {
    color: '#f9fafb',
  },
  transactionDescription: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
  },
  transactionDescriptionDark: {
    color: '#d1d5db',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionParties: {
    fontSize: 14,
    color: '#6b7280',
  },
  transactionPartiesDark: {
    color: '#9ca3af',
  },
  transactionDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  transactionDateDark: {
    color: '#9ca3af',
  },
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  markPaidButtonDark: {
    backgroundColor: '#064e3b',
  },
  markPaidText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10b981',
  },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  settledText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  settleAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  settleAllButtonDark: {
    backgroundColor: '#064e3b',
  },
  settleAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10b981',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  balanceNameDark: {
    color: '#f9fafb',
  },
  balanceDetails: {
    gap: 12,
  },
  balanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  balanceLabelDark: {
    color: '#9ca3af',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#6b7280',
  },
  errorTextDark: {
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
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  typeButtonDark: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  selectedTypeButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  selectedTypeButtonDark: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  typeButtonTextDark: {
    color: '#f9fafb',
  },
  selectedTypeButtonText: {
    color: '#ffffff',
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
  memberSelector: {
    gap: 8,
  },
  memberOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  memberOptionDark: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  selectedMemberOption: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  selectedMemberOptionDark: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  memberOptionText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
  memberOptionTextDark: {
    color: '#f9fafb',
  },
  selectedMemberOptionText: {
    color: '#ffffff',
  },
});