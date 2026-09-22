import React, { useState } from 'react';
import { 
  ShoppingBag, CheckCircle, Clock, Truck, Store, 
  Phone, MapPin, Receipt, Eye, X, Image as ImageIcon,
  CheckCircle2, ExternalLink, MessageCircle, Send,
  Landmark, User, DollarSign, AlertCircle, Copy, Check,
  AlertTriangle
} from 'lucide-react';
import { OnlineOrder, Sale, Employee, Settings } from '../types';

interface OrdersViewProps {
  orders: OnlineOrder[];
  onRefresh: () => void;
  onOpenReceipt: (sale: Sale) => void;
  currentUser?: Employee | null;
  employees?: Employee[];
  settings?: Settings;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ 
  orders, 
  onRefresh, 
  onOpenReceipt,
  currentUser,
  employees = [],
  settings
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [viewingProofImage, setViewingProofImage] = useState<{ image: string; orderNumber: string; ref?: string; customer: string } | null>(null);

  // Dispatch & Cash register integration modal states
  const [dispatchOrder, setDispatchOrder] = useState<OnlineOrder | null>(null);
  const [selectedCashRegisterId, setSelectedCashRegisterId] = useState<number | ''>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | ''>('');
  const [autoSendWhatsapp, setAutoSendWhatsapp] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [openCashRegisters, setOpenCashRegisters] = useState<any[]>([]);
  const [cajasLoading, setCajasLoading] = useState(false);

