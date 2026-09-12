import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../atoms/Button';
import { ShieldX, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080d18] flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-slate-800 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
          <ShieldX className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <span className="text-4xl font-black text-white font-['Rajdhani']">404</span>
          <h2 className="text-lg font-bold text-slate-200">Página No Encontrada</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            La ruta solicitada no existe, fue movida o no tienes autorización para visualizar este recurso.
          </p>
        </div>

        <div className="pt-2">
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            onClick={() => navigate('/')}
          >
            <Home className="w-4 h-4 mr-2" />
            Volver al Panel Principal
          </Button>
        </div>
      </div>
    </div>
  );
};

