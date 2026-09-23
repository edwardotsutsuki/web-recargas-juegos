import { CanjeaClient } from '../providers/canjea/client.js';
import { catalogOverrideRepository } from '../repositories/catalogOverrideRepository.js';
import { supabaseAdmin, isSupabaseConfigured } from '../repositories/supabaseClient.js';
import { emailService } from './emailService.js';

export const canjeaClient = new CanjeaClient();

let cachedCatalog = null;
let cachedGames = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

// Diccionario de metadatos gamer para las 34 franquicias soportadas por Canjea
export const GAME_DIRECTORY = {
  // --- 1. Recargas Directas con ID Verificable ---
  ff: {
    id: 'ff',
    name: 'Free Fire',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=700&auto=format&fit=crop&q=75',
    banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
    description: 'Recarga inmediata de Diamantes y Pase Élite con tu Player ID oficial.',
    player_id_label: 'ID de Jugador (UID)',
    player_id_placeholder: 'Ej: 198273645',
    player_id_hint: 'Encuentra tu ID de 8 a 10 dígitos en la esquina superior izquierda de tu perfil.',
    requires_player_id: true,
    can_verify_player: true,
    badge: 'ID Verificable',
  },
  ml: {
    id: 'ml',
    name: 'Mobile Legends: Bang Bang',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=700&auto=format&fit=crop&q=75',
    banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80',
    description: 'Diamantes y Pases Semanales directos a tu cuenta de Mobile Legends.',
    player_id_label: 'User ID',
    player_id_placeholder: 'Ej: 12345678',
    player_id_hint: 'Tu User ID son los dígitos antes del paréntesis en tu perfil.',
    requires_server: true,
    server_label: 'Zone ID (Servidor)',
    server_placeholder: 'Ej: 2045',
    server_hint: 'Los 4 a 5 dígitos que aparecen entre paréntesis junto a tu User ID.',
    requires_player_id: true,
    can_verify_player: true,
    badge: 'ID Verificable',
  },
  pubgm: {
    id: 'pubgm',
    name: 'PUBG Mobile',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=700&auto=format&fit=crop&q=75',
    banner: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1200&auto=format&fit=crop&q=80',
    description: 'Recarga de UC (Unknown Cash) para Royale Pass y cajas exclusivas.',
    player_id_label: 'ID de Personaje',
    player_id_placeholder: 'Ej: 5123456789',
    player_id_hint: 'Copia tu ID numérico desde tu tarjeta de perfil en el menú principal.',
    requires_player_id: true,
    can_verify_player: true,
    badge: 'ID Verificable',
  },
  fcm: {
    id: 'fcm',
    name: 'EA SPORTS FC Mobile',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=700&auto=format&fit=crop&q=75',
    banner: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&auto=format&fit=crop&q=80',
    description: 'FC Points y Pases Estrella para armar el equipo definitivo.',
    player_id_label: 'UID de FC Mobile',
    player_id_placeholder: 'Ej: 1092837465',
    player_id_hint: 'Encuentra tu UID en Ajustes del juego > Perfil.',
    requires_player_id: true,
    can_verify_player: true,
    badge: 'ID Verificable',
  },
  gi: {
    id: 'gi',
    name: 'Genshin Impact',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=700&auto=format&fit=crop&q=75',
    banner: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80',
    description: 'Cristales Génesis y Bendición Lunar con verificación instantánea de UID.',
    player_id_label: 'UID de Jugador',
    player_id_placeholder: 'Ej: 601234567',
    player_id_hint: 'Tu UID visible en la esquina inferior derecha de la pantalla del juego.',
    requires_server: true,
    server_label: 'Servidor',
    server_options: ['America', 'Europe', 'Asia', 'TW, HK, MO'],
    requires_player_id: true,
    can_verify_player: true,
    badge: 'ID Verificable',
  },
  abm: {
    id: 'abm',
    name: 'Arena Breakout',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=700&auto=format&fit=crop&q=75',
    banner: 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=1200&auto=format&fit=crop&q=80',
    description: 'Bonos y Pases de Batalla para equipamiento táctico de extracción móvil.',
    player_id_label: 'ID de Jugador (UID)',
    player_id_placeholder: 'Ej: 84729103',
    player_id_hint: 'Consulta tu ID de operador en los ajustes de perfil.',
    requires_player_id: true,
    can_verify_player: true,
    badge: 'ID Verificable',
  },
  abpc: {
    id: 'abpc',
    name: 'Arena Breakout Infinite (PC)',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1552824796-03c733611a58?w=700&auto=format&fit=crop&q=75',
    banner: 'https://images.unsplash.com/photo-1552824796-03c733611a58?w=1200&auto=format&fit=crop&q=80',
    description: 'Monedas tácticas y pases para la versión militar de PC.',
    player_id_label: 'ID de Cuenta PC',
    player_id_placeholder: 'Ej: 91028374',
    player_id_hint: 'Tu ID de soldado en el cliente de PC.',
    requires_player_id: true,
    can_verify_player: true,
    badge: 'ID Verificable',
  },
  blst: {
    id: 'blst',
    name: 'Blood Strike',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700&auto=format&fit=crop&q=75',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    description: 'Oro y Pase de Batalla para el FPS táctico de alta velocidad.',
    player_id_label: 'User ID de Blood Strike',
    player_id_placeholder: 'Ej: 482910384',
    player_id_hint: 'Copia tu ID desde la tarjeta de perfil en el lobby.',
    requires_player_id: true,
    can_verify_player: true,
    badge: 'ID Verificable',
  },
  hok: {
    id: 'hok',
    name: 'Honor of Kings',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=700&auto=format&fit=crop&q=75',
    banner: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=1200&auto=format&fit=crop&q=80',
    description: 'Tokens y skins exclusivas para el MOBA más jugado del mundo.',
    player_id_label: 'Player UID',
    player_id_placeholder: 'Ej: 2918301928',
    player_id_hint: 'Tu UID numérico en el menú de perfil de jugador.',
    requires_player_id: true,
    can_verify_player: true,
    badge: 'ID Verificable',
  },

  // --- 2. Recargas Directas (Requieren ID sin validación previa) ---
  dfs: {
    id: 'dfs',
    name: 'Delta Force (Steam)',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=700&auto=format&fit=crop&q=75',
    description: 'Monedas de combate y suministros para Delta Force en PC Steam.',
    player_id_label: 'ID de Cuenta Steam / UID',
    player_id_placeholder: 'Ej: 76561198000000000',
    requires_player_id: true,
    can_verify_player: false,
    badge: 'ID Requerido',
  },
  dfg: {
    id: 'dfg',
    name: 'Delta Force (Garena)',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=700&auto=format&fit=crop&q=75',
    description: 'Moneda de juego para el servidor Garena de Delta Force.',
    player_id_label: 'Garena UID',
    player_id_placeholder: 'Ej: 819203948',
    requires_player_id: true,
    can_verify_player: false,
    badge: 'ID Requerido',
  },
  fl84: {
    id: 'fl84',
    name: 'Farlight 84',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=700&auto=format&fit=crop&q=75',
    description: 'Diamantes para el vertiginoso battle royale futurista.',
    player_id_label: 'User ID de Farlight',
    player_id_placeholder: 'Ej: 9817263',
    requires_player_id: true,
    can_verify_player: false,
    badge: 'ID Requerido',
  },
  lucl: {
    id: 'lucl',
    name: 'Ludo Club',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=700&auto=format&fit=crop&q=75',
    description: 'Monedas y billetes para partidas online de Ludo Club.',
    player_id_label: 'User ID de Ludo',
    player_id_placeholder: 'Ej: 5829104',
    requires_player_id: true,
    can_verify_player: false,
    badge: 'ID Requerido',
  },
  mcgg: {
    id: 'mcgg',
    name: 'Magic Chess: Go Go',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=700&auto=format&fit=crop&q=75',
    description: 'Monedas y comandantes para el juego de estrategia táctica.',
    player_id_label: 'Player ID',
    player_id_placeholder: 'Ej: 7182930',
    requires_player_id: true,
    can_verify_player: false,
    badge: 'ID Requerido',
  },
  mico: {
    id: 'mico',
    name: 'MICO Live',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=700&auto=format&fit=crop&q=75',
    description: 'Monedas para transmisiones en vivo y regalos virtuales en MICO.',
    player_id_label: 'MICO ID',
    player_id_placeholder: 'Ej: 10293847',
    requires_player_id: true,
    can_verify_player: false,
    badge: 'ID Requerido',
  },
  bigo: {
    id: 'bigo',
    name: 'Bigo Live',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1516251193007-45ef944ab0c6?w=700&auto=format&fit=crop&q=75',
    description: 'Diamantes oficiales para streaming interactivo en Bigo Live.',
    player_id_label: 'Bigo ID',
    player_id_placeholder: 'Ej: bigo_user_id',
    requires_player_id: true,
    can_verify_player: false,
    badge: 'ID Requerido',
  },
  mr: {
    id: 'mr',
    name: 'Marvel Rivals',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=700&auto=format&fit=crop&q=75',
    description: 'Monedas para desbloquear héroes y aspectos en Marvel Rivals.',
    player_id_label: 'Player ID / UID',
    player_id_placeholder: 'Ej: MR-1928374',
    requires_player_id: true,
    can_verify_player: false,
    badge: 'ID Requerido',
  },
  ss: {
    id: 'ss',
    name: 'Super Sus',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=700&auto=format&fit=crop&q=75',
    description: 'Galletas de Oro y Pase Espacial para tripulantes e impostores.',
    player_id_label: 'Space ID (UID)',
    player_id_placeholder: 'Ej: 30192847',
    requires_player_id: true,
    can_verify_player: false,
    badge: 'ID Requerido',
  },
  tgm: {
    id: 'tgm',
    name: 'Telegram Stars & Premium',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=700&auto=format&fit=crop&q=75',
    description: 'Telegram Stars para bots y canales, o suscripción Premium.',
    player_id_label: 'Usuario de Telegram (@username o ID)',
    player_id_placeholder: 'Ej: @tu_usuario',
    requires_player_id: true,
    can_verify_player: false,
    badge: 'ID Requerido',
  },
  wuwa: {
    id: 'wuwa',
    name: 'Wuthering Waves',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=700&auto=format&fit=crop&q=75',
    description: 'Lunite y pase de suscripción para el RPG de mundo abierto.',
    player_id_label: 'UID de Rover',
    player_id_placeholder: 'Ej: 501928374',
    requires_player_id: true,
    can_verify_player: false,
    badge: 'ID Requerido',
  },
  wwm: {
    id: 'wwm',
    name: 'Where Winds Meet',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700&auto=format&fit=crop&q=75',
    description: 'Monedas de juego para la épica aventura oriental wuxia.',
    player_id_label: 'Player UID',
    player_id_placeholder: 'Ej: 90281726',
    requires_player_id: true,
    can_verify_player: false,
    badge: 'ID Requerido',
  },

  // --- 3. Tarjetas de Regalo & Pines Digitales (Sin ID, código instantáneo) ---
  apple: {
    id: 'apple',
    name: 'Apple iTunes / App Store',
    category: 'gift_card',
    category_label: 'Tarjeta de Regalo',
    image: 'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=700&auto=format&fit=crop&q=75',
    description: 'Código digital oficial para apps, suscripciones y Apple Music.',
    requires_player_id: false,
    can_verify_player: false,
    badge: 'Pin Digital',
  },
  bs: {
    id: 'bs',
    name: 'Brawl Stars',
    category: 'gift_card',
    category_label: 'Pin Digital',
    image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=700&auto=format&fit=crop&q=75',
    description: 'Gemas y Pase Brawl en código digital seguro de Supercell.',
    requires_player_id: false,
    can_verify_player: false,
    badge: 'Pin Digital',
  },
  exitlag: {
    id: 'exitlag',
    name: 'Exitlag',
    category: 'gift_card',
    category_label: 'Suscripción Digital',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=700&auto=format&fit=crop&q=75',
    description: 'Licencia para reducir el ping y optimizar tus conexiones gamer.',
    requires_player_id: false,
    can_verify_player: false,
    badge: 'Código Inmediato',
  },
  fn: {
    id: 'fn',
    name: 'Fortnite (V-Bucks)',
    category: 'gift_card',
    category_label: 'Pin Digital',
    image: 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=700&auto=format&fit=crop&q=75',
    description: 'Pavorreales (V-Bucks) en tarjetas canjeables en Epic Games.',
    requires_player_id: false,
    can_verify_player: false,
    badge: 'Pin Digital',
  },
  he: {
    id: 'he',
    name: 'Heroes Evolved',
    category: 'gift_card',
    category_label: 'Pin Digital',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=700&auto=format&fit=crop&q=75',
    description: 'Monedas de recarga en tarjetas de canje para Heroes Evolved.',
    requires_player_id: false,
    can_verify_player: false,
    badge: 'Pin Digital',
  },
  mnct: {
    id: 'mnct',
    name: 'Minecraft',
    category: 'gift_card',
    category_label: 'Tarjeta de Regalo',
    image: 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=700&auto=format&fit=crop&q=75',
    description: 'Minecoins y juego completo para canjear en minecraft.net.',
    requires_player_id: false,
    can_verify_player: false,
    badge: 'Pin Digital',
  },
  nintendo: {
    id: 'nintendo',
    name: 'Nintendo eShop',
    category: 'gift_card',
    category_label: 'Tarjeta de Regalo',
    image: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=700&auto=format&fit=crop&q=75',
    description: 'Saldo oficial para Nintendo Switch eShop.',
    requires_player_id: false,
    can_verify_player: false,
    badge: 'Pin Digital',
  },
  psn: {
    id: 'psn',
    name: 'PlayStation Network (PSN)',
    category: 'gift_card',
    category_label: 'Tarjeta de Regalo',
    image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=700&auto=format&fit=crop&q=75',
    description: 'Fondos de monedero para PlayStation Store en PS4 y PS5.',
    requires_player_id: false,
    can_verify_player: false,
    badge: 'Pin Digital',
  },
  ra: {
    id: 'ra',
    name: 'Riot Access (Valorant / LoL)',
    category: 'gift_card',
    category_label: 'Pin Digital',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=700&auto=format&fit=crop&q=75',
    description: 'Puntos Valorant y Riot Points para League of Legends.',
    requires_player_id: false,
    can_verify_player: false,
    badge: 'Pin Digital',
  },
  rb: {
    id: 'rb',
    name: 'Roblox (Robux)',
    category: 'gift_card',
    category_label: 'Tarjeta de Regalo',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=700&auto=format&fit=crop&q=75',
    description: 'Tarjetas de Robux para avatar items, skins y experiencias.',
    requires_player_id: false,
    can_verify_player: false,
    badge: 'Pin Digital',
  },
  softnyx: {
    id: 'softnyx',
    name: 'Softnyx Cash',
    category: 'gift_card',
    category_label: 'Pin Digital',
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=700&auto=format&fit=crop&q=75',
    description: 'Cash para Wolfteam, Rakion y juegos de la plataforma Softnyx.',
    requires_player_id: false,
    can_verify_player: false,
    badge: 'Pin Digital',
  },
  steam: {
    id: 'steam',
    name: 'Steam Wallet',
    category: 'gift_card',
    category_label: 'Tarjeta de Regalo',
    image: 'https://images.unsplash.com/photo-1612287233215-68045f448651?w=700&auto=format&fit=crop&q=75',
    description: 'Añade fondos a tu cartera de Steam para comprar miles de juegos.',
    requires_player_id: false,
    can_verify_player: false,
    badge: 'Pin Digital',
  },
  xbox: {
    id: 'xbox',
    name: 'Xbox / Microsoft Store',
    category: 'gift_card',
    category_label: 'Tarjeta de Regalo',
    image: 'https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=700&auto=format&fit=crop&q=75',
    description: 'Suscripciones Game Pass y saldo para consolas Xbox y PC.',
    requires_player_id: false,
    can_verify_player: false,
    badge: 'Pin Digital',
  },
  // --- Nuevos Juegos y Pines Canjea 2026 ---
  ffpin: {
    id: 'ffpin',
    name: 'Free Fire · Pines y Códigos',
    category: 'gift_card',
    category_label: 'Código Digital',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=700&auto=format&fit=crop&q=75',
    banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
    description: 'Pines digitales canjeables en PagoStore / redeem.canjea.me. Entrega inmediata sin ID.',
    requires_player_id: false,
    can_verify_player: false,
    badge: 'Pin Inmediato',
    redeem_instructions: '1. Entra a redeem.canjea.me o pagostore.com\n2. Ingresa el código recibido\n3. Escribe tu ID de Free Fire y los diamantes se acreditarán al instante.',
  },
  hsr: {
    id: 'hsr',
    name: 'Honkai: Star Rail',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=700&auto=format&fit=crop&q=75',
    banner: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
    description: 'Esquirlas Oníricas y Pase de Suministro Expreso directos a tu cuenta HoYoverse.',
    player_id_label: 'UID de Jugador',
    player_id_placeholder: 'Ej: 601234567',
    player_id_hint: 'Tu UID se encuentra en la esquina inferior izquierda o en tu teléfono dentro del juego.',
    requires_server: true,
    server_label: 'Servidor',
    server_options: ['America', 'Europe', 'Asia', 'TW, HK, MO'],
    requires_player_id: true,
    can_verify_player: false,
    badge: 'HoYoverse Oficial',
  },
  zzz: {
    id: 'zzz',
    name: 'Zenless Zone Zero',
    category: 'direct_topup',
    category_label: 'Recarga Directa',
    image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=700&auto=format&fit=crop&q=75',
    banner: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80',
    description: 'Fotogramas y Suscripción Proxy con recarga oficial directa para Zenless Zone Zero.',
    player_id_label: 'UID de Jugador',
    player_id_placeholder: 'Ej: 100234567',
    player_id_hint: 'Encuentra tu UID en la esquina inferior izquierda de tu pantalla de juego.',
    requires_server: true,
    server_label: 'Servidor',
    server_options: ['America', 'Europe', 'Asia', 'TW, HK, MO'],
    requires_player_id: true,
    can_verify_player: false,
    badge: 'HoYoverse Oficial',
  },
};

