import React, { useState } from 'react';
import { Modal } from '../../../components/atoms/Modal';
import { Input } from '../../../components/atoms/Input';
import { Button } from '../../../components/atoms/Button';
import { AdminUser } from '../../../types';
import { adminService } from '../../../services/api/admin.service';
import { parseDollarsToCents } from '../../../utils/currency';
import { useUIStore } from '../../../store/useUIStore';
import { DollarSign, ShieldAlert } from 'lucide-react';
import { PriceDisplay } from '../../../components/molecules/PriceDisplay';

interface BalanceCreditModalProps {
  isOpen: boolean;
  user: AdminUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const BalanceCreditModal: React.FC<BalanceCreditModalProps> = ({
  isOpen,
  user,
  onClose,
  onSuccess,
}) => {
  const [amountDollars, setAmountDollars] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useUIStore();

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseDollarsToCents(amountDollars);

    if (cents <= 0) {
      setError('Por favor ingresa un monto mayor a 0.');
      return;
    }

    if (!reason.trim()) {
      setError('Debes especificar un motivo para el crédito contable.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await adminService.creditUserWallet({
        userId: user.id,
        amount_cents: cents,
        currency: 'USD',
        reason: reason.trim(),
      });

      showToast(res.message, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al asignar el saldo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Asignar Saldo Virtual (Admin)"
      description="Este movimiento registra un crédito con clave de idempotencia."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        {/* User Summary Card */}
        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Usuario Destino
          </span>
          <p className="text-sm font-bold text-white">{user.email}</p>
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
            <span>Saldo Actual:</span>
            <PriceDisplay
              cents={user.wallet.available_balance_cents}
              currency={user.wallet.currency}
              size="sm"
              className="text-emerald-400 font-bold"
            />
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <Input
            label="Monto a Cargar (USD)"
            placeholder="Ej: 25.00"
            type="number"
            step="0.01"
            min="0.01"
            value={amountDollars}
            onChange={(e) => setAmountDollars(e.target.value)}
            leftIcon={<DollarSign className="w-4 h-4 text-emerald-400" />}
            error={error || undefined}
            required
          />
        </div>

        {/* Reason for Audit Log */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Motivo / Referencia de Pago
          </label>
          <input
            type="text"
            className="w-full bg-slate-900/90 text-slate-100 placeholder-slate-500 rounded-lg px-3.5 py-2.5 text-sm border border-slate-800 hover:border-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            placeholder="Ej: Pago móvil Banco #10492 / Transferencia Binance"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
          <p className="text-[10px] text-slate-500 mt-1">
            Quedará registrado de forma inmutable en la tabla transactions.
          </p>
        </div>

        {/* Security Note */}
        <div className="p-3 bg-amber-950/30 border border-amber-500/20 rounded-xl flex items-start gap-2 text-xs text-amber-300">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            La operación se procesa a través de la RPC protegida de administración con bloqueo transaccional.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <Button type="button" variant="ghost" className="w-1/3" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="accent"
            className="w-2/3"
            isLoading={isSubmitting}
            glow
          >
            Acreditar Saldo
          </Button>
        </div>
      </form>
    </Modal>
  );
};

