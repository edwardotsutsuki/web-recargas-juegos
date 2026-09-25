export type UserRole = 'client' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
  created_at?: string;
}

export interface WalletState {
  currency: string;
  total_balance_cents: number;
  held_balance_cents: number;
  available_balance_cents: number;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  game: string;
  category: string;
  price_cents: number;
  currency: string;
  image_url: string;
  requires_player_id: boolean;
  can_verify_player: boolean;
  description?: string;
  badge?: string;
}

export interface PackageField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  sensitive?: boolean;
  help?: string;
}

export interface PackageDelivery {
  mode: string;
  hours?: string;
  eta_minutes?: number | null;
}

export interface GamePackage {
  id: string;
  sku: string;
  name: string;
  price_cents: number;
  price_decimal: string;
  wholesale_cents?: number;
  wholesale_decimal?: string;
  currency: string;
  region?: string | null;
  region_label?: string | null;
  requires_player_id: boolean;
  can_verify_player: boolean;
  price_is_estimated?: boolean;
  is_active?: boolean;
  delivery?: PackageDelivery | null;
  required_fields?: PackageField[] | null;
  redeem_instructions?: string | null;
}

export interface GameSummary {
  id: string;
  name: string;
  category: 'direct_topup' | 'gift_card' | 'manual_topup';
  category_label: string;
  subtitle?: string;
  is_featured?: boolean;
  image_url: string;
  banner_url?: string;
  description: string;
  player_id_label?: string;
  player_id_placeholder?: string;
  player_id_hint?: string | null;
  requires_server?: boolean;
  server_label?: string | null;
  server_placeholder?: string | null;
  server_hint?: string | null;
  server_options?: string[] | null;
  regions?: Array<{ id: string; label: string }> | null;
  requires_player_id: boolean;
  can_verify_player: boolean;
  badge?: string;
  min_price_cents: number;
  min_price_decimal: string;
  currency: string;
  packages_count: number;
}

export interface GameDetail extends GameSummary {
  packages: GamePackage[];
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface Order {
  id: string;
  user_id: string;
  product_id: string;
  product_name: string;
  game: string;
  amount_cents: number;
  currency: string;
  player_id?: string;
  player_name?: string;
  status: OrderStatus;
  digital_code?: string;
  redeem_instructions?: string | null;
  created_at: string;
}

export interface VerifyPlayerRequest {
  productId: string;
  playerId: string;
  serverZone?: string;
}

export interface VerifyPlayerResponse {
  valid: boolean;
  playerId: string;
  playerName: string;
  detectedRegion?: string;
  message?: string;
}

export interface CreateOrderRequest {
  productId: string;
  playerId?: string;
  playerName?: string;
  fields?: Record<string, string>;
  currency: string;
}

export interface CreateOrderResponse {
  orderId: string;
  status: OrderStatus;
  message: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  phone?: string;
  referral_code?: string | null;
  two_factor_enabled?: boolean;
  wallet: WalletState;
  created_at: string;
}

export interface CreditWalletRequest {
  userId: string;
  amount_cents: number;
  currency: string;
  reason: string;
}

export interface AdminMetrics {
  total_sales_cents: number;
  active_orders_count: number;
  total_users_count: number;
  supplier_balance_cents: number;
  supplier_name: string;
  currency: string;
}

export interface PaymentMethod {
  id: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  account_holder: string;
  notes?: string | null;
  is_active: boolean;
  sort_order?: number;
}

export interface DepositRequest {
  id: string;
  user_id: string;
  payment_method_id?: string | null;
  bank_name: string;
  amount_cents: number;
  currency: string;
  reference_number: string;
  voucher_url: string;
  voucher_compressed_url?: string | null;
  voucher_hash?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at?: string;
  user?: {
    id: string;
    role: string;
    full_name?: string | null;
    phone?: string | null;
    referral_code?: string | null;
  };
}

export interface SystemStatus {
  ok: boolean;
  canjea_balance: string;
  canjea_balance_cents: number;
  currency: string;
  circuit_breaker_active: boolean;
  alert_level: 'normal' | 'warning' | 'critical';
  alert_message: string;
  settings: {
    warning_threshold_cents: number;
    warning_threshold_usd: string;
    critical_threshold_cents: number;
    critical_threshold_usd: string;
    circuit_breaker_override: 'auto' | 'force_open' | 'force_pause';
    rewards_enabled: boolean;
    referral_commission_percent: number;
    notification_sender_email?: string;
  };
  last_checked: string;
}

export interface AccountingSummary {
  total_orders_count: number;
  successful_orders_count: number;
  total_wholesale_cost_usd: string;
  total_client_charged_usd: string;
  total_net_profit_usd: string;
  today_profit_usd: string;
  month_profit_usd: string;
}

export interface AccountingEntry {
  id: string;
  order_id: string;
  date: string;
  sku: string;
  product_name: string;
  player_id: string;
  player_name: string;
  status: string;
  currency: string;
  wholesale_cost_cents: number;
  wholesale_cost_usd: string;
  retail_pvp_cents: number;
  retail_pvp_usd: string;
  net_profit_cents: number;
  net_profit_usd: string;
  margin_percent: number;
}

export interface AccountingBook {
  summary: AccountingSummary;
  entries: AccountingEntry[];
}

export interface CustomPrice {
  sku: string;
  custom_pvp_cents: number;
}

export interface RewardItem {
  id: string;
  title: string;
  description: string;
  target_sales_usd: string;
  reward_bonus_usd: string;
  current_sales_usd: string;
  progress_percentage: number;
  is_completed: boolean;
  badge_icon: string;
  game_id?: string | null;
}

export interface RewardsResponse {
  enabled: boolean;
  total_accumulated_usd: string;
  rewards: RewardItem[];
}

export interface ReferralInfo {
  referral_code: string;
  commission_percent: number;
  total_referred_users: number;
  total_earned_usd: string;
}

export interface Promotion {
  id: string;
  title: string;
  message: string;
  badge_text: string;
  banner_image_url?: string | null;
  action_url?: string | null;
  action_label?: string | null;
  placement: 'top_banner' | 'hero' | 'modal';
  is_active: boolean;
  created_at: string;
}

export interface CatalogGameAdmin {
  id: string;
  name: string;
  category: string;
  category_label: string;
  image_url: string;
  banner_url?: string;
  badge?: string;
  is_visible?: boolean;
  requires_player_id: boolean;
  can_verify_player: boolean;
  packages_count: number;
  min_price_decimal: string;
  currency: string;
}

export interface PromotionalMaterial {
  id: string;
  title: string;
  description: string;
  category: 'banner' | 'guide' | 'pricing_template' | 'logo' | 'story';
  file_url: string;
  thumbnail_url?: string | null;
  format: string;
  file_size_mb: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  user_email?: string;
  subject: string;
  category: 'deposit_inquiry' | 'recharge_issue' | 'id_verification' | 'account' | 'other';
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  admin_reply?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name?: string;
    phone?: string;
  };
}
