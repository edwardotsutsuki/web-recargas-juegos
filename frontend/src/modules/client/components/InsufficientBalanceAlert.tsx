import React from 'react';
import { AlertCircle, MessageCircle, PlusCircle } from 'lucide-react';
import { PriceDisplay } from '../../../components/molecules/PriceDisplay';
import { useWalletStore } from '../../../store/useWalletStore';

interface InsufficientBalanceAlertProps {
  priceCents: number;
  currency?: string;
}

export const InsufficientBalanceAlert: React.FC<InsufficientBalanceAlertProps> = ({
  priceCents,
  currency = 'USD',
}) => {
  const { wallet, setSimulatedBalance } = useWalletStore();
  const missingCents = Math.max(0, priceCents - wallet.available_balance_cents);

  return (
    <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl space-y-2.5">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-red-300 block">Saldo Virtual Insuficiente</span>
          <p className="text-slate-300 mt-0.5 leading-relaxed">
            Te faltan{' '}
            <PriceDisplay
              cents={missingCents}
              currency={currency}
              size="sm"
              className="text-red-400 font-bold"
            />{' '}
            para adquirir este producto.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <a
          href="https://wa.me/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Contactar Admin para Recargar
        </a>

        {/* Development Quick-Add Button */}
        <button
          onClick={() => setSimulatedBalance(wallet.available_balance_cents + 1000)}
          title="Modo Desarrollo: Agrega +$10.00 USD para probar la compra"
          className="inline-flex items-center justify-center gap-1 py-1 px-2 text-[11px] font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors"
        >
          <PlusCircle className="w-3 h-3 text-cyan-400" />
          +10$ (Dev)
        </button>
      </div>
    </div>
  );
};

