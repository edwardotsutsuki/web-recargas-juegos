import { supabaseAdmin, isSupabaseConfigured } from '../repositories/supabaseClient.js';
import { staffService } from '../services/staffService.js';

export async function authMiddleware(req) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];

  // Token de Terminal POS (Cajero o Dueño con PIN)
  if (token && token.startsWith('term_')) {
    const termUser = staffService.verifyTerminalToken(token);
    if (termUser) {
      return {
        id: termUser.userId,
        email: termUser.email,
        role: termUser.role || 'client',
        operatorName: termUser.operatorName,
        isCashier: termUser.isCashier === true,
        storeSlug: termUser.storeSlug,
      };
    }
    return null;
  }

  // En modo desarrollo, permitir tokens de desarrollo mapeados a usuarios sembrados en la BD
  if (process.env.NODE_ENV === 'development') {
    if (token === 'dev-admin-token') {
      return {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'b.edumalta@gmail.com',
        role: 'admin',
      };
    }
    if (token === 'dev-client-token' || token === 'dev-reseller-token') {
      return {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'edward.otsutsuki@gmail.com',
        role: 'client',
      };
    }
    if (token === 'dev-client-2-token') {
      return {
        id: '00000000-0000-0000-0000-000000000003',
        email: 'salvatierragenesis73@gmail.com',
        role: 'client',
      };
    }
  }

  if (!isSupabaseConfigured) {
    // Modo desarrollo local sin Supabase: simular usuario autenticado según token o rol
    return {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'gamer@nexuspay.gg',
      role: 'admin',
    };
  }

  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return null;

    // Obtener rol verificado de la tabla profiles
    let role = user.email === 'b.edumalta@gmail.com' ? 'admin' : 'client';
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role) {
        role = profile.role;
      }
    } catch {
      // Usar rol por defecto o super admin
    }

    return {
      id: user.id,
      email: user.email,
      role,
    };
  } catch {
    return null;
  }
}

