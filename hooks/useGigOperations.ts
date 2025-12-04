import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Gig, GigWithPaychecks, Paycheck } from '@/types';

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

  const linkPaycheckToGig = useCallback(async (gigId: string, paycheckId: string) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('gig_paychecks')
        .insert({
          gig_id: gigId,
          paycheck_id: paycheckId,
        });

      if (error) throw error;
      await loadGigs();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [userId, loadGigs]);

  const unlinkPaycheckFromGig = useCallback(async (gigId: string, paycheckId: string) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('gig_paychecks')
        .delete()
        .eq('gig_id', gigId)
        .eq('paycheck_id', paycheckId);

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
    linkPaycheckToGig,
    unlinkPaycheckFromGig,
  };
};
