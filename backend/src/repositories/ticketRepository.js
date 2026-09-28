import { supabaseAdmin, isSupabaseConfigured } from './supabaseClient.js';

function parseReplies(adminReply, ticketUpdatedAt) {
  if (!adminReply || typeof adminReply !== 'string' || !adminReply.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(adminReply);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Es string plano de versiones previas
  }
  return [
    {
      id: 'legacy-1',
      sender: 'admin',
      sender_name: 'Soporte Oficial',
      message: adminReply,
      created_at: ticketUpdatedAt || new Date().toISOString(),
    },
  ];
}

export const ticketRepository = {
  parseReplies,

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
    return (data || []).map((t) => ({
      ...t,
      replies: parseReplies(t.admin_reply, t.updated_at),
    }));
  },

  async getAllTicketsAdmin(status = null) {
    if (!isSupabaseConfigured) {
      return [];
    }

    let query = supabaseAdmin
      .from('support_tickets')
      .select('*, profiles:user_id(full_name, phone)')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map((t) => ({
      ...t,
      replies: parseReplies(t.admin_reply, t.updated_at),
    }));
  },

  async getPendingTicketsCount() {
    if (!isSupabaseConfigured) return 0;
    try {
      const { count, error } = await supabaseAdmin
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']);

      if (error) {
        console.error('Error obteniendo conteo de tickets pendientes:', error);
        return 0;
      }
      return count || 0;
    } catch (err) {
      console.error('Error getPendingTicketsCount:', err);
      return 0;
    }
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
    return {
      ...data,
      replies: [],
    };
  },

  async addReply({ ticketId, sender, senderName, message, newStatus, userId = null }) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase no está configurado');
    }

    const { data: ticket, error: fetchErr } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (fetchErr || !ticket) {
      throw new Error('Ticket no encontrado');
    }

    if (userId && ticket.user_id !== userId) {
      throw new Error('No tienes autorización para responder en este ticket.');
    }

    const currentReplies = parseReplies(ticket.admin_reply, ticket.updated_at);
    const newReply = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender, // 'admin' | 'client'
      sender_name: senderName || (sender === 'admin' ? 'Soporte Oficial' : 'Cliente'),
      message: message.trim(),
      created_at: new Date().toISOString(),
    };
    const updatedReplies = [...currentReplies, newReply];

    let finalStatus = ticket.status;
    if (newStatus) {
      finalStatus = newStatus;
    } else if (sender === 'client') {
      finalStatus = 'open';
    } else if (sender === 'admin') {
      finalStatus = 'in_progress';
    }

    const updates = {
      admin_reply: JSON.stringify(updatedReplies),
      status: finalStatus,
      updated_at: new Date().toISOString(),
    };

    if (finalStatus === 'resolved' || finalStatus === 'closed') {
      updates.resolved_at = new Date().toISOString();
    }

    const { data: updatedTicket, error: updateErr } = await supabaseAdmin
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId)
      .select('*, profiles:user_id(full_name, phone)')
      .single();

    if (updateErr) throw updateErr;

    return {
      ...updatedTicket,
      replies: updatedReplies,
    };
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
      .select('*, profiles:user_id(full_name, phone)')
      .single();

    if (error) throw error;
    return {
      ...data,
      replies: parseReplies(data.admin_reply, data.updated_at),
    };
  },
};