// Catálogo temático de imágenes gamer HD para juegos nuevos no registrados en el diccionario
export const GAMER_THEME_IMAGE_POOLS = {
  shooter: [
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=700&auto=format&fit=crop&q=75',
    'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=700&auto=format&fit=crop&q=75',
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=700&auto=format&fit=crop&q=75',
  ],
  anime_rpg: [
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=700&auto=format&fit=crop&q=75',
    'https://images.unsplash.com/photo-1563089145-599997674d42?w=700&auto=format&fit=crop&q=75',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=700&auto=format&fit=crop&q=75',
  ],
  sports: [
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=700&auto=format&fit=crop&q=75',
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=700&auto=format&fit=crop&q=75',
  ],
  cards_pines: [
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=700&auto=format&fit=crop&q=75',
    'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=700&auto=format&fit=crop&q=75',
    'https://images.unsplash.com/photo-1612287233215-68045f448651?w=700&auto=format&fit=crop&q=75',
  ],
  general_gamer: [
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=700&auto=format&fit=crop&q=75',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=700&auto=format&fit=crop&q=75',
    'https://images.unsplash.com/photo-1552824722-ddab1374e622?w=700&auto=format&fit=crop&q=75',
  ],
};

export function getThemedGamerImage(gameId = '', gameName = '', requiresPlayerId = false) {
  const text = `${gameId} ${gameName}`.toLowerCase();

  let pool = GAMER_THEME_IMAGE_POOLS.general_gamer;
  if (/fire|strike|cod|duty|pubg|war|gun|shoot|arena|delta|apex|val/i.test(text)) {
    pool = GAMER_THEME_IMAGE_POOLS.shooter;
  } else if (/honkai|star|genshin|zero|zone|anime|fate|rpg|fantasy|dragon|blade/i.test(text)) {
    pool = GAMER_THEME_IMAGE_POOLS.anime_rpg;
  } else if (/fifa|fc|soccer|fut|ball|sport|nba|speed|race/i.test(text)) {
    pool = GAMER_THEME_IMAGE_POOLS.sports;
  } else if (!requiresPlayerId || /pin|card|code|gift|steam|xbox|apple|google|play/i.test(text)) {
    pool = GAMER_THEME_IMAGE_POOLS.cards_pines;
  }

  // Hash consistente para que la misma franquicia siempre mantenga la misma imagen
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % pool.length;
  return pool[index];
}

