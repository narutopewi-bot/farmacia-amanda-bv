import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  ShoppingBag, 
  DollarSign, 
  Search, 
  Eye, 
  Clock, 
  Package, 
  CreditCard, 
  FileText, 
  MapPin, 
  Phone, 
  User, 
  RefreshCw, 
  Image as ImageIcon, 
  CheckCircle2, 
  X,
  ArrowLeft
} from 'lucide-react';
import { OnlineOrder, Settings } from '../types';

interface OnlineSalesReportData {
  orders: (OnlineOrder & {
    items: Array<{
      id: number;
      product_name: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
      category?: string;
    }>;
  })[];
  summary: {
    total_orders: number;
    total_revenue_usd: number;
    total_revenue_bs: number;
    delivered_count: number;
    pickup_count: number;
    pending_count: number;
    preparing_count: number;
    cancelled_count: number;
  };
  paymentMethods: Array<{
    payment_method: string;
    count: number;
    total_usd: number;
    total_bs: number;
  }>;
  topMedicines: Array<{
    product_name: string;
    total_units_sold: number;
    total_usd: number;
    orders_count: number;
  }>;
}

interface Props {
  settings: Settings | null;
  onBack?: () => void;
}

export const OnlineOrdersReportView: React.FC<Props> = ({ settings, onBack }) => {
  const [data, setData] = useState<OnlineSalesReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedProofOrder, setSelectedProofOrder] = useState<OnlineOrder | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (typeFilter !== 'ALL') params.append('deliveryType', typeFilter);

      const res = await fetch(`/api/reports/online-sales?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching online sales report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [statusFilter, typeFilter]);

  const handleApplyDateFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReport();
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setSearchTerm('');
    setTimeout(fetchReport, 10);
  };

  const filteredOrders = (data?.orders || []).filter(order => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const matchOrderNum = order.order_number?.toLowerCase().includes(term);
    const matchCustomer = order.customer_name?.toLowerCase().includes(term);
    const matchPhone = order.customer_phone?.toLowerCase().includes(term);
    const matchRef = order.payment_reference?.toLowerCase().includes(term);
    const matchMedicine = order.items?.some(it => it.product_name?.toLowerCase().includes(term));
    return matchOrderNum || matchCustomer || matchPhone || matchRef || matchMedicine;
  });

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition shadow-sm cursor-pointer flex items-center gap-1.5 text-xs font-bold mr-1"
                title="Volver a la lista de reportes"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Volver a Reportes</span>
              </button>
            )}
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                Reporte de Ventas Web & Delivery
              </h2>
              <p className="text-xs text-slate-400">
                Historial auditado de pedidos por la tienda online, recaudación en Divisas/Bolívares y medicamentos despachados
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReport}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl font-bold text-xs transition flex items-center gap-2 border border-slate-700 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar Datos</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 border border-emerald-600/40 p-5 rounded-2xl text-white shadow-sm">
          <div className="flex items-center justify-between text-emerald-200 text-xs font-bold mb-1">
            <span>Total Recaudado (Web Entregado)</span>
            <DollarSign className="w-4 h-4 text-emerald-300" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono">
            ${data?.summary.total_revenue_usd?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-emerald-200 font-semibold mt-1 font-mono">
            ≈ Bs. {data?.summary.total_revenue_bs?.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
            <span>Envíos a Domicilio (Delivery)</span>
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {data?.summary.delivered_count || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Despachos completados con éxito
          </p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
            <span>Retiros en Mostrador</span>
            <ShoppingBag className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {data?.summary.pickup_count || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Apartados web retirados en farmacia
          </p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
            <span>Pedidos en Trámite</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {(data?.summary.pending_count || 0) + (data?.summary.preparing_count || 0)}
          </div>
          <p className="text-[11px] text-purple-400 font-semibold mt-1">
            {data?.summary.pending_count || 0} nuevos &bull; {data?.summary.preparing_count || 0} en empaque
          </p>
        </div>
      </div>

      {/* Breakdown Row: Payment Methods & Top Sold Medicines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Payment Methods Breakdown */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
          <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Formas de Pago Utilizadas</span>
          </h3>

          {data?.paymentMethods && data.paymentMethods.length > 0 ? (
            <div className="space-y-2.5">
              {data.paymentMethods.map((pm, idx) => (
                <div key={idx} className="p-3 bg-[#0f172a] rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-white uppercase">
                      {pm.payment_method}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {pm.count} órdenes entregadas
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-xs text-emerald-400 font-mono">
                      ${pm.total_usd.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Bs. {pm.total_bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-4 text-center">
              No hay ventas web entregadas registradas.
            </p>
          )}
        </div>

        {/* Top Medicines Dispensed Online */}
        <div className="lg:col-span-2 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
          <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-400" />
            <span>Top Medicamentos y Productos Despachados por Web</span>
          </h3>

          {data?.topMedicines && data.topMedicines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-bold">
                    <th className="pb-2.5">Medicamento / Producto</th>
                    <th className="pb-2.5 text-center">Unidades Despachadas</th>
                    <th className="pb-2.5 text-center">N° Pedidos</th>
                    <th className="pb-2.5 text-right">Total Facturado ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.topMedicines.map((med, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50 transition">
                      <td className="py-2.5 font-bold text-white">
                        {med.product_name}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-extrabold text-[11px]">
                          {med.total_units_sold} uds
                        </span>
                      </td>
                      <td className="py-2.5 text-center text-slate-300 font-semibold">
                        {med.orders_count}
                      </td>
                      <td className="py-2.5 text-right font-black text-emerald-400 font-mono">
                        ${med.total_usd.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-4 text-center">
              No hay despachos web registrados aún.
            </p>
          )}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm space-y-3">
        <form onSubmit={handleApplyDateFilter} className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente, teléfono, referencia o medicamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#0f172a] border border-slate-800 rounded-xl text-xs text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden placeholder-slate-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-bold">Desde:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-[#0f172a] border border-slate-800 rounded-xl text-xs text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-bold">Hasta:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-[#0f172a] border border-slate-800 rounded-xl text-xs text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-[#0f172a] border border-slate-800 rounded-xl text-xs text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="DELIVERED">Entregados / Completados</option>
              <option value="PENDING">Pendientes</option>
              <option value="PREPARING">En Preparación</option>
              <option value="CANCELLED">Cancelados</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-[#0f172a] border border-slate-800 rounded-xl text-xs text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden"
            >
              <option value="ALL">Delivery y Retiro</option>
              <option value="DELIVERY">Sólo Delivery (Domicilio)</option>
              <option value="PICKUP">Sólo Retiro en Tienda</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md shadow-emerald-700/20"
          >
            Filtrar
          </button>

          {(startDate || endDate || statusFilter !== 'ALL' || typeFilter !== 'ALL' || searchTerm) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 text-slate-400 hover:text-white text-xs font-bold transition cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </form>
      </div>

      {/* Orders Detailed Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-black text-sm text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Detalle de Pedidos Web ({filteredOrders.length})</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-850 bg-slate-800/80 text-slate-300 font-bold text-[11px] border-b border-slate-800">
                <th className="p-3.5">Pedido / Fecha</th>
                <th className="p-3.5">Cliente / Contacto</th>
                <th className="p-3.5">Tipo / Destino</th>
                <th className="p-3.5">Medicamentos y Productos</th>
                <th className="p-3.5">Pago / Referencia</th>
                <th className="p-3.5 text-right">Monto Total</th>
                <th className="p-3.5 text-center">Estado</th>
                <th className="p-3.5 text-center">Comprobante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500 font-medium">
                    No se encontraron pedidos con los criterios especificados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  return (
                    <tr key={order.id} className="hover:bg-slate-800/40 transition">
                      {/* Pedido / Fecha */}
                      <td className="p-3.5 align-top">
                        <div className="font-extrabold text-white font-mono">
                          {order.order_number}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Cliente / Contacto */}
                      <td className="p-3.5 align-top">
                        <div className="font-bold text-white flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{order.customer_name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{order.customer_phone}</span>
                        </div>
                      </td>

                      {/* Tipo / Destino */}
                      <td className="p-3.5 align-top">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          order.delivery_type === 'DELIVERY' 
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                            : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        }`}>
                          {order.delivery_type === 'DELIVERY' ? <Truck className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                          {order.delivery_type === 'DELIVERY' ? 'Delivery' : 'Retiro en Tienda'}
                        </span>
                        {order.delivery_address && (
                          <div className="text-[10px] text-slate-400 mt-1 max-w-[200px] truncate flex items-start gap-1">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                            <span>{order.delivery_address}</span>
                          </div>
                        )}
                      </td>

                      {/* Medicamentos */}
                      <td className="p-3.5 align-top">
                        <div className="space-y-1 max-w-[280px]">
                          {order.items && order.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px] bg-[#0f172a] px-2 py-1 rounded-md border border-slate-800">
                              <span className="font-semibold text-slate-200 truncate mr-2">
                                {item.quantity}x {item.product_name}
                              </span>
                              <span className="font-bold text-slate-400 shrink-0 font-mono">
                                ${(item.unit_price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Pago / Referencia */}
                      <td className="p-3.5 align-top">
                        <div className="font-bold text-[11px] text-slate-200 uppercase">
                          {order.payment_method}
                        </div>
                        {order.payment_reference ? (
                          <div className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded mt-1 inline-block border border-emerald-500/30">
                            Ref: {order.payment_reference}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Sin ref.
                          </div>
                        )}
                        {order.payment_currency && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Moneda: {order.payment_currency}
                          </div>
                        )}
                      </td>

                      {/* Monto Total */}
                      <td className="p-3.5 align-top text-right font-mono">
                        <div className="font-black text-white text-sm">
                          ${order.total.toFixed(2)}
                        </div>
                        <div className="text-[11px] font-bold text-emerald-400">
                          Bs. {(order.total_bs || (order.total * (order.exchange_rate || settings?.exchange_rate || 85))).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {order.delivery_fee > 0 && (
                          <div className="text-[9px] text-slate-400">
                            (Delivery +${order.delivery_fee.toFixed(2)})
                          </div>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="p-3.5 align-top text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black border ${
                          order.status === 'DELIVERED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : order.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : order.status === 'PREPARING'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}>
                          {order.status === 'DELIVERED' ? 'ENTREGADO' :
                           order.status === 'PENDING' ? 'PENDIENTE' :
                           order.status === 'PREPARING' ? 'EN CAMINO / LISTO' : 'CANCELADO'}
                        </span>
                      </td>

                      {/* Comprobante */}
                      <td className="p-3.5 align-top text-center">
                        {order.proof_image ? (
                          <button
                            onClick={() => setSelectedProofOrder(order)}
                            className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 transition flex items-center gap-1 mx-auto text-[10px] font-bold cursor-pointer"
                            title="Ver capture de pago"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Capture</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proof of Payment Viewer Modal */}
      {selectedProofOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#1e293b] border border-slate-700 text-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <h4 className="font-black text-sm">Comprobante de Pago</h4>
                <p className="text-[11px] text-slate-300">
                  {selectedProofOrder.order_number} &bull; {selectedProofOrder.customer_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedProofOrder(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-[#0f172a] rounded-2xl p-2 border border-slate-800 flex items-center justify-center max-h-[400px] overflow-auto">
                <img
                  src={selectedProofOrder.proof_image}
                  alt="Comprobante de pago"
                  className="max-h-[380px] w-auto rounded-lg object-contain"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-[#0f172a] p-3 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Método de Pago:</span>
                  <span className="font-bold text-white uppercase">{selectedProofOrder.payment_method}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Referencia:</span>
                  <span className="font-mono font-bold text-emerald-400">{selectedProofOrder.payment_reference || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Monto Total:</span>
                  <span className="font-black text-white font-mono">
                    ${selectedProofOrder.total.toFixed(2)} / Bs. {(selectedProofOrder.total_bs || (selectedProofOrder.total * 85)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Teléfono:</span>
                  <span className="font-bold text-white">{selectedProofOrder.customer_phone}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedProofOrder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
