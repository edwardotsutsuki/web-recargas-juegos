export interface ThermalTicketData {
  orderId: string;
  game?: string;
  gameName?: string;
  productName: string;
  playerId?: string | null;
  playerName?: string | null;
  playerServer?: string | null;
  digitalCode?: string | null;
  redeemInstructions?: string | null;
  priceDollars: string | number;
  currency?: string;
  operatorName?: string | null;
  storeName?: string | null;
  createdAt?: string | Date;
  isReprint?: boolean;
}

export const thermalTicketService = {
  /**
   * Genera el HTML enriquecido y calibrado para papel térmico de 80mm (y 58mm).
   */
  generateTicketHtml(data: ThermalTicketData): string {
    const store = (data.storeName || 'RECARGAS JUEGOS PRO').toUpperCase();
    const cashier = data.operatorName ? data.operatorName.toUpperCase() : 'TERMINAL PRINCIPAL';
    const dateStr = data.createdAt
      ? new Date(data.createdAt).toLocaleString('es-ES', {
          dateStyle: 'short',
          timeStyle: 'medium',
        })
      : new Date().toLocaleString('es-ES', {
          dateStyle: 'short',
          timeStyle: 'medium',
        });
    const reprintDateStr = new Date().toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'medium',
    });

    const formattedPrice =
      typeof data.priceDollars === 'number'
        ? data.priceDollars.toFixed(2)
        : parseFloat(String(data.priceDollars) || '0').toFixed(2);

    const cleanPin = (data.digitalCode || '').trim();
    const qrUrl = cleanPin
      ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
          cleanPin
        )}`
      : '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Ticket #${data.orderId.slice(0, 8)}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 76mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 6mm 3mm 10mm 3mm;
      font-family: 'Courier New', Courier, monospace, monospace;
      font-size: 12px;
      line-height: 1.35;
      color: #000000;
      background-color: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .bold { font-weight: bold; }
    .extra-bold { font-weight: 900; }
    
    .divider {
      border-top: 1px dashed #000000;
      margin: 6px 0;
    }
    .double-divider {
      border-top: 2px solid #000000;
      margin: 8px 0;
    }

    .store-header {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .store-sub {
      font-size: 10px;
      margin-bottom: 4px;
    }

    .reprint-banner {
      border: 2px solid #000000;
      padding: 4px;
      margin: 6px 0;
      font-size: 11px;
      font-weight: 900;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .info-table {
      width: 100%;
      font-size: 11px;
      margin: 4px 0;
    }
    .info-table td {
      padding: 1.5px 0;
      vertical-align: top;
    }
    .info-table td.label {
      width: 32%;
      font-weight: bold;
    }

    .product-box {
      margin: 6px 0;
      padding: 4px 0;
    }
    .product-name {
      font-size: 14px;
      font-weight: 900;
    }
    .game-name {
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .pin-container {
      border: 2px dashed #000000;
      padding: 8px 4px;
      margin: 8px 0;
      text-align: center;
      background: #fbfbfb;
    }
    .pin-label {
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .pin-code {
      font-size: 17px;
      font-weight: 900;
      letter-spacing: 2px;
      word-break: break-all;
      display: block;
      margin: 4px 0;
    }

    .qr-box {
      margin: 6px auto;
      text-align: center;
    }
    .qr-img {
      width: 125px;
      height: 125px;
      display: block;
      margin: 0 auto;
      image-rendering: pixelated;
    }
    .qr-hint {
      font-size: 9px;
      color: #333;
      margin-top: 2px;
    }

    .instructions-box {
      font-size: 10px;
      margin: 6px 0;
      line-height: 1.3;
      text-align: left;
    }
    .instructions-title {
      font-size: 10px;
      font-weight: 900;
      margin-bottom: 2px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 14px;
      font-weight: 900;
      margin: 6px 0;
    }
    .total-amount {
      font-size: 17px;
    }

    .footer {
      font-size: 10px;
      text-align: center;
      margin-top: 8px;
      line-height: 1.3;
    }
    .footer-warning {
      font-size: 9px;
      margin-top: 4px;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="store-header">${store}</div>
    <div class="store-sub">Centro Autorizado de Recargas & Pines Oficiales</div>
  </div>

  ${
    data.isReprint
      ? `
    <div class="reprint-banner">
      *** REIMPRESIÓN (COPIA) ***
      <div style="font-size: 8.5px; font-weight: normal; margin-top: 2px;">
        Emitido: ${reprintDateStr}
      </div>
    </div>
  `
      : ''
  }

  <div class="divider"></div>

  <table class="info-table">
    <tr>
      <td class="label">Ticket #:</td>
      <td class="bold">${data.orderId.slice(0, 12)}</td>
    </tr>
    <tr>
      <td class="label">Fecha Venta:</td>
      <td>${dateStr}</td>
    </tr>
    <tr>
      <td class="label">Cajero:</td>
      <td>${cashier}</td>
    </tr>
    <tr>
      <td class="label">Estado:</td>
      <td class="bold">COMPLETADO / ENTREGADO</td>
    </tr>
  </table>

  <div class="divider"></div>

  <div class="product-box">
    <div class="game-name">🎮 ${data.game || data.gameName || 'JUEGOS ONLINE'}</div>
    <div class="product-name">${data.productName}</div>
  </div>

  ${
    cleanPin
      ? `
    <!-- BLOQUE DESTACADO DE PIN / CÓDIGO DIGITAL -->
    <div class="pin-container">
      <div class="pin-label">&gt;&gt;&gt; TU PIN / CÓDIGO DIGITAL &lt;&lt;&lt;</div>
      <div class="pin-code">${cleanPin}</div>
      <div style="font-size: 9px;">(No compartir hasta su canje)</div>
    </div>

    ${
      qrUrl
        ? `
      <div class="qr-box">
        <img src="${qrUrl}" alt="QR Pin" class="qr-img" />
        <div class="qr-hint">Escanea el código con tu celular</div>
      </div>
    `
        : ''
    }

    ${
      data.redeemInstructions
        ? `
      <div class="instructions-box">
        <div class="instructions-title">📖 Instrucciones de Canje:</div>
        <div>${data.redeemInstructions}</div>
      </div>
    `
        : ''
    }
  `
      : data.playerId
      ? `
    <!-- BLOQUE DE RECARGA DIRECTA POR ID -->
    <div class="pin-container" style="background:#fff;">
      <div class="pin-label">RECARGA DIRECTA EN CUENTA</div>
      <table class="info-table" style="margin: 4px auto; width: 90%;">
        <tr>
          <td class="label">ID Jugador:</td>
          <td class="bold" style="font-size: 13px;">${data.playerId}</td>
        </tr>
        ${
          data.playerName
            ? `
        <tr>
          <td class="label">Nombre:</td>
          <td class="bold">${data.playerName}</td>
        </tr>
        `
            : ''
        }
        ${
          data.playerServer
            ? `
        <tr>
          <td class="label">Servidor:</td>
          <td>${data.playerServer}</td>
        </tr>
        `
            : ''
        }
      </table>
      <div style="font-size: 9px; margin-top: 4px;">Acreditación automática en los servidores del juego</div>
    </div>
  `
      : ''
  }

  <div class="double-divider"></div>

  <div class="total-row">
    <span>TOTAL COBRADO:</span>
    <span class="total-amount">$${formattedPrice} USD</span>
  </div>

  <div class="divider"></div>

  <div class="footer">
    <div>¡Gracias por tu preferencia!</div>
    <div class="footer-warning">
      Conserva este ticket como comprobante de garantía.<br/>
      Los pines digitales son de un solo uso.
    </div>
    <div style="margin-top: 6px; font-size: 8px;">
      recargasjuegospro.cloud
    </div>
  </div>
</body>
</html>`;
  },

  /**
   * Imprime directamente el ticket en cualquier impresora térmica de 80mm o 58mm.
   * Utiliza un iframe aislado para máxima compatibilidad con Chrome Kiosk Printing y diálogos nativos.
   */
  printThermalTicket(data: ThermalTicketData): void {
    const html = this.generateTicketHtml(data);

    // Crear iframe oculto en el DOM
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      console.error('No se pudo acceder al documento del iframe para imprimir');
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    // Esperar a que se rendericen estilos e imágenes (QR)
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Error al invocar impresión térmica:', err);
      } finally {
        // Limpieza de iframe tras la orden de impresión
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 450);
  },
};
