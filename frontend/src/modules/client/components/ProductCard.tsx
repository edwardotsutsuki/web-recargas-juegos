import React from 'react';
import { Product } from '../../../types';
import { PriceDisplay } from '../../../components/molecules/PriceDisplay';
import { Button } from '../../../components/atoms/Button';
import { Badge } from '../../../components/atoms/Badge';
import { useWalletStore } from '../../../store/useWalletStore';
import { useCartStore } from '../../../store/useCartStore';
import { useUIStore } from '../../../store/useUIStore';
import { InsufficientBalanceAlert } from './InsufficientBalanceAlert';
import { ShieldCheck, UserCheck, ShoppingCart, Zap } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { wallet } = useWalletStore();
  const { addItem } = useCartStore();
  const { openVerificationModal } = useUIStore();

  const isSufficient = wallet.available_balance_cents >= product.price_cents;

  const handleAction = () => {
    if (!isSufficient) return;

    if (product.requires_player_id) {
      openVerificationModal(product, (playerId, playerName) => {
        addItem(product, playerId, playerName);
      });
    } else {
      addItem(product);
    }
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1">
      {/* Product Image & Badges */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-900">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1322] via-transparent to-black/40" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge variant="primary" size="sm">
            {product.game}
          </Badge>
          {product.badge && (
            <Badge variant="info" size="sm">
              {product.badge}
            </Badge>
          )}
        </div>

        {/* Verification Requirements Tag */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 text-[11px] text-slate-300">
          {product.requires_player_id && (
            <span className="inline-flex items-center gap-1 bg-slate-950/80 border border-slate-700/60 px-2 py-0.5 rounded-md text-[10px] font-semibold text-cyan-300 backdrop-blur-sm">
              <UserCheck className="w-3 h-3" />
              ID de Jugador
            </span>
          )}
          {product.can_verify_player && (
            <span className="inline-flex items-center gap-1 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-md text-[10px] font-semibold text-emerald-300 backdrop-blur-sm">
              <ShieldCheck className="w-3 h-3" />
              Verificable
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {product.category}
          </span>
          <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors mt-0.5">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Price & Balance Condition */}
        <div className="pt-3 border-t border-slate-800/80 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">Precio Final:</span>
            <PriceDisplay
              cents={product.price_cents}
              currency={product.currency}
              size="lg"
              className="text-white group-hover:text-cyan-400 transition-colors"
            />
          </div>

          {/* Insufficient balance warning block */}
          {!isSufficient && (
            <InsufficientBalanceAlert
              priceCents={product.price_cents}
              currency={product.currency}
            />
          )}

          {/* Action button */}
          <Button
            variant={isSufficient ? 'accent' : 'secondary'}
            size="md"
            className="w-full"
            disabled={!isSufficient}
            onClick={handleAction}
            glow={isSufficient}
          >
            {isSufficient ? (
              <span className="flex items-center gap-2">
                {product.requires_player_id ? (
                  <>
                    <Zap className="w-4 h-4 text-slate-950" />
                    Ingresar ID y Recargar
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 text-slate-950" />
                    Añadir al Carrito
                  </>
                )}
              </span>
            ) : (
              'Saldo Insuficiente'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

