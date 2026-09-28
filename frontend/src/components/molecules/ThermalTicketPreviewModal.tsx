import React from 'react';
import { Modal } from '../atoms/Modal';
import { Button } from '../atoms/Button';
import { Printer, Copy, Check } from 'lucide-react';
import { ThermalTicketData, thermalTicketService } from '../../services/thermalTicketService';
import { useUIStore } from '../../store/useUIStore';

interface ThermalTicketPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketData: ThermalTicketData | null;
}

export const ThermalTicketPreviewModal: React.FC<ThermalTicketPreviewModalProps> = ({
  isOpen,
  onClose,
  ticketData,
}) => {
  const [copied, setCopied] = React.useState(false);
  const { showToast } = useUIStore();

  if (!ticketData) return null;

  const handlePrint = () => {
    thermalTicketService.printThermalTicket(ticketData);
  };

  const handleCopyPin = () => {
    if (!ticketData.digitalCode) return;
    navigator.clipboard.writeText(ticketData.digitalCode);
    setCopied(true);
    showToast('PIN copiado al portapapeles', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedPrice =
    typeof ticketData.priceDollars === 'number'
      ? ticketData.priceDollars.toFixed(2)
      : parseFloat(String(ticketData.priceDollars) || '0').toFixed(2);

  const cleanPin = (ticketData.digitalCode || '').trim();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={ticketData.isReprint ? 'Reimpresión de Ticket Térmico' : 'Ticket de Venta (80mm)'}
      description="Comprobante con formato oficial para impresoras térmicas de punto de venta (80mm)."
      maxWidth="md"
    >
      <div className="space-y-4 my-2">
        {/* Vista previa en papel térmico simulado */}
        <div className="bg-white text-slate-950 p-5 rounded-2xl shadow-xl border-2 border-slate-200 dark:border-slate-700 max-w-[340px] mx-auto font-mono text-xs select-none">
          {/* Cabecera */}
          <div className="text-center space-y-1">
            <h4 className="font-black text-sm uppercase tracking-wide">
              {ticketData.storeName || 'RECARGAS JUEGOS PRO'}
            </h4>
            <p className="text-[10px] text-slate-600">
              Centro de Recargas & Pines Oficiales
            </p>
          </div>

          {ticketData.isReprint && (
            <div className="my-2 py-1 px-2 border-2 border-slate-900 text-center font-black text-[11px] uppercase tracking-wider bg-amber-50">
              *** REIMPRESIÓN (COPIA) ***
            </div>
          )}

          <div className="border-t border-dashed border-slate-400 my-2.5" />

          {/* Metadatos */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="font-bold">Ticket #:</span>
              <span>{ticketData.orderId.slice(0, 10)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Fecha:</span>
              <span>
                {ticketData.createdAt
                  ? new Date(ticketData.createdAt).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : new Date().toLocaleDateString('es-ES')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Cajero:</span>
              <span className="capitalize">{ticketData.operatorName || 'Principal'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Estado:</span>
              <span className="font-bold text-emerald-700">COMPLETADO</span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-400 my-2.5" />

          {/* Producto */}
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-slate-600">
              🎮 {ticketData.game}
            </div>
            <div className="text-sm font-black text-slate-900">
              {ticketData.productName}
            </div>
          </div>

          {/* PIN o Datos de Cuenta */}
          {cleanPin ? (
            <div className="my-3 p-3 border-2 border-dashed border-slate-900 bg-slate-50 text-center rounded-lg space-y-1">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                &gt;&gt; PIN DIGITAL &lt;&lt;
              </div>
              <div className="text-base font-black tracking-widest text-slate-900 select-all font-mono">
                {cleanPin}
              </div>
              <div className="text-[9px] text-slate-500">
                (No compartir hasta canjear)
              </div>
            </div>
          ) : ticketData.playerId ? (
            <div className="my-3 p-2.5 border border-slate-300 rounded-lg space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="font-bold">ID Jugador:</span>
                <span className="font-black text-slate-900">{ticketData.playerId}</span>
              </div>
              {ticketData.playerName && (
                <div className="flex justify-between">
                  <span className="font-bold">Nombre:</span>
                  <span>{ticketData.playerName}</span>
                </div>
              )}
              {ticketData.playerServer && (
                <div className="flex justify-between">
                  <span className="font-bold">Servidor:</span>
                  <span>{ticketData.playerServer}</span>
                </div>
              )}
            </div>
          ) : null}

          {/* Instrucciones Breves */}
          {ticketData.redeemInstructions && (
            <div className="my-2 p-2 bg-slate-100 rounded text-[10px] text-slate-700 leading-tight">
              <span className="font-bold block mb-0.5">📖 Instrucciones:</span>
              <p className="line-clamp-3">{ticketData.redeemInstructions}</p>
            </div>
          )}

          <div className="border-t-2 border-slate-900 my-2.5" />

          {/* Total */}
          <div className="flex justify-between items-baseline text-sm font-black">
            <span>TOTAL:</span>
            <span className="text-base font-black">${formattedPrice} USD</span>
          </div>

          <div className="border-t border-dashed border-slate-400 my-2.5" />

          {/* Footer */}
          <div className="text-center text-[10px] text-slate-600 space-y-1 mt-2">
            <p>¡Gracias por tu compra!</p>
            <p className="text-[8.5px] italic text-slate-500">
              Conserva este ticket como garantía.
            </p>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="space-y-2 pt-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handlePrint}
            className="w-full text-xs font-bold shadow-glow-primary"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir en Impresora Térmica (80mm)
          </Button>

          <div className="flex gap-2">
            {cleanPin && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyPin}
                className="flex-1 text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copied ? 'Copiado' : 'Copiar PIN'}
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="flex-1 text-xs"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
