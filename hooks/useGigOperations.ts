import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Gig, GigWithDeposits, Deposit } from '@/types';

export const useGigOperations = (
  userId: string | undefined,
  loadGigs: () => Promise<void>
) => {
  const createGig = useCallback(async (gig: Omit<Gig, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!userId) return { data: null, error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('gigs')
        .insert({
          user_id: userId,
          ...gig,
        })
        .select()
        .single();

      if (error) throw error;
      await loadGigs();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }, [userId, loadGigs]);

  const updateGig = useCallback(async (id: string, updates: Partial<Gig>) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('gigs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      await loadGigs();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [userId, loadGigs]);

  const deleteGig = useCallback(async (id: string) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('gigs')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      await loadGigs();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [userId, loadGigs]);

  const linkDepositToGig = useCallback(async (gigId: string, depositId: string) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('gig_deposits')
        .insert({
          gig_id: gigId,
          deposit_id: depositId,
          user_id: userId,
        });

      if (error) throw error;
      await loadGigs();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [userId, loadGigs]);

  const unlinkDepositFromGig = useCallback(async (gigId: string, depositId: string) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('gig_deposits')
        .delete()
        .eq('gig_id', gigId)
        .eq('deposit_id', depositId);

      if (error) throw error;
      await loadGigs();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [userId, loadGigs]);

  return {
    createGig,
    updateGig,
    deleteGig,
    linkDepositToGig,
    unlinkDepositFromGig,
  };
};
