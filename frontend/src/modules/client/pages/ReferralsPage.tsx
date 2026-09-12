import React, { useState, useEffect } from 'react';
import { Users, Copy, Check, Gift, Sparkles, DollarSign, UserCheck } from 'lucide-react';
import { Button } from '../../../components/atoms/Button';
import { resellerService } from '../../../services/api/reseller.service';
import { ReferralInfo } from '../../../types';

export const ReferralsPage: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReferrals() {
      setLoading(true);
      try {
        const res = await resellerService.getReferralInfo();
        setInfo(res);
      } catch (err) {
        console.error('Error cargando referidos:', err);
      } finally {
        setLoading(false);
      }
    }
    loadReferrals();
  }, []);

  const referralCode = info?.referral_code || 'RJO-SOCIO';
  const inviteUrl = `${window.location.origin}/register?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !info) {
    return <div className="p-12 text-center text-xs text-slate-400">Cargando información de referidos...</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-black text-white font-['Rajdhani'] uppercase tracking-wide flex items-center gap-2">
          Programa de Socios & Referidos <Users className="w-5 h-5 text-cyan-400" />
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Invita a otros emprendedores o tiendas gamer a unirse a la red y gana comisión en saldo por cada una de sus recargas.
        </p>
      </div>

      {/* Invite Box */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/30 relative overflow-hidden space-y-5">
        <div className="max-w-xl space-y-2">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Comisión directa de {info?.commission_percent || 1}% en cada recarga
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white font-['Rajdhani']">
            Tu Enlace de Afiliado Exclusivo
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Comparte tu código o enlace único. Cada vez que tus invitados recarguen saldo en su billetera para vender a sus clientes, recibirás automáticamente comisiones en dólares directo a tu saldo.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
          <div className="flex-1 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs font-mono text-cyan-300">
            <span className="truncate">{inviteUrl}</span>
            <span className="font-bold text-slate-400 text-[10px] ml-2 shrink-0">
              Código: {referralCode}
            </span>
          </div>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-1.5 text-emerald-400" />
                ¡Enlace Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1.5" />
                Copiar Enlace
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Estadísticas de Referidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Socios Invitados</span>
            <UserCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Rajdhani'] mt-3">
            {info?.total_referred_users || 0}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Cuentas activas registradas con tu link</span>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Comisiones Generadas</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 font-['Rajdhani'] mt-3">
            ${info?.total_earned_usd || '0.00'}{' '}
            <span className="text-xs font-sans font-bold text-slate-400">USD</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Total acreditado a tu billetera</span>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Tasa de Ganancia</span>
            <Gift className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-3xl font-black text-cyan-300 font-['Rajdhani'] mt-3">
            {info?.commission_percent || 1.0}%
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Porcentaje por cada depósito de tus socios</span>
        </div>
      </div>
    </div>
  );
};
