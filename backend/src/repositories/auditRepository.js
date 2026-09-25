import { supabaseAdmin, isSupabaseConfigured } from './supabaseClient.js';

export const auditRepository = {
  async logAction({ adminId, action, targetId = null, details = {}, ipAddress = null }) {
    if (!isSupabaseConfigured) {
      console.log(`[AUDIT_LOG_DEV] Admin: ${adminId} | Action: ${action} | Target: ${targetId} | Details:`, details);
      return { id: 'mock-audit-id', admin_id: adminId, action, target_id: targetId, details, created_at: new Date().toISOString() };
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('admin_audit_logs')
        .insert({
          admin_id: adminId,
          actor_id: adminId,
          target_entity: action.includes('deposit') ? 'deposit_requests' : 'wallets',
          action,
          target_id: targetId ? String(targetId) : null,
          details,
          ip_address: ipAddress,
        })
        .select()
        .single();

      if (error) {
        console.error('[AUDIT_ERROR] Error registrando bitácora de auditoría:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[AUDIT_EXCEPTION] Excepción registrando auditoría:', err.message);
      return null;
    }
  },

  async getRecentLogs(limit = 50) {
    if (!isSupabaseConfigured) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('*, profiles:admin_id(full_name, role)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AUDIT_ERROR] Error obteniendo bitácora de auditoría:', error.message);
      return [];
    }
    return data || [];
  },
};

