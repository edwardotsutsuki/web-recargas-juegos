import { createHmac } from 'node:crypto';
import { supabaseAdmin, isSupabaseConfigured } from '../repositories/supabaseClient.js';

const TERMINAL_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'recargas-pos-terminal-secret-key-2026';

export const staffService = {
  /**
   * Genera un token firmado para la sesión de terminal POS
   */
  generateTerminalToken(payload) {
    const dataStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', TERMINAL_SECRET).update(dataStr).digest('base64url');
    return `term_${dataStr}.${signature}`;
  },

  /**
   * Valida y decodifica un token de terminal POS
   */
  verifyTerminalToken(token) {
    if (!token || !token.startsWith('term_')) return null;
    try {
      const parts = token.slice(5).split('.');
      if (parts.length !== 2) return null;
      const [dataStr, signature] = parts;
      const expectedSig = createHmac('sha256', TERMINAL_SECRET).update(dataStr).digest('base64url');
      if (signature !== expectedSig) return null;

      const payload = JSON.parse(Buffer.from(dataStr, 'base64url').toString('utf8'));
      if (payload.exp && Date.now() > payload.exp) return null;
      return payload;
    } catch {
      return null;
    }
  },

  /**
   * Obtiene la lista pública de operadores disponibles para un local/tienda
   */
  async getStoreOperators(storeSlug) {
    if (!storeSlug) throw new Error('El nombre de local es requerido.');
    const cleanSlug = storeSlug.trim().toLowerCase();

    if (!isSupabaseConfigured) {
      // Mock para desarrollo
      return {
        storeName: cleanSlug === 'ryuu' ? 'Cyber Ryuu Gamer' : cleanSlug,
        storeSlug: cleanSlug,
        operators: [
          { name: 'Dueño / Admin', isMaster: true },
          { name: 'genesis', isMaster: false, role: 'cashier' },
          { name: 'carlos', isMaster: false, role: 'cashier' },
        ],
      };
    }

    // 1. Buscar local por slug
    const { data: store, error: storeErr } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, store_slug, email')
      .ilike('store_slug', cleanSlug)
      .maybeSingle();

    if (storeErr || !store) {
      const err = new Error(`El local "${cleanSlug}" no existe. Verifica el nombre con el dueño.`);
      err.status = 404;
      err.code = 'STORE_NOT_FOUND';
      throw err;
    }

    // 2. Buscar cajeros activos de este local
    const { data: staffList } = await supabaseAdmin
      .from('reseller_staff')
      .select('operator_name, role')
      .eq('reseller_id', store.id)
      .eq('is_active', true)
      .order('operator_name', { ascending: true });

    const operators = [
      { name: 'Dueño / Admin', isMaster: true },
      ...(staffList || []).map((s) => ({
        name: s.operator_name,
        isMaster: false,
        role: s.role,
      })),
    ];

    return {
      storeId: store.id,
      storeName: store.full_name || store.store_slug || 'Mi Tienda',
      storeSlug: store.store_slug,
      operators,
    };
  },

  /**
   * Inicio de sesión rápido en Terminal POS mediante PIN
   */
  async terminalLogin({ storeSlug, operatorName, pinCode }) {
    if (!storeSlug || !operatorName || !pinCode) {
      const err = new Error('Local, operador y PIN de 4 dígitos son requeridos.');
      err.status = 400;
      err.code = 'MISSING_FIELDS';
      throw err;
    }

    const cleanSlug = storeSlug.trim().toLowerCase();
    const cleanOp = operatorName.trim();
    const cleanPin = pinCode.trim();

    // 1. Obtener datos del local
    let store = null;
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, role, store_slug, master_pin')
        .ilike('store_slug', cleanSlug)
        .maybeSingle();
      if (error || !data) {
        const err = new Error(`El local "${cleanSlug}" no fue encontrado.`);
        err.status = 404;
        err.code = 'STORE_NOT_FOUND';
        throw err;
      }
      store = data;
    } else {
      store = {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'edward.otsutsuki@gmail.com',
        full_name: 'Cyber Ryuu',
        role: 'client',
        store_slug: cleanSlug,
        master_pin: '1234',
      };
    }

    // 2. Verificar si es ingreso como Dueño / Administrador
    const isMasterOperator =
      cleanOp.toLowerCase() === 'dueño / admin' ||
      cleanOp.toLowerCase() === 'dueño' ||
      cleanOp.toLowerCase() === 'admin' ||
      cleanOp.toLowerCase() === (store.full_name || '').toLowerCase();

    if (isMasterOperator) {
      const masterPin = store.master_pin || '1234';
      if (cleanPin !== masterPin) {
        const err = new Error('PIN de Dueño/Administrador incorrecto.');
        err.status = 401;
        err.code = 'INVALID_PIN';
        throw err;
      }

      // Sesión de Dueño (desbloqueada, ve ganancias y finanzas)
      const token = this.generateTerminalToken({
        userId: store.id,
        email: store.email,
        role: store.role || 'client',
        operatorName: 'Dueño',
        isCashier: false,
        storeSlug: store.store_slug,
        exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 días
      });

      return {
        token,
        isCashier: false,
        operatorName: 'Dueño',
        storeSlug: store.store_slug,
        storeName: store.full_name || store.store_slug,
        user: {
          id: store.id,
          email: store.email,
          role: store.role || 'client',
          fullName: store.full_name || 'Dueño de Tienda',
        },
      };
    }

    // 3. Verificar si es ingreso como Cajero / Empleado
    let staffMember = null;
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('reseller_staff')
        .select('*')
        .eq('reseller_id', store.id)
        .ilike('operator_name', cleanOp)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        const err = new Error(`El cajero "${cleanOp}" no está registrado o fue desactivado.`);
        err.status = 404;
        err.code = 'STAFF_NOT_FOUND';
        throw err;
      }
      staffMember = data;
    } else {
      // Mock para desarrollo
      if (cleanOp.toLowerCase() === 'genesis' || cleanOp.toLowerCase() === 'carlos') {
        staffMember = {
          operator_name: cleanOp,
          pin_code: '1234',
          role: 'cashier',
        };
      }
    }

    if (!staffMember || staffMember.pin_code !== cleanPin) {
      const err = new Error('PIN incorrecto para este cajero.');
      err.status = 401;
      err.code = 'INVALID_PIN';
      throw err;
    }

    // Sesión de Cajero (Bloqueada en Modo Mostrador, sin ganancias ni costos)
    const isCashier = staffMember.role === 'cashier';
    const token = this.generateTerminalToken({
      userId: store.id,
      email: store.email,
      role: store.role || 'client',
      operatorName: staffMember.operator_name,
      isCashier,
      storeSlug: store.store_slug,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
    });

    return {
      token,
      isCashier,
      operatorName: staffMember.operator_name,
      storeSlug: store.store_slug,
      storeName: store.full_name || store.store_slug,
      user: {
        id: store.id,
        email: store.email,
        role: store.role || 'client',
        fullName: `${staffMember.operator_name} (Cajero)`,
      },
    };
  },

  /**
   * Obtiene la configuración del local y lista de cajeros para el dueño
   */
  async getMyStaff(resellerId) {
    if (!isSupabaseConfigured) {
      return {
        storeSlug: 'ryuu',
        masterPin: '1234',
        staff: [
          { id: '1', operator_name: 'genesis', pin_code: '1234', role: 'cashier', is_active: true },
          { id: '2', operator_name: 'carlos', pin_code: '5678', role: 'cashier', is_active: true },
        ],
      };
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('store_slug, master_pin')
      .eq('id', resellerId)
      .single();

    const { data: staff } = await supabaseAdmin
      .from('reseller_staff')
      .select('*')
      .eq('reseller_id', resellerId)
      .order('created_at', { ascending: true });

    return {
      storeSlug: profile?.store_slug || '',
      masterPin: profile?.master_pin || '1234',
      staff: staff || [],
    };
  },

  /**
   * Crea o actualiza un cajero
   */
  async saveStaff(resellerId, { id, operatorName, pinCode, role = 'cashier', isActive = true }) {
    if (!operatorName || !pinCode) {
      throw new Error('Nombre del cajero y PIN de 4 dígitos son obligatorios.');
    }

    const cleanOp = operatorName.trim();
    const cleanPin = pinCode.trim().replace(/\D/g, '').slice(0, 6);
    if (cleanPin.length < 4) {
      throw new Error('El PIN debe tener al menos 4 dígitos numéricos.');
    }

    if (!isSupabaseConfigured) {
      return { id: id || `staff_${Date.now()}`, operator_name: cleanOp, pin_code: cleanPin, role, is_active: isActive };
    }

    if (id) {
      const { data, error } = await supabaseAdmin
        .from('reseller_staff')
        .update({
          operator_name: cleanOp,
          pin_code: cleanPin,
          role,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('reseller_id', resellerId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('reseller_staff')
        .insert({
          reseller_id: resellerId,
          operator_name: cleanOp,
          pin_code: cleanPin,
          role,
          is_active: isActive,
        })
        .select()
        .single();
      if (error) {
        if (error.code === '23505') {
          throw new Error(`Ya existe un cajero con el nombre "${cleanOp}" en tu local.`);
        }
        throw error;
      }
      return data;
    }
  },

  /**
   * Elimina un cajero
   */
  async deleteStaff(resellerId, staffId) {
    if (!isSupabaseConfigured) return true;
    const { error } = await supabaseAdmin
      .from('reseller_staff')
      .delete()
      .eq('id', staffId)
      .eq('reseller_id', resellerId);
    if (error) throw error;
    return true;
  },

  /**
   * Actualiza el identificador de tienda (store_slug) y el PIN maestro del dueño
   */
  async updateStoreSettings(resellerId, { storeSlug, masterPin }) {
    if (!storeSlug) throw new Error('El identificador del local es obligatorio.');
    const cleanSlug = storeSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (cleanSlug.length < 2) {
      throw new Error('El nombre de local debe tener al menos 2 caracteres alfanuméricos.');
    }

    const cleanPin = (masterPin || '1234').trim().replace(/\D/g, '').slice(0, 6);
    if (cleanPin.length < 4) {
      throw new Error('El PIN maestro debe tener al menos 4 dígitos.');
    }

    if (!isSupabaseConfigured) {
      return { storeSlug: cleanSlug, masterPin: cleanPin };
    }

    // Verificar si el slug ya está en uso por otro negocio
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('store_slug', cleanSlug)
      .neq('id', resellerId)
      .maybeSingle();

    if (existing) {
      throw new Error(`El nombre de local "${cleanSlug}" ya está registrado por otro comercio. Elige otro nombre.`);
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        store_slug: cleanSlug,
        master_pin: cleanPin,
      })
      .eq('id', resellerId);

    if (error) throw error;
    return { storeSlug: cleanSlug, masterPin: cleanPin };
  },
};
