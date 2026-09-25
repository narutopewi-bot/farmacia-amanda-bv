import React, { useState, useEffect } from 'react';
import { 
  Package, DollarSign, TrendingUp, AlertTriangle, 
  Award, Archive, RefreshCw, Printer, Search, 
  ArrowLeft, Layers, Calendar, CheckCircle2, 
  ArrowUpRight, AlertCircle, ShieldAlert, Sparkles,
  BarChart3, ArrowDownRight, Warehouse
} from 'lucide-react';

interface InventoryReportData {
  summary: {
    total_products: number;
    total_units: number;
    valuation_cost_usd: number;
    valuation_cost_bs: number;
    valuation_retail_usd: number;
    valuation_retail_bs: number;
    projected_profit_usd: number;
    projected_profit_bs: number;
    margin_percentage: string;
    low_stock_count: number;
    out_of_stock_count: number;
    dead_stock_count: number;
    bcv_rate: number;
  };
  low_stock_items: Array<{
    id: number;
    code: string;
    name: string;
    generic_name?: string;
    category?: string;
    presentation?: string;
    laboratory?: string;
    min_stock: number;
    cost_price: number;
    selling_price: number;
    warehouse_location?: string;
    total_stock: number;
    stock_status: 'OUT' | 'LOW';
  }>;
  top_sellers: Array<{
    id: number;
    code: string;
    name: string;
    generic_name?: string;
    category?: string;
    presentation?: string;
    selling_price: number;
    cost_price: number;
    total_units_sold: number;
    total_revenue_usd: number;
    current_stock: number;
  }>;
  dead_stock: Array<{
    id: number;
    code: string;
    name: string;
    generic_name?: string;
    category?: string;
    presentation?: string;
    laboratory?: string;
    cost_price: number;
    selling_price: number;
    warehouse_location?: string;
    current_stock: number;
    locked_capital_usd: number;
  }>;
  categories: Array<{
    category: string;
    products_count: number;
    units_count: number;
    cost_usd: number;
    retail_usd: number;
  }>;
  expiring_batches: Array<{
    id: number;
    batch_number: string;
    expiry_date: string;
    stock: number;
    cost_price: number;
    product_id: number;
    product_name: string;
    product_code: string;
    category?: string;
    status: 'EXPIRED' | 'EXPIRING';
  }>;
}

interface Props {
  onBack: () => void;
}

