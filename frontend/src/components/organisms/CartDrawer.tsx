import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, AlertTriangle, CheckCircle2, MessageCircle } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useWalletStore } from '../../store/useWalletStore';
import { PriceDisplay } from '../molecules/PriceDisplay';
import { Button } from '../atoms/Button';
import { ordersService } from '../../services/api/orders.service';

import { useUIStore } from '../../store/useUIStore';

export const CartDrawer: React.FC = () => {
  const { items, isOpen, closeCart, removeItem, clearCart, getTotalCents } = useCartStore();
  const { wallet, fetchWallet } = useWalletStore();
  const { showToast } = useUIStore();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const totalCents = getTotalCents();
  const availableCents = wallet.available_balance_cents;
  const isSufficient = availableCents >= totalCents;
  const missingCents = Math.max(0, totalCents - availableCents);

  const handleCheckout = async () => {
    if (!isSufficient || items.length === 0) return;

    setIsProcessing(true);
    try {
      // Process orders sequentially with idempotency
      for (const item of items) {
        await ordersService.createOrder({
          productId: item.product.id,
          playerId: item.playerId,
          playerName: item.playerName,
          fields: item.fields,
          currency: item.product.currency,
        });
      }

      // Refresh the authoritative balance after the backend accepts the orders.
      await fetchWallet();

      clearCart();
      closeCart();
      showToast('¡Compra realizada con éxito! Revisa tus códigos en Mis Códigos.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al procesar el pedido.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0d1322] border-l border-slate-800 shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-bold text-white font-['Rajdhani'] uppercase tracking-wider">
                Carrito de Compras
              </h3>
            </div>
            <button
              onClick={closeCart}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <ShoppingBag className="w-12 h-12 text-slate-700 mx-auto" />
                <p className="text-slate-400 text-sm">Tu carrito está vacío.</p>
                <p className="text-xs text-slate-500">
                  Explora el catálogo y añade diamantes, monedas o tarjetas de regalo.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl flex gap-3.5 items-start relative group"
                >
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
                    className="w-14 h-14 rounded-lg object-cover border border-slate-800 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase block">
                      {item.product.game}
                    </span>
                    <h4 className="text-sm font-semibold text-white truncate">
                      {item.product.name}
                    </h4>

                    {item.playerId && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-md inline-flex">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          ID: {item.playerId} {item.playerName && `(${item.playerName})`}
                        </span>
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between">
                      <PriceDisplay
                        cents={item.product.price_cents}
                        currency={item.product.currency}
                        size="sm"
                        className="text-cyan-400"
                      />
                      <span className="text-xs text-slate-400 font-medium">
                        Cant: {item.quantity}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-slate-500 hover:text-red-400 p-1 rounded-md transition-colors"
                    title="Eliminar ítem"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout */}
          {items.length > 0 && (
            <div className="p-5 border-t border-slate-800/80 bg-slate-950/60 space-y-4">
              {/* Balance comparison summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Saldo Virtual Disponible:</span>
                  <PriceDisplay
                    cents={availableCents}
                    currency={wallet.currency}
                    size="sm"
                    className="text-slate-200"
                  />
                </div>

                <div className="flex items-center justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
                  <span>Total a Pagar:</span>
                  <PriceDisplay
                    cents={totalCents}
                    currency={wallet.currency}
                    size="lg"
                    className="text-cyan-400"
                  />
                </div>
              </div>

              {/* Insufficient Balance Alert */}
              {!isSufficient && (
                <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Saldo insuficiente</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Te faltan{' '}
                    <strong className="text-red-400">
                      <PriceDisplay
                        cents={missingCents}
                        currency={wallet.currency}
                        size="sm"
                        className="text-red-400"
                      />
                    </strong>{' '}
                    para completar esta orden. Contacta al administrador para recargar tu saldo virtual.
                  </p>
                  <a
                    href="https://wa.me/593999561588?text=Hola%2C%20deseo%20solicitar%20una%20recarga%20de%20saldo%20en%20Recargas%20Juegos%20Online"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Solicitar Recarga por WhatsApp (0999561588)
                  </a>
                </div>
              )}

              {/* Checkout Button */}
              <Button
                variant={isSufficient ? 'accent' : 'secondary'}
                size="lg"
                className="w-full"
                disabled={!isSufficient || isProcessing}
                isLoading={isProcessing}
                onClick={handleCheckout}
                glow={isSufficient}
              >
                {isSufficient
                  ? 'Confirmar Compra con Saldo Virtual'
                  : 'Saldo Insuficiente para Comprar'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
