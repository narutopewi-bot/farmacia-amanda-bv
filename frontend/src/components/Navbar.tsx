import React from 'react';
import { Pill, Store, Bell, LogOut, ExternalLink, ShieldCheck, Menu, X } from 'lucide-react';
import { Employee, Settings } from '../types';

interface NavbarProps {
  currentView: 'admin' | 'store';
  setCurrentView: (view: 'admin' | 'store') => void;
  pendingOrdersCount: number;
  onOpenOrdersTab?: () => void;
  isConnected: boolean;
  currentUser?: Employee | null;
  onLogout?: () => void;
  onOpenLogin?: () => void;
  settings?: Settings;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  pendingOrdersCount,
  onOpenOrdersTab,
  isConnected,
  currentUser,
  onLogout,
  onOpenLogin,
  settings,
  isMobileMenuOpen,
  onToggleMobileMenu
}) => {
  // 1. PURE CUSTOMER STORE HEADER: NO ACCESS TO ADMINISTRATIVE SYSTEM
  if (currentView === 'store') {
    const rate = settings?.exchange_rate || 85.0;
    const deliveryCost = settings?.delivery_cost !== undefined ? Number(settings.delivery_cost) : 1.00;

    return (
      <header className="bg-[#004725] text-white sticky top-0 z-40 shadow-lg border-b border-[#00381e]">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          
          {/* Pharmacy Public Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden shadow-md border-2 border-white/20 bg-white flex items-center justify-center shrink-0">
              <img 
                src="/emblem.jpg" 
                alt="Amanda B&V" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-black text-base sm:text-lg tracking-tight text-white uppercase">
                  Amanda B&V
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest bg-[#cf152b] text-white px-2 py-0.5 rounded-full shadow-xs">
                  Tienda
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-emerald-100/90 font-bold hidden sm:block">
                Expendio de Medicinas &bull; SICM: 50530
              </p>
            </div>
          </div>

          {/* Customer-facing information only (Delivery $1.00 & BCV Exchange Rate) */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Delivery Price Indicator */}
            <div className="flex items-center gap-1 bg-[#00331b] border border-emerald-500/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold text-emerald-200">
              <span className="text-xs sm:text-sm">🛵</span>
              <span><span className="hidden xs:inline">Delivery: </span><strong className="text-white">${deliveryCost.toFixed(2)}</strong></span>
            </div>

            {/* Official Exchange Rate */}
            <div className="flex items-center gap-1 bg-[#00381e] border border-emerald-600/40 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-medium text-slate-100">
              <span className="text-emerald-300 font-bold">BCV:</span>
              <span className="font-mono font-bold text-white">{rate.toFixed(2)} Bs.</span>
            </div>

            {/* Support Phone */}
            {settings?.phone && (
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-100 bg-[#00381e]/80 px-3 py-1.5 rounded-xl border border-emerald-600/40">
                <span className="text-emerald-300 font-bold">📞 Atención:</span>
                <span className="font-semibold text-white">{settings.phone.split('/')[0].trim()}</span>
              </div>
            )}
          </div>

        </div>
      </header>
    );
  }

  // 2. ADMINISTRATIVE ERP HEADER (FOR AUTHORIZED STAFF ONLY)
  return (
    <header className="bg-[#012b18] text-white sticky top-0 z-40 shadow-md border-b border-[#001f11]">
      <div className="w-full px-3 sm:px-4 lg:px-6 h-16 flex items-center justify-between">
        
        {/* Pharmacy Brand for ERP & Mobile Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 -ml-1 text-emerald-100 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Menú de Navegación"
              aria-label="Abrir Menú"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          )}

          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden shadow-md border-2 border-white/20 bg-white flex items-center justify-center shrink-0">
            <img 
              src="/emblem.jpg" 
              alt="Amanda B&V" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-black text-base sm:text-lg tracking-tight text-white uppercase">
                Amanda B&V
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest bg-[#006837] border border-emerald-400/40 text-emerald-100 px-2 py-0.5 rounded-full">
                ERP
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-emerald-100/70 font-semibold hidden sm:block">
              Expendio de Medicinas &bull; SICM: 50530 &bull; Control y Facturación
            </p>
          </div>
        </div>

        {/* Right Tools: Open Store Link (New Tab), Database Sync, Notifications & Staff Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Link to open online store in a separate tab for preview */}
          <a
            href="/?view=store"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#004725] hover:bg-[#005930] text-emerald-100 hover:text-white rounded-xl text-xs font-semibold border border-emerald-700/60 transition shadow-xs"
            title="Abrir la Tienda Online en una pestaña nueva"
          >
            <Store className="w-3.5 h-3.5 text-emerald-300" />
            <span>Ver Tienda Online</span>
            <ExternalLink className="w-3 h-3 text-emerald-300" />
          </a>

          {/* Real-time DB sync indicator */}
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-700">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{isConnected ? 'BD En Vivo' : 'Conectando...'}</span>
          </div>

          {/* Pending Online Orders Notification */}
          <button
            onClick={onOpenOrdersTab}
            className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition flex items-center gap-1 cursor-pointer"
            title="Pedidos de la Tienda Online"
          >
            <Bell className="w-5 h-5" />
            {pendingOrdersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow-md">
                {pendingOrdersCount}
              </span>
            )}
          </button>

          {/* User Session Info Badge & Logout */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right hidden md:block">
                <div className="font-extrabold text-xs text-white flex items-center justify-end gap-1">
                  <span>{currentUser.name}</span>
                </div>
                <div className="flex items-center justify-end gap-1 text-[10px]">
                  <span className={`font-black uppercase px-1.5 py-0.2 rounded ${
                    currentUser.role === 'ADMIN' 
                      ? 'bg-purple-900/80 text-purple-300 border border-purple-500/30' 
                      : 'bg-blue-900/80 text-blue-300 border border-blue-500/30'
                  }`}>
                    {currentUser.role === 'ADMIN' ? '👑 Admin' : '👤 Cajero'}
                  </span>
                  <span className="text-slate-400 font-mono">({currentUser.shift || 'Turno'})</span>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-2 bg-slate-800 hover:bg-red-950/80 text-slate-300 hover:text-red-300 rounded-xl transition border border-slate-700/80 flex items-center gap-1 cursor-pointer"
                title="Cerrar Sesión / Cambiar Usuario"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-xs font-bold hidden sm:inline">Salir</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>Ingresar Personal</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
