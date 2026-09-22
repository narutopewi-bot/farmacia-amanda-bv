import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  Store, 
  Pill,
  ExternalLink
} from 'lucide-react';
import { Employee } from '../types';

interface LoginModalProps {
  onLoginSuccess: (user: Employee) => void;
  onGoToStore: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, onGoToStore }) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !pin.trim()) {
      setErrorMsg('Por favor ingrese su usuario y contraseña');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), pin: pin.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credenciales inválidas');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const setCredentials = (u: string, p: string) => {
    setUsername(u);
    setPin(p);
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center min-h-screen bg-[#090d16] text-white p-4 sm:p-6 select-none overflow-y-auto">
      
      {/* Floating Centered Dark Card */}
      <div className="w-full max-w-[430px] bg-slate-900 rounded-[32px] sm:rounded-[36px] shadow-2xl p-7 sm:p-9 text-center border border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Official Brand Emblem */}
        <div className="w-20 h-20 mx-auto mb-3.5 rounded-2xl overflow-hidden shadow-xl border-2 border-slate-700 flex items-center justify-center bg-slate-800">
          <img 
            src="/emblem.jpg" 
            alt="Expendio de Medicinas Amanda B&V C.A." 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Brand Name with Badge */}
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">
            Amanda B&V
          </h1>
          <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md tracking-wider">
            C.A.
          </span>
        </div>

        {/* Subtitle & Location */}
        <p className="text-[12px] font-black uppercase tracking-widest text-[#cf152b] mt-1">
          EXPENDIO DE MEDICINAS
        </p>
        <p className="text-[11px] font-bold text-slate-400 mt-0.5 tracking-wider">
          SICM: 50530 &bull; Venezuela
        </p>

        {/* Main Login Form */}
        <form onSubmit={handleSubmit} className="mt-7 text-left space-y-4">
          
          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3 bg-red-950/50 border border-red-800 rounded-xl text-xs text-red-300 font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* USUARIO */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              USUARIO
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin o cajero"
                required
                autoFocus
                className="w-full pl-11 pr-4 py-3 bg-[#0f172a] border border-slate-700 rounded-xl text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
              />
            </div>
          </div>

          {/* CONTRASEÑA */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              CONTRASEÑA
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-11 pr-11 py-3 bg-[#0f172a] border border-slate-700 rounded-xl text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 rounded-md transition cursor-pointer"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* INGRESAR AL SISTEMA BUTTON */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition duration-150 active:scale-[0.99] disabled:opacity-50 cursor-pointer tracking-wide"
          >
            <span>{isLoading ? 'Ingresando...' : 'Ingresar al Sistema'}</span>
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Initial Credentials Hint */}
        <div className="mt-7 text-center">
          <p className="text-[11px] text-slate-400 font-medium mb-2">
            Credenciales iniciales:
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setCredentials('admin', '1234')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
              title="Click para autocompletar Administrador"
            >
              admin / 1234
            </button>
            <button
              type="button"
              onClick={() => setCredentials('cajero', '1122')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
              title="Click para autocompletar Cajero"
            >
              cajero / 1122
            </button>
          </div>
        </div>

        {/* Subtle Link to Online Store */}
        <div className="mt-5 pt-3 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={onGoToStore}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <Store className="w-3.5 h-3.5" />
            <span>¿Eres cliente? Ir a la Tienda Online</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

      </div>

      {/* Footer outside the card */}
      <div className="mt-6 text-center text-xs text-slate-500 font-medium tracking-wide">
        © 2026 Expendio de Medicinas Amanda B&V C.A. • SICM: 50530 • Acceso seguro
      </div>

    </div>
  );
};
