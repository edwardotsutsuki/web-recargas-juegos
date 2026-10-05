import { randomUUID } from 'node:crypto';
import { jobRepository } from '../repositories/jobRepository.js';
import { orderRepository } from '../repositories/orderRepository.js';
import { canjeaClient, CanjeaError } from '../providers/canjea/client.js';
import { catalogService } from '../services/catalogService.js';
import { balanceMonitorService } from '../services/balanceMonitorService.js';

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

    console.log(`[Worker] Procesando orden ${orderId} (${sku}) para jugador:`, player?.id || 'PIN');

    // 2. Si este trabajo ya tiene intentos previos (attempts > 1), consultar primero con getOrder
    if (job.job_attempts > 1) {
      try {
        const checkRes = await canjeaClient.getOrder(orderId);
        if (checkRes?.order) {
          const currentStatus = checkRes.order.status;
          console.log(`[Worker] Sondeo de orden previa ${orderId}: estado en Canjea = ${currentStatus}`);

          if (currentStatus === 'COMPLETED') {
            const digitalCode = checkRes.order.redeem_code || null;
            let redeemInstructions = null;
            try {
              const prod = await catalogService.getProductBySku(sku);
              redeemInstructions = prod?.redeem_instructions || null;
            } catch {}

            await orderRepository.settlePurchase({
              orderId,
              leaseToken,
              outcome: 'succeeded',
              providerReference: checkRes.order.external_id || orderId,
              digitalCode,
              redeemInstructions,
            });
            console.log(`[Worker] Orden ${orderId} completada tras sondeo.`);
            return true;
          }

          if (currentStatus === 'FAILED') {
            await orderRepository.settlePurchase({
              orderId,
              leaseToken,
              outcome: 'failed',
              failureCode: 'CANJEA_FAILED',
            });
            console.log(`[Worker] Orden ${orderId} fallida en Canjea tras sondeo. Fondos liberados.`);
            return true;
          }

          if (currentStatus === 'REFUNDED') {
            await orderRepository.refundOrder({
              orderId,
              providerReference: checkRes.order.external_id || orderId,
              reason: 'Reembolso automático por reversión del proveedor Canjea',
            });
            console.log(`[Worker] Orden ${orderId} reembolsada por el proveedor.`);
            return true;
          }

          if (currentStatus === 'PROCESSING') {
            const delivery = checkRes.order.delivery;
            let delaySeconds = 20;
            let message = 'En proceso con proveedor Canjea...';

            if (delivery?.outside_hours && delivery?.resumes_at) {
              const resumeTime = new Date(delivery.resumes_at).getTime();
              const now = Date.now();
              const diffSec = Math.floor((resumeTime - now) / 1000);
              delaySeconds = Math.max(60, Math.min(3600 * 10, diffSec > 0 ? diffSec : 60));
              message = `Fuera de horario de atención de Canjea (Reanuda: ${new Date(delivery.resumes_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })})`;
            }

            await jobRepository.postponeJob({
              orderId,
              delaySeconds,
              errorCode: 'PROCESSING',
            });
            await orderRepository.markOrderProcessing({ orderId, message });
            return true;
          }
        }
      } catch (checkErr) {
        if (checkErr?.code === 'ORPHANED') {
          console.error(`[Worker] Orden ${orderId} marcada como ORPHANED por Canjea.`);
          await orderRepository.markOrderOrphaned({
            orderId,
            message: 'Orden en revisión por el proveedor Canjea. Contactar soporte WhatsApp +51 973 581 378.',
          });
          return true;
        }
        // Si responde 404 ORDER_NOT_FOUND, significa que el POST original nunca se ejecutó; procedemos a llamar createOrder abajo.
        console.warn(`[Worker] Consulta previa para orden ${orderId}: ${checkErr.message}. Continuando creación.`);
      }
    }

    try {
      // 1. Obtener costo mayorista real de Canjea para protección de precio
      let wholesalePrice = null;
      try {
        const prod = await catalogService.getProductBySku(sku);
        if (prod?.wholesale_decimal) {
          wholesalePrice = prod.wholesale_decimal;
        }
      } catch {}

      // 2. Validación preventiva de saldo mayorista (Encolado Inteligente)
      try {
        const balanceStatus = await balanceMonitorService.getStatus(false);
        const currentBalanceCents = balanceStatus.canjea_balance_cents || 0;
        const requiredCents = wholesalePrice ? Math.round(Number(wholesalePrice) * 100) : 0;

        if (currentBalanceCents > 0 && requiredCents > currentBalanceCents) {
          console.warn(`[Worker] Encolado Inteligente: Saldo Canjea ($${(currentBalanceCents/100).toFixed(2)}) insuficiente para orden ${orderId} (requiere $${wholesalePrice}). Poniendo en espera para reintento automático.`);

          await jobRepository.postponeJob({
            orderId,
            delaySeconds: 45,
            errorCode: 'INSUFFICIENT_PROVIDER_BALANCE',
          });

          await orderRepository.markWaitingProviderBalance({
            orderId,
            currentBalance: (currentBalanceCents / 100).toFixed(2),
            requiredBalance: wholesalePrice,
          });

          return true; // Trabajo gestionado limpiamente sin fallar la orden
        }
      } catch (balErr) {
        console.warn('[Worker] No se pudo comprobar saldo previo:', balErr.message);
      }

      // 3. Llamar al proveedor Canjea con la referencia única (orderId)
      const hasFields = Boolean(player?.fields && Object.keys(player.fields).length > 0);
      const res = await canjeaClient.createOrder({
        sku,
        externalId: orderId,
        expectedPrice: wholesalePrice,
        player: hasFields ? null : (player?.id ? { id: player.id, server: player.server } : null),
        fields: hasFields ? player.fields : null,
      });

      // 4. Manejo según el estado devuelto por Canjea
      if (res.order?.status === 'COMPLETED') {
        const digitalCode = res.order?.redeem_code || null;
        let redeemInstructions = null;
        try {
          const prod = await catalogService.getProductBySku(sku);
          redeemInstructions = prod?.redeem_instructions || null;
        } catch {}

        await orderRepository.settlePurchase({
          orderId,
          leaseToken,
          outcome: 'succeeded',
          providerReference: res.order?.external_id || orderId,
          digitalCode,
          redeemInstructions,
        });

        console.log(`[Worker] Orden ${orderId} liquidada con ÉXITO. Código:`, digitalCode || 'Acreditación Directa');
        return true;
      }

      // Si Canjea devuelve status PROCESSING (ej. entregas manuales human o proveedores asíncronos)
      if (res.order?.status === 'PROCESSING') {
        const delivery = res.order?.delivery;
        let delaySeconds = 15;
        let message = 'En proceso con proveedor Canjea...';

        if (delivery?.outside_hours && delivery?.resumes_at) {
          const resumeTime = new Date(delivery.resumes_at).getTime();
          const now = Date.now();
          const diffSec = Math.floor((resumeTime - now) / 1000);
          delaySeconds = Math.max(60, Math.min(3600 * 10, diffSec > 0 ? diffSec : 60));
          message = `Fuera de horario de atención de Canjea (Reanuda a las 08:00 AM)`;
        }

        console.log(`[Worker] Orden ${orderId} aceptada por Canjea en estado PROCESSING. Próximo sondeo en ${delaySeconds}s.`);
        await jobRepository.postponeJob({
          orderId,
          delaySeconds,
          errorCode: 'PROCESSING',
        });
        await orderRepository.markOrderProcessing({ orderId, message });
        return true;
      }
    } catch (err) {
      console.error(`[Worker] Error de Canjea en orden ${orderId}:`, err.message);

      // 1. Operación ya en curso en Canjea
      if (err?.code === 'OPERATION_IN_PROGRESS') {
        console.warn(`[Worker] Canjea reportó OPERATION_IN_PROGRESS en orden ${orderId}. Encolando sondeo en 15s.`);
        await jobRepository.postponeJob({
          orderId,
          delaySeconds: 15,
          errorCode: 'OPERATION_IN_PROGRESS',
        });
        await orderRepository.markOrderProcessing({
          orderId,
          message: 'Compra en curso en servidores del proveedor...',
        });
        return true;
      }

      // 2. Orden huérfana (requiere atención de soporte Canjea)
      if (err?.code === 'ORPHANED') {
        console.error(`[Worker] Canjea reportó ORPHANED en orden ${orderId}. Requiere soporte.`);
        await orderRepository.markOrderOrphaned({
          orderId,
          message: 'Orden en revisión por el proveedor Canjea. Soporte WhatsApp: +51 973 581 378.',
        });
        return true;
      }

      // 3. Saldo insuficiente del proveedor Canjea
      const isBalanceError =
        err?.code === 'INSUFFICIENT_BALANCE' ||
        err?.code === 'LOW_BALANCE' ||
        err?.code === 'ACCOUNT_BALANCE_LOW' ||
        err?.message?.toLowerCase().includes('balance');

      if (isBalanceError) {
        console.warn(`[Worker] Proveedor Canjea reportó falta de saldo en orden ${orderId}. Manteniendo fondos retenidos y encolando.`);
        balanceMonitorService.getStatus(true).catch(() => {});

        await jobRepository.postponeJob({
          orderId,
          delaySeconds: 60,
          errorCode: 'INSUFFICIENT_PROVIDER_BALANCE',
        });

        await orderRepository.markWaitingProviderBalance({
          orderId,
          reason: 'En espera de recarga de saldo del proveedor mayorista',
        });

        return true;
      }

      // 4. Cambio de precio por encima de la tolerancia de protección
      if (err?.code === 'PRICE_CHANGED') {
        console.warn(`[Worker] Rechazo PRICE_CHANGED en orden ${orderId}:`, err.detail);
        await orderRepository.settlePurchase({
          orderId,
          leaseToken,
          outcome: 'failed',
          failureCode: 'PRICE_CHANGED',
        });
        return true;
      }

      // 5. Fallo definitivo garantizado sin cargo (external_id_reusable: true)
      if (err instanceof CanjeaError && err.externalIdReusable) {
        // Liberar fondos retenidos al disponible del cliente
        await orderRepository.settlePurchase({
          orderId,
          leaseToken,
          outcome: 'failed',
          failureCode: err.code || 'PROVIDER_REJECTED',
        });
        console.log(`[Worker] Orden ${orderId} fallida definitivamente (${err.code}). Fondos liberados.`);
      } else {
        // Caso incierto: la compra pudo haber alcanzado al proveedor
        // Consultar estado en Canjea con reintentos inteligentes (3 intentos)
        try {
          let statusRes = null;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              statusRes = await canjeaClient.getOrder(orderId);
              if (statusRes?.order?.status) break;
            } catch (retryErr) {
              if (retryErr?.code === 'ORPHANED') {
                statusRes = { order: { status: 'ORPHANED' } };
                break;
              }
              console.warn(`[Worker] Reintento ${attempt}/3 de consulta para orden ${orderId}:`, retryErr.message);
              if (attempt < 3) {
                await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
              }
            }
          }

          if (statusRes?.order?.status === 'COMPLETED') {
            await orderRepository.settlePurchase({
              orderId,
              leaseToken,
              outcome: 'succeeded',
              providerReference: orderId,
              digitalCode: statusRes.order?.redeem_code,
            });
            console.log(`[Worker] Orden ${orderId} recuperada tras consulta: ÉXITO.`);
          } else if (statusRes?.order?.status === 'FAILED') {
            await orderRepository.settlePurchase({
              orderId,
              leaseToken,
              outcome: 'failed',
              failureCode: 'CANJEA_FAILED',
            });
          } else if (statusRes?.order?.status === 'REFUNDED') {
            await orderRepository.refundOrder({
              orderId,
              providerReference: orderId,
              reason: 'Reembolso automático por reversión del proveedor Canjea',
            });
          } else if (statusRes?.order?.status === 'ORPHANED') {
            await orderRepository.markOrderOrphaned({
              orderId,
              message: 'Orden en revisión por el proveedor Canjea. Contactar soporte WhatsApp +51 973 581 378.',
            });
          } else {
            // Sigue en PROCESSING o ambiguo: posponer trabajo para sondeo
            await jobRepository.postponeJob({
              orderId,
              delaySeconds: 20,
              errorCode: 'PROCESSING',
            });
            await orderRepository.markOrderProcessing({
              orderId,
              message: 'En espera de confirmación del proveedor Canjea...',
            });
            console.warn(`[Worker] Orden ${orderId} en estado PROCESSING. Encolado sondeo.`);
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

