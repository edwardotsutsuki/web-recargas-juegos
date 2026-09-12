import { authMiddleware } from '../middleware/auth.js';
import { sendJson, sendError } from '../middleware/errorHandler.js';
import { catalogService } from '../services/catalogService.js';
import { playerService } from '../services/playerService.js';
import { orderService } from '../services/orderService.js';
import { walletService } from '../services/walletService.js';
import { metricsService } from '../services/metricsService.js';
import { depositService } from '../services/depositService.js';
import { balanceMonitorService } from '../services/balanceMonitorService.js';
import { resellerService } from '../services/resellerService.js';
import { promotionRepository } from '../repositories/promotionRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { materialsRepository } from '../repositories/materialsRepository.js';
import { ticketRepository } from '../repositories/ticketRepository.js';
import { twoFactorService } from '../services/twoFactorService.js';
import { emailService } from '../services/emailService.js';
import { supabaseAdmin, isSupabaseConfigured } from '../repositories/supabaseClient.js';

async function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
  });
}

export async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  const method = req.method;

  // ---------------------------------------------------------------------------
  // 1. Rutas Públicas (Catálogo, ID Jugador, Estado del Sistema y Métodos de Pago)
  // ---------------------------------------------------------------------------
  try {
    if (method === 'GET' && pathname === '/health') {
      return sendJson(res, 200, { status: 'ok', scope: 'process' });
    }

    // Estado del sistema y Circuit Breaker para la tienda
    if (method === 'GET' && pathname === '/system/status') {
      const status = await balanceMonitorService.getStatus(false);
      return sendJson(res, 200, status);
    }

    // Métodos de pago y cuentas bancarias autorizadas
    if (method === 'GET' && pathname === '/payment-methods') {
      const methods = await depositService.getPaymentMethods();
      return sendJson(res, 200, methods);
    }

    // Promociones activas para la tienda y banners
    if (method === 'GET' && pathname === '/promotions') {
      const promos = await promotionRepository.getActivePromotions();
      return sendJson(res, 200, promos);
    }

    // Materiales promocionales y descargables activos para revendedores
    if (method === 'GET' && pathname === '/promotional-materials') {
      const materials = await materialsRepository.getActiveMaterials();
      return sendJson(res, 200, materials);
    }

    if (method === 'GET' && pathname === '/catalog/games') {
      const games = await catalogService.getGamesList();
      return sendJson(res, 200, games);
    }

    if (method === 'GET' && pathname.startsWith('/catalog/games/')) {
      const gameId = pathname.replace('/catalog/games/', '');
      const gameDetails = await catalogService.getGameDetails(gameId);
      if (!gameDetails) {
        return sendError(res, 404, 'GAME_NOT_FOUND', `El juego "${gameId}" no fue encontrado en el catálogo.`);
      }
      return sendJson(res, 200, gameDetails);
    }

    if (method === 'GET' && pathname === '/catalog') {
      const catalog = await catalogService.getCatalog();
      return sendJson(res, 200, catalog);
    }

    if (method === 'POST' && pathname === '/verify-player') {
      const body = await parseBody(req);
      const result = await playerService.verifyPlayer({
        sku: body.productId || body.sku,
        playerId: body.playerId,
        server: body.server,
        zoneId: body.serverZone || body.zoneId,
      });
      return sendJson(res, 200, result);
    }

    // --- Verificación de Código 2FA (Soporta flujo de login y activación con secret) ---
    if (method === 'POST' && pathname === '/auth/2fa/verify') {
      const body = await parseBody(req);
      const { secret, token, userId } = body;

      if (!token) {
        return sendError(res, 400, 'MISSING_TOKEN', 'Debes proporcionar el código de 6 dígitos.');
      }

      const authUser = await authMiddleware(req);

      // CASO 1: Activación desde Mi Perfil (se envía secret y token)
      if (secret) {
        if (!authUser) {
          return sendError(res, 401, 'UNAUTHORIZED', 'Debes tener una sesión activa para configurar 2FA.');
        }

        const isValid = twoFactorService.verifyToken(secret, token, 2);
        if (!isValid) {
          return sendError(res, 400, 'INVALID_2FA_CODE', 'El código de 6 dígitos es incorrecto o ha expirado. Verifica la hora de tu dispositivo e inténtalo de nuevo.');
        }

        if (isSupabaseConfigured) {
          const { error: updateErr } = await supabaseAdmin
            .from('profiles')
            .update({
              two_factor_enabled: true,
              two_factor_secret: secret,
            })
            .eq('id', authUser.id);

          if (updateErr) {
            console.error('[2FA_ACTIVATE_ERROR] Fallo al actualizar profiles:', updateErr);
            return sendError(res, 500, 'DB_ERROR', updateErr.message || 'No se pudo guardar la configuración 2FA.');
          }
        }

        return sendJson(res, 200, {
          success: true,
          message: '¡Verificación en dos pasos (2FA) activada exitosamente!',
        });
      }

      // CASO 2: Verificación durante el Login (no se envía secret, se consulta en DB)
      const targetUserId = authUser?.id || userId;
      if (!targetUserId) {
        return sendError(res, 400, 'MISSING_USER_ID', 'Se requiere el identificador de usuario para validar 2FA.');
      }

      if (isSupabaseConfigured) {
        const { data: profile, error: profileErr } = await supabaseAdmin
          .from('profiles')
          .select('two_factor_enabled, two_factor_secret')
          .eq('id', targetUserId)
          .single();

        if (profileErr || !profile) {
          return sendError(res, 404, 'USER_NOT_FOUND', 'Perfil de usuario no encontrado.');
        }

        if (!profile.two_factor_enabled || !profile.two_factor_secret) {
          return sendJson(res, 200, {
            success: true,
            message: 'El usuario no tiene 2FA requerido.',
          });
        }

        const isValid = twoFactorService.verifyToken(profile.two_factor_secret, token, 2);
        if (!isValid) {
          return sendError(res, 400, 'INVALID_2FA_CODE', 'Código 2FA incorrecto o expirado.');
        }

        return sendJson(res, 200, {
          success: true,
          message: 'Código 2FA verificado correctamente.',
        });
      } else {
        const isValid = token === '123456' || twoFactorService.verifyToken('JBSWY3DPEHPK3PXP', token, 2);
        if (!isValid) {
          return sendError(res, 400, 'INVALID_2FA_CODE', 'Código 2FA incorrecto o expirado.');
        }
        return sendJson(res, 200, {
          success: true,
          message: 'Código 2FA verificado (Modo Local).',
        });
      }
    }
  } catch (err) {
    const status = err.status || 500;
    const code = err.code || 'CATALOG_ERROR';
    return sendError(res, status, code, err.message);
  }

  // ---------------------------------------------------------------------------
  // 2. Autenticación de Supabase (Requerida para Billetera, Órdenes, Revendedores y Admin)
  // ---------------------------------------------------------------------------
  const user = await authMiddleware(req);
  if (!user) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Autenticación requerida. Token de Supabase no válido o ausente.');
  }

  try {
    // -------------------------------------------------------------------------
    // Billetera & Solicitudes de Depósito (Cliente / Socio Revendedor)
    // -------------------------------------------------------------------------
    if (method === 'GET' && pathname === '/wallet') {
      const wallet = await walletService.getWallet(user.id);
      return sendJson(res, 200, wallet);
    }

    if (method === 'POST' && pathname === '/wallet/deposits') {
      const body = await parseBody(req);
      const deposit = await depositService.submitDepositRequest({
        userId: user.id,
        paymentMethodId: body.paymentMethodId || body.payment_method_id,
        bankName: body.bankName || body.bank_name,
        amountCents: body.amountCents || Math.round(Number(body.amount || 0) * 100),
        currency: body.currency || 'USD',
        referenceNumber: body.referenceNumber || body.reference_number,
        voucherUrl: body.voucherUrl || body.voucher_url,
      });
      return sendJson(res, 201, {
        success: true,
        message: 'Solicitud de depósito enviada correctamente para revisión administrativa.',
        data: deposit,
      });
    }

    if (method === 'GET' && pathname === '/wallet/deposits') {
      const deposits = await depositService.getMyDeposits(user.id);
      return sendJson(res, 200, deposits);
    }

    // -------------------------------------------------------------------------
    // Módulos de Revendedor (Precios PVP, Libro Contable, Recompensas y Referidos)
    // -------------------------------------------------------------------------
    if (method === 'GET' && pathname === '/reseller/prices') {
      const prices = await resellerService.getCustomPrices(user.id);
      return sendJson(res, 200, prices);
    }

    if (method === 'POST' && pathname === '/reseller/prices') {
      const body = await parseBody(req);
      const updated = await resellerService.setCustomPrice(
        user.id,
        body.sku,
        body.custom_pvp_cents ?? Math.round(Number(body.pvp_usd || 0) * 100)
      );
      return sendJson(res, 200, { success: true, data: updated });
    }

    if (method === 'GET' && pathname === '/reseller/accounting') {
      const book = await resellerService.getAccountingBook(user.id);
      return sendJson(res, 200, book);
    }

    if (method === 'GET' && pathname === '/reseller/rewards') {
      const rewards = await resellerService.getRewardsProgress(user.id);
      return sendJson(res, 200, rewards);
    }

    if (method === 'GET' && pathname === '/reseller/referrals') {
      const referrals = await resellerService.getReferralInfo(user.id);
      return sendJson(res, 200, referrals);
    }

    // --- Mesa de Ayuda: Tickets de Soporte (Cliente) ---
    if (method === 'GET' && pathname === '/tickets') {
      const tickets = await ticketRepository.getUserTickets(user.id);
      return sendJson(res, 200, tickets);
    }

    if (method === 'POST' && pathname === '/tickets') {
      const body = await parseBody(req);
      if (!body.subject || !body.message) {
        return sendError(res, 400, 'FIELDS_REQUIRED', 'El asunto y el mensaje son obligatorios.');
      }
      const ticket = await ticketRepository.createTicket({
        userId: user.id,
        userEmail: user.email,
        subject: body.subject,
        category: body.category || 'recharge_issue',
        message: body.message,
        priority: body.priority || 'normal',
      });
      return sendJson(res, 201, ticket);
    }

    // --- Seguridad: Verificación en Dos Pasos (2FA) ---
    if (method === 'POST' && pathname === '/auth/2fa/setup') {
      const { secret, otpauthUrl, qrCodeUrl } = twoFactorService.generateSecret({
        email: user.email,
        issuer: 'Recargas Juegos Online',
      });
      return sendJson(res, 200, { secret, otpauthUrl, qrCodeUrl });
    }

    if (method === 'POST' && pathname === '/auth/2fa/disable') {
      const body = await parseBody(req);
      const { token } = body;

      if (isSupabaseConfigured) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('two_factor_secret')
          .eq('id', user.id)
          .single();

        // Si se provee token, validarlo; si no se provee, la sesión autenticada es suficiente
        if (profile?.two_factor_secret && token) {
          const isValid = twoFactorService.verifyToken(profile.two_factor_secret, token, 2);
          if (!isValid) {
            return sendError(res, 400, 'INVALID_2FA_CODE', 'Código de autenticación inválido para desactivar 2FA.');
          }
        }

        await supabaseAdmin
          .from('profiles')
          .update({
            two_factor_enabled: false,
            two_factor_secret: null,
          })
          .eq('id', user.id);
      }

      return sendJson(res, 200, {
        success: true,
        message: 'Verificación en dos pasos (2FA) desactivada.',
      });
    }

    // -------------------------------------------------------------------------
    // Rutas de Órdenes (Con protección de Circuit Breaker)
    // -------------------------------------------------------------------------
    if (method === 'POST' && pathname === '/orders') {
      // Verificar si el Circuit Breaker está activo antes de aceptar la orden
      await balanceMonitorService.checkOrderPermission();

      const body = await parseBody(req);
      const idempotencyKey = req.headers['idempotency-key'];

      const order = await orderService.createOrder({
        userId: user.id,
        sku: body.productId || body.sku,
        playerPayload: {
          id: body.playerId,
          name: body.playerName,
          server: body.serverZone || body.server,
        },
        currency: body.currency || 'USD',
        idempotencyKey,
      });

      return sendJson(res, 202, {
        orderId: order.order_id,
        status: order.status,
        message: 'Orden aceptada y encolada para despacho',
      });
    }

    if (method === 'GET' && pathname === '/orders') {
      const orders = await orderService.getMyOrders(user.id);
      return sendJson(res, 200, orders);
    }

    if (method === 'GET' && pathname.startsWith('/orders/')) {
      const orderId = pathname.replace('/orders/', '');
      const order = await orderService.getOrderById(orderId, user.id);
      if (!order) {
        return sendError(res, 404, 'ORDER_NOT_FOUND', 'Orden no encontrada o no pertenece al usuario.');
      }
      return sendJson(res, 200, order);
    }

    // -------------------------------------------------------------------------
    // Rutas de Administración Secreta (RBAC: role === 'admin')
    // Comportamiento de Seguridad: Respuesta 404 para no autorizados
    // -------------------------------------------------------------------------
    if (pathname.startsWith('/admin')) {
      if (user.role !== 'admin') {
        return sendError(res, 404, 'NOT_FOUND', `Ruta ${method} ${pathname} no encontrada.`);
      }

      // GET /admin/system/status
      if (method === 'GET' && pathname === '/admin/system/status') {
        const forceRefresh = url.searchParams.get('refresh') === 'true';
        const status = await balanceMonitorService.getStatus(forceRefresh);
        return sendJson(res, 200, status);
      }

      // PUT /admin/system/settings
      if ((method === 'PUT' || method === 'POST') && pathname === '/admin/system/settings') {
        const body = await parseBody(req);
        const updated = await balanceMonitorService.updateSystemSettings(body);
        return sendJson(res, 200, { success: true, settings: updated });
      }

      // GET /admin/deposits/pending-count
      if (method === 'GET' && pathname === '/admin/deposits/pending-count') {
        const count = await depositService.getPendingDepositsCount();
        return sendJson(res, 200, { pending_count: count });
      }

      // GET /admin/deposits
      if (method === 'GET' && pathname === '/admin/deposits') {
        const status = url.searchParams.get('status');
        const deposits = await depositService.getAllDeposits({ status });
        return sendJson(res, 200, deposits);
      }

      // POST /admin/deposits/:id/approve
      if (method === 'POST' && pathname.match(/^\/admin\/deposits\/[^/]+\/approve$/)) {
        const requestId = pathname.split('/')[3];
        const body = await parseBody(req);
        const result = await depositService.approveDeposit({
          requestId,
          adminId: user.id,
          compressedVoucherUrl: body.compressedVoucherUrl || null,
        });
        return sendJson(res, 200, {
          success: true,
          message: 'Depósito aprobado y saldo acreditado exitosamente.',
          data: result,
        });
      }

      // POST /admin/deposits/:id/reject
      if (method === 'POST' && pathname.match(/^\/admin\/deposits\/[^/]+\/reject$/)) {
        const requestId = pathname.split('/')[3];
        const body = await parseBody(req);
        const result = await depositService.rejectDeposit({
          requestId,
          adminId: user.id,
          reason: body.reason,
        });
        return sendJson(res, 200, {
          success: true,
          message: 'Depósito rechazado.',
          data: result,
        });
      }

      // --- Módulo Admin: Gestión de Cuentas Bancarias ---
      // GET /admin/payment-methods
      if (method === 'GET' && pathname === '/admin/payment-methods') {
        const methods = await depositService.getAllPaymentMethodsAdmin();
        return sendJson(res, 200, methods);
      }

      // POST /admin/payment-methods
      if (method === 'POST' && pathname === '/admin/payment-methods') {
        const body = await parseBody(req);
        const created = await depositService.createPaymentMethod(body);
        return sendJson(res, 201, created);
      }

      // PUT /admin/payment-methods/:id
      if (method === 'PUT' && pathname.match(/^\/admin\/payment-methods\/[^/]+$/)) {
        const methodId = pathname.split('/')[3];
        const body = await parseBody(req);
        const updated = await depositService.updatePaymentMethod(methodId, body);
        return sendJson(res, 200, updated);
      }

      // DELETE /admin/payment-methods/:id
      if (method === 'DELETE' && pathname.match(/^\/admin\/payment-methods\/[^/]+$/)) {
        const methodId = pathname.split('/')[3];
        await depositService.deletePaymentMethod(methodId);
        return sendJson(res, 200, { success: true });
      }

      // POST /admin/wallets/:userId/credits
      if (method === 'POST' && pathname.match(/^\/admin\/wallets\/[^/]+\/credits$/)) {
        const parts = pathname.split('/');
        const targetUserId = parts[3];
        const body = await parseBody(req);
        const idempotencyKey = req.headers['idempotency-key'];

        const creditResult = await walletService.creditWallet({
          userId: targetUserId,
          amountMinor: Number(body.amountMinor || body.amount_cents || 0),
          currency: body.currency || 'USD',
          idempotencyKey,
          reason: body.reason,
          actorId: user.id,
        });

        return sendJson(res, 200, {
          success: true,
          message: 'Saldo acreditado exitosamente',
          data: creditResult,
        });
      }

      // GET /admin/metrics
      if (method === 'GET' && pathname === '/admin/metrics') {
        const metrics = await metricsService.getAdminMetrics();
        return sendJson(res, 200, metrics);
      }

      // GET /admin/users
      if (method === 'GET' && pathname === '/admin/users') {
        if (isSupabaseConfigured) {
          try {
            const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100 });
            const authUsers = authData?.users || [];

            const { data: profiles } = await supabaseAdmin
              .from('profiles')
              .select('id, role, full_name, phone, referral_code, two_factor_enabled, created_at, wallets(*)');

            const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

            const combined = authUsers.map((u) => {
              const p = profileMap.get(u.id);
              const w = (p?.wallets && p.wallets.length > 0) ? p.wallets[0] : {};
              return {
                id: u.id,
                email: u.email || '',
                full_name: p?.full_name || u.user_metadata?.full_name || 'Sin nombre',
                role: p?.role || 'client',
                phone: p?.phone || '',
                referral_code: p?.referral_code || null,
                two_factor_enabled: Boolean(p?.two_factor_enabled),
                created_at: p?.created_at || u.created_at,
                wallet: {
                  total_balance_cents: Number(w.balance_minor || 0),
                  held_balance_cents: Number(w.held_minor || 0),
                  available_balance_cents: Number(w.available_minor ?? w.balance_minor ?? 0),
                  currency: w.currency || 'USD',
                },
              };
            });

            return sendJson(res, 200, combined);
          } catch (err) {
            console.error('Error en GET /admin/users:', err);
            return sendError(res, 500, 'USERS_FETCH_ERROR', 'Error obteniendo directorio de usuarios');
          }
        } else {
          return sendJson(res, 200, [
            {
              id: '00000000-0000-0000-0000-000000000001',
              email: 'b.edumalta@gmail.com',
              full_name: 'Super Admin (Edward Malta)',
              role: 'admin',
              two_factor_enabled: false,
              wallet: {
                total_balance_cents: 0,
                held_balance_cents: 0,
                available_balance_cents: 0,
                currency: 'USD',
              },
            },
            {
              id: '00000000-0000-0000-0000-000000000002',
              email: 'edward.otsutsuki@gmail.com',
              full_name: 'Edward Otsutsuki',
              role: 'client',
              two_factor_enabled: false,
              wallet: {
                total_balance_cents: 15000,
                held_balance_cents: 0,
                available_balance_cents: 15000,
                currency: 'USD',
              },
            },
            {
              id: '00000000-0000-0000-0000-000000000003',
              email: 'salvatierragenesis73@gmail.com',
              full_name: 'Genesis Salvatierra',
              role: 'client',
              two_factor_enabled: false,
              wallet: {
                total_balance_cents: 7500,
                held_balance_cents: 0,
                available_balance_cents: 7500,
                currency: 'USD',
              },
            },
          ]);
        }
      }

      // POST /admin/users/:id/password
      if (method === 'POST' && pathname.match(/^\/admin\/users\/[^/]+\/password$/)) {
        const targetUserId = pathname.split('/')[3];
        const body = await parseBody(req);
        const { newPassword, sendEmail } = body;

        if (!newPassword || newPassword.length < 6) {
          return sendError(res, 400, 'INVALID_PASSWORD', 'La contraseña debe tener al menos 6 caracteres.');
        }

        let userEmail = '';
        let fullName = '';

        if (isSupabaseConfigured) {
          const { data: updatedData, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
            targetUserId,
            { password: newPassword }
          );

          if (updateErr) {
            return sendError(res, 500, 'PASSWORD_UPDATE_FAILED', updateErr.message);
          }
          userEmail = updatedData.user.email;
          fullName = updatedData.user.user_metadata?.full_name;
        }

        // Registrar en bitácora de auditoría
        await auditRepository.logAction({
          adminId: user.id,
          action: 'reset_user_password',
          targetId: targetUserId,
          details: {
            user_email: userEmail,
            email_notified: Boolean(sendEmail),
          },
        });

        if (sendEmail && userEmail) {
          await emailService.sendPasswordResetNotification({
            toEmail: userEmail,
            recipientName: fullName,
            newPassword,
          });
        }

        return sendJson(res, 200, {
          success: true,
          message: `Contraseña actualizada exitosamente.${sendEmail ? ' Se envió notificación al cliente.' : ''}`,
        });
      }

      // POST /admin/users/:id/2fa/disable
      if (method === 'POST' && pathname.match(/^\/admin\/users\/[^/]+\/2fa\/disable$/)) {
        const targetUserId = pathname.split('/')[3];

        if (isSupabaseConfigured) {
          const { error: updateErr } = await supabaseAdmin
            .from('profiles')
            .update({
              two_factor_enabled: false,
              two_factor_secret: null,
            })
            .eq('id', targetUserId);

          if (updateErr) {
            return sendError(res, 500, '2FA_DISABLE_FAILED', updateErr.message);
          }
        }

        // Registrar en bitácora de auditoría
        await auditRepository.logAction({
          adminId: user.id,
          action: 'admin_disable_user_2fa',
          targetId: targetUserId,
          details: {
            reason: 'Restablecimiento de emergencia por Administrador',
          },
        });

        return sendJson(res, 200, {
          success: true,
          message: 'Autenticación en dos pasos (2FA) desactivada para el usuario.',
        });
      }

      // GET /admin/orders
      if (method === 'GET' && pathname === '/admin/orders') {
        const globalOrders = await orderService.getGlobalOrders();
        return sendJson(res, 200, globalOrders);
      }

      // --- Módulo Admin: Gestión de Promociones y Avisos ---
      // GET /admin/promotions
      if (method === 'GET' && pathname === '/admin/promotions') {
        const list = await promotionRepository.getAllPromotions();
        return sendJson(res, 200, list);
      }

      // POST /admin/promotions
      if (method === 'POST' && pathname === '/admin/promotions') {
        const body = await parseBody(req);
        const created = await promotionRepository.createPromotion(body);
        return sendJson(res, 201, created);
      }

      // PUT /admin/promotions/:id
      if (method === 'PUT' && pathname.match(/^\/admin\/promotions\/[^/]+$/)) {
        const promoId = pathname.split('/')[3];
        const body = await parseBody(req);
        const updated = await promotionRepository.updatePromotion(promoId, body);
        return sendJson(res, 200, updated);
      }

      // DELETE /admin/promotions/:id
      if (method === 'DELETE' && pathname.match(/^\/admin\/promotions\/[^/]+$/)) {
        const promoId = pathname.split('/')[3];
        await promotionRepository.deletePromotion(promoId);
        return sendJson(res, 200, { success: true });
      }

      // --- Módulo Admin: Personalización de Juegos y Portadas ---
      // GET /admin/catalog/games
      if (method === 'GET' && pathname === '/admin/catalog/games') {
        const allGames = await catalogService.getGamesList({ includeHidden: true });
        return sendJson(res, 200, allGames);
      }

      // PUT /admin/catalog/games/:gameId
      if (method === 'PUT' && pathname.match(/^\/admin\/catalog\/games\/[^/]+$/)) {
        const gameId = pathname.split('/')[4];
        const body = await parseBody(req);
        const result = await catalogService.updateGameOverride(gameId, body);
        return sendJson(res, 200, { success: true, data: result });
      }

      // POST /admin/catalog/sync (Sincronización forzada bajo demanda)
      if (method === 'POST' && pathname === '/admin/catalog/sync') {
        const syncResult = await catalogService.syncCatalogWithProvider({ force: true });
        return sendJson(res, 200, syncResult);
      }

      // --- Módulo Admin: Recompensas Personalizadas ---
      // GET /admin/rewards
      if (method === 'GET' && pathname === '/admin/rewards') {
        const rewards = await resellerService.getAllRewardsAdmin();
        return sendJson(res, 200, rewards);
      }

      // POST /admin/rewards
      if (method === 'POST' && pathname === '/admin/rewards') {
        const body = await parseBody(req);
        const created = await resellerService.createRewardAdmin(body);
        return sendJson(res, 201, created);
      }

      // PUT /admin/rewards/:id
      if (method === 'PUT' && pathname.match(/^\/admin\/rewards\/[^/]+$/)) {
        const rewardId = pathname.split('/')[3];
        const body = await parseBody(req);
        const updated = await resellerService.updateRewardAdmin(rewardId, body);
        return sendJson(res, 200, updated);
      }

      // DELETE /admin/rewards/:id
      if (method === 'DELETE' && pathname.match(/^\/admin\/rewards\/[^/]+$/)) {
        const rewardId = pathname.split('/')[3];
        await resellerService.deleteRewardAdmin(rewardId);
        return sendJson(res, 200, { success: true });
      }

      // --- Módulo Admin: Bitácora Inmutable de Auditoría ---
      // GET /admin/audit-logs
      if (method === 'GET' && pathname === '/admin/audit-logs') {
        const limit = Number(url.searchParams.get('limit')) || 50;
        const logs = await auditRepository.getRecentLogs(limit);
        return sendJson(res, 200, logs);
      }

      // --- Módulo Admin: Materiales Promocionales & Descargas ---
      // GET /admin/promotional-materials
      if (method === 'GET' && pathname === '/admin/promotional-materials') {
        const materials = await materialsRepository.getAllMaterialsAdmin();
        return sendJson(res, 200, materials);
      }

      // POST /admin/promotional-materials
      if (method === 'POST' && pathname === '/admin/promotional-materials') {
        const body = await parseBody(req);
        const created = await materialsRepository.createMaterial(body);
        return sendJson(res, 201, created);
      }

      // PUT /admin/promotional-materials/:id
      if (method === 'PUT' && pathname.match(/^\/admin\/promotional-materials\/[^/]+$/)) {
        const matId = pathname.split('/')[3];
        const body = await parseBody(req);
        const updated = await materialsRepository.updateMaterial(matId, body);
        return sendJson(res, 200, updated);
      }

      // DELETE /admin/promotional-materials/:id
      if (method === 'DELETE' && pathname.match(/^\/admin\/promotional-materials\/[^/]+$/)) {
        const matId = pathname.split('/')[3];
        await materialsRepository.deleteMaterial(matId);
        return sendJson(res, 200, { success: true });
      }

      // --- Módulo Admin: Mesa de Ayuda & Tickets de Soporte ---
      // GET /admin/tickets
      if (method === 'GET' && pathname === '/admin/tickets') {
        const tickets = await ticketRepository.getAllTicketsAdmin();
        return sendJson(res, 200, tickets);
      }

      // PUT /admin/tickets/:id
      if (method === 'PUT' && pathname.match(/^\/admin\/tickets\/[^/]+$/)) {
        const ticketId = pathname.split('/')[3];
        const body = await parseBody(req);
        const updated = await ticketRepository.updateTicketAdmin(ticketId, body);

        if (body.admin_reply && updated.user_email) {
          await emailService.sendTicketReplyNotification({
            toEmail: updated.user_email,
            ticketSubject: updated.subject,
            adminReply: body.admin_reply,
          });
        }

        return sendJson(res, 200, updated);
      }
    }

    // Ruta no encontrada
    return sendError(res, 404, 'NOT_FOUND', `Ruta ${method} ${pathname} no encontrada.`);
  } catch (err) {
    const status = err.status || 500;
    const code = err.code || 'INTERNAL_SERVER_ERROR';
    const message = err.message || 'Error inesperado del servidor';
    return sendError(res, status, code, message, err.detail || null);
  }
}
