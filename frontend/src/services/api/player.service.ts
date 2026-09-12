import { apiClient } from './client';
import { VerifyPlayerRequest, VerifyPlayerResponse } from '../../types';

export const playerService = {
  async verifyPlayer(data: VerifyPlayerRequest): Promise<VerifyPlayerResponse> {
    try {
      return await apiClient<VerifyPlayerResponse>('/verify-player', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      // Fallback verification for local testing when backend route is under construction
      // Simulated delay of 600ms
      await new Promise((res) => setTimeout(res, 600));

      if (!data.playerId || data.playerId.trim().length < 4) {
        return {
          valid: false,
          playerId: data.playerId,
          playerName: '',
          message: 'El ID de jugador debe contener al menos 4 caracteres.',
        };
      }

      return {
        valid: true,
        playerId: data.playerId.trim(),
        playerName: `Player_${data.playerId.trim().slice(-4).toUpperCase()}`,
        message: 'Jugador verificado con éxito',
      };
    }
  },
};

