import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { Sale, Settings } from '../types';

interface ReceiptModalProps {
  sale: Sale | null;
  settings?: Settings;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, settings, onClose }) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const rate = sale.exchange_rate || settings?.exchange_rate || 85.0;
  const totalBs = sale.total_bs || (sale.total * rate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-800 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        
        {/* Header Actions */}
        <div className="bg-slate-950 text-white px-4 sm:px-5 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-xs sm:text-sm">Venta Procesada Exitosamente</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div id="printable-receipt" className="p-4 sm:p-6 font-mono text-xs text-slate-800 bg-white overflow-y-auto flex-1">
          <div className="text-center pb-4 border-b border-dashed border-slate-300">
            <div className="flex justify-center mb-2">
              <img 
                src="/emblem.jpg" 
                alt="Logo Amanda B&V" 
                className="w-14 h-14 rounded-full object-cover border border-slate-200 shadow-xs" 
              />
            </div>
            <h2 className="text-sm font-black text-slate-900 tracking-wider uppercase">
              {settings?.pharmacy_name || 'EXPENDIO DE MEDICINAS AMANDA B&V C.A.'}
            </h2>
            <p className="text-[10px] font-black text-[#cf152b] tracking-wider mt-0.5">
              {settings?.sanitary_license || 'SICM: 50530'}
            </p>
            <p className="text-[11px] text-slate-600">RIF: {settings?.rif || 'J-40192841-0'}</p>
            <p className="text-[11px] text-slate-600">{settings?.address || 'Av. Principal Los Rosales, Local 12'}</p>
            <p className="text-[11px] text-slate-600">Tel: {settings?.phone || '0212-555-4321 / 0414-999-8877'}</p>
          </div>

          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
            <div className="flex justify-between font-bold text-slate-900">
              <span>COMPROBANTE:</span>
              <span>{sale.invoice_number}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>CONDICIÓN DE PAGO:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                sale.is_credit || sale.sale_type === 'CREDIT' || sale.payment_method === 'CREDIT'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-900'
              }`}>
                {sale.is_credit || sale.sale_type === 'CREDIT' || sale.payment_method === 'CREDIT'
                  ? 'VENTA A CRÉDITO'
                  : 'VENTA DE CONTADO'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Fecha / Hora:</span>
              <span>{new Date(sale.created_at || Date.now()).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Tasa Oficial BCV:</span>
              <span className="font-bold">1 USD = {rate.toFixed(2)} Bs.</span>
            </div>
            <div className="flex justify-between">
              <span>Atendido por:</span>
              <span>{sale.employee_name || 'Cajero de Turno'}</span>
            </div>
            <div className="flex justify-between">
              <span>Cliente:</span>
              <span className="font-semibold">{sale.customer_name || 'Consumidor Final'}</span>
            </div>
            {sale.customer_id_number && (
              <div className="flex justify-between">
                <span>Cédula/RIF:</span>
                <span>{sale.customer_id_number}</span>
              </div>
            )}
          </div>

          {/* Product Items Table */}
          <div className="py-2.5 border-b border-dashed border-slate-300">
            <div className="grid grid-cols-12 font-bold pb-1 text-slate-900 text-[11px]">
              <span className="col-span-6">DESCRIPCIÓN</span>
              <span className="col-span-2 text-center">CANT</span>
              <span className="col-span-2 text-right">P.U ($)</span>
              <span className="col-span-2 text-right">TOTAL</span>
            </div>
            <div className="space-y-1 mt-1">
              {sale.items?.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 text-[11px]">
                  <div className="col-span-6">
                    <p className="font-medium text-slate-900">{item.product_name}</p>
                    {item.batch_number && (
                      <p className="text-[9px] text-slate-500">Lote: {item.batch_number} {item.expiry_date ? `(Vence: ${item.expiry_date})` : ''}</p>
                    )}
                  </div>
                  <span className="col-span-2 text-center font-bold">{item.quantity}</span>
                  <span className="col-span-2 text-right">${Number(item.unit_price).toFixed(2)}</span>
                  <span className="col-span-2 text-right font-semibold">${Number(item.subtotal).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Breakdown */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-xs">
            <div className="flex justify-between">
              <span>SUBTOTAL ($):</span>
              <span>${Number(sale.subtotal).toFixed(2)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>DESCUENTO:</span>
                <span>-${Number(sale.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1 border-t border-slate-200">
              <span>TOTAL A PAGAR ($):</span>
              <span>${Number(sale.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-black text-emerald-800 text-sm">
              <span>TOTAL EN BOLÍVARES:</span>
              <span>Bs. {totalBs.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Breakdown (Multimoneda) */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <span className="font-bold text-slate-900 block mb-1">DETALLE DE FORMAS DE PAGO:</span>
            {sale.payments && sale.payments.length > 0 ? (
              sale.payments.map((p, i) => {
                let name = 'Efectivo $';
                if (p.payment_method === 'CASH_BS') name = 'Efectivo Bs';
                if (p.payment_method === 'PAGO_MOVIL') name = 'Pago Móvil';
                if (p.payment_method === 'CARD_BS') name = 'Punto / Tarjeta';
                if (p.payment_method === 'ZELLE_USD') name = 'Zelle';
                if (p.payment_method === 'TRANSFER_BS') name = 'Transferencia';
                if (p.payment_method === 'CREDIT') name = 'Crédito';

                return (
                  <div key={i} className="flex justify-between">
                    <span>&bull; {name} {p.reference ? `(Ref: ${p.reference})` : ''}:</span>
                    <span className="font-bold">
                      {p.currency === 'BS' ? `Bs. ${Number(p.amount).toFixed(2)}` : `$${Number(p.amount).toFixed(2)}`}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="flex justify-between">
                <span>Forma de Pago:</span>
                <span className="font-bold uppercase">{sale.payment_method}</span>
              </div>
            )}

            {sale.change_amount !== undefined && sale.change_amount > 0 && (
              <div className="flex justify-between font-bold text-emerald-700 pt-1 border-t border-slate-100">
                <span>CAMBIO / VUELTO ({sale.change_currency || 'USD'}):</span>
                <span>{sale.change_currency === 'BS' ? `Bs. ${Number(sale.change_amount).toFixed(2)}` : `$${Number(sale.change_amount).toFixed(2)}`}</span>
              </div>
            )}
          </div>

          {/* Footer message */}
          <div className="text-center pt-3 text-[10px] text-slate-500 space-y-1">
            <p className="font-bold text-slate-700">¡GRACIAS POR SU COMPRA!</p>
            <p>Por favor verifique su medicamento antes de retirarse.</p>
            <p>Los medicamentos refrigerados o bajo prescripción no tienen cambio.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-900 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-800 flex gap-2 sm:gap-3 shrink-0">
          <button
            onClick={handlePrint}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-3 sm:px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition active:scale-98 cursor-pointer text-xs sm:text-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ticket (80mm)</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 sm:px-5 py-2.5 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition active:scale-98 text-xs sm:text-sm cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
