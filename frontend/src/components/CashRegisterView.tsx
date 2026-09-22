import React, { useState, useEffect, useMemo } from 'react';
import {
  Vault,
  Plus,
  RefreshCw,
  Lock,
  Unlock,
  Printer,
  Receipt,
  FileText,
  X,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Send,
  Smartphone,
  Layers,
  ArrowRight,
  Calculator,
  Calendar,
  UserCheck,
  TrendingUp
} from 'lucide-react';
import { Employee } from '../types';

export interface Caja {
  id: number;
  numero: number;
  nombre_caja: string;
  estado: 'abierta' | 'cerrada';
  fecha_apertura: string;
  fecha_cierre: string;
  usuario_apertura_id: number;
  usuario_apertura_nombre: string;
  usuario_cierre_id?: number | null;
  usuario_cierre_nombre?: string;
  monto_apertura_usd: number;
  monto_apertura_bs: number;
  tasa_bcv_apertura: number;
  tasa_bcv_cierre: number;
  ventas_efectivo: number;
  ventas_zelle: number;
  ventas_pagomovil: number;
  ventas_punto: number;
  ventas_credito: number;
  total_ventas: number;
  ventas_pagomovil_bs: number;
  ventas_punto_bs: number;
  ventas_efectivo_bs: number;
  total_ventas_bs: number;
  abonos_efectivo: number;
  abonos_zelle: number;
  abonos_pagomovil: number;
  abonos_punto: number;
  total_abonos: number;
  abonos_pagomovil_bs: number;
  abonos_punto_bs: number;
  abonos_efectivo_bs: number;
  total_abonos_bs: number;
  total_esperado_efectivo: number;
  total_esperado_general: number;
  declarado_efectivo: number;
  declarado_zelle: number;
  declarado_pagomovil: number;
  declarado_punto: number;
  total_declarado: number;
  diferencia_efectivo: number;
  diferencia_general: number;
  observaciones_apertura: string;
  observaciones_cierre: string;
  facturas?: any[];
  abonos_lista?: any[];
}

interface EstadoCajaGlobal {
  activa: boolean;
  caja: Caja | null;
  cajas_abiertas: Caja[];
  cajas_ocupadas_nombres: string[];
  total_cajas_abiertas: number;
  tasa_bcv: number;
}

interface CashRegisterViewProps {
  employees: Employee[];
}

