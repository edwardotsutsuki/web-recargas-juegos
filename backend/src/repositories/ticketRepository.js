import { supabaseAdmin, isSupabaseConfigured } from './supabaseClient.js';

export const ticketRepository = {
  async getUserTickets(userId) {
    if (!isSupabaseConfigured) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getAllTicketsAdmin() {
    if (!isSupabaseConfigured) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .select('*, profiles:user_id(full_name, phone)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createTicket({ userId, userEmail, subject, category, message, priority = 'normal' }) {
    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        user_id: userId,
        user_email: userEmail,
        subject,
        category,
        message,
        priority,
        status: 'open',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTicketAdmin(id, { status, admin_reply }) {
    const updates = {
      updated_at: new Date().toISOString(),
    };
    if (status !== undefined) {
      updates.status = status;
      if (status === 'resolved' || status === 'closed') {
        updates.resolved_at = new Date().toISOString();
      }
    }
    if (admin_reply !== undefined) {
      updates.admin_reply = admin_reply;
    }

    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

