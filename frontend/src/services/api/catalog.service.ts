import { apiClient } from './client';
import { Product, GameSummary, GameDetail } from '../../types';

// Mock catalog fallback for local development before backend endpoint is live
export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod_freefire_100',
    name: '100 + 10 Diamantes',
    game: 'Free Fire',
    category: 'Moneda del Juego',
    price_cents: 100,
    currency: 'USD',
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=700&auto=format&fit=crop&q=75',
    requires_player_id: true,
    can_verify_player: true,
    description: 'Recarga directa a tu cuenta con Player ID. Acreditación instantánea.',
    badge: 'Popular',
  },
];

const CACHE_KEY_GAMES = 'cached_games_catalog_v2';
const CACHE_PREFIX_GAME = 'cached_game_detail_';

export const catalogService = {
  async getCatalog(): Promise<Product[]> {
    try {
      const products = await apiClient<Product[]>('/catalog');
      return products && products.length > 0 ? products : MOCK_PRODUCTS;
    } catch {
      return MOCK_PRODUCTS;
    }
  },

  async getGames(): Promise<GameSummary[]> {
    try {
      const games = await apiClient<GameSummary[]>('/catalog/games');
      if (games && games.length > 0) {
        try {
          localStorage.setItem(CACHE_KEY_GAMES, JSON.stringify(games));
        } catch {}
        return games;
      }
    } catch (err) {
      console.error('Error fetching games catalog from API:', err);
    }

    // Fallback a caché local si la red falla o está lenta
    try {
      const cached = localStorage.getItem(CACHE_KEY_GAMES);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}

    return [];
  },

  async getGameDetails(gameId: string): Promise<GameDetail | null> {
    const cacheKey = `${CACHE_PREFIX_GAME}${gameId}`;
    try {
      const details = await apiClient<GameDetail>(`/catalog/games/${encodeURIComponent(gameId)}`);
      if (details) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(details));
        } catch {}
        return details;
      }
    } catch (err) {
      console.error(`Error fetching game details for ${gameId}:`, err);
    }

    // Fallback a caché local para el detalle del juego
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}

    return null;
  },

  async getProductById(id: string): Promise<Product | undefined> {
    const products = await this.getCatalog();
    return products.find((p) => p.id === id);
  },
};

