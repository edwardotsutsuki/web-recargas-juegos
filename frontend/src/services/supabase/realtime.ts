import { supabase, isSupabaseConfigured } from './client';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Subscribes to realtime updates for the current user's wallet.
 * When an admin credits the wallet or an order settles, the balance is refreshed automatically.
 */
export function subscribeToUserWallet(
  userId: string,
  onUpdate: (payload: any) => void
): RealtimeChannel | null {
  if (!isSupabaseConfigured || !userId) return null;

  const channel = supabase
    .channel(`wallet:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'wallets',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onUpdate(payload);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribes to realtime updates for the user's orders (e.g., status changes to completed/failed).
 */
export function subscribeToUserOrders(
  userId: string,
  onOrderUpdate: (payload: any) => void
): RealtimeChannel | null {
  if (!isSupabaseConfigured || !userId) return null;

  const channel = supabase
    .channel(`orders:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onOrderUpdate(payload);
      }
    )
    .subscribe();

  return channel;
}