  // Post-dispatch success modal
  const [dispatchSuccessData, setDispatchSuccessData] = useState<{
    saleData: any;
    order: OnlineOrder;
    invoiceNumber: string;
    employeeName: string;
    cashRegisterName: string;
    whatsappUrl: string;
    whatsappText: string;
  } | null>(null);

  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);

  const filteredOrders = orders.filter(o => {
    if (filterStatus === 'ALL') return true;
    return o.status === filterStatus;
  });

  const handleUpdateStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Error al actualizar estado');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Helper: Genera la nota de entrega formateada para WhatsApp
  const buildWhatsappDeliveryNote = (
    order: OnlineOrder, 
    invoiceNumber?: string, 
    employeeName?: string, 
    cashRegisterName?: string
  ) => {
    const pharmacyName = settings?.pharmacy_name || 'Expendio de Medicinas Amanda B&V C.A.';
    const rawPhone = order.customer_phone || '';
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '58' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('4') && cleanPhone.length === 10) {
      cleanPhone = '58' + cleanPhone;
    } else if (!cleanPhone.startsWith('58') && cleanPhone.length === 10) {
      cleanPhone = '58' + cleanPhone;
    }

    const isDelivery = order.delivery_type === 'DELIVERY';
    const rate = order.exchange_rate || settings?.exchange_rate || 85.0;
    const totalBs = order.total_bs || (order.total * rate);

    const lines: string[] = [
      `¡Hola, *${order.customer_name}*! 👋`,
      `Te saludamos cordialmente de *${pharmacyName}* 💊🏥`,
      ``,
      `✅ *¡Tu pedido ha sido procesado y facturado con éxito!*`,
      isDelivery 
        ? `🛵 *Tu compra ya está lista y el delivery ya va en camino a tu dirección.*`
        : `🏪 *Tu compra ya está lista y empacada para ser retirada en farmacia.*`,
      ``,
      `📄 *NOTA DE ENTREGA / TICKET:* ${invoiceNumber || order.invoice_number || 'EMITIDO'}`,
      `📦 *Pedido Web:* #${order.order_number}`,
      `📅 *Fecha:* ${new Date().toLocaleDateString('es-VE')} - ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
      employeeName ? `👤 *Atendido por:* ${employeeName}${cashRegisterName ? ` (${cashRegisterName})` : ''}` : ``,
      ``,
      `📋 *DETALLE DE TU PEDIDO:*`
    ];

    if (order.items && order.items.length > 0) {
      order.items.forEach(it => {
        lines.push(`• ${it.quantity}x ${it.product_name} — $${(it.unit_price * it.quantity).toFixed(2)}`);
      });
    }

    if (isDelivery) {
      const delFee = Number(order.delivery_fee) || 0;
      lines.push(`🛵 *Costo de Delivery:* ${delFee <= 0 ? '¡GRATIS! ($0.00)' : `$${delFee.toFixed(2)}`}`);
    }

    lines.push(``);
    lines.push(`💰 *TOTAL CANCELADO:*`);
    lines.push(`💵 *Total USD:* $${order.total.toFixed(2)}`);
    lines.push(`🇻🇪 *Total Bs:* Bs. ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Tasa BCV: ${rate.toFixed(2)} Bs/$)`);

    lines.push(``);
    lines.push(`💳 *FORMA DE PAGO VERIFICADA:*`);
    lines.push(`• Método: *${order.payment_method}*`);
    if (order.payment_reference) {
      lines.push(`• Referencia: *${order.payment_reference}*`);
    }
    lines.push(`• Estado: *Cobro ingresado y cuadrado en caja*`);

    if (isDelivery && order.delivery_address) {
      lines.push(``);
      lines.push(`📍 *Dirección de Entrega:*`);
      lines.push(`${order.delivery_address}`);
    }

    lines.push(``);
    lines.push(isDelivery
      ? `¡Muchas gracias por preferirnos! Nuestro repartidor llegará muy pronto. Si tienes alguna duda, puedes responder directamente a este mensaje. ✨🛵`
      : `¡Muchas gracias por preferirnos! Te esperamos en nuestro mostrador con tu pedido listo. ✨🏪`
    );

    const text = lines.filter(Boolean).join('\n');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    return { cleanPhone, text, url };
  };

  // Consultar cajas abiertas
  const fetchOpenCajas = async () => {
    try {
      setCajasLoading(true);
      const res = await fetch('/api/cajas/estado');
      if (res.ok) {
        const data = await res.json();
        const list = data.cajas_abiertas || [];
        setOpenCashRegisters(list);
        if (list.length > 0) {
          // Preseleccionar la caja del usuario actual o la primera abierta
          const match = list.find((c: any) => currentUser && (c.employee_id === currentUser.id || c.employee_name === currentUser.name));
          setSelectedCashRegisterId(match ? match.id : list[0].id);
        } else {
          setSelectedCashRegisterId('');
        }
      }
    } catch (err) {
      console.error('Error consultando cajas abiertas:', err);
    } finally {
      setCajasLoading(false);
    }
  };

  // Abrir modal de despacho y cobro
  const handleOpenDispatchModal = (order: OnlineOrder) => {
    setDispatchOrder(order);
    setSelectedEmployeeId(currentUser ? currentUser.id : (employees.length > 0 ? employees[0].id : 1));
    setAutoSendWhatsapp(true);
    fetchOpenCajas();
  };

  // Confirmar despacho, facturación y cuadre en caja
  const handleConfirmDispatch = async () => {
    if (!dispatchOrder) return;
    if (!selectedCashRegisterId) {
      alert('Debe seleccionar una caja abierta para ingresar el cobro.');
      return;
    }

    setIsProcessing(true);
    try {
      const selectedEmp = employees.find(e => e.id === Number(selectedEmployeeId)) || currentUser;
      const selectedCaja = openCashRegisters.find(c => c.id === Number(selectedCashRegisterId));

      const res = await fetch(`/api/orders/${dispatchOrder.id}/convert-to-sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: selectedEmployeeId || 1,
          employee_name: selectedEmp ? selectedEmp.name : 'Administrador',
          cash_register_id: selectedCashRegisterId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al facturar pedido');

      // Consultar la venta generada
      const saleRes = await fetch(`/api/sales/${data.saleId}`);
      const saleData = await saleRes.json();

      const empName = selectedEmp ? selectedEmp.name : (data.employeeName || 'Cajero');
      const cajaName = selectedCaja ? selectedCaja.nombre_caja : (data.cashRegisterName || 'Caja');

      // Generar la nota para WhatsApp
      const wa = buildWhatsappDeliveryNote(dispatchOrder, data.invoiceNumber, empName, cajaName);

      // Si el usuario marcó envío automático, abrir WhatsApp
      if (autoSendWhatsapp && wa.cleanPhone) {
        window.open(wa.url, '_blank');
      }

      setDispatchSuccessData({
        saleData,
        order: dispatchOrder,
        invoiceNumber: data.invoiceNumber,
        employeeName: empName,
        cashRegisterName: cajaName,
        whatsappUrl: wa.url,
        whatsappText: wa.text
      });

      setDispatchOrder(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Enviar WhatsApp manual de nota de entrega desde la tarjeta
  const handleSendWhatsappDirect = (order: OnlineOrder) => {
    const wa = buildWhatsappDeliveryNote(order, order.invoice_number, order.processed_by_name);
    window.open(wa.url, '_blank');
  };

  const copyWhatsappText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWhatsapp(true);
    setTimeout(() => setCopiedWhatsapp(false), 2000);
  };

  const pendingCount = orders.filter(o => o.status === 'PENDING').length;
  const preparingCount = orders.filter(o => o.status === 'PREPARING').length;
  const readyCount = orders.filter(o => o.status === 'READY').length;

  return (
    <div className="space-y-5">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setFilterStatus(filterStatus === 'PENDING' ? 'ALL' : 'PENDING')}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-xs flex items-center justify-between ${
            filterStatus === 'PENDING' 
              ? 'bg-amber-950/50 border-amber-500/60 text-amber-200' 
              : 'bg-slate-900 border-slate-800 hover:border-amber-500/40 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-900/40 text-amber-400 flex items-center justify-center font-bold border border-amber-800/40">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-300">Pendientes por Validar</p>
              <p className="text-2xl font-black text-amber-400">{pendingCount}</p>
            </div>
          </div>
          {pendingCount > 0 && (
            <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full animate-pulse">
              ¡Nuevos!
            </span>
          )}
        </div>

        <div
          onClick={() => setFilterStatus(filterStatus === 'PREPARING' ? 'ALL' : 'PREPARING')}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-xs flex items-center justify-between ${
            filterStatus === 'PREPARING' 
              ? 'bg-blue-950/50 border-blue-500/60 text-blue-200' 
              : 'bg-slate-900 border-slate-800 hover:border-blue-500/40 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900/40 text-blue-400 flex items-center justify-center font-bold border border-blue-800/40">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-300">En Preparación / Empaque</p>
              <p className="text-2xl font-black text-blue-400">{preparingCount}</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setFilterStatus(filterStatus === 'READY' ? 'ALL' : 'READY')}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-xs flex items-center justify-between ${
            filterStatus === 'READY' 
              ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200' 
              : 'bg-slate-900 border-slate-800 hover:border-emerald-500/40 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-900/40 text-emerald-400 flex items-center justify-center font-bold border border-emerald-800/40">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-300">Listos para Entrega</p>
              <p className="text-2xl font-black text-emerald-400">{readyCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-slate-900 p-12 text-center rounded-2xl border border-slate-800 text-slate-400 shadow-md">
            <ShoppingBag className="w-12 h-12 mx-auto stroke-1 text-slate-500 mb-2" />
            <p className="text-sm font-semibold text-slate-200">No hay pedidos para mostrar</p>
            <p className="text-xs text-slate-400">Los pedidos de la tienda online aparecerán aquí con sus comprobantes de pago.</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            let statusBadge = { label: 'Pendiente', bg: 'bg-amber-950/60 text-amber-300 border border-amber-800/80' };
            if (order.status === 'PREPARING') statusBadge = { label: 'En Preparación', bg: 'bg-blue-950/60 text-blue-300 border border-blue-800/80' };
            if (order.status === 'READY') statusBadge = { label: 'Listo para Entrega', bg: 'bg-purple-950/60 text-purple-300 border border-purple-800/80' };
            if (order.status === 'DELIVERED') statusBadge = { label: 'Entregado y Facturado', bg: 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/80' };
            if (order.status === 'CANCELLED') statusBadge = { label: 'Cancelado', bg: 'bg-red-950/60 text-red-300 border border-red-800/80' };

            const rate = order.exchange_rate || settings?.exchange_rate || 85.0;
            const totalBs = order.total_bs || (order.total * rate);

            return (
              <div key={order.id} className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-md space-y-3">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-extrabold text-base text-white font-mono">
                      #{order.order_number}
                    </span>
                    <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${statusBadge.bg}`}>
                      {statusBadge.label}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-300 bg-slate-800 border border-slate-700/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                      {order.delivery_type === 'DELIVERY' ? <Truck className="w-3 h-3 text-emerald-400" /> : <Store className="w-3 h-3 text-teal-400" />}
                      {order.delivery_type === 'DELIVERY' ? 'Envío a Domicilio' : 'Retiro en Farmacia'}
                    </span>

                    {order.status === 'DELIVERED' && order.invoice_number && (
                      <span className="text-[11px] font-mono font-bold bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/80">
                        Doc: {order.invoice_number}
                      </span>
                    )}

                    {order.status === 'DELIVERED' && order.processed_by_name && (
                      <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" /> Despachado por: <strong className="text-slate-200">{order.processed_by_name}</strong>
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-white font-mono">
                      ${order.total.toFixed(2)} USD
                    </span>
                    <p className="text-xs font-extrabold text-emerald-400 font-mono">
                      Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Customer, Delivery & Payment Proof details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#0f172a] p-3 rounded-xl border border-slate-800">
                  <div className="space-y-1">
                    <p className="text-slate-400 font-semibold text-[11px]">Cliente:</p>
                    <p className="font-bold text-white">{order.customer_name}</p>
                    <p className="text-slate-300 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {order.customer_phone}
                    </p>
                    {order.customer_email && (
                      <p className="text-slate-400 text-[11px]">{order.customer_email}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-slate-400 font-semibold text-[11px]">Destino / Entrega:</p>
                    {order.delivery_type === 'DELIVERY' ? (
                      <p className="text-slate-300 flex items-start gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{order.delivery_address || 'Dirección no especificada'}</span>
                      </p>
                    ) : (
                      <p className="text-teal-400 font-semibold flex items-center gap-1">
                        <Store className="w-3.5 h-3.5" /> Retiro en mostrador de farmacia
                      </p>
                    )}
                    {order.notes && (
                      <p className="text-[10px] text-slate-400 italic mt-1">
                        Nota: "{order.notes}"
                      </p>
                    )}
                  </div>

                  {/* Payment Info & Proof Capture Button */}
                  <div className="space-y-1 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <p className="text-slate-400 font-semibold text-[10px] uppercase">Forma de Pago & Comprobante:</p>
                    <p className="font-bold text-white uppercase text-xs">
                      {order.payment_method} ({order.payment_currency || 'BS'})
                    </p>
                    {order.payment_reference && (
                      <p className="font-mono text-xs font-bold text-emerald-400">
                        Ref: {order.payment_reference}
                      </p>
                    )}

                    {order.proof_image ? (
                      <button
                        type="button"
                        onClick={() => setViewingProofImage({
                          image: order.proof_image!,
                          orderNumber: order.order_number,
                          ref: order.payment_reference,
                          customer: order.customer_name
                        })}
                        className="mt-1.5 w-full py-1.5 px-2 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 font-extrabold text-[11px] rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Capture de Pago Móvil</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic block mt-1">
                        (Sin captura adjunta)
                      </span>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-300">Medicamentos Solicitados:</p>
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                    {order.items?.map((it, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-xs bg-[#0f172a]">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-bold flex items-center justify-center text-xs">
                            {it.quantity}x
                          </span>
                          <span className="font-semibold text-slate-200">{it.product_name}</span>
                        </div>
                        <span className="font-mono font-bold text-white">${it.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-400">Cambiar estado:</span>
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                        className="px-3 py-1 bg-blue-950/60 text-blue-300 hover:bg-blue-900/60 border border-blue-800/60 font-semibold text-xs rounded-lg transition cursor-pointer"
                      >
                        Pasar a Preparación
                      </button>
                    )}
                    {order.status === 'PREPARING' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'READY')}
                        className="px-3 py-1 bg-purple-950/60 text-purple-300 hover:bg-purple-900/60 border border-purple-800/60 font-semibold text-xs rounded-lg transition cursor-pointer"
                      >
                        Marcar como Listo para Retiro
                      </button>
                    )}
                    {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                        className="px-2 py-1 text-slate-500 hover:text-red-400 font-semibold text-xs transition cursor-pointer"
                      >
                        Cancelar Pedido
                      </button>
                    )}

                    {/* Botón directo para enviar WhatsApp con nota de entrega */}
                    <button
                      onClick={() => handleSendWhatsappDirect(order)}
                      className="px-3 py-1 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer border border-emerald-800/60"
                      title="Enviar nota de entrega por WhatsApp al cliente"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WhatsApp Cliente</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleOpenDispatchModal(order)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-700/20 transition flex items-center gap-1.5 active:scale-98 cursor-pointer"
                      >
                        <Receipt className="w-4 h-4" />
                        <span>Facturar y Despachar en POS (Ticket)</span>
                      </button>
                    )}

                    {order.status === 'DELIVERED' && order.sale_id && (
                      <button
                        onClick={async () => {
                          try {
                            const sRes = await fetch(`/api/sales/${order.sale_id}`);
                            if (sRes.ok) {
                              const sData = await sRes.json();
                              onOpenReceipt(sData);
                            }
                          } catch (e) {
                            alert('No se pudo cargar el ticket.');
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ver Ticket POS</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Modal 1: Ver Capture / Comprobante de Pago en Alta Resolución */}
      {viewingProofImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl border border-slate-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-800/90 text-white flex items-center justify-between border-b border-slate-700">
              <div>
                <h3 className="font-bold text-sm">Comprobante de Pago - Pedido #{viewingProofImage.orderNumber}</h3>
                <p className="text-[11px] text-slate-400">
                  Cliente: {viewingProofImage.customer} {viewingProofImage.ref ? `&bull; Ref: ${viewingProofImage.ref}` : ''}
                </p>
              </div>
              <button onClick={() => setViewingProofImage(null)} className="p-1 text-slate-400 hover:text-white rounded cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-black/70 flex-1 overflow-auto flex items-center justify-center">
              <img
                src={viewingProofImage.image}
                alt="Comprobante de Pago Móvil"
                className="max-w-full max-h-[70vh] rounded-xl object-contain shadow-md"
              />
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-semibold">
                Verifique que la referencia bancaria coincida antes de facturar.
              </span>
              <button
                onClick={() => setViewingProofImage(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 cursor-pointer"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Facturar, Cuadrar Caja y Despachar Pedido Online */}
      {dispatchOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400 font-bold border border-white/10">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Facturar y Despachar Pedido Online</h3>
                  <p className="text-[11px] text-emerald-300">
                    Pedido #{dispatchOrder.order_number} &bull; {dispatchOrder.customer_name}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setDispatchOrder(null)} 
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              
              {/* Payment & Amount Summary Card */}
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-300 uppercase">Monto que ingresará a Caja:</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    ${dispatchOrder.total.toFixed(2)} USD
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-emerald-800/60 text-emerald-300 font-semibold font-mono">
                  <span>Equivalente en Bolívares (BCV):</span>
                  <span className="font-extrabold text-emerald-200">
                    Bs. {((dispatchOrder.total_bs || (dispatchOrder.total * (settings?.exchange_rate || 85.0)))).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-300">
                  <span className="font-semibold">
                    Método: <strong className="uppercase text-white">{dispatchOrder.payment_method}</strong>
                    {dispatchOrder.payment_reference ? ` • Ref: ${dispatchOrder.payment_reference}` : ''}
                  </span>

                  {dispatchOrder.proof_image && (
                    <button
                      type="button"
                      onClick={() => setViewingProofImage({
                        image: dispatchOrder.proof_image!,
                        orderNumber: dispatchOrder.order_number,
                        ref: dispatchOrder.payment_reference,
                        customer: dispatchOrder.customer_name
                      })}
                      className="text-emerald-400 hover:text-emerald-300 font-bold underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> Ver Capture
                    </button>
                  )}
                </div>
              </div>

              {/* Delivery Info */}
              <div className="p-3 bg-[#0f172a] rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span className="flex items-center gap-1">
                    {dispatchOrder.delivery_type === 'DELIVERY' ? <Truck className="w-3.5 h-3.5 text-emerald-400" /> : <Store className="w-3.5 h-3.5 text-teal-400" />}
                    <span>{dispatchOrder.delivery_type === 'DELIVERY' ? 'Envío Delivery a Domicilio' : 'Retiro en Mostrador de Farmacia'}</span>
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {dispatchOrder.delivery_type === 'DELIVERY' ? (dispatchOrder.delivery_fee <= 0 ? 'Delivery ¡GRATIS!' : `+$${dispatchOrder.delivery_fee.toFixed(2)}`) : 'Gratis'}
                  </span>
                </div>
                {dispatchOrder.delivery_type === 'DELIVERY' && (
                  <p className="text-slate-400 text-[11px] font-medium pl-4">
                    Dirección: {dispatchOrder.delivery_address || 'No indicada'}
                  </p>
                )}
              </div>

              {/* Caja Destino Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-emerald-400" />
                    <span>Caja receptora del dinero:</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {openCashRegisters.length} caja(s) abierta(s)
                  </span>
                </label>

                {cajasLoading ? (
                  <div className="p-2.5 text-center text-slate-400 bg-[#0f172a] rounded-xl border border-slate-800">Cargando cajas...</div>
                ) : openCashRegisters.length === 0 ? (
                  <div className="p-3 bg-amber-950/50 border border-amber-800/60 rounded-xl text-amber-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">No hay ninguna caja abierta en el sistema</p>
                      <p className="text-[11px] text-amber-300/80">
                        Debe abrir una caja en el Módulo de Ventas o Control de Caja para registrar este cobro y cuadrar el dinero.
                      </p>
                    </div>
                  </div>
                ) : (
                  <select
                    value={selectedCashRegisterId}
                    onChange={(e) => setSelectedCashRegisterId(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#0f172a] border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  >
                    {openCashRegisters.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre_caja} — {c.employee_name || 'Cajero'} (Apertura: ${Number(c.monto_apertura_usd || 0).toFixed(2)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Empleado que despacha / recibe */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span>Cajero / Empleado que procesa el pedido:</span>
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#0f172a] border border-slate-700 rounded-xl font-semibold text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* WhatsApp Automatic Option */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="autoSendWa"
                  checked={autoSendWhatsapp}
                  onChange={(e) => setAutoSendWhatsapp(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-500 rounded border-slate-700 bg-slate-900 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="autoSendWa" className="cursor-pointer">
                  <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Enviar Nota de Entrega por WhatsApp automáticamente</span>
                  </p>
                  <p className="text-[11px] text-emerald-300/80">
                    Se abrirá WhatsApp con el mensaje estructurado avisando a <strong>{dispatchOrder.customer_phone}</strong> que su pedido fue facturado y que el delivery va en camino.
                  </p>
                </label>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDispatchOrder(null)}
                disabled={isProcessing}
                className="px-4 py-2 text-slate-400 hover:text-white font-bold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmDispatch}
                disabled={isProcessing || openCashRegisters.length === 0}
                className={`px-5 py-2.5 rounded-xl font-black text-white flex items-center gap-2 shadow-lg transition cursor-pointer ${
                  openCashRegisters.length === 0 || isProcessing
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-700/30 active:scale-98'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isProcessing ? 'Procesando y Cuadrando...' : 'Confirmar Facturación y Despacho'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal 3: Éxito de Despacho & Acciones WhatsApp / Ticket */}
      {dispatchSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="p-5 bg-gradient-to-br from-emerald-800 to-teal-900 text-white text-center border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-2 text-2xl shadow-inner border border-white/10">
                🎉
              </div>
              <h3 className="font-black text-base text-white">¡Pedido Facturado y Cobrado con Éxito!</h3>
              <p className="text-xs text-emerald-200 mt-0.5">
                La factura fue emitida y el dinero quedó asentado en caja.
              </p>
            </div>

            <div className="p-5 space-y-4 text-xs">
              
              {/* Receipt & Cash Details */}
              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Factura N°:</span>
                  <span className="font-mono font-black text-white text-sm">{dispatchSuccessData.invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Caja Cuadrada:</span>
                  <span className="font-bold text-emerald-400">{dispatchSuccessData.cashRegisterName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Despachado por:</span>
                  <span className="font-bold text-slate-200">{dispatchSuccessData.employeeName}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-800">
                  <span className="text-slate-400 font-semibold">Cobrado:</span>
                  <span className="font-mono font-black text-emerald-400">
                    ${dispatchSuccessData.order.total.toFixed(2)} USD ({dispatchSuccessData.order.payment_method})
                  </span>
                </div>
              </div>

              {/* WhatsApp Action Box */}
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span>Nota de Entrega WhatsApp:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyWhatsappText(dispatchSuccessData.whatsappText)}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedWhatsapp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedWhatsapp ? '¡Copiado!' : 'Copiar Texto'}</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-300 line-clamp-3 bg-[#090d16] p-2 rounded-lg border border-emerald-900/60 font-mono text-[10px]">
                  {dispatchSuccessData.whatsappText}
                </p>

                <button
                  type="button"
                  onClick={() => window.open(dispatchSuccessData.whatsappUrl, '_blank')}
                  className="w-full py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <Send className="w-4 h-4" />
                  <span>Abrir Chat de WhatsApp con el Cliente</span>
                </button>
              </div>

              {/* Ticket POS Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onOpenReceipt(dispatchSuccessData.saleData);
                    setDispatchSuccessData(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>Ver / Imprimir Ticket POS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDispatchSuccessData(null)}
                  className="px-4 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold rounded-xl transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
