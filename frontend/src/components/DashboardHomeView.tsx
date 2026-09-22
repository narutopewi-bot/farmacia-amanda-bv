import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Package, AlertTriangle, Users, CreditCard,
  Landmark, ShoppingCart, BarChart3, Store, ArrowUpRight,
  RefreshCw, CheckCircle2, DollarSign, Clock, ShieldCheck,
  ChevronRight, Sparkles, ExternalLink, Calendar, Layers
} from 'lucide-react';
import { Settings, Employee } from '../types';

interface DashboardHomeViewProps {
  onNavigateTab: (tab: any) => void;
  settings?: Settings | null;
  currentUser?: Employee | null;
}

interface DashboardData {
  kpis: {
    inventoryCount: number;
    inventoryUnits: number;
    lowStockCount: number;
    monthSalesUsd: number;
    monthSalesBs: number;
    monthSalesCount: number;
    avgTicketUsd: number;
    pendingCreditsUsd: number;
    debtorsCount: number;
    totalCustomers: number;
    exchangeRate: number;
  };
  pnl: {
    grossRevenue: number;
    cogs: number;
    tax: number;
    netRevenue: number;
    netProfit: number;
    grossMarginPct: number;
    netMarginPct: number;
  };
  cashReconciliation: {
    status: 'OPEN' | 'CLOSED';
    registerId: number | null;
    employeeName: string;
    openedAt: string | null;
    openingBalance: number;
    cashSales: number;
    incomes: number;
    expenses: number;
    expectedCashUsd: number;
    expectedCashBs: number;
  };
  salesMetrics: {
    cashCollected: number;
    pendingReceivables: number;
    avgTicket: number;
    totalTransactions: number;
  };
  timeline: Array<{
    date: string;
    label: string;
    ventas: number;
    credito: number;
    clientes: number;
    inventario: number;
  }>;
  alerts: {
    lowStock: Array<{
      id: number;
      code: string;
      name: string;
      category: string;
      presentation?: string;
      min_stock: number;
      selling_price: number;
      current_stock: number;
    }>;
    expiringBatches: Array<{
      id: number;
      batch_number: string;
      expiry_date: string;
      stock: number;
      product_id: number;
      product_name: string;
      category: string;
      days_left: number;
    }>;
    pendingOrders: Array<{
      id: number;
      order_number: string;
      customer_name: string;
      customer_phone: string;
      delivery_type: string;
      payment_method: string;
      total: number;
      created_at: string;
      items_count: number;
    }>;
  };
}

