import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { localStorage } from '@/lib/storage';
import { useAuth } from './useAuth';
import { sendTransactionNotification } from '@/lib/notifications';

interface Transaction {
  id: string;
  room_id: string;
  amount: number;
  type: 'borrowed' | 'lent' | 'shared';
  description: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending';
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
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select(
          `
          *,
          from_user:profiles!transactions_from_user_id_profiles_fkey(id, email, name, full_name),
          to_user:profiles!transactions_to_user_id_profiles_fkey(id, email, name, full_name)
        `
        )
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      // If roomId is provided, filter by room
      if (roomId) {
        // Try to get cached transactions first
        const cachedTransactions = await localStorage.getItem(
          `transactions_${roomId}`
        );
        if (cachedTransactions) {
          setTransactions(cachedTransactions);
        }

        // First verify user has access to this room
        const { data: roomAccess, error: roomError } = await supabase
          .from('room_members')
          .select('user_id')
          .eq('room_id', roomId)
          .eq('user_id', user.id)
          .single();

        if (roomError || !roomAccess) {
          console.log('User does not have access to this room');
          setTransactions([]);
          return;
        }

        query = query.eq('room_id', roomId);
      } else {
        // Try to get cached all transactions first
        const cachedTransactions = await localStorage.getItem(
          `all_transactions_${user.id}`
        );
        if (cachedTransactions) {
          setTransactions(cachedTransactions);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedTransactions = data.map((transaction) => ({
        ...transaction,
        from_user: {
          name:
            transaction.from_user?.name ||
            transaction.from_user?.full_name ||
            'Unknown User',
          email: transaction.from_user?.email || 'unknown@email.com',
        },
        to_user: {
          name:
            transaction.to_user?.name ||
            transaction.to_user?.full_name ||
            'Unknown User',
          email: transaction.to_user?.email || 'unknown@email.com',
        },
      }));

      setTransactions(formattedTransactions);

      // Cache the transactions data
      if (roomId) {
        await localStorage.setItem(
          `transactions_${roomId}`,
          formattedTransactions,
          true
        );
      } else {
        await localStorage.setItem(
          `all_transactions_${user.id}`,
          formattedTransactions,
          true
        );
      }
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
    if (!user || !roomId)
      throw new Error('User not authenticated or room not selected');

    setLoading(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        room_id: roomId,
        amount: transactionData.amount,
        type: transactionData.type,
        description: transactionData.description,
        from_user_id: user.id,
        to_user_id: transactionData.target_user_id,
      });

      if (error) throw error;

      // Send push notification to the target user
      try {
        await sendTransactionNotification(roomId, {
          amount: transactionData.amount,
          type: transactionData.type,
          description: transactionData.description,
          fromUserName: user.user_metadata?.name || user.email || 'Someone',
          toUserId: transactionData.target_user_id,
        });
      } catch (notificationError) {
        console.warn('Failed to send notification:', notificationError);
        // Don't throw - notification failure shouldn't break the transaction
      }

      await fetchTransactions();
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (transactionId: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    try {
      console.log('=== MARK AS PAID START ===');
      console.log('Transaction ID:', transactionId);
      console.log('User ID:', user.id);
      console.log('User email:', user.email);

      // First, let's verify the transaction exists and user has permission
      const { data: existingTransaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError) {
        console.error('Error fetching transaction:', fetchError);
        throw fetchError;
      }

      console.log('Existing transaction:', existingTransaction);
      console.log(
        'User can modify?',
        existingTransaction.from_user_id === user.id ||
          existingTransaction.to_user_id === user.id
      );

      // Now delete the transaction
      const { data, error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .select()
        .single();

      if (error) {
        console.error('Supabase DELETE error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('Transaction deleted successfully:', data);
      console.log('=== MARK AS PAID SUCCESS ===');

      await fetchTransactions();
    } catch (error) {
      console.error('=== MARK AS PAID ERROR ===');
      console.error('Error marking transaction as paid:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const settleAllTransactions = async (targetUserId?: string) => {
    if (!user || !roomId)
      throw new Error('User not authenticated or room not selected');

    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .delete()
        .eq('room_id', roomId)
        .eq('status', 'pending');

      if (targetUserId) {
        query = query
          .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
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
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `room_id=eq.${roomId}`,
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
