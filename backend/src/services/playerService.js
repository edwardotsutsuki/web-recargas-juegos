import { canjeaClient } from './catalogService.js';

// Caché en memoria para evitar re-verificaciones lentas innecesarias (15 minutos)
const verifyCache = new Map();
const VERIFY_CACHE_TTL_MS = 15 * 60 * 1000;

export const playerService = {
  async verifyPlayer({ sku, playerId, server, zoneId }) {
    if (!sku || !playerId) {
      return {
        valid: false,
        message: 'sku y playerId son campos obligatorios.',
      };
    }

    const cleanPlayerId = String(playerId).trim();
    const cacheKey = `${sku}_${cleanPlayerId}_${server || ''}_${zoneId || ''}`.toLowerCase();

    // 1. Retorno instantáneo si ya fue verificado recientemente
    const cached = verifyCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < VERIFY_CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      let activeSku = sku;
      let res = null;
      let detectedRegion = null;

      // 2. Optimización de alto rendimiento para Free Fire:
      // Free Fire tiene dos servidores en Canjea: 'fflatam...' (Hispanoamérica/Ecuador) y 'ffbr...' (Brasil).
      // Para evitar esperas secuenciales de 5+ segundos, si es Free Fire consultamos de forma concurrente o priorizamos LATAM.
      if (activeSku.toLowerCase().startsWith('ff')) {
        const isBrRequested = activeSku.toLowerCase().startsWith('ffbr');
        const primarySku = isBrRequested ? 'ffbr100' : 'fflatam100';
        const secondarySku = isBrRequested ? 'fflatam100' : 'ffbr100';

        // Disparamos ambas consultas en paralelo para respuesta hiperrápida (máx 2.5s en vez de 5.2s)
        const [primaryPromise, secondaryPromise] = [
          canjeaClient.verifyPlayer({ sku: primarySku, playerId: cleanPlayerId, server, zoneId }).catch((e) => ({ result: 'ERROR', error: e })),
          canjeaClient.verifyPlayer({ sku: secondarySku, playerId: cleanPlayerId, server, zoneId }).catch((e) => ({ result: 'ERROR', error: e })),
        ];

        const [primaryRes, secondaryRes] = await Promise.all([primaryPromise, secondaryPromise]);

        if (primaryRes.result === 'VERIFIED') {
          res = primaryRes;
          activeSku = primarySku;
          detectedRegion = primarySku.startsWith('fflatam') ? 'latam' : 'br';
        } else if (secondaryRes.result === 'VERIFIED') {
          res = secondaryRes;
          activeSku = secondarySku;
          detectedRegion = secondarySku.startsWith('fflatam') ? 'latam' : 'br';
        } else {
          // Si ambos fallaron o ninguno es VERIFIED, usar el resultado de la región solicitada
          res = primaryRes.result !== 'ERROR' ? primaryRes : secondaryRes;
        }
      } else {
        // Otros juegos (Mobile Legends, PUBG, COD Mobile, etc.)
        res = await canjeaClient.verifyPlayer({
          sku: activeSku,
          playerId: cleanPlayerId,
          server,
          zoneId,
        });
      }

      let resultPayload = null;

      // Mapear los 4 estados de Canjea
      if (res.result === 'VERIFIED') {
        resultPayload = {
          valid: true,
          result: 'VERIFIED',
          playerId: res.player?.id || cleanPlayerId,
          playerName: res.player?.name || `Player_${cleanPlayerId.slice(-4)}`,
          detectedRegion,
          message: detectedRegion
            ? `Cuenta verificada exitosamente (${detectedRegion === 'latam' ? 'Servidor LATAM' : 'Servidor Brasil'})`
            : 'Cuenta verificada exitosamente',
        };
      } else if (res.result === 'INVALID_ID') {
        resultPayload = {
          valid: false,
          result: 'INVALID_ID',
          playerId: cleanPlayerId,
          message: res.message || 'El ID ingresado no existe en los servidores del juego.',
        };
      } else if (res.result === 'NAME_NOT_CONFIRMED') {
        resultPayload = {
          valid: true,
          result: 'NAME_NOT_CONFIRMED',
          playerId: cleanPlayerId,
          playerName: null,
          detectedRegion,
          message: 'Cuenta existente, pero el juego no expone el nombre público.',
        };
      } else {
        // SIN_VERIFIEDR u otro
        resultPayload = {
          valid: true,
          result: 'SIN_VERIFIEDR',
          playerId: cleanPlayerId,
          playerName: null,
          detectedRegion,
          message: 'Este juego no requiere o no soporta validación previa.',
        };
      }

      // Guardar en caché si fue verificado con éxito
      if (resultPayload.valid) {
        verifyCache.set(cacheKey, { timestamp: Date.now(), data: resultPayload });
      }

      return resultPayload;
    } catch (err) {
      return {
        valid: false,
        message: err.message || 'Error al conectar con el servidor de validación.',
      };
    }
  },
};