export const CashRegisterView: React.FC<CashRegisterViewProps> = ({ employees }) => {
  const [estadoGlobal, setEstadoGlobal] = useState<EstadoCajaGlobal>({
    activa: false,
    caja: null,
    cajas_abiertas: [],
    cajas_ocupadas_nombres: [],
    total_cajas_abiertas: 0,
    tasa_bcv: 85.0
  });

  const [historial, setHistorial] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCaja, setFiltroCaja] = useState('TODAS');

  // Modales
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [cajaACerrar, setCajaACerrar] = useState<Caja | null>(null);
  const [cajaTicket, setCajaTicket] = useState<Caja | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form Apertura
  const [nombreCaja, setNombreCaja] = useState('Caja 1');
  const [montoAperturaUsd, setMontoAperturaUsd] = useState('100.00');
  const [montoAperturaBs, setMontoAperturaBs] = useState('0.00');
  const [obsApertura, setObsApertura] = useState('');
  const [aperturaEmpleadoId, setAperturaEmpleadoId] = useState<number>(employees[0]?.id || 1);

  // Form Cierre
  const [decEfectivo, setDecEfectivo] = useState('');
  const [decZelle, setDecZelle] = useState('0.00');
  const [decPagoMovil, setDecPagoMovil] = useState('0.00');
  const [decPunto, setDecPunto] = useState('0.00');
  const [obsCierre, setObsCierre] = useState('');

  // Toast / Mensaje
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchEstado = async () => {
    try {
      const res = await fetch('/api/cajas/estado');
      if (res.ok) {
        const data = await res.json();
        setEstadoGlobal(data);
      }
    } catch (e) {
      console.error('Error al cargar estado de cajas:', e);
    }
  };

  const fetchHistorial = async () => {
    try {
      const res = await fetch('/api/cajas?limit=100');
      if (res.ok) {
        const data = await res.json();
        setHistorial(data);
      }
    } catch (e) {
      console.error('Error al cargar historial de cajas:', e);
    }
  };

  const reloadAll = async () => {
    setLoading(true);
    await Promise.all([fetchEstado(), fetchHistorial()]);
    setLoading(false);
  };

  useEffect(() => {
    reloadAll();
  }, []);

  // Apertura helpers
  const handleOpenModalAbrir = () => {
    const ocupadas = estadoGlobal.cajas_ocupadas_nombres || [];
    let sugerida = 'Caja 1';
    if (ocupadas.includes('Caja 1')) sugerida = 'Caja 2';
    if (ocupadas.includes('Caja 2')) sugerida = 'Caja 3';
    if (ocupadas.includes('Caja 3')) sugerida = 'Caja 4';

    setNombreCaja(sugerida);
    setMontoAperturaUsd('100.00');
    const bcv = estadoGlobal.tasa_bcv || 85.0;
    setMontoAperturaBs((100 * bcv).toFixed(2));
    setObsApertura('');
    setShowOpenModal(true);
  };

  const handleUsdChange = (val: string) => {
    setMontoAperturaUsd(val);
    const num = parseFloat(val) || 0;
    const bcv = estadoGlobal.tasa_bcv || 85.0;
    setMontoAperturaBs((num * bcv).toFixed(2));
  };

  const handleSubmitApertura = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    const emp = employees.find(x => x.id === aperturaEmpleadoId) || employees[0];

    try {
      const res = await fetch('/api/cajas/abrir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_caja: nombreCaja,
          monto_apertura_usd: parseFloat(montoAperturaUsd) || 0,
          monto_apertura_bs: parseFloat(montoAperturaBs) || 0,
          observaciones: obsApertura,
          employee_id: emp?.id || 1,
          employee_name: emp?.name || 'Administrador'
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowOpenModal(false);
        showToast(`¡${data.caja.nombre_caja} abierta exitosamente! Turno #${data.caja.numero}`, 'success');
        await reloadAll();
      } else {
        showToast(data.detail || data.error || 'Error al abrir caja', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de conexión', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Cierre helpers
  const handleOpenModalCerrar = (caja: Caja) => {
    setCajaACerrar(caja);
    setDecEfectivo('');
    setDecZelle(caja.ventas_zelle.toFixed(2));
    setDecPagoMovil(caja.ventas_pagomovil.toFixed(2));
    setDecPunto(caja.ventas_punto.toFixed(2));
    setObsCierre('');
    setShowCloseModal(true);
  };

  const handleSubmitCierre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cajaACerrar) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/cajas/cerrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caja_id: cajaACerrar.id,
          declarado_efectivo: parseFloat(decEfectivo) || 0,
          declarado_zelle: parseFloat(decZelle) || 0,
          declarado_pagomovil: parseFloat(decPagoMovil) || 0,
          declarado_punto: parseFloat(decPunto) || 0,
          observaciones: obsCierre,
          usuario_cierre_id: cajaACerrar.usuario_apertura_id,
          usuario_cierre_nombre: cajaACerrar.usuario_apertura_nombre
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowCloseModal(false);
        showToast(`¡Turno #${data.caja.numero} de ${data.caja.nombre_caja} cerrado con éxito!`, 'success');
        await reloadAll();
        // Abrir automáticamente comprobante de cierre
        setCajaTicket(data.caja);
        setShowTicketModal(true);
      } else {
        showToast(data.detail || data.error || 'Error al cerrar caja', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de conexión', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Ver ticket de caja
  const handleVerTicket = async (id: number) => {
    try {
      const res = await fetch(`/api/cajas/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCajaTicket(data);
        setShowTicketModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Historial filtrado
  const nombresCajasUnicas = useMemo(() => {
    const list = Array.from(new Set(historial.map(c => c.nombre_caja || 'Caja 1'))).sort();
    return list;
  }, [historial]);

  const historialFiltrado = useMemo(() => {
    if (filtroCaja === 'TODAS') return historial;
    return historial.filter(c => (c.nombre_caja || 'Caja 1') === filtroCaja);
  }, [historial, filtroCaja]);

  // Cálculos de consolidado de cajas abiertas
  const abiertas = estadoGlobal.cajas_abiertas || [];
  const totFondoUSD = abiertas.reduce((acc, c) => acc + (c.monto_apertura_usd || 0), 0);
  const totEfectivoUSD = abiertas.reduce((acc, c) => acc + (c.ventas_efectivo || 0) + (c.abonos_efectivo || 0), 0);
  const totZelleUSD = abiertas.reduce((acc, c) => acc + (c.ventas_zelle || 0) + (c.abonos_zelle || 0), 0);
  const totTransfUSD = abiertas.reduce((acc, c) => acc + (c.ventas_pagomovil || 0) + (c.abonos_pagomovil || 0), 0);
  const totTransfBS = abiertas.reduce((acc, c) => acc + (c.ventas_pagomovil_bs || ((c.ventas_pagomovil || 0) * (estadoGlobal.tasa_bcv || 1))), 0);
  const totPuntoUSD = abiertas.reduce((acc, c) => acc + (c.ventas_punto || 0) + (c.abonos_punto || 0), 0);
  const totPuntoBS = abiertas.reduce((acc, c) => acc + (c.ventas_punto_bs || ((c.ventas_punto || 0) * (estadoGlobal.tasa_bcv || 1))), 0);
  const totVentasUSD = abiertas.reduce((acc, c) => acc + (c.total_ventas || 0), 0);
  const totGavetaUSD = abiertas.reduce((acc, c) => acc + (c.total_esperado_efectivo || 0), 0);

  // Cálculos dinámicos en Modal de Cierre
  const esperadoCierre = cajaACerrar ? cajaACerrar.total_esperado_efectivo : 0;
  const declaradoEfectivoNum = parseFloat(decEfectivo) || 0;
  const difCierre = decEfectivo === '' ? 0 : Number((declaradoEfectivoNum - esperadoCierre).toFixed(2));

  // Totales de historial
  const sumFondoHist = historialFiltrado.reduce((acc, c) => acc + (c.monto_apertura_usd || 0), 0);
  const sumVentasHist = historialFiltrado.reduce((acc, c) => acc + (c.total_ventas || 0), 0);
  const sumAbonosHist = historialFiltrado.reduce((acc, c) => acc + (c.total_abonos || 0), 0);
  const sumEsperadoHist = historialFiltrado.reduce((acc, c) => acc + (c.total_esperado_efectivo || 0), 0);
  const sumDeclaradoHist = historialFiltrado.filter(c => c.estado === 'cerrada').reduce((acc, c) => acc + (c.declarado_efectivo || 0), 0);
  const sumDifHist = historialFiltrado.filter(c => c.estado === 'cerrada').reduce((acc, c) => acc + (c.diferencia_efectivo || 0), 0);

  return (
    <div className="space-y-6 text-slate-100 print:text-black">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md transition-all ${
          toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' :
          toast.type === 'error' ? 'bg-rose-950/90 border-rose-500/50 text-rose-200' :
          'bg-slate-900/90 border-slate-700 text-slate-200'
        }`}>
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span className="text-xs font-bold">{toast.text}</span>
        </div>
      )}

      {/* CABECERA PRINCIPAL */}
      <div className="bg-[#0b1120] p-5 rounded-2xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-inner">
            <Vault className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">Control de Cajas y Turnos</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PROLAGO ARCHITECTURE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Gestión de aperturas multi-terminal, arqueo en vivo, cierres de turno y ticket térmico 80mm
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="hidden md:flex items-center px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300">
            <span className="text-slate-500 mr-1.5">Tasa BCV:</span>
            <strong className="text-emerald-400 font-mono">Bs. {estadoGlobal.tasa_bcv.toFixed(2)}</strong>
          </div>

          <button
            onClick={reloadAll}
            disabled={loading}
            className="px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={handleOpenModalAbrir}
            className="px-4 sm:px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center space-x-2 cursor-pointer"
          >
            {abiertas.length === 0 ? (
              <>
                <Unlock className="w-4 h-4" />
                <span>Abrir Caja</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>+ Abrir Otra Caja</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ESTADO EN VIVO DE CAJAS */}
      {abiertas.length === 0 ? (
        /* BANNER DE CAJAS CERRADAS */
        <div className="bg-gradient-to-br from-[#0b1120] via-[#0f172a] to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-xs font-black uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
              <span>Todas las Cajas Cerradas</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              No hay ningún turno de caja activo en el sistema
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xl">
              Para registrar cobros y emitir ventas en el Punto de Venta (POS), debe abrir un turno (Caja 1, Caja 2, Caja 3, etc.) e ingresar el fondo base para vueltos.
            </p>
          </div>

          <button
            onClick={handleOpenModalAbrir}
            className="px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-emerald-500/20 transition flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            <span>ABRIR CAJA AHORA</span>
          </button>
        </div>
      ) : (
        /* AL MENOS UNA CAJA ABIERTA (CONSOLIDADO + TARJETAS INDIVIDUALES) */
        <div className="space-y-6">
          {/* TARJETA PRINCIPAL: CAJA GENERAL CONSOLIDADA */}
          <div className="bg-gradient-to-br from-[#070b14] via-[#0b1324] to-[#042f20] text-white rounded-3xl shadow-2xl border-2 border-emerald-500/40 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-amber-400 text-slate-950 rounded-full font-black text-[11px] uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                    <Vault className="w-3.5 h-3.5" /> TOTAL GENERAL • CAJA CONSOLIDADA
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg font-black text-[11px]">
                    {abiertas.length} {abiertas.length === 1 ? 'Terminal Activa' : 'Terminales Activas Sumadas'}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Total General de Todas las Cajas
                </h3>
                <p className="text-xs text-slate-300">
                  Sumando en vivo: <strong className="text-emerald-300 font-bold">{abiertas.map(c => c.nombre_caja).join(' + ')}</strong> &bull; Fondos Base Sumados: <strong className="text-white font-mono">${totFondoUSD.toFixed(2)} USD</strong>
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0 bg-white/5 border border-white/10 rounded-2xl p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Facturado en Red</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">${totVentasUSD.toFixed(2)}</span>
                <span className="text-[10px] text-slate-300 font-bold block font-mono">
                  Bs. {(totVentasUSD * (estadoGlobal.tasa_bcv || 1)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* 6 Totales Consolidados */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="p-3 bg-white/5 hover:bg-white/10 transition rounded-2xl border border-white/10 text-center">
                <span className="text-[10px] font-bold text-emerald-300 uppercase block">Efectivo Total ($)</span>
                <span className="text-lg sm:text-xl font-black text-emerald-400 mt-1 block font-mono">${totEfectivoUSD.toFixed(2)}</span>
                <span className="text-[9px] text-slate-400">Ventas + Abonos</span>
              </div>

              <div className="p-3 bg-white/5 hover:bg-white/10 transition rounded-2xl border border-white/10 text-center">
                <span className="text-[10px] font-bold text-purple-300 uppercase block">Zelle Total ($)</span>
                <span className="text-lg sm:text-xl font-black text-purple-300 mt-1 block font-mono">${totZelleUSD.toFixed(2)}</span>
                <span className="text-[9px] text-slate-400">Digital</span>
              </div>

              <div className="p-3 bg-white/5 hover:bg-white/10 transition rounded-2xl border border-white/10 text-center">
                <span className="text-[10px] font-bold text-blue-300 uppercase block">Transferencia Total</span>
                <span className="text-lg sm:text-xl font-black text-blue-300 mt-1 block font-mono">${totTransfUSD.toFixed(2)}</span>
                <span className="text-[9px] text-slate-300 font-bold font-mono">Bs. {totTransfBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className="p-3 bg-white/5 hover:bg-white/10 transition rounded-2xl border border-white/10 text-center">
                <span className="text-[10px] font-bold text-amber-300 uppercase block">Punto Venta Total</span>
                <span className="text-lg sm:text-xl font-black text-amber-300 mt-1 block font-mono">${totPuntoUSD.toFixed(2)}</span>
                <span className="text-[9px] text-slate-300 font-bold font-mono">Bs. {totPuntoBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className="p-3 bg-white/5 hover:bg-white/10 transition rounded-2xl border border-white/10 text-center">
                <span className="text-[10px] font-bold text-emerald-200 uppercase block">Total Ventas ($)</span>
                <span className="text-lg sm:text-xl font-black text-emerald-300 mt-1 block font-mono">${totVentasUSD.toFixed(2)}</span>
                <span className="text-[9px] text-slate-400">Facturado en Red</span>
              </div>

              <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/40 text-center shadow-lg">
                <span className="text-[10px] font-bold text-emerald-300 uppercase block">Gavetas Físicas ($)</span>
                <span className="text-lg sm:text-xl font-black text-emerald-200 mt-1 block font-mono">${totGavetaUSD.toFixed(2)}</span>
                <span className="text-[9px] text-emerald-300/80">Fondo + Efectivo Total</span>
              </div>
            </div>
          </div>

          {/* DETALLE INDIVIDUAL DE CADA CAJA ABIERTA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Detalle Individual por Terminal ({abiertas.length} {abiertas.length === 1 ? 'Caja Abierta' : 'Cajas Abiertas'})</span>
              </h3>
              <button
                onClick={handleOpenModalAbrir}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Abrir Nueva Terminal</span>
              </button>
            </div>

            <div className={`grid grid-cols-1 ${abiertas.length > 1 ? 'xl:grid-cols-2' : ''} gap-5`}>
              {abiertas.map(c => (
                <div key={c.id} className="bg-[#0b1120] rounded-3xl shadow-md border border-slate-800 overflow-hidden flex flex-col justify-between">
                  {/* Cabecera individual */}
                  <div className="p-5 bg-gradient-to-r from-[#064e3b] to-[#022c22] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-600/30">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 bg-emerald-400 text-slate-950 rounded-full font-black text-xs uppercase tracking-wider shadow-sm flex items-center gap-1">
                          <Receipt className="w-3.5 h-3.5" /> {c.nombre_caja || 'Caja 1'}
                        </span>
                        <span className="px-2.5 py-0.5 bg-white/10 text-white rounded-lg font-bold text-[11px]">
                          Turno #{c.numero}
                        </span>
                        <span className="text-[11px] text-emerald-200">{c.fecha_apertura}</span>
                      </div>
                      <h4 className="text-base sm:text-lg font-black mt-1">Responsable: {c.usuario_apertura_nombre || 'Administrador'}</h4>
                      <p className="text-xs text-emerald-200/80">
                        Fondo Base: <strong className="text-white font-mono">${c.monto_apertura_usd.toFixed(2)} USD</strong> (Bs. {(c.monto_apertura_usd * (c.tasa_bcv_apertura || estadoGlobal.tasa_bcv)).toLocaleString('es-VE', { minimumFractionDigits: 2 })})
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenModalCerrar(c)}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-900/30 transition flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Cierre / Arqueo</span>
                    </button>
                  </div>

                  {/* Métricas en vivo */}
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-[#080d19]">
                    <div className="p-2.5 bg-[#0f172a] rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase block">Efectivo ($)</span>
                      <span className="text-base font-black text-emerald-300 mt-0.5 block font-mono">${(c.ventas_efectivo + c.abonos_efectivo).toFixed(2)}</span>
                      <span className="text-[9px] text-slate-400">Ventas + Abonos</span>
                    </div>

                    <div className="p-2.5 bg-[#0f172a] rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] font-bold text-purple-400 uppercase block">Zelle ($)</span>
                      <span className="text-base font-black text-purple-300 mt-0.5 block font-mono">${(c.ventas_zelle + c.abonos_zelle).toFixed(2)}</span>
                      <span className="text-[9px] text-slate-400">Digital</span>
                    </div>

                    <div className="p-2.5 bg-[#0f172a] rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] font-bold text-blue-400 uppercase block">Transferencia ($)</span>
                      <span className="text-base font-black text-blue-300 mt-0.5 block font-mono">${(c.ventas_pagomovil + c.abonos_pagomovil).toFixed(2)}</span>
                      <span className="text-[9px] text-slate-400 font-mono">Bs. {(c.ventas_pagomovil_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="p-2.5 bg-[#0f172a] rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] font-bold text-amber-400 uppercase block">Punto Venta ($)</span>
                      <span className="text-base font-black text-amber-300 mt-0.5 block font-mono">${(c.ventas_punto + c.abonos_punto).toFixed(2)}</span>
                      <span className="text-[9px] text-slate-400 font-mono">Bs. {(c.ventas_punto_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="p-2.5 bg-[#0f172a] rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] font-bold text-slate-300 uppercase block">Total Ventas ($)</span>
                      <span className="text-base font-black text-white mt-0.5 block font-mono">${c.total_ventas.toFixed(2)}</span>
                      <span className="text-[9px] text-slate-400">Facturado</span>
                    </div>

                    <div className="p-2.5 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-center">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase block">Gaveta Física ($)</span>
                      <span className="text-base font-black text-emerald-300 mt-0.5 block font-mono">${c.total_esperado_efectivo.toFixed(2)}</span>
                      <span className="text-[9px] text-emerald-400/80">Fondo + Efectivo</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HISTORIAL DE TURNOS DE CAJA */}
      <div className="bg-[#0b1120] rounded-2xl shadow-lg border border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f172a]/50">
          <div>
            <h2 className="font-bold text-white text-sm tracking-wide uppercase flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Historial de Cajas y Turnos Anteriores</span>
            </h2>
            <p className="text-xs text-slate-400">
              Registro histórico de aperturas, recaudación, arqueos y comprobantes de cierre
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-bold mr-1">Filtrar:</span>
            <select
              value={filtroCaja}
              onChange={(e) => setFiltroCaja(e.target.value)}
              className="px-3 py-1.5 bg-[#162032] border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="TODAS">🏢 Todas las Cajas (Consolidado)</option>
              {nombresCajasUnicas.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-xs text-slate-500 font-semibold">
              {historialFiltrado.length} turnos registrados
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111827] text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-3 py-3 text-center">N° Turno</th>
                <th className="px-3 py-3">Caja / Terminal</th>
                <th className="px-3 py-3">Responsable</th>
                <th className="px-3 py-3">Apertura</th>
                <th className="px-3 py-3">Cierre</th>
                <th className="px-3 py-3 text-right">Fondo Base ($)</th>
                <th className="px-3 py-3 text-right">Ventas ($)</th>
                <th className="px-3 py-3 text-right">Abonos ($)</th>
                <th className="px-3 py-3 text-right">Esperado ($)</th>
                <th className="px-3 py-3 text-right">Declarado ($)</th>
                <th className="px-3 py-3 text-right">Diferencia ($)</th>
                <th className="px-3 py-3 text-center">Estado</th>
                <th className="px-3 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {historialFiltrado.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-8 text-slate-500 font-semibold">
                    No se encontraron turnos de caja registrados.
                  </td>
                </tr>
              ) : (
                historialFiltrado.map(c => {
                  const dif = c.diferencia_efectivo;
                  const difClass = dif === 0 ? 'text-slate-400 font-bold' : (dif > 0 ? 'text-emerald-400 font-black' : 'text-rose-400 font-black');

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-3 py-3 text-center font-mono font-black text-white">#{c.numero}</td>
                      <td className="px-3 py-3 font-extrabold text-white flex items-center space-x-1.5">
                        <Receipt className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{c.nombre_caja || 'Caja 1'}</span>
                      </td>
                      <td className="px-3 py-3 text-slate-200">{c.usuario_apertura_nombre || 'Administrador'}</td>
                      <td className="px-3 py-3 text-slate-400 text-[11px]">{c.fecha_apertura}</td>
                      <td className="px-3 py-3 text-slate-400 text-[11px]">
                        {c.fecha_cierre || <span className="text-emerald-400 font-bold">En curso...</span>}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-slate-300">${c.monto_apertura_usd.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-white">${c.total_ventas.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right font-mono text-emerald-400">${c.total_abonos.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-slate-200">${c.total_esperado_efectivo.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-white">
                        {c.estado === 'cerrada' ? `$${c.declarado_efectivo.toFixed(2)}` : '-'}
                      </td>
                      <td className={`px-3 py-3 text-right font-mono ${difClass}`}>
                        {c.estado === 'cerrada' ? `${dif >= 0 ? '+$' : '-$'}${Math.abs(dif).toFixed(2)}` : '-'}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {c.estado === 'abierta' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                            Abierta
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                            Cerrada
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => handleVerTicket(c.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-bold text-[11px] transition flex items-center justify-center space-x-1 mx-auto cursor-pointer"
                        >
                          <Receipt className="w-3 h-3 text-emerald-400" />
                          <span>Ticket</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {historialFiltrado.length > 0 && (
              <tfoot className="bg-[#0f172a] text-white font-black text-xs border-t-2 border-emerald-500">
                <tr>
                  <td colSpan={5} className="px-3 py-3.5 text-left uppercase tracking-wider text-emerald-400 font-black">
                    <div className="flex items-center gap-1.5">
                      <Calculator className="w-4 h-4" />
                      <span>TOTAL GENERAL ({historialFiltrado.length} Turnos Sumados):</span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-right font-mono text-slate-300">${sumFondoHist.toFixed(2)}</td>
                  <td className="px-3 py-3.5 text-right font-mono text-emerald-300 font-black">${sumVentasHist.toFixed(2)}</td>
                  <td className="px-3 py-3.5 text-right font-mono text-emerald-400">${sumAbonosHist.toFixed(2)}</td>
                  <td className="px-3 py-3.5 text-right font-mono text-emerald-300 font-black">${sumEsperadoHist.toFixed(2)}</td>
                  <td className="px-3 py-3.5 text-right font-mono text-slate-200">${sumDeclaradoHist.toFixed(2)}</td>
                  <td className={`px-3 py-3.5 text-right font-mono ${sumDifHist === 0 ? 'text-slate-300' : (sumDifHist > 0 ? 'text-emerald-400' : 'text-rose-400')}`}>
                    {sumDifHist >= 0 ? '+$' : '-$'}{Math.abs(sumDifHist).toFixed(2)}
                  </td>
                  <td colSpan={2} className="px-3 py-3.5 text-center text-slate-400 text-[10px]">Consolidado</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL 1: APERTURA DE CAJA                  */}
      {/* ========================================== */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-sm font-bold">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Apertura de Caja</h3>
                  <p className="text-xs text-slate-400">Inicie un nuevo turno registrando el fondo base</p>
                </div>
              </div>
              <button onClick={() => setShowOpenModal(false)} className="text-slate-400 hover:text-white text-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitApertura} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Terminal / Caja <span className="text-emerald-400">*</span></span>
                  <span className="text-[10px] text-slate-400">
                    {estadoGlobal.cajas_ocupadas_nombres?.length > 0 ? `En uso: ${estadoGlobal.cajas_ocupadas_nombres.join(', ')}` : 'Todas disponibles'}
                  </span>
                </label>

                {/* Pills selector */}
                <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                  {['Caja 1', 'Caja 2', 'Caja 3', 'Caja 4'].map((nom) => {
                    const ocupada = estadoGlobal.cajas_ocupadas_nombres?.includes(nom);
                    const selected = nombreCaja === nom;

                    return (
                      <button
                        key={nom}
                        type="button"
                        disabled={ocupada}
                        onClick={() => setNombreCaja(nom)}
                        className={`py-1.5 px-2 text-xs font-black rounded-xl border transition cursor-pointer ${
                          ocupada
                            ? 'border-rose-900/50 bg-rose-950/30 text-rose-500 opacity-50 line-through cursor-not-allowed'
                            : selected
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-md shadow-emerald-950/50'
                            : 'border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        {nom}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  value={nombreCaja}
                  onChange={(e) => setNombreCaja(e.target.value)}
                  required
                  placeholder="Ej: Caja 1, Caja 2..."
                  className="w-full px-3.5 py-2.5 bg-[#070b14] border border-slate-700 rounded-xl text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Cajero / Responsable <span className="text-emerald-400">*</span>
                </label>
                <select
                  value={aperturaEmpleadoId}
                  onChange={(e) => setAperturaEmpleadoId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-[#070b14] border border-slate-700 rounded-xl text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Fondo Base en Efectivo ($ USD) <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={montoAperturaUsd}
                    onChange={(e) => handleUsdChange(e.target.value)}
                    required
                    className="w-full pl-8 pr-3.5 py-2.5 bg-[#070b14] border border-slate-700 rounded-xl text-emerald-400 font-black text-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Equivalente oficial: <strong className="text-slate-200 font-mono">Bs. {montoAperturaBs}</strong> (a Bs. {estadoGlobal.tasa_bcv.toFixed(2)})
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Fondo Base en Bolívares (Efectivo Bs) <span className="text-slate-500 text-[10px]">(Opcional)</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold">Bs.</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={montoAperturaBs}
                    onChange={(e) => setMontoAperturaBs(e.target.value)}
                    className="w-full pl-11 pr-3.5 py-2.5 bg-[#070b14] border border-slate-700 rounded-xl text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Observaciones / Notas
                </label>
                <input
                  type="text"
                  value={obsApertura}
                  onChange={(e) => setObsApertura(e.target.value)}
                  placeholder="Ej: Billetes de baja denominación para cambio..."
                  className="w-full px-3.5 py-2.5 bg-[#070b14] border border-slate-700 rounded-xl text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Al abrir la caja, las ventas y cobros del POS quedarán registrados bajo este turno.</span>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{actionLoading ? 'Abriendo...' : 'Confirmar Apertura'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 2: ARQUEO Y CIERRE DE CAJA           */}
      {/* ========================================== */}
      {showCloseModal && cajaACerrar && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full p-6 text-slate-100 overflow-y-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center text-sm font-bold">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Arqueo y Cierre de Turno</h3>
                  <p className="text-xs text-slate-400">
                    {cajaACerrar.nombre_caja} • Turno #{cajaACerrar.numero} • Cajero: {cajaACerrar.usuario_apertura_nombre}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCloseModal(false)} className="text-slate-400 hover:text-white text-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumen Esperado por el Sistema */}
            <div className="bg-[#070b14] border border-slate-800 p-4 rounded-2xl mb-4 space-y-2.5">
              <div className="flex justify-between items-baseline border-b border-slate-800 pb-2">
                <span className="text-xs text-slate-400 uppercase font-bold">Efectivo Esperado en Gaveta:</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  ${cajaACerrar.total_esperado_efectivo.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                <div>Fondo Base: <strong className="text-white font-mono">${cajaACerrar.monto_apertura_usd.toFixed(2)}</strong></div>
                <div>Ventas Efectivo: <strong className="text-white font-mono">${cajaACerrar.ventas_efectivo.toFixed(2)}</strong></div>
                <div>Abonos Efectivo: <strong className="text-white font-mono">${cajaACerrar.abonos_efectivo.toFixed(2)}</strong></div>
                <div>Total Sistema General: <strong className="text-white font-mono">${cajaACerrar.total_esperado_general.toFixed(2)}</strong></div>
                <div className="col-span-2 border-t border-slate-800 pt-1 grid grid-cols-2 gap-2 text-[11px] text-emerald-300">
                  <div>Transferencias: <strong className="text-white font-mono">Bs. {(cajaACerrar.ventas_pagomovil_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong> (${cajaACerrar.ventas_pagomovil.toFixed(2)})</div>
                  <div>Punto de Venta: <strong className="text-white font-mono">Bs. {(cajaACerrar.ventas_punto_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong> (${cajaACerrar.ventas_punto.toFixed(2)})</div>
                </div>
              </div>
            </div>

            {/* Formulario de Conteo Declarado */}
            <form onSubmit={handleSubmitCierre} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Efectivo Total Contado en Gaveta ($ USD Físicos) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={decEfectivo}
                    onChange={(e) => setDecEfectivo(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-[#070b14] border border-slate-700 rounded-xl text-emerald-400 font-black text-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Zelle Declarado ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={decZelle}
                    onChange={(e) => setDecZelle(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070b14] border border-slate-700 rounded-xl text-xs font-bold text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Transferencia ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={decPagoMovil}
                    onChange={(e) => setDecPagoMovil(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070b14] border border-slate-700 rounded-xl text-xs font-bold text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Punto Venta ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={decPunto}
                    onChange={(e) => setDecPunto(e.target.value)}
                    className="w-full px-3 py-2 bg-[#070b14] border border-slate-700 rounded-xl text-xs font-bold text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Insignia de Cuadre en Tiempo Real */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                decEfectivo === '' ? 'bg-slate-900 border-slate-800 text-slate-400' :
                Math.abs(difCierre) < 0.01 ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' :
                difCierre > 0 ? 'bg-blue-950/40 border-blue-500/40 text-blue-300' :
                'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}>
                <span>Diferencia en Efectivo:</span>
                <span className="text-sm font-black font-mono">
                  {decEfectivo === '' ? '$0.00' :
                   Math.abs(difCierre) < 0.01 ? 'CUADRE EXACTO ($0.00)' :
                   difCierre > 0 ? `SOBRANTE: +$${difCierre.toFixed(2)}` :
                   `FALTANTE: -$${Math.abs(difCierre).toFixed(2)}`}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Observaciones de Cierre
                </label>
                <input
                  type="text"
                  value={obsCierre}
                  onChange={(e) => setObsCierre(e.target.value)}
                  placeholder="Ej: Cuadre conforme sin novedades..."
                  className="w-full px-3.5 py-2.5 bg-[#070b14] border border-slate-700 rounded-xl text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || decEfectivo === ''}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{actionLoading ? 'Cerrando Turno...' : 'Confirmar Cierre de Caja'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: COMPROBANTE DE CIERRE / TICKET TÉRMICO 80MM      */}
      {/* ======================================================== */}
      {showTicketModal && cajaTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 text-slate-100 overflow-y-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 print:hidden">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-sm font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Comprobante de Cierre</h3>
                  <p className="text-xs text-slate-400">{cajaTicket.nombre_caja} • Turno #{cajaTicket.numero}</p>
                </div>
              </div>
              <button onClick={() => setShowTicketModal(false)} className="text-slate-400 hover:text-white text-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SECCIÓN DEL TICKET IMPRIMIBLE (80MM) */}
            <div
              id="seccionTicketCajaImprimir"
              className="p-4 bg-white text-black rounded-xl border border-slate-300 text-xs font-mono space-y-3 shadow-inner"
            >
              <div className="text-center border-b border-dashed border-slate-400 pb-2">
                <h4 className="font-black text-sm uppercase">EXPENDIO DE MEDICINAS AMANDA B&V C.A.</h4>
                <p className="text-[10px] text-slate-700">RIF: J-40192841-0 &bull; SICM: 50530</p>
                <p className="font-bold mt-1 text-[11px] text-slate-900">CORTE Y CIERRE DE CAJA</p>
                <p className="text-[10px] text-slate-600">{cajaTicket.fecha_cierre || 'En curso'}</p>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between"><span>Caja / Terminal:</span><strong className="text-emerald-800">{cajaTicket.nombre_caja}</strong></div>
                <div className="flex justify-between"><span>Turno Consecutivo:</span><strong>#{cajaTicket.numero}</strong></div>
                <div className="flex justify-between"><span>Apertura por:</span><span>{cajaTicket.usuario_apertura_nombre}</span></div>
                <div className="flex justify-between"><span>Cierre por:</span><span>{cajaTicket.usuario_cierre_nombre || cajaTicket.usuario_apertura_nombre}</span></div>
                <div className="flex justify-between"><span>Fecha Apertura:</span><span>{cajaTicket.fecha_apertura}</span></div>
              </div>

              <div className="border-t border-b border-dashed border-slate-400 py-2 space-y-1 text-[11px]">
                <div className="flex justify-between"><span>Fondo Inicial ($):</span><strong>${cajaTicket.monto_apertura_usd.toFixed(2)}</strong></div>
                <div className="flex justify-between"><span>Ventas Efectivo:</span><span>${cajaTicket.ventas_efectivo.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Ventas Zelle:</span><span>${cajaTicket.ventas_zelle.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold"><span>Ventas Transferencia:</span><span>Bs. {(cajaTicket.ventas_pagomovil_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between font-bold"><span>Ventas Punto:</span><span>Bs. {(cajaTicket.ventas_punto_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between font-bold"><span>Ventas Crédito:</span><span>${cajaTicket.ventas_credito.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-300">
                  <span>TOTAL VENTAS ($):</span><strong>${cajaTicket.total_ventas.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between font-black text-slate-900">
                  <span>TOTAL VENTAS (Bs.):</span>
                  <strong>Bs. {(cajaTicket.total_ventas_bs || (cajaTicket.total_ventas * cajaTicket.tasa_bcv_apertura)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="flex justify-between font-bold text-slate-900">
                  <span>TOTAL ABONOS ($):</span><strong>${cajaTicket.total_abonos.toFixed(2)}</strong>
                </div>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-bold"><span>Total Esperado Efectivo:</span><strong>${cajaTicket.total_esperado_efectivo.toFixed(2)}</strong></div>
                <div className="flex justify-between font-bold"><span>Efectivo Declarado:</span><strong>${cajaTicket.declarado_efectivo.toFixed(2)}</strong></div>
                <div className={`flex justify-between text-xs font-black pt-1 border-t border-slate-400 ${
                  cajaTicket.diferencia_efectivo === 0 ? 'text-slate-900' :
                  cajaTicket.diferencia_efectivo > 0 ? 'text-emerald-800' : 'text-rose-800'
                }`}>
                  <span>DIFERENCIA:</span>
                  <strong>{cajaTicket.diferencia_efectivo >= 0 ? '+$' : '-$'}{Math.abs(cajaTicket.diferencia_efectivo).toFixed(2)}</strong>
                </div>
              </div>

              {cajaTicket.observaciones_cierre && (
                <div className="border-t border-dashed border-slate-400 pt-1 text-[10px] text-slate-600">
                  <span>Nota: {cajaTicket.observaciones_cierre}</span>
                </div>
              )}

              {/* Firmas */}
              <div className="border-t border-dashed border-slate-400 pt-3 text-center text-[10px] space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="border-b border-slate-500 w-4/5 mx-auto mb-1"></div>
                    <span>Cajero Entrega</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-500 w-4/5 mx-auto mb-1"></div>
                    <span>Supervisor Recibe</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end space-x-2 print:hidden">
              <button
                onClick={() => setShowTicketModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos para impresión de ticket térmico 80mm */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #seccionTicketCajaImprimir, #seccionTicketCajaImprimir * {
            visibility: visible;
          }
          #seccionTicketCajaImprimir {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 4mm !important;
            background: white !important;
            color: black !important;
            font-family: monospace !important;
          }
          @page {
            margin: 2mm;
            size: 80mm auto;
          }
        }
      `}</style>
    </div>
  );
};
