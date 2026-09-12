import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  Gamepad2,
  Gift,
  Tag,
  ShoppingBag,
  CreditCard,
  BookOpen,
  Trophy,
  Users,
  Download,
  Headphones,
  User,
  Sparkles,
} from 'lucide-react';

export const MobileQuickCategories: React.FC = () => {
  const navigate = useNavigate();

  const categories = [
    { label: 'Juegos & Pines', icon: Gamepad2, color: 'from-indigo-500 to-purple-600', path: '/catalog' },
    { label: 'Free Fire', icon: Flame, color: 'from-amber-500 to-orange-600', path: '/catalog?search=Free%20Fire' },
    { label: 'Gift Cards', icon: Gift, color: 'from-pink-500 to-rose-600', path: '/catalog' },
    { label: 'PVP & Margen', icon: Tag, color: 'from-purple-500 to-indigo-600', path: '/reseller/pvp' },
    { label: 'Mis Órdenes', icon: ShoppingBag, color: 'from-cyan-500 to-blue-600', path: '/orders' },
    { label: 'Recargar', icon: CreditCard, color: 'from-emerald-500 to-teal-600', path: '/wallet/deposit' },
    { label: 'Libro Contable', icon: BookOpen, color: 'from-teal-500 to-emerald-600', path: '/accounting' },
    { label: 'Recompensas', icon: Trophy, color: 'from-yellow-500 to-amber-600', path: '/rewards' },
    { label: 'Mis Referidos', icon: Users, color: 'from-blue-500 to-indigo-600', path: '/referrals' },
    { label: 'Descargas', icon: Download, color: 'from-violet-500 to-purple-600', path: '/downloads' },
    { label: 'Mesa de Ayuda', icon: Headphones, color: 'from-rose-500 to-pink-600', path: '/support' },
    { label: 'Mi Perfil', icon: User, color: 'from-slate-600 to-slate-800', path: '/profile' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-['Rajdhani']">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Accesos Rápidos</span>
        </h4>
        <span className="text-[10px] text-slate-500 font-mono">12 Módulos</span>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {categories.map((cat, idx) => {
          const Icon = cat.icon;
          return (
            <button
              key={idx}
              onClick={() => navigate(cat.path)}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 active:scale-95 transition-all shadow-sm group"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${cat.color} flex items-center justify-center text-white shadow-md mb-1.5 group-hover:scale-105 transition-transform`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-bold text-slate-300 text-center leading-tight line-clamp-1">
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
