import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, TrendingDown, Minus, CircleCheck as CheckCircle, Filter, FileDown } from 'lucide-react-native';
import { useSummary } from '@/hooks/useSummary';

interface Balance {
  userId: string;
  userName: string;
  youOwe: number;
  owesYou: number;
  netBalance: number;
}

type SummaryFilter = 'all' | 'pending' | 'settled';

export default function SummaryScreen() {
  const { balances, totals, settleAll, exportTransactions, loading } = useSummary();
  const [filter, setFilter] = useState<SummaryFilter>('all');

  const handleSettleAll = () => {
    Alert.alert(
      'Settle All Debts',
      'This will mark all pending transactions as settled. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Settle All', style: 'destructive', onPress: () => settleAll() },
      ]
    );
  };

  const handleExport = () => {
    Alert.alert(
      'Export Transactions',
      'Choose export format:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'CSV', onPress: () => exportTransactions('csv') },
        { text: 'PDF', onPress: () => exportTransactions('pdf') },
      ]
    );
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return '#10b981'; // Green for positive
    if (balance < 0) return '#ef4444'; // Red for negative
    return '#6b7280'; // Gray for zero
  };

  const getBalanceIcon = (balance: number) => {
    if (balance > 0) return <TrendingUp size={20} color="#10b981" />;
    if (balance < 0) return <TrendingDown size={20} color="#ef4444" />;
    return <Minus size={20} color="#6b7280" />;
  };

  const renderBalance = ({ item }: { item: Balance }) => (
    <View style={styles.balanceCard}>
      <View style={styles.balanceHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.userName}</Text>
          <View style={styles.netBalance}>
            {getBalanceIcon(item.netBalance)}
            <Text style={[styles.netAmount, { color: getBalanceColor(item.netBalance) }]}>
              ${Math.abs(item.netBalance).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.balanceDetails}>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>You owe them</Text>
          <Text style={[styles.balanceAmount, { color: '#ef4444' }]}>
            ${item.youOwe.toFixed(2)}
          </Text>
        </View>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>They owe you</Text>
          <Text style={[styles.balanceAmount, { color: '#10b981' }]}>
            ${item.owesYou.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Summary</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              const filters: SummaryFilter[] = ['all', 'pending', 'settled'];
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
            style={styles.exportButton}
            onPress={handleExport}
          >
            <FileDown size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Overall Summary */}
      <View style={styles.overallSummary}>
        <Text style={styles.summaryTitle}>Your Overall Balance</Text>
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <TrendingDown size={24} color="#ef4444" />
            <Text style={styles.summaryLabel}>Total You Owe</Text>
            <Text style={[styles.summaryAmount, { color: '#ef4444' }]}>
              ${totals.totalYouOwe?.toFixed(2) || '0.00'}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <TrendingUp size={24} color="#10b981" />
            <Text style={styles.summaryLabel}>Total Owed to You</Text>
            <Text style={[styles.summaryAmount, { color: '#10b981' }]}>
              ${totals.totalOwedToYou?.toFixed(2) || '0.00'}
            </Text>
          </View>
        </View>
        <View style={styles.netSummary}>
          <Text style={styles.netLabel}>Net Balance</Text>
          <Text style={[
            styles.netAmount,
            { color: getBalanceColor(totals.netBalance || 0) }
          ]}>
            ${Math.abs(totals.netBalance || 0).toFixed(2)}
            {totals.netBalance && totals.netBalance > 0 ? ' in your favor' : 
             totals.netBalance && totals.netBalance < 0 ? ' you owe' : ''}
          </Text>
        </View>
      </View>

      {/* Individual Balances */}
      <FlatList
        data={balances}
        renderItem={renderBalance}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.balancesList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Individual Balances</Text>
            {balances.length > 0 && (
              <TouchableOpacity
                style={styles.settleAllButton}
                onPress={handleSettleAll}
              >
                <CheckCircle size={16} color="#10b981" />
                <Text style={styles.settleAllText}>Settle All</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
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
  exportButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  overallSummary: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  summaryCard: {
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
  netSummary: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  netLabel: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  netAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
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
  settleAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10b981',
  },
  balancesList: {
    padding: 24,
    gap: 16,
  },
  balanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  balanceHeader: {
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  netBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  balanceAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
});