import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { localStorage } from '@/lib/storage';
import { useAuth } from './useAuth';

interface Transaction {
  id: string;
  room_id: string;
  amount: number;
  type: 'borrowed' | 'lent' | 'shared';
  description: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'settled';
  settled_at: string | null;
  created_at: string;
  from_user?: { name: string; email: string };
  to_user?: { name: string; email: string };
}

export function useTransactions(roomId?: string) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = async () => {
    if (!user || !roomId) return;

    // Try to get cached transactions first
    const cachedTransactions = await localStorage.getItem(`transactions_${roomId}`);
    if (cachedTransactions) {
      setTransactions(cachedTransactions);
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          from_user:from_user_id(email, raw_user_meta_data),
          to_user:to_user_id(email, raw_user_meta_data)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTransactions = data.map(transaction => ({
        ...transaction,
        from_user: {
          name: transaction.from_user?.raw_user_meta_data?.name || 
                transaction.from_user?.raw_user_meta_data?.full_name || 
                'Unknown User',
          email: transaction.from_user?.email || 'unknown@email.com',
        },
        to_user: {
          name: transaction.to_user?.raw_user_meta_data?.name || 
                transaction.to_user?.raw_user_meta_data?.full_name || 
                'Unknown User',
          email: transaction.to_user?.email || 'unknown@email.com',
        },
      }));

      setTransactions(formattedTransactions);
      
      // Cache the transactions data
      await localStorage.setItem(`transactions_${roomId}`, formattedTransactions, true);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // If online fetch fails, keep cached data
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (transactionData: {
    amount: number;
    type: 'borrowed' | 'lent' | 'shared';
    description: string;
    target_user_id: string;
  }) => {
    if (!user || !roomId) throw new Error('User not authenticated or room not selected');

    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          room_id: roomId,
          amount: transactionData.amount,
          type: transactionData.type,
          description: transactionData.description,
          from_user_id: user.id,
          to_user_id: transactionData.target_user_id,
        });

      if (error) throw error;

      await fetchTransactions();
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (transactionId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'settled',
          settled_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (error) throw error;

      await fetchTransactions();
    } catch (error) {
      console.error('Error marking transaction as paid:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const settleAllTransactions = async (targetUserId?: string) => {
    if (!user || !roomId) throw new Error('User not authenticated or room not selected');

    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .update({
          status: 'settled',
          settled_at: new Date().toISOString(),
        })
        .eq('room_id', roomId)
        .eq('status', 'pending');

      if (targetUserId) {
        query = query.or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
                    .or(`from_user_id.eq.${targetUserId},to_user_id.eq.${targetUserId}`);
      } else {
        query = query.or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);
      }

      const { error } = await query;

      if (error) throw error;

      await fetchTransactions();
    } catch (error) {
      console.error('Error settling all transactions:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && roomId) {
      fetchTransactions();

      // Set up real-time subscription for transactions
      const subscription = supabase
        .channel(`transactions_${roomId}`)
        .on('postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'transactions',
            filter: `room_id=eq.${roomId}`
          },
          () => fetchTransactions()
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, roomId]);

  return {
    transactions,
    addTransaction,
    markAsPaid,
    settleAllTransactions,
    loading,
    refetch: fetchTransactions,
  };
}