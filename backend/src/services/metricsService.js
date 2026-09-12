import { supabaseAdmin, isSupabaseConfigured } from '../repositories/supabaseClient.js';
import { canjeaClient } from './catalogService.js';

export const metricsService = {
  async getAdminMetrics() {
    let totalSalesCents = 0;
    let activeOrdersCount = 0;
    let totalUsersCount = 0;

    if (isSupabaseConfigured) {
      // Contar usuarios
      const { count: usersCount } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      totalUsersCount = usersCount || 0;

      // Sumar órdenes completadas
      const { data: salesData } = await supabaseAdmin
        .from('orders')
        .select('price_minor')
        .eq('status', 'succeeded');

      if (salesData) {
        totalSalesCents = salesData.reduce((acc, row) => acc + Number(row.price_minor || 0), 0);
      }

      // Contar órdenes activas o en proceso
      const { count: activeCount } = await supabaseAdmin
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['held', 'processing', 'pending_reconciliation']);
      activeOrdersCount = activeCount || 0;
    } else {
      totalSalesCents = 248500;
      activeOrdersCount = 8;
      totalUsersCount = 114;
    }

    // Consultar saldo en vivo con el proveedor Canjea
    let supplierBalanceCents = 10000;
    try {
      const balanceData = await canjeaClient.getBalance();
      const balanceFloat = parseFloat(balanceData.balance || '0');
      supplierBalanceCents = Math.round(balanceFloat * 100);
    } catch {
      // Fallback
    }

    return {
      total_sales_cents: totalSalesCents,
      active_orders_count: activeOrdersCount,
      total_users_count: totalUsersCount,
      supplier_balance_cents: supplierBalanceCents,
      supplier_name: 'Canjea API Gateway',
      currency: 'USD',
    };
  },
};

