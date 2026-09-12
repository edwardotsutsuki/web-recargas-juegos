import { supabaseAdmin, isSupabaseConfigured } from '../repositories/supabaseClient.js';

export const emailService = {
  /**
   * Obtiene la dirección del remitente oficial configurada
   */
  async getSenderConfig() {
    let email = 'notificaciones@recargasjuegospro.cloud';
    const name = 'Recargas Juegos Online';

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabaseAdmin
          .from('system_settings')
          .select('notification_sender_email')
          .eq('id', 'singleton')
          .single();

        if (data?.notification_sender_email) {
          email = data.notification_sender_email.trim();
        }
      } catch {
        // Fallback a default
      }
    }

    return {
      email,
      name,
      formattedFrom: `${name} <${email}>`,
    };
  },

  /**
   * Despacha un correo electrónico usando la API de Resend
   * Si no hay API Key configurada, realiza una simulación auditable en consola.
   */
  async sendEmail({ to, subject, html, text }) {
    const sender = await this.getSenderConfig();
    const apiKey = process.env.RESEND_API_KEY?.trim();

    if (apiKey && apiKey.startsWith('re_')) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: sender.formattedFrom,
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            text: text || subject,
          }),
        });

        const resData = await response.json();

        if (!response.ok) {
          console.error('[RESEND_API_ERROR] Falló el despacho de correo:', resData);
          return {
            success: false,
            error: resData.message || 'Error en servicio Resend',
            from: sender.formattedFrom,
            to,
          };
        }

        console.log(`[RESEND_SUCCESS] Correo despachado con éxito id=${resData.id} a "${to}"`);
        return {
          success: true,
          id: resData.id,
          from: sender.formattedFrom,
          to,
          provider: 'resend',
          timestamp: new Date().toISOString(),
        };
      } catch (err) {
        console.error('[RESEND_NETWORK_ERROR] Error de conexión con Resend:', err.message);
        return { success: false, error: err.message, to };
      }
    }

    // Modo Desarrollo / Simulación Local si no hay API Key
    console.log('\n======================================================');
    console.log('📧 [EMAIL_SIMULATION - RESEND NO CONFIGURADO]');
    console.log(`  De: "${sender.formattedFrom}"`);
    console.log(`  Para: "${to}"`);
    console.log(`  Asunto: "${subject}"`);
    console.log('  Cuerpo: (Plantilla HTML generada)');
    console.log('======================================================\n');

    return {
      success: true,
      simulated: true,
      from: sender.formattedFrom,
      to,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Envía correo con nueva contraseña temporal al socio revendedor
   */
  async sendPasswordResetNotification({ toEmail, recipientName, newPassword }) {
    const subject = '🔐 Tus credenciales de acceso a Recargas Juegos Online';
    const siteUrl = process.env.SITE_URL || 'https://recargasjuegospro.cloud';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080c14; color: #e2e8f0; margin: 0; padding: 20px; }
    .card { max-width: 540px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .logo-badge { display: inline-block; background: linear-gradient(135deg, #06b6d4, #6366f1); padding: 8px 16px; border-radius: 8px; color: #ffffff; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
    h2 { color: #ffffff; margin-top: 0; font-size: 20px; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; }
    .cred-box { background: #080d18; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin: 24px 0; }
    .cred-item { margin-bottom: 8px; font-size: 13px; color: #cbd5e1; }
    .cred-label { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px; display: block; margin-bottom: 2px; }
    .cred-val { font-family: monospace; font-size: 16px; font-weight: bold; color: #38bdf8; letter-spacing: 1px; }
    .btn { display: inline-block; background: #06b6d4; color: #020617; font-weight: bold; font-size: 14px; padding: 12px 24px; border-radius: 10px; text-decoration: none; margin-top: 10px; }
    .footer { margin-top: 30px; border-top: 1px solid #1e293b; padding-top: 15px; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-badge">Recargas Juegos Online</div>
    <h2>Actualización de Credenciales</h2>
    <p>Hola <strong>${recipientName || 'Socio Revendedor'}</strong>,</p>
    <p>El administrador de la plataforma ha asignado o restablecido tu contraseña de acceso a tu panel de ventas:</p>

    <div class="cred-box">
      <div class="cred-item">
        <span class="cred-label">Correo Electrónico:</span>
        <span style="font-size: 14px; color: #ffffff;">${toEmail}</span>
      </div>
      <div class="cred-item" style="margin-top: 12px; margin-bottom: 0;">
        <span class="cred-label">Contraseña Temporal:</span>
        <span class="cred-val">${newPassword}</span>
      </div>
    </div>

    <p style="font-size: 12px; color: #f59e0b;">
      ⚠️ <strong>Recomendación de Seguridad:</strong> Te recomendamos cambiar esta contraseña desde la sección <em>Mi Perfil</em> en cuanto inicies sesión.
    </p>

    <div style="text-align: center; margin: 25px 0;">
      <a href="${siteUrl}/login" class="btn" target="_blank">Iniciar Sesión en el Portal</a>
    </div>

    <div class="footer">
      Este correo fue emitido automáticamente por la plataforma de Recargas Juegos Online.<br>
      Si no solicitaste este cambio, contacta de inmediato con la mesa de ayuda.
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({ to: toEmail, subject, html });
  },

  /**
   * Notificación cuando un comprobante de depósito es Aprobado o Rechazado
   */
  async sendDepositStatusNotification({ toEmail, recipientName, amountUsd, currency = 'USD', status, referenceNumber, bankName, reason }) {
    const isApproved = status === 'approved';
    const subject = isApproved
      ? `✅ Depósito Aprobado: $${amountUsd} ${currency} acreditados a tu billetera`
      : `❌ Solicitud de Depósito Rechazada - Referencia #${referenceNumber}`;

    const siteUrl = process.env.SITE_URL || 'https://recargasjuegospro.cloud';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080c14; color: #e2e8f0; margin: 0; padding: 20px; }
    .card { max-width: 540px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 8px; font-weight: 800; font-size: 12px; text-transform: uppercase; margin-bottom: 16px; }
    .badge-success { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
    .badge-error { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
    .amount-display { font-size: 28px; font-weight: 900; color: ${isApproved ? '#34d399' : '#f87171'}; margin: 10px 0 20px 0; }
    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    .details-table td { padding: 8px 0; border-bottom: 1px solid #1e293b; color: #cbd5e1; }
    .details-table td:first-child { color: #64748b; font-weight: 600; width: 40%; }
    .btn { display: inline-block; background: #06b6d4; color: #020617; font-weight: bold; font-size: 13px; padding: 12px 24px; border-radius: 10px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge ${isApproved ? 'badge-success' : 'badge-error'}">
      ${isApproved ? 'Depósito Aprobado & Acreditado' : 'Depósito No Aprobado'}
    </div>
    <h2 style="color: #ffffff; margin-top: 0;">${isApproved ? '¡Saldo Añadido a tu Billetera!' : 'Novedad con tu Depósito'}</h2>
    <p style="color: #94a3b8; font-size: 14px;">Hola <strong>${recipientName || 'Socio'}</strong>,</p>

    <div class="amount-display">$${amountUsd} ${currency}</div>

    <table class="details-table">
      <tr>
        <td>Banco / Medio:</td>
        <td><strong>${bankName || 'Bancos Nacionales'}</strong></td>
      </tr>
      <tr>
        <td>Número de Referencia:</td>
        <td style="font-family: monospace;">#${referenceNumber || 'N/A'}</td>
      </tr>
      <tr>
        <td>Estado Final:</td>
        <td style="color: ${isApproved ? '#34d399' : '#f87171'}; font-weight: bold;">
          ${isApproved ? 'Acreditado Inmediato' : 'Rechazado'}
        </td>
      </tr>
      ${!isApproved && reason ? `
      <tr>
        <td>Motivo del Rechazo:</td>
        <td style="color: #fca5a5;">${reason}</td>
      </tr>
      ` : ''}
    </table>

    ${isApproved ? `
    <p style="color: #94a3b8; font-size: 13px;">
      Ya puedes utilizar este saldo para despachar recargas de diamantes, Robux, pases y pines digitales desde tu catálogo.
    </p>
    <div style="text-align: center; margin-top: 25px;">
      <a href="${siteUrl}/catalog" class="btn" target="_blank">Ir al Catálogo de Juegos</a>
    </div>
    ` : `
    <p style="color: #94a3b8; font-size: 13px;">
      Si consideras que se trata de un error o deseas enviar nuevamente el comprobante corregido, puedes hacerlo desde tu panel o abrir un ticket de ayuda.
    </p>
    <div style="text-align: center; margin-top: 25px;">
      <a href="${siteUrl}/wallet/deposit" class="btn" target="_blank">Revisar Billetera</a>
    </div>
    `}
  </div>
</body>
</html>
    `;

    return this.sendEmail({ to: toEmail, subject, html });
  },

  /**
   * Notificación enviada al SOCIO REVENDEDOR cuando sube un comprobante de recarga
   */
  async sendDepositReceivedNotification({ toEmail, recipientName, amountUsd, currency = 'USD', referenceNumber, bankName }) {
    const subject = `📋 Comprobante Recibido: Recarga de $${amountUsd} ${currency} en revisión (Ref: #${referenceNumber})`;
    const siteUrl = process.env.SITE_URL || 'https://recargasjuegospro.cloud';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080c14; color: #e2e8f0; margin: 0; padding: 20px; }
    .card { max-width: 540px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 8px; font-weight: 800; font-size: 12px; text-transform: uppercase; margin-bottom: 16px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); }
    .amount-display { font-size: 28px; font-weight: 900; color: #38bdf8; margin: 10px 0 20px 0; }
    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    .details-table td { padding: 8px 0; border-bottom: 1px solid #1e293b; color: #cbd5e1; }
    .details-table td:first-child { color: #64748b; font-weight: 600; width: 40%; }
    .btn { display: inline-block; background: #06b6d4; color: #020617; font-weight: bold; font-size: 13px; padding: 12px 24px; border-radius: 10px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Solicitud de Saldo en Revisión</div>
    <h2 style="color: #ffffff; margin-top: 0;">¡Hemos Recibido tu Comprobante!</h2>
    <p style="color: #94a3b8; font-size: 14px;">Hola <strong>${recipientName || 'Socio Revendedor'}</strong>,</p>

    <div class="amount-display">$${amountUsd} ${currency}</div>

    <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5;">
      Tu solicitud de recarga y comprobante bancario han sido registrados correctamente en nuestro sistema y se encuentran en cola de verificación.
    </p>

    <table class="details-table">
      <tr>
        <td>Banco / Medio:</td>
        <td><strong>${bankName || 'Bancos Nacionales'}</strong></td>
      </tr>
      <tr>
        <td>Número de Comprobante:</td>
        <td style="font-family: monospace;">#${referenceNumber || 'N/A'}</td>
      </tr>
      <tr>
        <td>Estado Actual:</td>
        <td style="color: #f59e0b; font-weight: bold;">⏳ Pendiente de Aprobación</td>
      </tr>
    </table>

    <p style="color: #94a3b8; font-size: 12px;">
      Tan pronto como nuestro equipo valide la transacción con la entidad bancaria, recibirás una confirmación y el saldo se reflejará de inmediato en tu billetera.
    </p>

    <div style="text-align: center; margin-top: 25px;">
      <a href="${siteUrl}/wallet" class="btn" target="_blank">Ver Mi Billetera</a>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({ to: toEmail, subject, html });
  },

  /**
   * Alerta enviada al SUPER ADMINISTRADOR cuando un socio solicita saldo y sube comprobante
   */
  async sendNewDepositAlertToAdmin({ adminEmail = 'b.edumalta@gmail.com', clientName, clientEmail, amountUsd, currency = 'USD', referenceNumber, bankName, depositId }) {
    const subject = `🔔 Nueva Solicitud de Depósito: $${amountUsd} ${currency} de ${clientName} (Ref: #${referenceNumber})`;
    const siteUrl = process.env.SITE_URL || 'https://recargasjuegospro.cloud';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080c14; color: #e2e8f0; margin: 0; padding: 20px; }
    .card { max-width: 580px; margin: 0 auto; background: #0f172a; border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 8px; font-weight: 800; font-size: 12px; text-transform: uppercase; margin-bottom: 16px; background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35); }
    .amount-display { font-size: 28px; font-weight: 900; color: #fbbf24; margin: 10px 0 20px 0; }
    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    .details-table td { padding: 8px 0; border-bottom: 1px solid #1e293b; color: #cbd5e1; }
    .details-table td:first-child { color: #64748b; font-weight: 600; width: 40%; }
    .btn { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #020617; font-weight: bold; font-size: 13px; padding: 14px 28px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3); }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Nuevo Comprobante por Aprobar</div>
    <h2 style="color: #ffffff; margin-top: 0;">🔔 Solicitud de Recarga de Saldo</h2>
    <p style="color: #94a3b8; font-size: 14px;">Atención Super Administrador,</p>

    <div class="amount-display">$${amountUsd} ${currency}</div>

    <table class="details-table">
      <tr>
        <td>Socio Revendedor:</td>
        <td><strong>${clientName}</strong></td>
      </tr>
      <tr>
        <td>Correo del Socio:</td>
        <td style="color: #38bdf8;">${clientEmail}</td>
      </tr>
      <tr>
        <td>Banco Destino:</td>
        <td><strong>${bankName}</strong></td>
      </tr>
      <tr>
        <td>Número de Referencia:</td>
        <td style="font-family: monospace; font-weight: bold; color: #f1f5f9;">#${referenceNumber}</td>
      </tr>
      <tr>
        <td>Estado:</td>
        <td style="color: #fbbf24; font-weight: bold;">⏳ Pendiente en Cola</td>
      </tr>
    </table>

    <p style="color: #94a3b8; font-size: 13px;">
      El socio ha adjuntado el comprobante bancario (voucher). Ingresa a tu panel para verificar la imagen y aprobar o rechazar la acreditación de saldo.
    </p>

    <div style="text-align: center; margin-top: 25px;">
      <a href="${siteUrl}/sys-admin-auth/deposits" class="btn" target="_blank">Ir a Aprobar Vouchers</a>
    </div>

    <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #475569;">
      Recargas Juegos Online • Módulo de Gestión Financiera • ${siteUrl}
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({ to: adminEmail, subject, html });
  },

  /**
   * Notificación de respuesta a ticket de soporte
   */
  async sendTicketReplyNotification({ toEmail, recipientName, ticketSubject, adminReply, ticketId }) {
    const subject = `🎧 Respuesta a tu Ticket de Soporte: "${ticketSubject}"`;
    const siteUrl = process.env.SITE_URL || 'https://recargasjuegospro.cloud';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080c14; color: #e2e8f0; margin: 0; padding: 20px; }
    .card { max-width: 540px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; }
    .reply-box { background: #080d18; border-left: 4px solid #06b6d4; border-radius: 4px 12px 12px 4px; padding: 16px; margin: 20px 0; font-size: 14px; color: #f1f5f9; line-height: 1.6; }
    .btn { display: inline-block; background: #6366f1; color: #ffffff; font-weight: bold; font-size: 13px; padding: 10px 20px; border-radius: 8px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div style="color: #06b6d4; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Mesa de Ayuda &bull; Ticket #${(ticketId || 'SOPORTE').substring(0, 8).toUpperCase()}</div>
    <h2 style="color: #ffffff; margin-top: 0; font-size: 18px;">${ticketSubject}</h2>
    <p style="color: #94a3b8; font-size: 13px;">Hola <strong>${recipientName || 'Socio'}</strong>, el equipo de soporte ha respondido a tu consulta:</p>

    <div class="reply-box">
      ${adminReply}
    </div>

    <div style="text-align: center; margin-top: 20px;">
      <a href="${siteUrl}/support" class="btn" target="_blank">Ver Ticket en el Panel</a>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({ to: toEmail, subject, html });
  },

  /**
   * Alerta crítica para el administrador cuando el saldo Canjea baja del umbral
   */
  async sendLowBalanceAlert({ adminEmail, currentBalanceUsd, thresholdUsd }) {
    const subject = `⚠️ ALERTA CRÍTICA: Saldo Proveedor Canjea en $${currentBalanceUsd} USD (Límite: $${thresholdUsd} USD)`;
    const siteUrl = process.env.SITE_URL || 'https://recargasjuegospro.cloud';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080c14; color: #e2e8f0; margin: 0; padding: 20px; }
    .card { max-width: 540px; margin: 0 auto; background: #0f172a; border: 1px solid #ef4444; border-radius: 16px; padding: 32px; }
    .alert-box { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 12px; padding: 16px; margin: 20px 0; color: #fca5a5; font-size: 14px; }
    .btn { display: inline-block; background: #ef4444; color: #ffffff; font-weight: bold; font-size: 13px; padding: 12px 24px; border-radius: 10px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h2 style="color: #f87171; margin-top: 0;">⚠️ Notificación de Saldo Bajo - Canjea API</h2>
    <p style="color: #94a3b8; font-size: 14px;">Atención Super Administrador,</p>

    <div class="alert-box">
      El saldo actual con el proveedor principal Canjea ha caído a <strong>$${currentBalanceUsd} USD</strong>, por debajo del umbral preventivo configurado ($${thresholdUsd} USD).
    </div>

    <p style="color: #cbd5e1; font-size: 13px;">
      Si el saldo llega a $5.00 USD, el sistema activará automáticamente el <strong>Circuit Breaker</strong> para pausar las compras y proteger el saldo de los socios revendedores.
    </p>

    <div style="text-align: center; margin-top: 25px;">
      <a href="${siteUrl}/sys-admin-auth/settings" class="btn" target="_blank">Abrir Control de Saldo</a>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({ to: adminEmail, subject, html });
  },

  /**
   * Alerta al Super Administrador cuando Canjea agrega nuevos productos o juegos al catálogo
   */
  async sendNewProductsAlert({ adminEmail, newProducts = [], newGamesCount = 0 }) {
    const totalCount = newProducts.length;
    const subject = `📢 ¡Canjea API agregó ${totalCount} nuevo${totalCount === 1 ? '' : 's'} producto${totalCount === 1 ? '' : 's'} a tu catálogo!`;
    const siteUrl = process.env.SITE_URL || 'https://recargasjuegospro.cloud';

    const displayProducts = newProducts.slice(0, 12);
    const extraCount = totalCount - displayProducts.length;

    const rowsHtml = displayProducts.map((p) => `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
        <td style="padding: 10px 12px; font-weight: bold; color: #38bdf8;">${p.game_name || p.game_id}</td>
        <td style="padding: 10px 12px; color: #f1f5f9;">
          <div>${p.name}</div>
          <div style="font-size: 11px; color: #64748b; font-family: monospace;">SKU: ${p.sku}</div>
        </td>
        <td style="padding: 10px 12px; text-align: right; font-weight: bold; color: #4ade80;">$${p.wholesale_price || '0.00'} ${p.currency || 'USD'}</td>
        <td style="padding: 10px 12px; text-align: center;">
          <span style="display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 999px; background: ${p.requires_player_id ? 'rgba(99,102,241,0.2)' : 'rgba(234,179,8,0.2)'}; color: ${p.requires_player_id ? '#a5b4fc' : '#fde047'}; font-weight: bold;">
            ${p.requires_player_id ? 'Recarga Directa' : 'Pin Digital'}
          </span>
        </td>
      </tr>
    `).join('');

    const extraRowHtml = extraCount > 0 ? `
      <tr>
        <td colspan="4" style="padding: 12px; text-align: center; color: #94a3b8; font-size: 12px; font-style: italic;">
          ... y ${extraCount} producto${extraCount === 1 ? '' : 's'} adicional${extraCount === 1 ? '' : 'es'} más.
        </td>
      </tr>
    ` : '';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080c14; color: #e2e8f0; margin: 0; padding: 20px; }
    .card { max-width: 640px; margin: 0 auto; background: #0f172a; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 18px; padding: 32px; box-shadow: 0 10px 35px rgba(0,0,0,0.5); }
    .badge { display: inline-block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; padding: 4px 10px; border-radius: 6px; font-weight: bold; margin-bottom: 12px; }
    .alert-box { background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px; padding: 16px; margin: 18px 0; color: #bae6fd; font-size: 13px; line-height: 1.5; }
    .table-container { overflow-x: auto; background: #090d16; border: 1px solid #1e293b; border-radius: 12px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #131d33; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; }
    .btn { display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%); color: #ffffff; font-weight: bold; font-size: 13px; padding: 14px 28px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3); }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Sincronización Automática API</div>
    <h2 style="color: #ffffff; margin-top: 0; font-size: 22px;">🎮 Nuevos Productos Agregados por Canjea</h2>
    <p style="color: #94a3b8; font-size: 14px; margin-bottom: 0;">Hola Super Administrador,</p>

    <div class="alert-box">
      Tu proveedor <strong>Canjea</strong> acaba de agregar <strong>${totalCount} nuevo${totalCount === 1 ? '' : 's'} producto${totalCount === 1 ? '' : 's'}</strong> en su catálogo en vivo.
      ${newGamesCount > 0 ? `<br>🎯 <strong>¡Incluye ${newGamesCount} nuevo${newGamesCount === 1 ? '' : 's'} juego${newGamesCount === 1 ? '' : 's'}/franquicia${newGamesCount === 1 ? '' : 's'}!</strong>` : ''}
      <br>La plataforma los ha <strong>creado e integrado automáticamente</strong> para que estén listos para la venta.
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Juego</th>
            <th>Paquete</th>
            <th style="text-align: right;">Costo API</th>
            <th style="text-align: center;">Tipo</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          ${extraRowHtml}
        </tbody>
      </table>
    </div>

    <p style="color: #cbd5e1; font-size: 13px; margin: 16px 0;">
      Puedes acceder al panel de administración para ajustar los márgenes de ganancia (PVP sugerido), cambiar carátulas personalizadas o badges destacados si lo consideras necesario.
    </p>

    <div style="text-align: center; margin-top: 25px;">
      <a href="${siteUrl}/sys-admin-auth/catalog" class="btn" target="_blank">Revisar Catálogo & Precios</a>
    </div>

    <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #475569;">
      Recargas Juegos Online • Sistema Autónomo de Sincronización B2B • ${siteUrl}
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({ to: adminEmail, subject, html });
  },
};