export const InventoryReportView: React.FC<Props> = ({ onBack }) => {
  const [data, setData] = useState<InventoryReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LOW_STOCK' | 'TOP_SELLERS' | 'DEAD_STOCK' | 'CATEGORIES' | 'EXPIRIES'>('OVERVIEW');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchInventoryReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/inventory');
      if (!res.ok) throw new Error('Error al cargar reporte de inventario');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching inventory report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryReport();
  }, []);

  const summary = data?.summary || {
    total_products: 0,
    total_units: 0,
    valuation_cost_usd: 0,
    valuation_cost_bs: 0,
    valuation_retail_usd: 0,
    valuation_retail_bs: 0,
    projected_profit_usd: 0,
    projected_profit_bs: 0,
    margin_percentage: '0.0',
    low_stock_count: 0,
    out_of_stock_count: 0,
    dead_stock_count: 0,
    bcv_rate: 85.0
  };

  const bcvRate = summary.bcv_rate || 85.0;

  // Filter lists based on search
  const term = searchTerm.toLowerCase().trim();

  const filteredLowStock = (data?.low_stock_items || []).filter(item => 
    !term || 
    item.name.toLowerCase().includes(term) || 
    item.code.toLowerCase().includes(term) || 
    (item.category && item.category.toLowerCase().includes(term))
  );

  const filteredTopSellers = (data?.top_sellers || []).filter(item => 
    !term || 
    item.name.toLowerCase().includes(term) || 
    item.code.toLowerCase().includes(term)
  );

  const filteredDeadStock = (data?.dead_stock || []).filter(item => 
    !term || 
    item.name.toLowerCase().includes(term) || 
    item.code.toLowerCase().includes(term) ||
    (item.category && item.category.toLowerCase().includes(term))
  );

  const filteredCategories = (data?.categories || []).filter(cat =>
    !term || (cat.category || 'Sin categoría').toLowerCase().includes(term)
  );

  const filteredExpiring = (data?.expiring_batches || []).filter(b =>
    !term || 
    b.product_name.toLowerCase().includes(term) || 
    b.batch_number.toLowerCase().includes(term)
  );

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition shadow-sm cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Volver a la lista de reportes"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Volver a Reportes</span>
          </button>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#006837] text-white shadow-md text-base">
                📦
              </span>
              <span>Reporte de Inventario y Existencias</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Valoración a precio costo y venta, rotación de artículos, stock crítico y capital inmovilizado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInventoryReport}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
            title="Refrescar reporte"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-[#006837] hover:bg-[#00522c] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-900/20 transition active:scale-95 cursor-pointer"
            title="Imprimir informe de inventario o guardar en PDF"
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
            <p className="text-xs font-bold text-slate-800 mt-1 uppercase tracking-wider">
              INFORME EJECUTIVO DE VALORACIÓN DE INVENTARIO Y ROTACIÓN
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-mono font-bold">Fecha de Emisión: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
            <p className="text-slate-600">Tasa Oficial BCV: Bs. {bcvRate.toFixed(2)}</p>
            <p className="text-slate-600 font-bold">Total Artículos: {summary.total_products} | Unidades Físicas: {summary.total_units}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards: Resumen de Capital y Existencias */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Artículos y Unidades */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider">Catálogo y Stock</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{summary.total_products}</span>
            <span className="text-xs text-slate-400 font-bold">artículos reg.</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Unidades en existencias:</span>
            <span className="font-extrabold text-blue-400">{summary.total_units.toLocaleString()} und.</span>
          </div>
        </div>

        {/* Capital a Precio Costo */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider">Capital a Precio Costo</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-400">${summary.valuation_cost_usd.toFixed(2)}</span>
            <span className="text-[11px] text-slate-500 font-bold">USD</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Equivalente BCV:</span>
            <span className="font-extrabold text-slate-200">Bs. {summary.valuation_cost_bs.toFixed(2)}</span>
          </div>
        </div>

        {/* Capital a Precio Venta */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider">Capital a Precio Venta</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-400">${summary.valuation_retail_usd.toFixed(2)}</span>
            <span className="text-[11px] text-slate-500 font-bold">USD</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Equivalente BCV:</span>
            <span className="font-extrabold text-slate-200">Bs. {summary.valuation_retail_bs.toFixed(2)}</span>
          </div>
        </div>

        {/* Margen y Ganancia Proyectada */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider">Margen y Ganancia Est.</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-400">${summary.projected_profit_usd.toFixed(2)}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-extrabold">
              {summary.margin_percentage}%
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Ganancia en Bolívares:</span>
            <span className="font-extrabold text-slate-200">Bs. {summary.projected_profit_bs.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Mini Alert Cards (Poco stock, Huesos, Vencimientos) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
        <button
          onClick={() => setActiveTab('LOW_STOCK')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
            activeTab === 'LOW_STOCK'
              ? 'bg-amber-950/40 border-amber-600 text-amber-200 shadow-sm'
              : 'bg-slate-900/70 border-slate-800 hover:border-amber-600/50 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold">Poco Stock / Agotados</p>
              <p className="text-[11px] text-slate-400">{summary.low_stock_count} artículos requieren reposición</p>
            </div>
          </div>
          <span className="text-lg font-black text-amber-400">{summary.low_stock_count}</span>
        </button>

        <button
          onClick={() => setActiveTab('TOP_SELLERS')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
            activeTab === 'TOP_SELLERS'
              ? 'bg-emerald-950/40 border-emerald-600 text-emerald-200 shadow-sm'
              : 'bg-slate-900/70 border-slate-800 hover:border-emerald-600/50 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold">Más Vendidos (Top)</p>
              <p className="text-[11px] text-slate-400">Mayor rotación comercial</p>
            </div>
          </div>
          <span className="text-lg font-black text-emerald-400">{data?.top_sellers?.length || 0}</span>
        </button>

        <button
          onClick={() => setActiveTab('DEAD_STOCK')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
            activeTab === 'DEAD_STOCK'
              ? 'bg-rose-950/40 border-rose-600 text-rose-200 shadow-sm'
              : 'bg-slate-900/70 border-slate-800 hover:border-rose-600/50 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/15 text-rose-400">
              <Archive className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold">Sin Rotación ("Huesos")</p>
              <p className="text-[11px] text-slate-400">{summary.dead_stock_count} artículos con 0 ventas</p>
            </div>
          </div>
          <span className="text-lg font-black text-rose-400">{summary.dead_stock_count}</span>
        </button>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-2xl border border-slate-800 print:hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'bg-[#006837] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            📊 Resumen General
          </button>

          <button
            onClick={() => setActiveTab('LOW_STOCK')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'LOW_STOCK'
                ? 'bg-[#006837] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            ⚠️ Poco Stock / Agotados
            {summary.low_stock_count > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black rounded-full text-[10px]">
                {summary.low_stock_count}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('TOP_SELLERS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'TOP_SELLERS'
                ? 'bg-[#006837] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            🏆 Más Vendidos
          </button>

          <button
            onClick={() => setActiveTab('DEAD_STOCK')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'DEAD_STOCK'
                ? 'bg-[#006837] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            🛑 Sin Ventas ("Huesos")
          </button>

          <button
            onClick={() => setActiveTab('CATEGORIES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'CATEGORIES'
                ? 'bg-[#006837] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            🏷️ Por Categorías
          </button>

          <button
            onClick={() => setActiveTab('EXPIRIES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'EXPIRIES'
                ? 'bg-[#006837] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            ⏰ Lotes por Vencer
          </button>
        </div>

        {/* Quick Search in Report */}
        <div className="relative min-w-[200px] sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar medicamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-850 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Tab 1: OVERVIEW (Resumen Ejecutivo Completo) */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Executive Balance Breakdown */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-md">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Balance de Valoración Económica y Rentabilidad</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                <span className="text-xs text-slate-400 font-bold">Costo Total de Reposición</span>
                <p className="text-xl font-black text-amber-400 mt-1">${summary.valuation_cost_usd.toFixed(2)}</p>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">Bs. {summary.valuation_cost_bs.toFixed(2)}</p>
                <p className="text-[11px] text-slate-500 mt-2">Capital neto que tienes invertido en la botica.</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                <span className="text-xs text-slate-400 font-bold">Valor Estimado a la Venta</span>
                <p className="text-xl font-black text-emerald-400 mt-1">${summary.valuation_retail_usd.toFixed(2)}</p>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">Bs. {summary.valuation_retail_bs.toFixed(2)}</p>
                <p className="text-[11px] text-slate-500 mt-2">Ingreso bruto al vender la totalidad del stock actual.</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-850 border border-slate-800">
                <span className="text-xs text-slate-400 font-bold">Ganancia Bruta Proyectada</span>
                <p className="text-xl font-black text-purple-400 mt-1">${summary.projected_profit_usd.toFixed(2)}</p>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">Bs. {summary.projected_profit_bs.toFixed(2)}</p>
                <p className="text-[11px] text-purple-300 mt-2 font-bold">Margen comercial global: {summary.margin_percentage}%</p>
              </div>
            </div>
          </div>

          {/* Top 5 Best Sellers Preview & Top 5 Low Stock Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Top 5 Vendidos */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>Artículos con Mayor Venta</span>
                </h4>
                <button
                  onClick={() => setActiveTab('TOP_SELLERS')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                >
                  Ver todos →
                </button>
              </div>

              <div className="space-y-2">
                {(data?.top_sellers || []).slice(0, 5).map((item, idx) => (
                  <div key={item.id} className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-black text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-extrabold text-white">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{item.code} {item.presentation ? `• ${item.presentation}` : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-emerald-400">{item.total_units_sold} vendidos</span>
                      <p className="text-[10px] text-slate-400">${item.total_revenue_usd.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                {(data?.top_sellers || []).length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No hay datos de ventas registrados aún.</p>
                )}
              </div>
            </div>

            {/* Top 5 Poco Stock */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Artículos con Poco Stock o Agotados</span>
                </h4>
                <button
                  onClick={() => setActiveTab('LOW_STOCK')}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                >
                  Ver todos →
                </button>
              </div>

              <div className="space-y-2">
                {(data?.low_stock_items || []).slice(0, 5).map((item) => (
                  <div key={item.id} className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-extrabold text-white">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {item.code} • Mínimo req: {item.min_stock} und.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        item.total_stock <= 0
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-800'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-800'
                      }`}>
                        {item.total_stock <= 0 ? 'AGOTADO' : `${item.total_stock} und.`}
                      </span>
                      {item.warehouse_location && (
                        <p className="text-[10px] text-slate-400 mt-0.5">Ubic: {item.warehouse_location}</p>
                      )}
                    </div>
                  </div>
                ))}
                {(data?.low_stock_items || []).length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">Excelente: no hay artículos con stock crítico.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tab 2: LOW_STOCK (Poco Stock / Agotados) */}
      {activeTab === 'LOW_STOCK' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Artículos que requieren Reabastecimiento Urgente</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Medicamentos cuyo stock actual es menor o igual a la cantidad mínima de seguridad fijada.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              Total listados: {filteredLowStock.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Código</th>
                  <th className="py-2.5 px-3">Artículo / Medicamento</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3 text-center">Stock Actual</th>
                  <th className="py-2.5 px-3 text-center">Stock Mínimo</th>
                  <th className="py-2.5 px-3 text-right">Costo ($)</th>
                  <th className="py-2.5 px-3 text-right">Precio Venta ($)</th>
                  <th className="py-2.5 px-3 text-center">Ubicación</th>
                  <th className="py-2.5 px-3 rounded-r-lg text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredLowStock.map(item => (
                  <tr key={item.id} className="hover:bg-slate-850/60 transition">
                    <td className="py-2 px-3 font-mono font-bold text-slate-300">{item.code}</td>
                    <td className="py-2 px-3">
                      <p className="font-extrabold text-white">{item.name}</p>
                      {item.generic_name && (
                        <p className="text-[10px] text-slate-400">{item.generic_name}</p>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-300">{item.category || 'General'}</td>
                    <td className="py-2 px-3 text-center font-extrabold">
                      <span className={item.total_stock <= 0 ? 'text-rose-400' : 'text-amber-400'}>
                        {item.total_stock}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center text-slate-400 font-mono">{item.min_stock}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">${item.cost_price.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-400 font-extrabold">${item.selling_price.toFixed(2)}</td>
                    <td className="py-2 px-3 text-center text-slate-400">{item.warehouse_location || 'Estante'}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        item.stock_status === 'OUT'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-800'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-800'
                      }`}>
                        {item.stock_status === 'OUT' ? 'Agotado' : 'Bajo'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredLowStock.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-500">
                      No se encontraron artículos con bajo stock para el filtro actual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: TOP_SELLERS (Más Vendidos) */}
      {activeTab === 'TOP_SELLERS' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Ranking de Artículos Más Vendidos (Mayor Rotación)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Productos con mayor volumen de salida y recaudación de ingresos.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              Total: {filteredTopSellers.length} artículos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg text-center">Puesto</th>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Medicamento / Artículo</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3 text-center">Unid. Vendidas</th>
                  <th className="py-2.5 px-3 text-right">Precio Venta</th>
                  <th className="py-2.5 px-3 text-right">Recaudación USD</th>
                  <th className="py-2.5 px-3 text-right">Recaudación Bs.</th>
                  <th className="py-2.5 px-3 rounded-r-lg text-center">Stock Actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredTopSellers.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-850/60 transition">
                    <td className="py-2 px-3 text-center font-black">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-400">{item.code}</td>
                    <td className="py-2 px-3">
                      <p className="font-extrabold text-white">{item.name}</p>
                      {item.presentation && (
                        <p className="text-[10px] text-slate-400">{item.presentation}</p>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-300">{item.category || 'General'}</td>
                    <td className="py-2 px-3 text-center font-extrabold text-emerald-400 text-sm">
                      {item.total_units_sold}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">${item.selling_price.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-mono font-extrabold text-emerald-400">
                      ${item.total_revenue_usd.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">
                      Bs. {(item.total_revenue_usd * bcvRate).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.current_stock <= 5 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {item.current_stock} und.
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredTopSellers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-500">
                      No hay artículos vendidos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: DEAD_STOCK (Sin Rotación / "Huesos") */}
      {activeTab === 'DEAD_STOCK' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Archive className="w-4 h-4 text-rose-400" />
                <span>Artículos Sin Ventas ("Huesos" y Capital Inmovilizado)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Medicamentos registrados que tienen 0 unidades vendidas, ocupan espacio y representan dinero estancado.
              </p>
            </div>
            <span className="text-xs font-bold text-rose-400">
              {filteredDeadStock.length} artículos inmovilizados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Código</th>
                  <th className="py-2.5 px-3">Artículo / Medicamento</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3 text-center">Stock Actual</th>
                  <th className="py-2.5 px-3 text-right">Costo Unit. ($)</th>
                  <th className="py-2.5 px-3 text-right">Precio Venta ($)</th>
                  <th className="py-2.5 px-3 text-right">Dinero Estancado ($)</th>
                  <th className="py-2.5 px-3 text-right">Dinero Estancado (Bs.)</th>
                  <th className="py-2.5 px-3 rounded-r-lg text-center">Ubicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredDeadStock.map(item => (
                  <tr key={item.id} className="hover:bg-slate-850/60 transition">
                    <td className="py-2 px-3 font-mono text-slate-400">{item.code}</td>
                    <td className="py-2 px-3">
                      <p className="font-extrabold text-white">{item.name}</p>
                      {item.laboratory && (
                        <p className="text-[10px] text-slate-400">Lab: {item.laboratory}</p>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-300">{item.category || 'General'}</td>
                    <td className="py-2 px-3 text-center font-bold text-slate-200">
                      {item.current_stock} und.
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">${item.cost_price.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">${item.selling_price.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-mono font-black text-rose-400">
                      ${item.locked_capital_usd.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">
                      Bs. {(item.locked_capital_usd * bcvRate).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center text-slate-400">{item.warehouse_location || 'Depósito'}</td>
                  </tr>
                ))}
                {filteredDeadStock.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-500">
                      Excelente: todos los artículos registrados han tenido rotación.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: CATEGORIES (Valoración por Categorías) */}
      {activeTab === 'CATEGORIES' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Distribución y Valoración por Categorías Farmacéuticas</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cuánto dinero y cuántas existencias tienes en cada línea de producto.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {filteredCategories.length} categorías registradas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Categoría</th>
                  <th className="py-2.5 px-3 text-center">Variedad de Artículos</th>
                  <th className="py-2.5 px-3 text-center">Unidades Totales</th>
                  <th className="py-2.5 px-3 text-right">Inversión a Costo ($)</th>
                  <th className="py-2.5 px-3 text-right">Inversión a Costo (Bs.)</th>
                  <th className="py-2.5 px-3 text-right">Proyección Venta ($)</th>
                  <th className="py-2.5 px-3 rounded-r-lg text-center">% del Inventario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredCategories.map(cat => {
                  const pct = summary.valuation_cost_usd > 0
                    ? ((cat.cost_usd / summary.valuation_cost_usd) * 100).toFixed(1)
                    : '0.0';

                  return (
                    <tr key={cat.category || 'Sin categoría'} className="hover:bg-slate-850/60 transition">
                      <td className="py-2.5 px-3 font-extrabold text-white">
                        {cat.category || 'Sin Categoría Asignada'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-300">
                        {cat.products_count}
                      </td>
                      <td className="py-2.5 px-3 text-center font-extrabold text-blue-400">
                        {cat.units_count.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                        ${cat.cost_usd.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        Bs. {(cat.cost_usd * bcvRate).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        ${cat.retail_usd.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, Number(pct))}%` }}></div>
                          </div>
                          <span className="font-mono text-[10px] text-slate-300 font-bold">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredCategories.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      No hay categorías para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: EXPIRIES (Lotes Próximos a Vencer) */}
      {activeTab === 'EXPIRIES' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Lotes Próximos a Vencer (&lt; 60 Días) o Vencidos</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Control preventivo de fechas de caducidad para evitar mermas o pérdidas en farmacia.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {filteredExpiring.length} lotes en observación
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">N° Lote</th>
                  <th className="py-2.5 px-3">Artículo / Medicamento</th>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3 text-center">Fecha Caducidad</th>
                  <th className="py-2.5 px-3 text-center">Unidades Afectadas</th>
                  <th className="py-2.5 px-3 text-right">Costo en Riesgo ($)</th>
                  <th className="py-2.5 px-3 rounded-r-lg text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredExpiring.map(batch => (
                  <tr key={batch.id} className="hover:bg-slate-850/60 transition">
                    <td className="py-2 px-3 font-mono font-bold text-slate-300">{batch.batch_number}</td>
                    <td className="py-2 px-3 font-extrabold text-white">{batch.product_name}</td>
                    <td className="py-2 px-3 font-mono text-slate-400">{batch.product_code}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-300">{batch.expiry_date}</td>
                    <td className="py-2 px-3 text-center font-extrabold text-amber-400">{batch.stock} und.</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-rose-400">
                      ${(batch.stock * batch.cost_price).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        batch.status === 'EXPIRED'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-800'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-800'
                      }`}>
                        {batch.status === 'EXPIRED' ? 'Vencido' : 'Próximo a Vencer'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredExpiring.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      Excelente: no hay lotes vencidos ni por vencer en los próximos 60 días.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Tables Section (Rendered when user prints the entire report) */}
      <div className="hidden print:block space-y-6 text-slate-900 text-xs">
        <div>
          <h3 className="font-black text-sm uppercase border-b border-slate-900 pb-1 mb-2">
            1. Resumen de Valoración y Capital
          </h3>
          <table className="w-full border-collapse border border-slate-400 text-left text-xs mb-4">
            <tbody>
              <tr className="border-b border-slate-300">
                <td className="p-2 font-bold bg-slate-100 w-1/3">Total Artículos Registrados:</td>
                <td className="p-2">{summary.total_products} productos</td>
                <td className="p-2 font-bold bg-slate-100 w-1/3">Total Unidades Físicas:</td>
                <td className="p-2">{summary.total_units} und.</td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="p-2 font-bold bg-slate-100">Capital a Precio Costo:</td>
                <td className="p-2 font-bold">${summary.valuation_cost_usd.toFixed(2)} (Bs. {summary.valuation_cost_bs.toFixed(2)})</td>
                <td className="p-2 font-bold bg-slate-100">Capital a Precio Venta:</td>
                <td className="p-2 font-bold">${summary.valuation_retail_usd.toFixed(2)} (Bs. {summary.valuation_retail_bs.toFixed(2)})</td>
              </tr>
              <tr>
                <td className="p-2 font-bold bg-slate-100">Ganancia Proyectada:</td>
                <td className="p-2 font-bold text-slate-900">${summary.projected_profit_usd.toFixed(2)} (Bs. {summary.projected_profit_bs.toFixed(2)})</td>
                <td className="p-2 font-bold bg-slate-100">Margen Comercial Estimado:</td>
                <td className="p-2 font-bold">{summary.margin_percentage}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="font-black text-sm uppercase border-b border-slate-900 pb-1 mb-2">
            2. Artículos con Poco Stock o Agotados ({data?.low_stock_items?.length || 0})
          </h3>
          <table className="w-full border-collapse border border-slate-400 text-left text-[10px]">
            <thead>
              <tr className="bg-slate-200">
                <th className="p-1 border border-slate-400">Código</th>
                <th className="p-1 border border-slate-400">Artículo</th>
                <th className="p-1 border border-slate-400 text-center">Stock</th>
                <th className="p-1 border border-slate-400 text-center">Mínimo</th>
                <th className="p-1 border border-slate-400 text-right">P. Venta</th>
                <th className="p-1 border border-slate-400 text-center">Ubicación</th>
              </tr>
            </thead>
            <tbody>
              {(data?.low_stock_items || []).slice(0, 20).map(item => (
                <tr key={item.id} className="border-b border-slate-300">
                  <td className="p-1 font-mono">{item.code}</td>
                  <td className="p-1 font-bold">{item.name}</td>
                  <td className="p-1 text-center font-bold">{item.total_stock}</td>
                  <td className="p-1 text-center">{item.min_stock}</td>
                  <td className="p-1 text-right font-mono">${item.selling_price.toFixed(2)}</td>
                  <td className="p-1 text-center">{item.warehouse_location || 'Estante'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="font-black text-sm uppercase border-b border-slate-900 pb-1 mb-2">
            3. Top Artículos Más Vendidos ({data?.top_sellers?.length || 0})
          </h3>
          <table className="w-full border-collapse border border-slate-400 text-left text-[10px]">
            <thead>
              <tr className="bg-slate-200">
                <th className="p-1 border border-slate-400">Código</th>
                <th className="p-1 border border-slate-400">Artículo</th>
                <th className="p-1 border border-slate-400 text-center">Vendidos</th>
                <th className="p-1 border border-slate-400 text-right">Total USD</th>
                <th className="p-1 border border-slate-400 text-center">Stock Actual</th>
              </tr>
            </thead>
            <tbody>
              {(data?.top_sellers || []).slice(0, 15).map(item => (
                <tr key={item.id} className="border-b border-slate-300">
                  <td className="p-1 font-mono">{item.code}</td>
                  <td className="p-1 font-bold">{item.name}</td>
                  <td className="p-1 text-center font-bold">{item.total_units_sold}</td>
                  <td className="p-1 text-right font-mono">${item.total_revenue_usd.toFixed(2)}</td>
                  <td className="p-1 text-center">{item.current_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
