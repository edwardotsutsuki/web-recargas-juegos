import React from 'react';
import { Link } from 'react-router-dom';
import {
  Gamepad2,
  ShieldCheck,
  Zap,
  TrendingUp,
  Download,
  Users,
  Headphones,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  const featuredGames = [
    {
      id: 'ff',
      name: 'Free Fire',
      category: 'Recarga Directa',
      badge: '🔥 MÁS VENDIDO',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=700&auto=format&fit=crop&q=75',
      features: ['ID Verificable en Vivo', 'Diamantes + Pase Élite', 'Entrega Inmediata'],
    },
    {
      id: 'ml',
      name: 'Mobile Legends',
      category: 'Recarga Directa',
      badge: '⚡ FLASH',
      image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=700&auto=format&fit=crop&q=75',
      features: ['ID + Server Zone', 'Pases Semanales', 'Acreditación 24/7'],
    },
    {
      id: 'roblox',
      name: 'Roblox Robux',
      category: 'Pin Digital',
      badge: 'POPULAR',
      image: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=700&auto=format&fit=crop&q=75',
      features: ['Códigos Oficiales', 'Robux Instantáneos', 'Sin riesgo de baneo'],
    },
    {
      id: 'pubgm',
      name: 'PUBG Mobile',
      category: 'Recarga Directa',
      badge: 'OFICIAL',
      image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=700&auto=format&fit=crop&q=75',
      features: ['Unknown Cash (UC)', 'Royale Pass', 'Verificación por ID'],
    },
    {
      id: 'steam',
      name: 'Steam Wallet',
      category: 'Pin Digital',
      badge: 'PIN GLOBAL',
      image: 'https://images.unsplash.com/photo-1612287233215-68045f448651?w=700&auto=format&fit=crop&q=75',
      features: ['Saldo para Juegos de PC', 'Tarjetas desde $5 USD', 'Canje Directo'],
    },
    {
      id: 'codm',
      name: 'Call of Duty: Mobile',
      category: 'Recarga Directa',
      badge: 'TOP RATED',
      image: 'https://images.unsplash.com/photo-1552824722-ddab1374e622?w=700&auto=format&fit=crop&q=75',
      features: ['CP Oficiales', 'Pase de Batalla', 'Entrega en Segundos'],
    },
  ];

  return (
    <div className="min-h-screen bg-[#05070f] text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
      {/* 1. Header / Navbar de la Landing */}
      <header className="sticky top-0 z-50 w-full bg-[#05070f]/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-white font-['Rajdhani'] uppercase tracking-wider">
                  Recargas <span className="text-cyan-400">Juegos</span> Online
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase">
                  B2B
                </span>
              </div>
              <span className="text-[10px] text-slate-400 tracking-widest uppercase block -mt-1">
                Distribución Oficial de Recargas
              </span>
            </div>
          </Link>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#catalogo" className="hover:text-cyan-400 transition-colors">
              Juegos Soportados
            </a>
            <a href="#como-funciona" className="hover:text-cyan-400 transition-colors">
              ¿Cómo Funciona?
            </a>
            <a href="#revendedores" className="hover:text-cyan-400 transition-colors">
              Para Revendedores
            </a>
            <a href="#metodos-pago" className="hover:text-cyan-400 transition-colors">
              Bancos & Depósitos
            </a>
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/catalog"
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
              >
                <span>Ir a Mi Panel de Ventas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="py-2 px-4 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  to="/register"
                  className="py-2.5 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-cyan-500/20 transition-all transform hover:scale-105"
                >
                  Crear Cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-12 pb-20 overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-cyan-600/15 via-indigo-600/20 to-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-12 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 shadow-lg text-xs font-bold text-cyan-300 uppercase tracking-wider animate-bounce-in">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            La Plataforma Líder en Recargas Gamer para Negocios y Revendedores
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white font-['Rajdhani'] uppercase tracking-tight leading-none max-w-5xl mx-auto">
            Vende Recargas de Videojuegos y <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">
              Multiplica tus Ganancias al Instante
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-slate-400 text-sm sm:text-lg max-w-3xl mx-auto leading-relaxed">
            Abastece a tus clientes con diamantes de Free Fire, Mobile Legends, robux, pines de Steam y más de 34 franquicias oficiales. Despacho automatizado en menos de 60 segundos con verificación de ID en vivo y los mejores márgenes del mercado.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to={isAuthenticated ? '/catalog' : '/register'}
              className="w-full sm:w-auto py-4 px-8 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-indigo-700 hover:from-cyan-400 hover:to-indigo-600 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <span>{isAuthenticated ? 'Abrir Catálogo de Ventas' : 'Comenzar a Vender Ahora'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#catalogo"
              className="w-full sm:w-auto py-4 px-8 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <span>Explorar Franquicias</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </a>
          </div>

          {/* Trust Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-slate-800/80">
            <div className="flex items-center justify-center gap-2.5 text-xs text-slate-300 font-semibold">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Acreditación en 60 seg</span>
            </div>
            <div className="flex items-center justify-center gap-2.5 text-xs text-slate-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Verificación Oficial de ID</span>
            </div>
            <div className="flex items-center justify-center gap-2.5 text-xs text-slate-300 font-semibold">
              <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Precios PVP Personalizables</span>
            </div>
            <div className="flex items-center justify-center gap-2.5 text-xs text-slate-300 font-semibold">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Protección 2FA de Saldo</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Metrics Ticker */}
      <section className="py-8 bg-slate-950/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-white font-['Rajdhani']">
                +34
              </div>
              <div className="text-xs text-slate-400 uppercase font-semibold tracking-wider">
                Juegos & Pines Digitales
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-cyan-400 font-['Rajdhani']">
                99.9%
              </div>
              <div className="text-xs text-slate-400 uppercase font-semibold tracking-wider">
                Efectividad en Entrega
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-['Rajdhani']">
                0%
              </div>
              <div className="text-xs text-slate-400 uppercase font-semibold tracking-wider">
                Riesgo de Baneo (IDs 100% Legales)
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-indigo-400 font-['Rajdhani']">
                24/7
              </div>
              <div className="text-xs text-slate-400 uppercase font-semibold tracking-wider">
                Atención y Soporte Técnico
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Showcase de Juegos Destacados */}
      <section id="catalogo" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
            Catálogo Oficial de Recargas
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-['Rajdhani'] uppercase tracking-wide">
            Las Franquicias Más Populares Listas para Vender
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
            Disponemos de denominaciones adaptadas a todos los bolsillos: desde recargas mínimas de diamantes hasta tarjetas de regalo de alta denominación.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredGames.map((game) => (
            <div
              key={game.id}
              className="glass-panel rounded-3xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between group hover:-translate-y-1 duration-300"
            >
              <div>
                {/* Image Cover */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                  <img
                    src={game.image}
                    alt={game.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-cyan-500/90 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-lg">
                    {game.badge}
                  </span>
                  <span className="absolute bottom-3 right-3 text-xs font-bold text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
                    {game.category}
                  </span>
                </div>

                {/* Details */}
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-bold text-white font-['Rajdhani'] tracking-wide">
                    {game.name}
                  </h3>

                  <div className="space-y-2">
                    {game.features.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0">
                <Link
                  to={isAuthenticated ? '/catalog' : '/login'}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-bold text-cyan-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Recargar en mi Panel</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-4">
          <Link
            to={isAuthenticated ? '/catalog' : '/login'}
            className="inline-flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-4"
          >
            <span>Ver las 34 franquicias completas con cotizaciones en tiempo real</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* 5. ¿Cómo Funciona? (3 Pasos) */}
      <section id="como-funciona" className="py-20 bg-slate-950/80 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
              Proceso Fácil & Rápido
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-['Rajdhani'] uppercase tracking-wide">
              Comienza a Despachar Recargas en 3 Pasos
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Sin trámites complicados. Diseñado para revendedores independientes, cibercafés y tiendas digitales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-4 relative">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-xl">
                1
              </div>
              <h3 className="text-lg font-bold text-white">Crea tu Cuenta de Socio</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Regístrate en menos de 1 minuto con tu correo electrónico. Obtén acceso inmediato a precios mayoristas y al panel contable.
              </p>
            </div>

            {/* Step 2 */}
            <div className="glass-panel p-8 rounded-3xl border border-indigo-500/30 space-y-4 relative">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-xl">
                2
              </div>
              <h3 className="text-lg font-bold text-white">Recarga tu Saldo Virtual</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Realiza una transferencia a nuestras cuentas bancarias autorizadas (Pichincha, Guayaquil, etc.) y adjunta tu comprobante. Lo aprobamos de inmediato.
              </p>
            </div>

            {/* Step 3 */}
            <div className="glass-panel p-8 rounded-3xl border border-emerald-500/30 space-y-4 relative">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xl">
                3
              </div>
              <h3 className="text-lg font-bold text-white">Despacha y Gana Dinero</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Introduce el ID de jugador de tu cliente, selecciona el paquete y confirma. La recarga entra en segundos a su juego y cobras tu precio sugerido.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Beneficios para Revendedores */}
      <section id="revendedores" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Herramientas Exclusivas
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-['Rajdhani'] uppercase tracking-wide">
            Todo lo que Necesitas para Escalar tus Ventas
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
            Te brindamos software de administración completo para que operes como una agencia profesional.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3">
            <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 w-fit">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">Configuración de PVP</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Define tus propios precios de venta al público y calcula automáticamente tu margen de beneficio neto en cada orden.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 w-fit">
              <Download className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">Banners y Publicidad</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Descarga kits promocionales en alta definición, plantillas editables e imágenes para tus estados de WhatsApp e Instagram.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3">
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 w-fit">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">Comisiones por Referidos</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Comparte tu enlace de invitación y recibe comisiones automáticas acreditadas directamente a tu saldo por cada recarga de tus invitados.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 w-fit">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">Seguridad 2FA TOTP</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Protege tu saldo virtual contra intrusos vinculando Google Authenticator, Microsoft Authenticator o Authy desde tu perfil.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Métodos de Pago y Depósito */}
      <section id="metodos-pago" className="py-20 bg-slate-950/80 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              Carga tu Saldo Fácilmente
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-['Rajdhani'] uppercase tracking-wide">
              Bancos Autorizados y Medios de Pago
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Trabajamos con las principales entidades bancarias para que abones fondos de forma transparente, rápida y sin tarifas abusivas.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center gap-2 text-center">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 font-bold text-sm">
                BP
              </div>
              <span className="text-xs font-bold text-white">Banco Pichincha</span>
              <span className="text-[10px] text-slate-400">Depósito / Transferencia</span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center gap-2 text-center">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 font-bold text-sm">
                BG
              </div>
              <span className="text-xs font-bold text-white">Banco Guayaquil</span>
              <span className="text-[10px] text-slate-400">Depósito / Transferencia</span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center gap-2 text-center">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                PRO
              </div>
              <span className="text-xs font-bold text-white">Produbanco</span>
              <span className="text-[10px] text-slate-400">Transferencias Interbancarias</span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center gap-2 text-center">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm">
                ₮
              </div>
              <span className="text-xs font-bold text-white">USDT / Cripto</span>
              <span className="text-[10px] text-slate-400">Red TRC-20 / Binance</span>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Call To Action Final */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-r from-cyan-900/40 via-indigo-950/60 to-purple-900/40 border border-cyan-500/40 p-8 sm:p-14 text-center space-y-6 shadow-2xl backdrop-blur-xl">
            <h2 className="text-3xl sm:text-5xl font-black text-white font-['Rajdhani'] uppercase tracking-tight">
              ¿Listo para Empezar a Ganar con Recargas Gamer?
            </h2>
            <p className="text-xs sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Únete a cientos de revendedores que ya gestionan sus ventas de manera profesional y automatizada con Recargas Juegos Online.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                to="/register"
                className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all transform hover:scale-105"
              >
                Crear Cuenta Gratuita
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs transition-colors"
              >
                Acceder a Mi Cuenta
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="bg-[#030408] border-t border-slate-900 py-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white uppercase font-['Rajdhani'] tracking-wide">
                Recargas Juegos Online &bull; Sistema de Recargas
              </span>
              <p className="text-[11px] text-slate-500">
                Plataforma tecnológica de distribución digital independiente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <a href="https://wa.me/593999561588" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
              <Headphones className="w-3.5 h-3.5" /> Soporte WhatsApp (0999561588)
            </a>
            <Link to="/login" className="hover:text-white transition-colors">
              Portal Clientes
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-slate-900/80 text-center text-[11px] text-slate-600">
          &copy; {new Date().getFullYear()} Recargas Juegos Online. Todos los nombres de juegos y marcas registradas pertenecen a sus respectivos creadores (Garena, Moonton, Roblox Corp, Valve, Activision).
        </div>
      </footer>
    </div>
  );
};
