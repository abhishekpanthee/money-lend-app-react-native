import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  CircleArrowUp as ArrowUpCircle,
  CircleArrowDown as ArrowDownCircle,
  Users,
  Check,
} from 'lucide-react-native';

interface Transaction {
  id: string;
  amount: number;
  type: 'borrowed' | 'lent' | 'shared';
  description: string;
  created_at: string;
  status: 'pending' | 'settled';
  settled_at?: string | null;
  from_user_id: string;
  to_user_id: string;
  from_user?: { name: string };
  to_user?: { name: string };
}

interface TransactionCardProps {
  transaction: Transaction;
  onMarkAsPaid?: (id: string) => void;
  currentUserId: string;
}

export default function TransactionCard({
  transaction,
  onMarkAsPaid,
  currentUserId,
}: TransactionCardProps) {
  const getTransactionColor = () => {
    if (transaction.status === 'settled') return '#6b7280';

    switch (transaction.type) {
      case 'borrowed':
        return '#ef4444';
      case 'lent':
        return '#10b981';
      case 'shared':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getTransactionIcon = () => {
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

  const canMarkAsPaid =
    transaction.status === 'pending' &&
    (transaction.from_user_id === currentUserId ||
      transaction.to_user_id === currentUserId);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.transactionInfo}>
          <View style={styles.transactionMeta}>
            {getTransactionIcon()}
            <Text
              style={[styles.transactionType, { color: getTransactionColor() }]}
            >
              {transaction.type.charAt(0).toUpperCase() +
                transaction.type.slice(1)}
            </Text>
          </View>
          <Text style={styles.amount}>${transaction.amount.toFixed(2)}</Text>
        </View>
      </View>

      <Text style={styles.description}>{transaction.description}</Text>

      <View style={styles.details}>
        <Text style={styles.parties}>
          {transaction.from_user?.name || 'You'} →{' '}
          {transaction.to_user?.name || 'User'}
        </Text>
        <Text style={styles.date}>
          {new Date(transaction.created_at).toLocaleDateString()}
        </Text>
      </View>

      {canMarkAsPaid && onMarkAsPaid && (
        <TouchableOpacity
          style={styles.markPaidButton}
          onPress={() => onMarkAsPaid(transaction.id)}
        >
          <Check size={16} color="#10b981" />
          <Text style={styles.markPaidText}>Mark as Paid</Text>
        </TouchableOpacity>
      )}

      {transaction.status === 'settled' && (
        <View style={styles.settledBadge}>
          <Check size={14} color="#10b981" />
          <Text style={styles.settledText}>
            Settled{' '}
            {transaction.settled_at
              ? new Date(transaction.settled_at).toLocaleDateString()
              : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
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
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  parties: {
    fontSize: 14,
    color: '#6b7280',
  },
  date: {
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
});