/**
 * Calcula el precio minorista aplicando margen y/o suggested_retail_price
 */
function calculatePricing(wholesalePriceStr, suggestedRetailPriceStr, markupPercent = 0.10) {
  const wholesaleDollars = parseFloat(wholesalePriceStr || '0');
  const wholesaleCents = Math.round(wholesaleDollars * 100);

  const suggestedDollars = parseFloat(suggestedRetailPriceStr || '0');
  const suggestedCents = Math.round(suggestedDollars * 100);

  let retailCents;
  if (suggestedCents > wholesaleCents) {
    retailCents = suggestedCents;
  } else {
    retailCents = Math.round(wholesaleCents * (1 + markupPercent));
  }

  // Margen mínimo de $0.05
  if (retailCents <= wholesaleCents) {
    retailCents = wholesaleCents + 5;
  }

  return {
    wholesale_cents: wholesaleCents,
    wholesale_decimal: (wholesaleCents / 100).toFixed(2),
    price_cents: retailCents,
    price_decimal: (retailCents / 100).toFixed(2),
  };
}

export const catalogService = {
  /**
   * Obtiene la lista completa de productos normalizados
   */
  async getCatalog() {
    const now = Date.now();
    if (cachedCatalog && now - lastFetchTime < CACHE_TTL_MS) {
      return cachedCatalog;
    }

    const canjeaData = await canjeaClient.getCatalog();
    const rawProducts = canjeaData?.products || [];

    const normalized = rawProducts.map((p) => {
      const pricing = calculatePricing(p.price, p.suggested_retail_price);
      const meta = GAME_DIRECTORY[p.game] || {
        id: p.game,
        name: p.game_name || p.game,
        category: p.requires_player_id ? 'direct_topup' : 'gift_card',
        category_label: p.requires_player_id ? 'Recarga Directa' : 'Tarjeta de Regalo',
        image: getThemedGamerImage(p.game, p.game_name, p.requires_player_id),
        banner: getThemedGamerImage(p.game, p.game_name, p.requires_player_id),
        requires_player_id: Boolean(p.requires_player_id),
        can_verify_player: Boolean(p.can_verify_player),
        badge: p.can_verify_player ? 'ID Verificable' : !p.requires_player_id ? 'Pin Digital' : 'ID Requerido',
      };

      return {
        id: p.sku,
        sku: p.sku,
        name: p.name,
        game_id: p.game,
        game: p.game_name || meta.name,
        category: meta.category,
        category_label: meta.category_label,
        price_cents: pricing.price_cents,
        price_decimal: pricing.price_decimal,
        wholesale_cents: pricing.wholesale_cents,
        wholesale_decimal: pricing.wholesale_decimal,
        currency: p.currency || 'USD',
        requires_player_id: Boolean(p.requires_player_id),
        can_verify_player: Boolean(p.can_verify_player),
        price_is_estimated: Boolean(p.price_is_estimated),
        image_url: meta.image,
        badge: meta.badge,
      };
    });

    cachedCatalog = normalized;
    lastFetchTime = now;

    return normalized;
  },

  /**
   * Obtiene las 34 franquicias/juegos agrupados con precio mínimo "desde"
   */
  async getGamesList(includeHidden = false) {
    const now = Date.now();
    if (!includeHidden && cachedGames && now - lastFetchTime < CACHE_TTL_MS) {
      return cachedGames;
    }

    const catalog = await this.getCatalog();
    const gamesMap = new Map();

    for (const prod of catalog) {
      const gameKey = prod.game_id;
      const meta = GAME_DIRECTORY[gameKey] || {
        id: gameKey,
        name: prod.game,
        category: prod.category,
        category_label: prod.category_label,
        image: prod.image_url,
        description: `Recarga oficial para ${prod.game}`,
        requires_player_id: prod.requires_player_id,
        can_verify_player: prod.can_verify_player,
        badge: prod.badge,
      };

      if (!gamesMap.has(gameKey)) {
        gamesMap.set(gameKey, {
          id: gameKey,
          name: meta.name,
          category: meta.category,
          category_label: meta.category_label,
          image_url: meta.image,
          banner_url: meta.banner || meta.image,
          description: meta.description,
          player_id_label: meta.player_id_label,
          player_id_placeholder: meta.player_id_placeholder,
          player_id_hint: meta.player_id_hint,
          requires_server: Boolean(meta.requires_server),
          server_label: meta.server_label || null,
          server_placeholder: meta.server_placeholder || null,
          server_hint: meta.server_hint || null,
          server_options: meta.server_options || null,
          requires_player_id: Boolean(prod.requires_player_id),
          can_verify_player: Boolean(prod.can_verify_player),
          badge: meta.badge,
          min_price_cents: prod.price_cents,
          min_price_decimal: prod.price_decimal,
          currency: prod.currency,
          packages_count: 1,
        });
      } else {
        const existing = gamesMap.get(gameKey);
        existing.packages_count += 1;
        if (prod.price_cents < existing.min_price_cents) {
          existing.min_price_cents = prod.price_cents;
          existing.min_price_decimal = prod.price_decimal;
        }
      }
    }

    // Aplicar personalizaciones de portadas e imágenes fijadas por el Administrador
    let overrides = [];
    try {
      overrides = await catalogOverrideRepository.getOverrides();
    } catch {
      overrides = [];
    }

    const overrideMap = new Map();
    for (const ov of overrides) {
      overrideMap.set(ov.game_id, ov);
    }

    const resultList = [];
    for (const g of gamesMap.values()) {
      const ov = overrideMap.get(g.id);
      if (ov) {
        if (!includeHidden && ov.is_visible === false) {
          continue;
        }
        if (ov.custom_name) g.name = ov.custom_name;
        if (ov.custom_image_url) g.image_url = ov.custom_image_url;
        if (ov.custom_banner_url) g.banner_url = ov.custom_banner_url;
        if (ov.custom_badge) g.badge = ov.custom_badge;
        g.is_visible = ov.is_visible !== false;
      } else {
        g.is_visible = true;
      }
      resultList.push(g);
    }

    const sorted = resultList.sort((a, b) => {
      // Priorizar los juegos verificables populares primero
      if (a.can_verify_player && !b.can_verify_player) return -1;
      if (!a.can_verify_player && b.can_verify_player) return 1;
      return a.name.localeCompare(b.name);
    });

    if (!includeHidden) {
      cachedGames = sorted;
    }

    return sorted;
  },

  /**
   * Obtiene la información completa de un juego junto con sus paquetes ordenados por precio
   */
  async getGameDetails(gameId) {
    const catalog = await this.getCatalog();
    let gamePackages = catalog.filter((p) => p.game_id === gameId);

    if (gamePackages.length === 0) {
      return null;
    }

    let regions = null;
    if (gameId === 'ff') {
      regions = [
        { id: 'latam', label: 'LATAM / Hispanoamérica' },
        { id: 'br', label: 'Brasil' },
      ];

      gamePackages = gamePackages.map((p) => {
        const isLatam = p.sku.toLowerCase().startsWith('fflatam');
        return {
          ...p,
          region: isLatam ? 'latam' : 'br',
          region_label: isLatam ? 'LATAM' : 'Brasil',
        };
      });

      // Ordenar: primero LATAM por precio, luego Brasil por precio
      gamePackages.sort((a, b) => {
        if (a.region === 'latam' && b.region === 'br') return -1;
        if (a.region === 'br' && b.region === 'latam') return 1;
        return a.price_cents - b.price_cents;
      });
    } else {
      gamePackages.sort((a, b) => a.price_cents - b.price_cents);
    }

    const first = gamePackages[0];
    let meta = GAME_DIRECTORY[gameId] || {
      id: gameId,
      name: first.game,
      category: first.category,
      category_label: first.category_label,
      image: first.image_url,
      description: `Recarga oficial para ${first.game}`,
      requires_player_id: first.requires_player_id,
      can_verify_player: first.can_verify_player,
      badge: first.badge,
    };

    // Aplicar personalización de admin si existe
    try {
      const overrides = await catalogOverrideRepository.getOverrides();
      const ov = overrides.find((o) => o.game_id === gameId);
      if (ov) {
        meta = {
          ...meta,
          name: ov.custom_name || meta.name,
          image: ov.custom_image_url || meta.image,
          banner: ov.custom_banner_url || meta.banner || meta.image,
          badge: ov.custom_badge || meta.badge,
        };
      }
    } catch {}

    return {
      id: gameId,
      name: meta.name,
      category: meta.category,
      category_label: meta.category_label,
      image_url: meta.image,
      banner_url: meta.banner || meta.image,
      description: meta.description,
      player_id_label: meta.player_id_label || 'ID de Jugador',
      player_id_placeholder: meta.player_id_placeholder || 'Ej: 123456789',
      player_id_hint: meta.player_id_hint || null,
      requires_server: Boolean(meta.requires_server),
      server_label: meta.server_label || null,
      server_placeholder: meta.server_placeholder || null,
      server_hint: meta.server_hint || null,
      server_options: meta.server_options || null,
      regions,
      requires_player_id: Boolean(first.requires_player_id),
      can_verify_player: Boolean(first.can_verify_player),
      badge: meta.badge,
      min_price_cents: first.price_cents,
      min_price_decimal: first.price_decimal,
      currency: first.currency,
      packages_count: gamePackages.length,
      packages: gamePackages.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        price_cents: p.price_cents,
        price_decimal: p.price_decimal,
        wholesale_cents: p.wholesale_cents,
        wholesale_decimal: p.wholesale_decimal,
        currency: p.currency,
        region: p.region || null,
        region_label: p.region_label || null,
        requires_player_id: p.requires_player_id,
        can_verify_player: p.can_verify_player,
        price_is_estimated: p.price_is_estimated,
        is_active: p.is_active !== false,
      })),
    };
  },

  /**
   * Actualiza la portada, banner, nombre o visibilidad de un juego (Admin)
   */
  async updateGameOverride(gameId, data) {
    cachedGames = null;
    return catalogOverrideRepository.upsertOverride(gameId, data);
  },

  /**
   * Busca un producto por SKU
   */
  async getProductBySku(sku) {
    const catalog = await this.getCatalog();
    return catalog.find((p) => p.sku === sku);
  },

  /**
   * Sincroniza el catálogo con Canjea API:
   * 1. Detecta nuevos productos o juegos en tiempo real.
   * 2. Auto-crea los registros en la base de datos (provider_synced_products).
   * 3. Despacha alerta instantánea por correo a Super Admin si hay novedades.
   */
  async syncCatalogWithProvider({ force = false } = {}) {
    const canjeaData = await canjeaClient.getCatalog();
    const rawProducts = canjeaData?.products || [];
    if (rawProducts.length === 0) {
      return { success: false, message: 'Proveedor no devolvió productos', newCount: 0 };
    }

    if (!isSupabaseConfigured) {
      return { success: true, message: 'Supabase no configurado, sincronizado en memoria', newCount: 0 };
    }

    // 1. Obtener SKUs ya registrados
    const { data: existingRows, error: fetchErr } = await supabaseAdmin
      .from('provider_synced_products')
      .select('sku, game_id');

    if (fetchErr) {
      console.error('[CatalogSync] Error consultando provider_synced_products:', fetchErr);
      return { success: false, error: fetchErr.message, newCount: 0 };
    }

    const knownSkus = new Set((existingRows || []).map((r) => r.sku));
    const isInitialSeeding = knownSkus.size === 0;

    const newProducts = [];
    const knownGameIds = new Set(Object.keys(GAME_DIRECTORY));
    let newGamesCount = 0;

    for (const p of rawProducts) {
      if (!knownSkus.has(p.sku)) {
        newProducts.push({
          sku: p.sku,
          game_id: p.game,
          game_name: p.game_name || p.game,
          name: p.name,
          wholesale_price: String(p.price || '0.00'),
          suggested_price: String(p.suggested_retail_price || p.price || '0.00'),
          currency: p.currency || 'USD',
          requires_player_id: Boolean(p.requires_player_id),
          can_verify_player: Boolean(p.can_verify_player),
          is_active: true,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          notified_admin: isInitialSeeding, // Si es la primera carga histórica, no disparar correo
        });

        if (!knownGameIds.has(p.game)) {
          newGamesCount++;
          knownGameIds.add(p.game);
        }
      }
    }

    // 2. Insertar los nuevos productos en base de datos
    if (newProducts.length > 0) {
      const { error: insertErr } = await supabaseAdmin
        .from('provider_synced_products')
        .upsert(newProducts, { onConflict: 'sku' });

      if (insertErr) {
        console.error('[CatalogSync] Error guardando nuevos productos:', insertErr);
      } else {
        console.log(`[CatalogSync] Registrados ${newProducts.length} nuevos productos en provider_synced_products (Inicial: ${isInitialSeeding}).`);
      }
    }

    // 3. Si NO es la siembra inicial y hay nuevos productos, despachar alerta inmediata por correo al Super Admin
    if (!isInitialSeeding && newProducts.length > 0) {
      try {
        const adminEmail = 'b.edumalta@gmail.com';
        await emailService.sendNewProductsAlert({
          adminEmail,
          newProducts,
          newGamesCount,
        });
        console.log(`[CatalogSync] ✉️ Correo de alerta despachado a ${adminEmail} por ${newProducts.length} nuevos productos.`);
      } catch (mailErr) {
        console.error('[CatalogSync] Error enviando alerta de correo por nuevos productos:', mailErr);
      }
    }

    // 4. Si se encontraron nuevos productos, invalidar cachés para que los clientes los vean de inmediato
    if (newProducts.length > 0) {
      cachedCatalog = null;
      cachedGames = null;
      lastFetchTime = 0;
    }

    return {
      success: true,
      totalFromProvider: rawProducts.length,
      newProductsCount: isInitialSeeding ? 0 : newProducts.length,
      isInitialSeeding,
      newProducts: isInitialSeeding ? [] : newProducts,
    };
  },
};
