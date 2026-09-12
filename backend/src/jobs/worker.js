import { randomUUID } from 'node:crypto';
import { jobRepository } from '../repositories/jobRepository.js';
import { orderRepository } from '../repositories/orderRepository.js';
import { canjeaClient, CanjeaError } from '../providers/canjea/client.js';

let isRunning = false;

export async function processNextJob() {
  const leaseToken = randomUUID();
  const leaseSeconds = 65; // Timeout superior a la llamada de Canjea

  try {
    const job = await jobRepository.claimPurchaseJob(leaseSeconds, leaseToken);
    if (!job) return false; // No hay trabajos listos

    const orderId = job.job_order_id;
    const sku = job.order_product_id;
    const player = job.order_player_payload;
    const priceDollars = (Number(job.order_price_minor) / 100).toFixed(2);

    console.log(`[Worker] Procesando orden ${orderId} (${sku}) para jugador:`, player?.id || 'PIN');

    try {
      // 1. Llamar al proveedor Canjea con la referencia única (orderId)
      const res = await canjeaClient.createOrder({
        sku,
        externalId: orderId,
        expectedPrice: priceDollars,
        player: player?.id ? { id: player.id, server: player.server } : null,
      });

      // 2. Éxito confirmado por Canjea
      const digitalCode = res.order?.redeem_code || null;
      await orderRepository.settlePurchase({
        orderId,
        leaseToken,
        outcome: 'succeeded',
        providerReference: res.order?.external_id || orderId,
        digitalCode,
      });

      console.log(`[Worker] Orden ${orderId} liquidada con ÉXITO. Código:`, digitalCode || 'Acreditación Directa');
    } catch (err) {
      console.error(`[Worker] Error de Canjea en orden ${orderId}:`, err.message);

      if (err instanceof CanjeaError && err.externalIdReusable) {
        // Fallo definitivo garantizado sin cargo (ej. ID de jugador inexistente, sku inactivo)
        // Liberar fondos retenidos al disponible del cliente
        await orderRepository.settlePurchase({
          orderId,
          leaseToken,
          outcome: 'failed',
          failureCode: err.code || 'PROVIDER_REJECTED',
        });
        console.log(`[Worker] Orden ${orderId} fallida definitivamente. Fondos liberados.`);
      } else {
        // Caso incierto: la compra pudo haber alcanzado al proveedor
        // Consultar estado en Canjea antes de liberar
        try {
          const statusRes = await canjeaClient.getOrder(orderId);
          if (statusRes.order?.status === 'COMPLETED') {
            await orderRepository.settlePurchase({
              orderId,
              leaseToken,
              outcome: 'succeeded',
              providerReference: orderId,
              digitalCode: statusRes.order?.redeem_code,
            });
            console.log(`[Worker] Orden ${orderId} recuperada tras consulta: ÉXITO.`);
          } else if (statusRes.order?.status === 'FAILED') {
            await orderRepository.settlePurchase({
              orderId,
              leaseToken,
              outcome: 'failed',
              failureCode: 'CANJEA_FAILED',
            });
          } else {
            // Sigue en PROCESSING o ambiguo: marcar para conciliación manteniendo retención
            await orderRepository.settlePurchase({
              orderId,
              leaseToken,
              outcome: 'pending_reconciliation',
              failureCode: err.code || 'TIMEOUT_PENDING_RECONCILIATION',
            });
            console.warn(`[Worker] Orden ${orderId} en estado PENDING_RECONCILIATION.`);
          }
        } catch {
          await orderRepository.settlePurchase({
            orderId,
            leaseToken,
            outcome: 'pending_reconciliation',
            failureCode: 'RECONCILIATION_UNREACHABLE',
          });
        }
      }
    }

    return true; // Procesó un trabajo
  } catch (err) {
    console.error('[Worker] Error general en worker:', err);
    return false;
  }
}

export function startWorkerLoop(intervalMs = 2000) {
  if (isRunning) return;
  isRunning = true;

  console.log('[Worker] Worker de despacho asíncrono iniciado.');

  const loop = async () => {
    if (!isRunning) return;
    try {
      const hadJob = await processNextJob();
      // Si procesó un trabajo, reintentar de inmediato por si hay cola
      setTimeout(loop, hadJob ? 200 : intervalMs);
    } catch {
      setTimeout(loop, intervalMs);
    }
  };

  loop();
}

export function stopWorkerLoop() {
  isRunning = false;
}

