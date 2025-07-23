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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, CircleArrowUp as ArrowUpCircle, CircleArrowDown as ArrowDownCircle, Users, Check, Filter } from 'lucide-react-native';
import { useTransactions } from '@/hooks/useTransactions';
import { useAuth } from '@/hooks/useAuth';

interface Transaction {
  id: string;
  amount: number;
  type: 'borrowed' | 'lent' | 'shared';
  description: string;
  date: string;
  from_user_id: string;
  to_user_id: string;
  room_id: string;
  status: 'pending' | 'settled';
  settled_at?: string;
  from_user?: { name: string };
  to_user?: { name: string };
}

type TransactionType = 'borrowed' | 'lent' | 'shared';
type FilterType = 'all' | 'pending' | 'settled';

export default function TransactionsScreen() {
  const { user } = useAuth();
  const { transactions, addTransaction, markAsPaid, loading } = useTransactions();
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  
  // Form state
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('borrowed');
  const [description, setDescription] = useState('');
  const [targetUserId, setTargetUserId] = useState('');

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.status === filter;
  });

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

  const getTransactionColor = (transaction: Transaction) => {
    if (transaction.status === 'settled') return '#6b7280';
    
    switch (transaction.type) {
      case 'borrowed': return '#ef4444';
      case 'lent': return '#10b981';
      case 'shared': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.status === 'settled') {
      return <Check size={20} color="#10b981" />;
    }
    
    switch (transaction.type) {
      case 'borrowed':
        return <ArrowDownCircle size={20} color="#ef4444" />;
      case 'lent':
        return <ArrowUpCircle size={20} color="#10b981" />;
      case 'shared':
        return <Users size={20} color="#3b82f6" />;
      default:
        return null;
    }
  };

  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <View style={styles.transactionMeta}>
            {getTransactionIcon(item)}
            <Text style={[styles.transactionType, { color: getTransactionColor(item) }]}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
          </View>
          <Text style={styles.transactionAmount}>
            {formatAmount(item.amount)}
          </Text>
        </View>
      </View>
      
      <Text style={styles.transactionDescription}>{item.description}</Text>
      
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionParties}>
          {item.from_user?.name || 'You'} → {item.to_user?.name || 'User'}
        </Text>
        <Text style={styles.transactionDate}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
      </View>

      {item.status === 'pending' && (item.from_user_id === user?.id || item.to_user_id === user?.id) && (
        <TouchableOpacity
          style={styles.markPaidButton}
          onPress={() => handleMarkAsPaid(item.id)}
        >
          <Check size={16} color="#10b981" />
          <Text style={styles.markPaidText}>Mark as Paid</Text>
        </TouchableOpacity>
      )}

      {item.status === 'settled' && (
        <View style={styles.settledBadge}>
          <Check size={14} color="#10b981" />
          <Text style={styles.settledText}>
            Settled {item.settled_at ? new Date(item.settled_at).toLocaleDateString() : ''}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              const filters: FilterType[] = ['all', 'pending', 'settled'];
              const currentIndex = filters.indexOf(filter);
              const nextIndex = (currentIndex + 1) % filters.length;
              setFilter(filters[nextIndex]);
            }}
          >
            <Filter size={16} color="#6b7280" />
            <Text style={styles.filterText}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.transactionsList}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Transaction Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Transaction</Text>
            <TouchableOpacity onPress={handleAddTransaction}>
              <Text style={styles.saveButton}>Add</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.typeSelector}>
              {(['borrowed', 'lent', 'shared'] as TransactionType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeButton,
                    type === t && styles.selectedTypeButton,
                  ]}
                  onPress={() => setType(t)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      type === t && styles.selectedTypeButtonText,
                    ]}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="What was this for?"
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {type === 'borrowed' ? 'Borrowed from' : 
                 type === 'lent' ? 'Lent to' : 'Shared with'}
              </Text>
              <TextInput
                style={styles.input}
                value={targetUserId}
                onChangeText={setTargetUserId}
                placeholder="Select user..."
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  filterText: {
    fontSize: 14,
    color: '#6b7280',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 8,
  },
  transactionsList: {
    padding: 24,
    gap: 16,
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
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
  transactionAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  transactionDescription: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
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
  transactionDate: {
    fontSize: 14,
    color: '#6b7280',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  cancelButton: {
    fontSize: 16,
    color: '#6b7280',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
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
  selectedTypeButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
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
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
});