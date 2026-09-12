import { canjeaClient } from './catalogService.js';

export const playerService = {
  async verifyPlayer({ sku, playerId, server, zoneId }) {
    if (!sku || !playerId) {
      return {
        valid: false,
        message: 'sku y playerId son campos obligatorios.',
      };
    }

    try {
      let activeSku = sku;
      let res = await canjeaClient.verifyPlayer({
        sku: activeSku,
        playerId,
        server,
        zoneId,
      });

      let detectedRegion = null;

      // Soporte inteligente para Free Fire:
      // Free Fire tiene dos servidores independientes en Canjea: 'fflatam...' (Hispanoamérica) y 'ffbr...' (Brasil).
      // Si el usuario consulta con SKU de Brasil pero su cuenta es de LATAM (o viceversa), auto-consultamos la región contraria.
      if (res.result === 'INVALID_ID' && activeSku.startsWith('ff')) {
        const altSku = activeSku.startsWith('ffbr') ? 'fflatam100' : 'ffbr100';
        try {
          const altRes = await canjeaClient.verifyPlayer({
            sku: altSku,
            playerId,
            server,
            zoneId,
          });

          if (altRes.result === 'VERIFIED') {
            res = altRes;
            activeSku = altSku;
            detectedRegion = altSku.startsWith('fflatam') ? 'latam' : 'br';
          }
        } catch {
          // Si la consulta alternativa falla, mantenemos la respuesta original
        }
      }

      if (!detectedRegion && activeSku.startsWith('ff')) {
        detectedRegion = activeSku.startsWith('fflatam') ? 'latam' : 'br';
      }

      // Mapear los 4 estados de Canjea
      if (res.result === 'VERIFIED') {
        return {
          valid: true,
          result: 'VERIFIED',
          playerId: res.player?.id || playerId,
          playerName: res.player?.name || `Player_${playerId.slice(-4)}`,
          detectedRegion,
          message: detectedRegion
            ? `Cuenta verificada exitosamente (${detectedRegion === 'latam' ? 'Servidor LATAM' : 'Servidor Brasil'})`
            : 'Cuenta verificada exitosamente',
        };
      } else if (res.result === 'INVALID_ID') {
        return {
          valid: false,
          result: 'INVALID_ID',
          playerId,
          message: res.message || 'El ID ingresado no existe en los servidores del juego.',
        };
      } else if (res.result === 'NAME_NOT_CONFIRMED') {
        return {
          valid: true,
          result: 'NAME_NOT_CONFIRMED',
          playerId,
          playerName: null,
          detectedRegion,
          message: 'Cuenta existente, pero el juego no expone el nombre público.',
        };
      } else {
        // SIN_VERIFIEDR u otro
        return {
          valid: true,
          result: 'SIN_VERIFIEDR',
          playerId,
          playerName: null,
          detectedRegion,
          message: 'Este juego no soporta validación previa.',
        };
      }
    } catch (err) {
      return {
        valid: false,
        message: err.message || 'Error al conectar con el servidor de validación.',
      };
    }
  },
};