export const DashboardHomeView: React.FC<DashboardHomeViewProps> = ({
  onNavigateTab,
  settings,
  currentUser
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [chartTab, setChartTab] = useState<'VENTAS' | 'CRÉDITO' | 'CLIENTES' | 'INVENTARIO'>('VENTAS');
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/overview');
      if (!res.ok) throw new Error('Error al cargar métricas ejecutivas');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching dashboard overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-500 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[#006837]" />
        <p className="text-sm font-semibold">Cargando métricas de la farmacia en tiempo real...</p>
      </div>
    );
  }

  const rawKpi = (data as any)?.kpis || (data as any)?.kpi || {};
  const kpis = {
    inventoryCount: rawKpi.inventoryCount || 0,
    inventoryUnits: rawKpi.inventoryUnits || 0,
    lowStockCount: rawKpi.lowStockCount || (data as any)?.alerts?.lowStockCount || (data as any)?.alerts?.lowStockList?.length || 0,
    monthSalesUsd: Number(rawKpi.monthSalesUsd || 0),
    monthSalesBs: Number(rawKpi.monthSalesBs || 0),
    monthSalesCount: Number(rawKpi.monthSalesCount || 0),
    avgTicketUsd: Number(rawKpi.avgTicketUsd || rawKpi.avgTicket || 0),
    pendingCreditsUsd: Number(rawKpi.pendingCreditsUsd || 0),
    debtorsCount: rawKpi.debtorsCount || 0,
    totalCustomers: rawKpi.totalCustomers || 0,
    exchangeRate: Number(rawKpi.exchangeRate || rawKpi.rate || settings?.exchange_rate || 85.0)
  };

  const pnl = data?.pnl || {
    grossRevenue: 0,
    cogs: 0,
    tax: 0,
    netRevenue: 0,
    netProfit: 0,
    grossMarginPct: 0,
    netMarginPct: 0
  };

  const cash = data?.cashReconciliation || {
    status: 'CLOSED',
    registerId: null,
    employeeName: 'Sin Asignar',
    openedAt: null,
    openingBalance: 0,
    cashSales: 0,
    incomes: 0,
    expenses: 0,
    expectedCashUsd: 0,
    expectedCashBs: 0
  };

  const rawTimeline = (data as any)?.timeline || (data as any)?.timelineDays || [];
  const timeline: Array<{
    date: string;
    label: string;
    ventas: number;
    credito: number;
    clientes: number;
    inventario: number;
  }> = rawTimeline.map((d: any) => ({
    date: d.date || `Día ${d.day}`,
    label: d.label || `Día ${d.day}`,
    ventas: Number(d.ventas !== undefined ? d.ventas : d.sales || 0),
    credito: Number(d.credito !== undefined ? d.credito : d.credit || 0),
    clientes: Number(d.clientes !== undefined ? d.clientes : d.clients || 0),
    inventario: Number(d.inventario !== undefined ? d.inventario : d.inventory || 0)
  }));

  const rawAlerts = (data as any)?.alerts || {};
  const alerts = {
    lowStock: (rawAlerts.lowStock || rawAlerts.lowStockList || []).map((p: any) => ({
      id: p.id,
      code: p.code || '',
      name: p.name || '',
      category: p.category || 'General',
      min_stock: p.min_stock || 5,
      selling_price: p.selling_price || 0,
      current_stock: p.current_stock !== undefined ? p.current_stock : p.total_stock || 0
    })),
    expiringBatches: (rawAlerts.expiringBatches || rawAlerts.expiringBatchesList || []).map((b: any) => {
      const daysLeft = b.days_left !== undefined 
        ? b.days_left 
        : Math.round((new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: b.id,
        batch_number: b.batch_number || '',
        expiry_date: b.expiry_date || '',
        stock: b.stock || 0,
        product_id: b.product_id || 0,
        product_name: b.product_name || '',
        category: b.category || 'General',
        days_left: daysLeft
      };
    }),
    pendingOrders: (rawAlerts.pendingOrders || rawAlerts.pendingOrdersList || []).map((o: any) => ({
      id: o.id,
      order_number: o.order_number || '',
      customer_name: o.customer_name || '',
      customer_phone: o.customer_phone || '',
      delivery_type: o.delivery_type || 'DELIVERY',
      payment_method: o.payment_method || 'PAGO_MOVIL',
      total: o.total || 0,
      created_at: o.created_at || '',
      items_count: o.items_count || 1
    }))
  };

  // Chart data calculations
  const chartValues = timeline.map((d: any) => {
    if (chartTab === 'VENTAS') return d.ventas;
    if (chartTab === 'CRÉDITO') return d.credito;
    if (chartTab === 'CLIENTES') return d.clientes;
    return d.inventario;
  });

  const maxVal = Math.max(...chartValues, 10);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  // Generate SVG points for smooth area curve
  const svgWidth = 800;
  const svgHeight = 240;
  const paddingX = 40;
  const paddingY = 25;
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;

  const points = timeline.map((item: any, idx: number) => {
    const val = chartValues[idx] || 0;
    const x = paddingX + (idx / Math.max(timeline.length - 1, 1)) * chartW;
    const y = svgHeight - paddingY - ((val - minVal) / range) * chartH;
    return { x, y, item, val };
  });

  const polylineStr = points.map((p: any) => `${p.x},${p.y}`).join(' ');
  const areaPathStr = points.length > 0
    ? `M ${points[0].x} ${svgHeight - paddingY} ` +
      points.map((p: any) => `L ${p.x} ${p.y}`).join(' ') +
      ` L ${points[points.length - 1].x} ${svgHeight - paddingY} Z`
    : '';

  // Donut SVG parameters
  const donutRadius = 55;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const netProfitPct = Math.max(0, Math.min(100, pnl.netMarginPct));
  const cogsPct = pnl.grossRevenue > 0 ? Math.min(100, (pnl.cogs / pnl.grossRevenue) * 100) : 0;
  const taxPct = pnl.grossRevenue > 0 ? Math.min(100, (pnl.tax / pnl.grossRevenue) * 100) : 0;

  const profitStroke = (netProfitPct / 100) * donutCircumference;
  const cogsStroke = (cogsPct / 100) * donutCircumference;
  const taxStroke = (taxPct / 100) * donutCircumference;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Top Banner: Welcome + Live Status + Exchange Rate */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#004725] rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-700/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              En Vivo &bull; Sistema Operativo
            </span>
            <span className="text-xs text-slate-300 font-medium">
              {new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Torre de Control & Panel Ejecutivo
          </h1>
          <p className="text-xs text-slate-300">
            {settings?.pharmacy_name || 'Expendio de Medicinas Amanda B&V C.A.'} &bull; RIF: {settings?.rif || 'J-40192841-0'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Exchange Rate Card */}
          <div className="px-3.5 py-2 rounded-xl bg-slate-950/60 border border-slate-700 text-right">
            <div className="text-[10px] uppercase font-extrabold text-slate-400">Tasa Oficial BCV</div>
            <div className="text-sm sm:text-base font-black text-amber-400">
              $1 = Bs. {kpis.exchangeRate.toFixed(2)}
            </div>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={fetchDashboardData}
            title="Actualizar datos en vivo"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 transition cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 1. TOP COMMAND KPI CARDS (Matches media_1789988969479.png) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1: Inventario */}
        <div 
          onClick={() => onNavigateTab('inventory')}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 text-white transition-all shadow-sm hover:shadow-md cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Package className="w-4 h-4" />
              Inventario
            </span>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{kpis.inventoryCount}</span>
            <span className="text-xs text-slate-400 font-semibold">medicamentos</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
            <span className="text-slate-400 font-medium">{kpis.inventoryUnits} unidades totales</span>
            {kpis.lowStockCount > 0 ? (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                ⚠️ {kpis.lowStockCount} bajo stock
              </span>
            ) : (
              <span className="text-emerald-400 font-bold">✓ Stock óptimo</span>
            )}
          </div>
        </div>

        {/* KPI 2: Ventas */}
        <div 
          onClick={() => onNavigateTab('reports')}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 text-white transition-all shadow-sm hover:shadow-md cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              Ventas
            </span>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">${kpis.monthSalesUsd.toFixed(2)}</span>
            <span className="text-xs text-emerald-400 font-bold">USD</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
            <span className="text-slate-400 font-medium">Bs. {kpis.monthSalesBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold">
              {kpis.monthSalesCount} tickets
            </span>
          </div>
        </div>

        {/* KPI 3: Crédito */}
        <div 
          onClick={() => onNavigateTab('credits')}
          className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-4 text-white transition-all shadow-sm hover:shadow-md cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" />
              Crédito
            </span>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-transform group-hover:translate-x-0.5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">${kpis.pendingCreditsUsd.toFixed(2)}</span>
            <span className="text-xs text-slate-400 font-semibold">por cobrar</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
            <span className="text-slate-400 font-medium">Cuentas corrientes</span>
            <span className="px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-bold">
              {kpis.debtorsCount} deudores
            </span>
          </div>
        </div>

        {/* KPI 4: Clientes */}
        <div 
          onClick={() => onNavigateTab('customers')}
          className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-4 text-white transition-all shadow-sm hover:shadow-md cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Clientes
            </span>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-transform group-hover:translate-x-0.5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{kpis.totalCustomers}</span>
            <span className="text-xs text-slate-400 font-semibold">registrados</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
            <span className="text-slate-400 font-medium">Ticket prom: ${kpis.avgTicketUsd.toFixed(2)}</span>
            <span className="text-purple-300 font-bold">Activos</span>
          </div>
        </div>

      </div>

      {/* 2. MIDDLE SECTION: HISTORICAL AREA CHART + P&L MARGINS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Area Chart: Evolución de Métricas Históricas */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Evolución de Métricas Históricas
                </h3>
                <p className="text-xs text-slate-400">Tendencia de actividad por día del período</p>
              </div>

              {/* Chart Tabs */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start">
                {(['VENTAS', 'CRÉDITO', 'CLIENTES', 'INVENTARIO'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setChartTab(tab)}
                    className={`px-3 py-1 text-[11px] font-black rounded-lg transition cursor-pointer ${
                      chartTab === tab
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Area Chart */}
            <div className="relative w-full h-[220px] select-none">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                    <stop offset="90%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = paddingY + (1 - ratio) * chartH;
                  const labelVal = (minVal + ratio * range).toFixed(0);
                  return (
                    <g key={i}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={svgWidth - paddingX}
                        y2={y}
                        stroke="#334155"
                        strokeDasharray="3 3"
                        strokeWidth="0.8"
                      />
                      <text
                        x={paddingX - 8}
                        y={y + 3}
                        fill="#64748b"
                        fontSize="9"
                        textAnchor="end"
                        fontWeight="600"
                      >
                        {chartTab === 'VENTAS' || chartTab === 'CRÉDITO' ? `$${labelVal}` : labelVal}
                      </text>
                    </g>
                  );
                })}

                {/* Area Gradient Path */}
                {areaPathStr && (
                  <path d={areaPathStr} fill="url(#areaGradient)" />
                )}

                {/* Line Curve */}
                {polylineStr && (
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylineStr}
                  />
                )}

                {/* Interactive Points */}
                {points.map((p: any, i: number) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={hoveredPoint?.idx === i ? 6 : 3.5}
                    fill={hoveredPoint?.idx === i ? '#34d399' : '#10b981'}
                    stroke="#0f172a"
                    strokeWidth="2"
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredPoint({ ...p, idx: i })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}
              </svg>

              {/* Hover Tooltip */}
              {hoveredPoint && (
                <div
                  className="absolute z-20 bg-slate-950 border border-slate-700 text-white px-2.5 py-1.5 rounded-lg text-xs shadow-xl pointer-events-none -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                    top: `${(hoveredPoint.y / svgHeight) * 100}%`
                  }}
                >
                  <p className="font-extrabold text-emerald-400">{hoveredPoint.item.label}</p>
                  <p className="text-[11px] text-slate-300">
                    {chartTab}: {chartTab === 'VENTAS' || chartTab === 'CRÉDITO' ? `$${hoveredPoint.val.toFixed(2)}` : hoveredPoint.val}
                  </p>
                </div>
              )}
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between px-10 pt-1 text-[11px] text-slate-400 font-semibold">
              {timeline.map((item: any, i: number) => (
                <span key={i} className="truncate">{item.label}</span>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Visualizando datos consolidados del sistema</span>
            <span className="font-bold text-emerald-400">
              {chartTab === 'VENTAS' && `Total: $${kpis.monthSalesUsd.toFixed(2)}`}
              {chartTab === 'CRÉDITO' && `Saldo Pendiente: $${kpis.pendingCreditsUsd.toFixed(2)}`}
              {chartTab === 'CLIENTES' && `Total Clientes: ${kpis.totalCustomers}`}
              {chartTab === 'INVENTARIO' && `Total Unidades: ${kpis.inventoryUnits}`}
            </span>
          </div>
        </div>

        {/* P&L / Márgenes y Utilidad Donut (Matches media_1789988969479.png) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Márgenes y Utilidad (P&L)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">Rendimiento neto de las operaciones</p>

            {/* Circular Donut Diagram */}
            <div className="relative flex items-center justify-center my-2">
              <svg width="150" height="150" viewBox="0 0 150 150" className="rotate-[-90deg]">
                {/* Background Ring */}
                <circle
                  cx="75"
                  cy="75"
                  r={donutRadius}
                  fill="transparent"
                  stroke="#1e293b"
                  strokeWidth="14"
                />
                {/* COGS Segment (Gray) */}
                <circle
                  cx="75"
                  cy="75"
                  r={donutRadius}
                  fill="transparent"
                  stroke="#475569"
                  strokeWidth="14"
                  strokeDasharray={`${cogsStroke} ${donutCircumference}`}
                  strokeDashoffset="0"
                />
                {/* Tax Segment (Amber) */}
                <circle
                  cx="75"
                  cy="75"
                  r={donutRadius}
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth="14"
                  strokeDasharray={`${taxStroke} ${donutCircumference}`}
                  strokeDashoffset={`${-cogsStroke}`}
                />
                {/* Net Profit Segment (Emerald) */}
                <circle
                  cx="75"
                  cy="75"
                  r={donutRadius}
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="14"
                  strokeDasharray={`${profitStroke} ${donutCircumference}`}
                  strokeDashoffset={`${-(cogsStroke + taxStroke)}`}
                  strokeLinecap="round"
                />
              </svg>

              {/* Center Donut Text */}
              <div className="absolute text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Utilidad</span>
                <span className="text-lg font-black text-emerald-400 leading-none">
                  ${pnl.netProfit.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Neta</span>
              </div>
            </div>

            {/* Margins Indicators */}
            <div className="grid grid-cols-2 gap-2 my-3 text-center">
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Margen Bruto</span>
                <span className="text-base font-black text-emerald-400">{pnl.grossMarginPct}%</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Margen Neto</span>
                <span className="text-base font-black text-emerald-400">{pnl.netMarginPct}%</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Utilidad Neta:
                </span>
                <span className="font-bold text-white">${pnl.netProfit.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                  Costo de Mercancía:
                </span>
                <span className="font-bold text-slate-300">${pnl.cogs.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  IVA Fiscal SENIAT:
                </span>
                <span className="font-bold text-amber-300">${pnl.tax.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('reports')}
            className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Ver Reporte Financiero Completo</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* 3. LOWER-MIDDLE SECTION: CONCILIACIÓN DE CAJAS + MÉTRICAS DE VENTAS + ATAJOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Conciliación de Cajas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-400" />
                Conciliación de Cajas
              </h3>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                cash.status === 'OPEN' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                {cash.status === 'OPEN' ? 'Caja Abierta' : 'Caja Cerrada'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Cajero: <strong className="text-white">{cash.employeeName}</strong>
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Apertura (Fondo):</span>
                <span className="font-bold text-white">${cash.openingBalance.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Ventas en Efectivo:</span>
                <span className="font-bold text-emerald-400">+${cash.cashSales.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Salidas / Egresos:</span>
                <span className="font-bold text-rose-400">-${cash.expenses.toFixed(2)}</span>
              </div>
            </div>

            {/* Expected Cash Total */}
            <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-950 border border-emerald-500/30 text-center">
              <span className="text-[10px] uppercase font-extrabold text-emerald-400 block">Fondo Estimado en Caja</span>
              <div className="text-xl font-black text-white">${cash.expectedCashUsd.toFixed(2)}</div>
              <div className="text-[11px] text-emerald-300 font-semibold">
                Bs. {cash.expectedCashBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('cash')}
            className="mt-3 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Ir a Control de Caja</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Métricas de Ventas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Métricas de Ventas
              </h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Mes Actual</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">Flujo de cobro y desempeño comercial</p>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Cobrado Real en Caja</span>
                  <span className="font-black text-base text-emerald-400">${cash.cashSales.toFixed(2)}</span>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Cuentas por Cobrar</span>
                  <span className="font-black text-base text-blue-400">${kpis.pendingCreditsUsd.toFixed(2)}</span>
                </div>
                <Clock className="w-5 h-5 text-blue-400" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Ticket Promedio</span>
                  <span className="font-black text-sm text-white">${kpis.avgTicketUsd.toFixed(2)}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Transacciones</span>
                  <span className="font-black text-sm text-white">{kpis.monthSalesCount} tickets</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('reports')}
            className="mt-3 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Auditar Facturas</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Atajos Rápidos */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Atajos y Operaciones
            </h3>
            <p className="text-[11px] text-slate-400 mb-3">Accesos directos a los módulos clave</p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigateTab('pos')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-emerald-900/40 border border-slate-800 hover:border-emerald-500/40 text-left transition cursor-pointer group"
              >
                <ShoppingCart className="w-4 h-4 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black text-white block">VENTAS</span>
                <span className="text-[10px] text-slate-400">Facturar en caja</span>
              </button>

              <button
                onClick={() => onNavigateTab('reports')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-blue-900/40 border border-slate-800 hover:border-blue-500/40 text-left transition cursor-pointer group"
              >
                <BarChart3 className="w-4 h-4 text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black text-white block">Financiero</span>
                <span className="text-[10px] text-slate-400">IVA & Utilidades</span>
              </button>

              <button
                onClick={() => onNavigateTab('cash')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-amber-900/40 border border-slate-800 hover:border-amber-500/40 text-left transition cursor-pointer group"
              >
                <Landmark className="w-4 h-4 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black text-white block">Arqueo Caja</span>
                <span className="text-[10px] text-slate-400">Cuadre de turno</span>
              </button>

              <button
                onClick={() => onNavigateTab('inventory')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-purple-900/40 border border-slate-800 hover:border-purple-500/40 text-left transition cursor-pointer group"
              >
                <Package className="w-4 h-4 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black text-white block">Inventario</span>
                <span className="text-[10px] text-slate-400">Medicinas & Stock</span>
              </button>
            </div>
          </div>

          <a
            href="/?view=store"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 w-full py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Abrir Tienda Web para Clientes</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>

      {/* 4. BOTTOM SECTION: CENTRO DE ALERTAS Y STOCKS CRÍTICOS (Explicit User Request) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
              Centro de Alertas & Stocks Críticos
            </h3>
            <p className="text-xs text-slate-400">
              Insumos con poco stock, vencimientos de lotes y pedidos online entrantes
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
              {alerts.lowStock.length} Medicamentos Bajos
            </span>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
              {alerts.expiringBatches.length} Lotes por Vencer
            </span>
            {alerts.pendingOrders.length > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                {alerts.pendingOrders.length} Pedidos Web
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Panel 1: Insumos y Medicamentos Bajos de Stock */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400">
              <span className="flex items-center gap-1.5">
                <Package className="w-4 h-4" />
                Bajo Stock Mínimo
              </span>
              <button 
                onClick={() => onNavigateTab('inventory')}
                className="text-[10px] text-slate-400 hover:text-white cursor-pointer underline"
              >
                Ver todo
              </button>
            </div>

            {alerts.lowStock.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                ✓ Todo el inventario supera el stock de seguridad
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {alerts.lowStock.map((p: any) => (
                  <div 
                    key={p.id}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs hover:border-amber-500/40 transition"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-black text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.category} &bull; Mín: {p.min_stock}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded-md font-black text-xs ${
                        p.current_stock === 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {p.current_stock} disp.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Panel 2: Semáforo de Lotes por Vencer */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-rose-400">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Vencimientos (Semáforo 90 Días)
              </span>
              <button 
                onClick={() => onNavigateTab('expiries')}
                className="text-[10px] text-slate-400 hover:text-white cursor-pointer underline"
              >
                Ver semáforo
              </button>
            </div>

            {alerts.expiringBatches.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                ✓ No hay lotes próximos a vencer en los siguientes 90 días
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {alerts.expiringBatches.map((b: any) => {
                  const isCritical = b.days_left <= 30;
                  return (
                    <div 
                      key={b.id}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs hover:border-rose-500/40 transition"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-black text-white truncate">{b.product_name}</p>
                        <p className="text-[10px] text-slate-400">Lote: {b.batch_number} &bull; Vence: {b.expiry_date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`px-2 py-0.5 rounded-md font-black text-[11px] ${
                          isCritical
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {b.days_left <= 0 ? 'VENCIDO' : `${b.days_left}d restantes`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panel 3: Pedidos Tienda Web Pendientes */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-blue-400">
              <span className="flex items-center gap-1.5">
                <Store className="w-4 h-4" />
                Pedidos Web por Despachar
              </span>
              <button 
                onClick={() => onNavigateTab('orders')}
                className="text-[10px] text-slate-400 hover:text-white cursor-pointer underline"
              >
                Ver todos
              </button>
            </div>

            {alerts.pendingOrders.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                ✓ No hay pedidos web pendientes por despachar
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {alerts.pendingOrders.map((o: any) => (
                  <div 
                    key={o.id}
                    onClick={() => onNavigateTab('orders')}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs hover:border-blue-500/40 transition cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-black text-white truncate">{o.customer_name}</p>
                      <p className="text-[10px] text-slate-400">Orden #{o.order_number} &bull; {o.delivery_type}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-emerald-400 text-xs block">${o.total.toFixed(2)}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-blue-500/20 text-blue-300 font-bold uppercase">
                        {o.payment_method}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
};
