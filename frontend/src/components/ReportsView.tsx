import React, { useState, useEffect } from 'react';
import { 
  BarChart3, DollarSign, TrendingUp, Package, 
  Calendar, CreditCard, PieChart, ArrowUpRight, Download, Filter,
  Printer, RefreshCw, Landmark, ShieldCheck, FileText, CheckCircle2,
  Percent, ArrowRight, HelpCircle, ArrowLeft, Truck, Layers,
  Sparkles, Check, ChevronRight
} from 'lucide-react';
import { Settings } from '../types';
import { InventoryReportView } from './InventoryReportView';
import { OnlineOrdersReportView } from './OnlineOrdersReportView';

interface Props {
  settings?: Settings | null;
}

export const ReportsView: React.FC<Props> = ({ settings }) => {
  const [selectedReport, setSelectedReport] = useState<'HUB' | 'FINANCIAL' | 'INVENTORY' | 'ONLINE'>('HUB');

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [quickFilter, setQuickFilter] = useState<'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'PREV_MONTH' | 'ALL'>('MONTH');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SENIAT' | 'PAYMENTS' | 'PRODUCTS' | 'INVOICES'>('OVERVIEW');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchFinancialReport = async (start = startDate, end = endDate) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (start) queryParams.append('startDate', start);
      if (end) queryParams.append('endDate', end);

      const res = await fetch(`/api/reports/financial?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Error al cargar reporte financiero');
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error('Error fetching financial report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialReport(startDate, endDate);
  }, []);

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchFinancialReport(startDate, endDate);
  };

  const setQuickRange = (type: 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'PREV_MONTH' | 'ALL') => {
    setQuickFilter(type);
    const curr = new Date();
    let s = '';
    let e = curr.toISOString().split('T')[0];

    if (type === 'TODAY') {
      s = e;
    } else if (type === 'YESTERDAY') {
      const yest = new Date(curr.getTime() - 24 * 60 * 60 * 1000);
      s = yest.toISOString().split('T')[0];
      e = s;
    } else if (type === 'WEEK') {
      const lastWeek = new Date(curr.getTime() - 7 * 24 * 60 * 60 * 1000);
      s = lastWeek.toISOString().split('T')[0];
    } else if (type === 'MONTH') {
      s = new Date(curr.getFullYear(), curr.getMonth(), 1).toISOString().split('T')[0];
    } else if (type === 'PREV_MONTH') {
      const prevFirst = new Date(curr.getFullYear(), curr.getMonth() - 1, 1).toISOString().split('T')[0];
      const prevLast = new Date(curr.getFullYear(), curr.getMonth(), 0).toISOString().split('T')[0];
      s = prevFirst;
      e = prevLast;
    } else if (type === 'ALL') {
      s = '';
      e = '';
    }

    setStartDate(s);
    setEndDate(e);
    fetchFinancialReport(s, e);
  };

  // Sub-views switching
  if (selectedReport === 'INVENTORY') {
    return <InventoryReportView onBack={() => setSelectedReport('HUB')} />;
  }

  if (selectedReport === 'ONLINE') {
    return <OnlineOrdersReportView settings={settings || null} onBack={() => setSelectedReport('HUB')} />;
  }

  if (selectedReport === 'HUB') {
    return (
      <div className="space-y-6">
        {/* Hub Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#006837] text-white shadow-md text-base">
                📊
              </span>
              <span>Centro de Reportes y Analítica</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Accede a los módulos de auditoría financiera, valoración de existencias e informes de ventas.
            </p>
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Reporte Financiero SENIAT */}
          <div 
            onClick={() => setSelectedReport('FINANCIAL')}
            className="group relative bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-600/60 rounded-2xl p-6 transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <Landmark className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                  Fiscal & Contable
                </span>
              </div>

              <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors">
                Reportes Financieros y Fiscales (SENIAT)
              </h3>
              <p className="text-xs text-slate-400 mt-2 line-clamp-3">
                Auditoría de ingresos brutos, costo de reposición de mercancía (COGS), ganancia neta real y cálculo de débito fiscal IVA para declaraciones.
              </p>

              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Auditoría de Ventas e Ingresos Totales</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Cálculo de IVA y Libro de Ventas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Distribución de métodos de pago</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 flex items-center justify-between text-xs font-black text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Abrir Reporte Financiero</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2: Reporte de Inventario y Existencias */}
          <div 
            onClick={() => setSelectedReport('INVENTORY')}
            className="group relative bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-blue-600/60 rounded-2xl p-6 transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
                  <Package className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/80">
                  Inventario & Costos
                </span>
              </div>

              <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors">
                Reportes de Inventario y Existencias
              </h3>
              <p className="text-xs text-slate-400 mt-2 line-clamp-3">
                Total de artículos registrados, valoración a precio costo y venta, margen proyectado, poco stock, más vendidos y artículos sin rotación.
              </p>

              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>Valoración en $ y Bs. (Tasa BCV)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>Artículos con Poco Stock y Agotados</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>Top Más Vendidos vs Artículos Sin Rotación</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>Desglose por Categorías y Lotes por Vencer</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 flex items-center justify-between text-xs font-black text-blue-400 group-hover:translate-x-1 transition-transform">
              <span>Abrir Reporte de Inventario</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Card 3: Reporte de Ventas Web & Delivery */}
          <div 
            onClick={() => setSelectedReport('ONLINE')}
            className="group relative bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-purple-600/60 rounded-2xl p-6 transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
                  <Truck className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/80">
                  Comercio Digital
                </span>
              </div>

              <h3 className="text-lg font-black text-white group-hover:text-purple-400 transition-colors">
                Reportes de Ventas Web & Delivery
              </h3>
              <p className="text-xs text-slate-400 mt-2 line-clamp-3">
                Historial de pedidos recibidos por la tienda online, recaudación en divisas y bolívares, y logística de entregas a domicilio y pickup.
              </p>

              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Envíos a Domicilio y Retiros en Tienda</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Verificación de Comprobantes de Pago</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Medicamentos con Mayor Demanda Online</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 flex items-center justify-between text-xs font-black text-purple-400 group-hover:translate-x-1 transition-transform">
              <span>Abrir Reporte Digital</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const summary = reportData?.summary || {};
  const totalRev = summary.totalRevenueUsd || 0;
  const totalCogs = summary.totalCogsUsd || 0;
  const grossProfit = summary.grossProfitUsd || 0;
  const totalTax = summary.totalTaxUsd || 0;
  const rate = summary.avgRate || 85.0;

  // Percentage distribution of each gross dollar
  const cogsPct = totalRev > 0 ? ((totalCogs / totalRev) * 100) : 0;
  const profitPct = totalRev > 0 ? ((grossProfit / totalRev) * 100) : 0;
  const taxPct = totalRev > 0 ? ((totalTax / totalRev) * 100) : 0;

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      
      {/* Top Header & Export Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedReport('HUB')}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition shadow-sm cursor-pointer flex items-center gap-1.5 text-xs font-bold mr-1"
            title="Volver a la lista de reportes"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Volver a Reportes</span>
          </button>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#006837] text-white shadow-md text-base">
                📊
              </span>
              <span>Reportes Financieros y Fiscales (SENIAT)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Auditoría de ingresos brutos, costo de reposición de mercancía, ganancia neta real e IVA a declarar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchFinancialReport(startDate, endDate)}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-[#006837] hover:bg-[#00522c] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-900/20 transition active:scale-95 cursor-pointer"
            title="Imprimir informe contable o guardar en PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Header (Visible only when printing) */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-3">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-slate-900">Expendio de Medicinas Amanda B&V C.A.</h1>
            <p className="text-xs text-slate-600">RIF: J-40192841-0 &bull; SICM: 50530 &bull; Caracas, Venezuela</p>
            <p className="text-xs font-bold text-slate-800 mt-1">
              INFORME FINANCIERO Y DECLARACIÓN DE DÉBITO FISCAL (SENIAT)
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-mono font-bold">Período: {startDate || 'Inicio'} hasta {endDate || 'Hoy'}</p>
            <p className="text-slate-500">Emitido: {new Date().toLocaleString()}</p>
            <p className="text-slate-500">Tasa de Cambio Oficial: Bs. {rate.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Date Range Filter Bar (Calendario) */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md print:hidden space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5" /> Período:
            </span>
            {[
              { key: 'TODAY', label: 'Hoy' },
              { key: 'YESTERDAY', label: 'Ayer' },
              { key: 'WEEK', label: 'Últimos 7 Días' },
              { key: 'MONTH', label: 'Este Mes' },
              { key: 'PREV_MONTH', label: 'Mes Anterior' },
              { key: 'ALL', label: 'Todo el Historial' }
            ].map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setQuickRange(f.key as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                  quickFilter === f.key
                    ? 'bg-[#006837] text-white shadow-md'
                    : 'bg-[#0f172a] text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Date Picker Form */}
          <form onSubmit={handleApplyFilter} className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-[#0f172a] border border-slate-700 rounded-xl px-2.5 py-1 text-xs">
              <span className="text-slate-400 text-[10px] font-bold uppercase">Desde</span>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setQuickFilter('ALL');
                }}
                className="bg-transparent font-semibold text-white text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#0f172a] border border-slate-700 rounded-xl px-2.5 py-1 text-xs">
              <span className="text-slate-400 text-[10px] font-bold uppercase">Hasta</span>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setQuickFilter('ALL');
                }}
                className="bg-transparent font-semibold text-white text-xs focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-[#cf152b] hover:bg-[#b01023] active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              Filtrar
            </button>
          </form>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Total Ventas */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              1. Ventas Totales Facturadas
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-950/70 text-blue-400 border border-blue-800/80 flex items-center justify-center font-bold">
              💵
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-white font-mono">
              ${totalRev.toFixed(2)}
            </p>
            <p className="text-xs font-extrabold text-blue-400 font-mono mt-0.5">
              Bs. {(totalRev * rate).toFixed(2)}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>{summary.totalInvoices || 0} facturas</span>
            <span>{summary.totalUnitsSold || 0} unidades</span>
          </div>
        </div>

        {/* 2. Costo Mercancía Vendida */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              2. Costo Mercancía (Para Reponer)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-950/70 text-amber-400 border border-amber-800/80 flex items-center justify-center font-bold">
              📦
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-amber-400 font-mono">
              ${totalCogs.toFixed(2)}
            </p>
            <p className="text-xs font-extrabold text-slate-400 font-mono mt-0.5">
              Bs. {(totalCogs * rate).toFixed(2)}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-amber-300 font-semibold truncate">
            {cogsPct.toFixed(1)}% del ingreso bruto (A droguerías)
          </div>
        </div>

        {/* 3. Tu Ganancia Neta Real */}
        <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-emerald-950/50 p-5 rounded-2xl border-2 border-emerald-500 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
              3. Tu Ganancia Neta Real
            </span>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
              +{summary.profitMarginPercent || 0}% Margen
            </span>
          </div>
          <div className="mt-2">
            <p className="text-3xl font-black text-emerald-400 font-mono">
              +${grossProfit.toFixed(2)}
            </p>
            <p className="text-xs font-black text-emerald-300 font-mono mt-0.5">
              +Bs. {(grossProfit * rate).toFixed(2)}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-emerald-800/80 text-[11px] text-emerald-300 font-bold">
            Utilidad neta limpia en tu bolsillo ({profitPct.toFixed(1)}% de la venta)
          </div>
        </div>

        {/* 4. IVA a Pagar al SENIAT */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              4. IVA a Pagar al SENIAT
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-950/70 text-purple-400 border border-purple-800/80 flex items-center justify-center font-bold">
              🏛️
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-purple-300 font-mono">
              ${totalTax.toFixed(2)}
            </p>
            <p className="text-xs font-extrabold text-purple-400 font-mono mt-0.5">
              Bs. {(totalTax * rate).toFixed(2)}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-slate-400">
            16% sobre artículos gravados (No es ganancia)
          </div>
        </div>

      </div>

      {/* Visual Flow Distribution Banner */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
              <span>🎯</span>
              <span>Distribución Real del Dinero Ingresado:</span>
            </h4>
            <p className="text-xs text-slate-400">
              Desglose visual exacto de cómo se divide cada dólar y bolívar facturado en el período:
            </p>
          </div>
          <span className="text-xs font-bold font-mono text-emerald-400 bg-[#0f172a] border border-slate-800 px-3 py-1 rounded-xl">
            Tasa Oficial: 1 USD = Bs. {rate.toFixed(2)}
          </span>
        </div>

        {/* Visual 3-part Progress Bar */}
        <div className="w-full h-5 rounded-xl bg-slate-800 overflow-hidden flex shadow-inner">
          <div 
            style={{ width: `${Math.max(cogsPct, 1)}%` }} 
            className="bg-amber-500 h-full flex items-center justify-center text-[10px] text-white font-extrabold transition-all duration-500"
            title={`Costo Mercancía: $${totalCogs.toFixed(2)} (${cogsPct.toFixed(1)}%)`}
          >
            {cogsPct > 15 && `Mercancía ${cogsPct.toFixed(0)}%`}
          </div>
          <div 
            style={{ width: `${Math.max(profitPct, 1)}%` }} 
            className="bg-[#006837] h-full flex items-center justify-center text-[10px] text-white font-extrabold transition-all duration-500"
            title={`Tu Ganancia Real: $${grossProfit.toFixed(2)} (${profitPct.toFixed(1)}%)`}
          >
            {profitPct > 15 && `Tu Ganancia ${profitPct.toFixed(0)}%`}
          </div>
          <div 
            style={{ width: `${Math.max(taxPct, 1)}%` }} 
            className="bg-purple-700 h-full flex items-center justify-center text-[10px] text-white font-extrabold transition-all duration-500"
            title={`IVA SENIAT: $${totalTax.toFixed(2)} (${taxPct.toFixed(1)}%)`}
          >
            {taxPct > 8 && `IVA ${taxPct.toFixed(0)}%`}
          </div>
        </div>

        {/* Distribution Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 bg-amber-950/40 border border-amber-800/70 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-300 block">Costo de Mercancía</span>
              <strong className="text-sm font-mono text-white">${totalCogs.toFixed(2)}</strong>
              <span className="text-[10px] text-slate-400 font-mono block">Bs. {(totalCogs * rate).toFixed(2)}</span>
            </div>
            <span className="text-xs font-black text-amber-200 bg-amber-900/60 border border-amber-700/80 px-2 py-1 rounded-lg">
              {cogsPct.toFixed(1)}%
            </span>
          </div>

          <div className="p-3 bg-emerald-950/40 border border-emerald-700/70 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-400 block">Tu Ganancia Neta</span>
              <strong className="text-sm font-mono text-emerald-400">+${grossProfit.toFixed(2)}</strong>
              <span className="text-[10px] text-emerald-300 font-mono block">+Bs. {(grossProfit * rate).toFixed(2)}</span>
            </div>
            <span className="text-xs font-black text-emerald-950 bg-emerald-400 px-2 py-1 rounded-lg font-bold">
              {profitPct.toFixed(1)}%
            </span>
          </div>

          <div className="p-3 bg-purple-950/40 border border-purple-800/70 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-purple-300 block">Para Pagar al SENIAT</span>
              <strong className="text-sm font-mono text-purple-300">${totalTax.toFixed(2)}</strong>
              <span className="text-[10px] text-purple-300/80 font-mono block">Bs. {(totalTax * rate).toFixed(2)}</span>
            </div>
            <span className="text-xs font-black text-purple-200 bg-purple-900/60 border border-purple-700/80 px-2 py-1 rounded-lg">
              {taxPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="border-b border-slate-800 flex gap-2 overflow-x-auto text-xs font-bold print:hidden">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'OVERVIEW'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          📊 Resumen y Tendencia
        </button>

        <button
          onClick={() => setActiveTab('SENIAT')}
          className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'SENIAT'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span>🏛️</span>
          <span>Reporte Fiscal SENIAT (IVA 16%)</span>
          {totalTax > 0 && (
            <span className="bg-purple-950/80 text-purple-300 border border-purple-800/80 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              ${totalTax.toFixed(0)}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('PAYMENTS')}
          className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'PAYMENTS'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          💳 Cobros por Forma de Pago
        </button>

        <button
          onClick={() => setActiveTab('PRODUCTS')}
          className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'PRODUCTS'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          💊 Rentabilidad por Medicamento
        </button>

        <button
          onClick={() => setActiveTab('INVOICES')}
          className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'INVOICES'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          🧾 Libro de Facturas Emitidas
        </button>
      </div>

      {/* TAB 1: OVERVIEW & TENDENCIA */}
      {(activeTab === 'OVERVIEW' || activeTab === 'PRODUCTS') && (
        <div className="space-y-6">
          {/* Daily Trend Bars */}
          {reportData?.dailyTimeline && reportData.dailyTimeline.length > 0 && (
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span>Evolución Diaria: Ventas Totales vs Ganancia Neta</span>
                </h4>
                <span className="text-xs text-slate-400">Por fecha en el período</span>
              </div>

              <div className="space-y-2 pt-2">
                {reportData.dailyTimeline.map((day: any) => {
                  const maxVal = Math.max(...reportData.dailyTimeline.map((d: any) => d.total_sales)) || 1;
                  const salesWidth = (day.total_sales / maxVal) * 100;
                  const profitWidth = (day.daily_profit / maxVal) * 100;

                  return (
                    <div key={day.sale_date} className="p-2.5 bg-[#0f172a] rounded-xl border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-slate-300 font-mono">{day.sale_date} ({day.count} ventas)</span>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-white">Ventas: ${day.total_sales.toFixed(2)}</span>
                          <span className="text-emerald-400 font-black">Ganancia: +${day.daily_profit.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full" style={{ width: `${salesWidth}%` }} />
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${profitWidth}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REPORTE FISCAL SENIAT (IVA 16%) */}
      {activeTab === 'SENIAT' && (
        <div className="space-y-6">
          
          {/* SENIAT Summary Header */}
          <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-lg space-y-4 border border-purple-800/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" />
                  <span>Servicio Nacional Integrado de Administración Aduanera y Tributaria (SENIAT)</span>
                </span>
                <h3 className="text-xl sm:text-2xl font-black mt-1 text-white">
                  Resumen Oficial de Débito Fiscal e IVA 16%
                </h3>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 text-xs font-mono text-purple-200">
                Tasa Oficial: Bs. {rate.toFixed(2)} / USD
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              
              {/* Ventas Exentas */}
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
                <span className="text-[10px] uppercase font-bold text-purple-200 block">
                  1. Ventas Exentas (Medicinas 0% IVA)
                </span>
                <p className="text-2xl font-black font-mono mt-1 text-white">
                  ${(summary.exemptSalesUsd || 0).toFixed(2)}
                </p>
                <p className="text-xs text-purple-200 font-mono mt-0.5">
                  Bs. {((summary.exemptSalesUsd || 0) * rate).toFixed(2)}
                </p>
                <span className="text-[10px] text-purple-300 block mt-1">
                  Exención según Ley del Medicamento
                </span>
              </div>

              {/* Base Imponible Gravada */}
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
                <span className="text-[10px] uppercase font-bold text-purple-200 block">
                  2. Base Imponible (Gravada 16%)
                </span>
                <p className="text-2xl font-black font-mono mt-1 text-white">
                  ${(summary.taxedSalesBaseUsd || 0).toFixed(2)}
                </p>
                <p className="text-xs text-purple-200 font-mono mt-0.5">
                  Bs. {((summary.taxedSalesBaseUsd || 0) * rate).toFixed(2)}
                </p>
                <span className="text-[10px] text-purple-300 block mt-1">
                  Cosméticos, suplementos e higiene
                </span>
              </div>

              {/* Débito Fiscal a Pagar al SENIAT */}
              <div className="bg-purple-950/80 p-3.5 rounded-2xl border-2 border-purple-500">
                <span className="text-[10px] uppercase font-extrabold text-amber-300 block flex items-center gap-1">
                  <span>⚡</span> Débito Fiscal (IVA a Pagar al SENIAT)
                </span>
                <p className="text-2xl font-black font-mono mt-1 text-amber-300">
                  ${totalTax.toFixed(2)}
                </p>
                <p className="text-xs text-white font-mono font-bold mt-0.5">
                  Bs. {(totalTax * rate).toFixed(2)}
                </p>
                <span className="text-[10px] text-purple-300 block mt-1">
                  16% exacto de la base gravada
                </span>
              </div>

            </div>
          </div>

          {/* Detailed Tax Invoices Table */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-xs">
                  Libro de Ventas Fiscales y Desglose por Comprobante
                </h4>
                <p className="text-[11px] text-slate-400">
                  Auditoría detallada de facturas emitidas en el rango seleccionado
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-purple-300 bg-purple-950/60 border border-purple-800/80 px-2.5 py-1 rounded-xl">
                {reportData?.invoices?.length || 0} Registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 border-b border-slate-800 text-slate-300 text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Comprobante</th>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Cliente / Cédula</th>
                    <th className="py-2.5 px-3 text-right">Subtotal Base</th>
                    <th className="py-2.5 px-3 text-right text-purple-400">IVA (16%)</th>
                    <th className="py-2.5 px-3 text-right">Total Facturado ($)</th>
                    <th className="py-2.5 px-3 text-right">Total Facturado (Bs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {reportData?.invoices?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-400">
                        No hay facturas emitidas en este período de fechas.
                      </td>
                    </tr>
                  ) : (
                    reportData?.invoices?.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-white">
                          {inv.invoice_number}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {new Date(inv.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-white">{inv.customer_name || 'Consumidor Final'}</span>
                          {inv.customer_id_number && (
                            <span className="text-[10px] text-slate-400 block font-mono">
                              CI/RIF: {inv.customer_id_number}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                          ${inv.subtotal.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-400">
                          {inv.tax > 0 ? `+$${inv.tax.toFixed(2)}` : 'Exento'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-white">
                          ${inv.total.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                          Bs. {inv.total_bs ? inv.total_bs.toFixed(2) : (inv.total * rate).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: COBROS POR FORMA DE PAGO */}
      {activeTab === 'PAYMENTS' && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <div>
              <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Ingresos Reales por Modalidad de Cobro y Moneda</span>
              </h4>
              <p className="text-xs text-slate-400">
                Auditoría de cuánto dinero entró en efectivo dólares, bolívares, pago móvil, transferencias y tarjetas:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {reportData?.paymentsBreakdown?.map((p: any) => {
                let icon = '💵';
                let label = 'Efectivo Dólares ($)';
                let borderCol = 'border-emerald-800/80 bg-emerald-950/30';

                if (p.payment_method === 'CASH_BS') {
                  icon = '🇻🇪';
                  label = 'Efectivo Bolívares (Bs.)';
                  borderCol = 'border-teal-800/80 bg-teal-950/30';
                } else if (p.payment_method === 'PAGO_MOVIL') {
                  icon = '📲';
                  label = 'Pago Móvil (Bs.)';
                  borderCol = 'border-blue-800/80 bg-blue-950/30';
                } else if (p.payment_method === 'CARD_BS' || p.payment_method === 'CARD') {
                  icon = '💳';
                  label = 'Punto de Venta / Débito (Bs.)';
                  borderCol = 'border-indigo-800/80 bg-indigo-950/30';
                } else if (p.payment_method === 'ZELLE_USD' || p.payment_method === 'ZELLE') {
                  icon = '⚡';
                  label = 'Zelle ($)';
                  borderCol = 'border-purple-800/80 bg-purple-950/30';
                } else if (p.payment_method === 'TRANSFER_BS' || p.payment_method === 'TRANSFER') {
                  icon = '🏦';
                  label = 'Transferencia Bancaria (Bs.)';
                  borderCol = 'border-slate-700 bg-slate-800/50';
                } else if (p.payment_method === 'CREDIT') {
                  icon = '👤';
                  label = 'Ventas a Crédito (Por Cobrar)';
                  borderCol = 'border-amber-800/80 bg-amber-950/30';
                }

                return (
                  <div key={`${p.payment_method}-${p.currency}`} className={`p-4 rounded-2xl border ${borderCol} space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-slate-200 flex items-center gap-1.5">
                        <span>{icon}</span> {label}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                        {p.count} cobros
                      </span>
                    </div>
                    <div>
                      <span className="text-xl font-black text-white font-mono block">
                        ${p.total_usd.toFixed(2)}
                      </span>
                      {p.currency === 'BS' && (
                        <span className="text-xs font-bold text-slate-400 font-mono block">
                          Bs. {p.total_native.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RENTABILIDAD POR MEDICAMENTO */}
      {activeTab === 'PRODUCTS' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white text-xs">
                Medicamentos con Mayor Margen y Ganancia Neta
              </h4>
              <p className="text-[11px] text-slate-400">
                Productos ordenados por la ganancia limpia que le dejaron a la farmacia en el período
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 border-b border-slate-800 text-slate-300 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Medicamento</th>
                  <th className="py-2.5 px-3 text-center">Unidades</th>
                  <th className="py-2.5 px-3 text-right">Venta Total ($)</th>
                  <th className="py-2.5 px-3 text-right text-amber-400">Costo Total ($)</th>
                  <th className="py-2.5 px-3 text-right text-emerald-400">Ganancia Neta ($)</th>
                  <th className="py-2.5 px-3 text-center">Margen Comercial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {reportData?.topProfitableProducts?.map((prod: any, idx: number) => {
                  const marginPct = prod.total_cost > 0 
                    ? ((prod.net_profit / prod.total_cost) * 100).toFixed(0) 
                    : 100;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-white">{prod.name}</span>
                            <span className="text-[10px] text-slate-400 block">{prod.category}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-300">
                        {prod.qty_sold} und
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        ${prod.total_revenue.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-400 font-bold">
                        ${prod.total_cost.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-400">
                        +${prod.net_profit.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-800/80">
                          +{marginPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: AUDITORÍA DE FACTURAS */}
      {activeTab === 'INVOICES' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h4 className="font-bold text-white text-xs">Auditoría Completa de Facturación</h4>
            <span className="text-xs text-slate-400 font-mono">
              Total en ventas: ${totalRev.toFixed(2)} / Bs. {(totalRev * rate).toFixed(2)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 border-b border-slate-800 text-slate-300 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Comprobante</th>
                  <th className="py-2.5 px-4">Fecha / Hora</th>
                  <th className="py-2.5 px-4">Cliente</th>
                  <th className="py-2.5 px-4">Cajero</th>
                  <th className="py-2.5 px-4">Método</th>
                  <th className="py-2.5 px-4 text-right">IVA</th>
                  <th className="py-2.5 px-4 text-right">Total ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {reportData?.invoices?.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-400">{inv.invoice_number}</td>
                    <td className="py-2.5 px-4 text-slate-400">{new Date(inv.created_at).toLocaleString()}</td>
                    <td className="py-2.5 px-4 font-semibold text-white">{inv.customer_name || 'Consumidor Final'}</td>
                    <td className="py-2.5 px-4 text-slate-300">{inv.employee_name || 'Cajero'}</td>
                    <td className="py-2.5 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0f172a] border border-slate-700 text-slate-300 uppercase">
                        {inv.payment_method}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-400">
                      {inv.tax > 0 ? `$${inv.tax.toFixed(2)}` : 'Exento'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-white">
                      ${inv.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
