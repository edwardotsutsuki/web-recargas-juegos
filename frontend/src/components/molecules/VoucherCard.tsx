import React, { useState } from 'react';
import { Copy, Check, Key, Hash, Info } from 'lucide-react';

interface VoucherCardProps {
  pin?: string;
  serial?: string;
  instructions?: string;
}

export const VoucherCard: React.FC<VoucherCardProps> = ({ pin, serial, instructions }) => {
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedSerial, setCopiedSerial] = useState(false);

  const handleCopy = (text: string, type: 'pin' | 'serial') => {
    navigator.clipboard.writeText(text);
    if (type === 'pin') {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    } else {
      setCopiedSerial(true);
      setTimeout(() => setCopiedSerial(false), 2000);
    }
  };

  if (!pin && !serial) return null;

  return (
    <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-purple-950/30 border border-indigo-500/20 text-xs space-y-2">
      <div className="flex items-center gap-1.5 text-indigo-400 font-bold uppercase tracking-wider text-[10px]">
        <Key className="w-3.5 h-3.5" />
        <span>PIN Digital / Licencia Canjeable</span>
      </div>

      {pin && (
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/80 border border-indigo-500/30">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-medium">PIN / Código:</span>
            <code className="text-xs font-mono font-black text-indigo-300 select-all tracking-wider">
              {pin}
            </code>
          </div>
          <button
            onClick={() => handleCopy(pin, 'pin')}
            className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 transition-colors"
            title="Copiar PIN"
          >
            {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {serial && (
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/50 border border-slate-800">
          <div className="flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] text-slate-400">Serial:</span>
            <code className="text-[11px] font-mono text-slate-300">{serial}</code>
          </div>
          <button
            onClick={() => handleCopy(serial, 'serial')}
            className="p-1 text-slate-400 hover:text-white"
            title="Copiar Serial"
          >
            {copiedSerial ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {instructions && (
        <div className="flex items-start gap-1.5 text-[11px] text-slate-400 bg-slate-900/40 p-2 rounded-xl">
          <Info className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
          <p className="line-clamp-2 hover:line-clamp-none transition-all">{instructions}</p>
        </div>
      )}
    </div>
  );
};
