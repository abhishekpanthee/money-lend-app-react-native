import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface Balance {
  userId: string;
  userName: string;
  userEmail: string;
  youOwe: number;
  owesYou: number;
  netBalance: number;
}

interface Totals {
  totalYouOwe: number;
  totalOwedToYou: number;
  netBalance: number;
}

export function useSummary(roomId?: string) {
  const { user } = useAuth();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [totals, setTotals] = useState<Totals>({
    totalYouOwe: 0,
    totalOwedToYou: 0,
    netBalance: 0,
  });
  const [loading, setLoading] = useState(false);

  const calculateSummary = async () => {
    if (!user || !roomId) return;

    setLoading(true);
    try {
      // Get all pending transactions for this room
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(
          `
          *,
          from_user:profiles!transactions_from_user_id_profiles_fkey(id, email, name, full_name),
          to_user:profiles!transactions_to_user_id_profiles_fkey(id, email, name, full_name)
        `
        )
        .eq('room_id', roomId)
        .eq('status', 'pending');

      if (error) throw error;

      // Get all room members
      const { data: members, error: membersError } = await supabase
        .from('room_members')
        .select(
          `
          user_id,
          profile:profiles!room_members_user_id_profiles_fkey(id, email, name, full_name)
        `
        )
        .eq('room_id', roomId);

      if (membersError) throw membersError;

      // Calculate balances for each member
      const balanceMap = new Map<string, Balance>();

      // Initialize balances for all members
      members.forEach((member) => {
        if (member.user_id !== user.id) {
          const profile = member.profile?.[0] || member.profile;
          balanceMap.set(member.user_id, {
            userId: member.user_id,
            userName: profile?.name || profile?.full_name || 'Unknown User',
            userEmail: profile?.email || 'unknown@email.com',
            youOwe: 0,
            owesYou: 0,
            netBalance: 0,
          });
        }
      });

      // Calculate amounts from transactions
      transactions.forEach((transaction) => {
        const { from_user_id, to_user_id, amount, type } = transaction;

        if (from_user_id === user.id) {
          // Current user created this transaction
          const balance = balanceMap.get(to_user_id);
          if (balance) {
            if (type === 'lent') {
              // User lent money to target_user -> target_user owes current user
              balance.owesYou += amount;
            } else if (type === 'borrowed') {
              // User borrowed money from target_user -> current user owes target_user
              balance.youOwe += amount;
            } else if (type === 'shared') {
              // Shared expense -> current user paid, target_user owes half
              balance.owesYou += amount / 2;
            }
          }
        } else if (to_user_id === user.id) {
          // Someone else created a transaction involving current user
          const balance = balanceMap.get(from_user_id);
          if (balance) {
            if (type === 'lent') {
              // Other user lent money to current user -> current user owes them
              balance.youOwe += amount;
            } else if (type === 'borrowed') {
              // Other user borrowed from current user -> they owe current user
              balance.owesYou += amount;
            } else if (type === 'shared') {
              // Other user paid shared expense -> current user owes half
              balance.youOwe += amount / 2;
            }
          }
        }
      });

      // Calculate net balances
      const balancesList = Array.from(balanceMap.values()).map((balance) => ({
        ...balance,
        netBalance: balance.owesYou - balance.youOwe,
      }));

      // Calculate totals
      const newTotals = balancesList.reduce(
        (acc, balance) => ({
          totalYouOwe: acc.totalYouOwe + balance.youOwe,
          totalOwedToYou: acc.totalOwedToYou + balance.owesYou,
          netBalance: acc.netBalance + balance.netBalance,
        }),
        { totalYouOwe: 0, totalOwedToYou: 0, netBalance: 0 }
      );

      setBalances(balancesList);
      setTotals(newTotals);
    } catch (error) {
      console.error('Error calculating summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const settleAll = async () => {
    if (!user || !roomId)
      throw new Error('User not authenticated or room not selected');

    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'settled',
          settled_at: new Date().toISOString(),
        })
        .eq('room_id', roomId)
        .eq('status', 'pending')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

      if (error) throw error;

      await calculateSummary();
    } catch (error) {
      console.error('Error settling all transactions:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const exportTransactions = async (format: 'csv' | 'pdf') => {
    if (!roomId) return;

    setLoading(true);
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(
          `
          *,
          from_user:profiles!transactions_from_user_id_profiles_fkey(id, email, name, full_name),
          to_user:profiles!transactions_to_user_id_profiles_fkey(id, email, name, full_name)
        `
        )
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (format === 'csv') {
        const csvContent = [
          'Date,Type,Amount,Description,From,To,Status',
          ...transactions.map(
            (t) =>
              `${new Date(t.created_at).toLocaleDateString()},${t.type},$${
                t.amount
              },${t.description},${t.from_user?.email},${t.to_user?.email},${
                t.status
              }`
          ),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${
          new Date().toISOString().split('T')[0]
        }.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting transactions:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && roomId) {
      calculateSummary();

      // Set up real-time subscription
      const subscription = supabase
        .channel(`summary_${roomId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `room_id=eq.${roomId}`,
          },
          () => calculateSummary()
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, roomId]);

  return {
    balances,
    totals,
    settleAll,
    exportTransactions,
    loading,
    refetch: calculateSummary,
  };
}
