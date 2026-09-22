import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Search, Calendar, FileText, CheckCircle, Trash2, X } from 'lucide-react';
import { Product, Supplier } from '../types';

interface PurchasesViewProps {
  products: Product[];
  suppliers: Supplier[];
  onRefresh: () => void;
}

interface PurchaseRow {
  product_id: number;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  unit_cost: number;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({ products, suppliers, onRefresh }) => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [supplierId, setSupplierId] = useState<number>(suppliers[0]?.id || 1);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PurchaseRow[]>([
    { product_id: products[0]?.id || 1, batch_number: '', expiry_date: '', quantity: 10, unit_cost: 1.50 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/purchases');
      const data = await res.json();
      setPurchases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { product_id: products[0]?.id || 1, batch_number: '', expiry_date: '', quantity: 10, unit_cost: 1.0 }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof PurchaseRow, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        const updated = { ...item, [field]: value };
        if (field === 'product_id') {
          const prod = products.find(p => p.id === Number(value));
          if (prod) updated.unit_cost = prod.cost_price;
        }
        return updated;
      }
      return item;
    }));
  };

  const totalPurchase = items.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.unit_cost)), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Debe agregar al menos un medicamento');
      return;
    }

    // Validate batch numbers and dates
    for (const item of items) {
      if (!item.batch_number.trim()) {
        alert('Debe indicar el número de lote para todos los medicamentos');
        return;
      }
      if (!item.expiry_date) {
        alert('Debe indicar la fecha de caducidad para todos los medicamentos');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_number: invoiceNumber,
          supplier_id: supplierId,
          employee_id: 1,
          purchase_date: purchaseDate,
          notes,
          items: items.map(i => ({
            product_id: Number(i.product_id),
            batch_number: i.batch_number,
            expiry_date: i.expiry_date,
            quantity: Number(i.quantity),
            unit_cost: Number(i.unit_cost)
          }))
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar la compra');
      }

      setShowModal(false);
      setInvoiceNumber('');
      setItems([{ product_id: products[0]?.id || 1, batch_number: '', expiry_date: '', quantity: 10, unit_cost: 1.50 }]);
      fetchPurchases();
      onRefresh();
      alert('¡Factura de compra registrada! El inventario y los lotes han sido actualizados.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-sm">Compras & Recepción de Medicamentos</h3>
          <p className="text-xs text-slate-400">Ingreso de facturas de proveedores con trazabilidad de lotes y costos</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Factura de Compra</span>
        </button>
      </div>

      {/* List of Purchases */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Cargando compras...</div>
        ) : purchases.length === 0 ? (
          <div className="bg-slate-900 p-12 text-center rounded-2xl border border-slate-800 text-slate-400">
            <ShoppingBag className="w-10 h-10 mx-auto stroke-1 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-white">No hay facturas de compras registradas</p>
            <p className="text-xs text-slate-400">Haga clic en "Registrar Factura de Compra" para ingresar mercancía.</p>
          </div>
        ) : (
          purchases.map(p => (
            <div key={p.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-white">Factura #{p.invoice_number}</span>
                    <span className="text-[10px] bg-emerald-950/70 text-emerald-300 border border-emerald-800/80 font-bold px-2 py-0.5 rounded">
                      {p.payment_status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Proveedor: <strong className="text-slate-200">{p.supplier_name}</strong> &bull; Fecha: {p.purchase_date}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-emerald-400 font-mono">
                    ${p.total_amount.toFixed(2)}
                  </span>
                  <p className="text-[10px] text-slate-400">Registrado por: {p.employee_name || 'Admin'}</p>
                </div>
              </div>

              {/* Items in this purchase */}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase text-slate-400 font-bold bg-slate-800/80 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Medicamento</th>
                      <th className="py-2 px-3">Lote Ingresado</th>
                      <th className="py-2 px-3">Vencimiento</th>
                      <th className="py-2 px-3 text-center">Cantidad</th>
                      <th className="py-2 px-3 text-right">Costo Unitario</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {p.items?.map((it: any) => (
                      <tr key={it.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2 px-3 font-semibold text-white">{it.product_name}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-300">{it.batch_number}</td>
                        <td className="py-2 px-3 font-mono text-slate-300">{it.expiry_date}</td>
                        <td className="py-2 px-3 text-center font-extrabold text-emerald-400">+{it.quantity} und</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300">${it.unit_cost.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-white">${it.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Registrar Factura de Compra */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 border border-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white">Recepción de Factura de Compra</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Nº Factura de Proveedor *</label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    placeholder="Ej: F-004928"
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Droguería / Proveedor *</label>
                  <select
                    value={supplierId}
                    onChange={e => setSupplierId(Number(e.target.value))}
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white rounded-lg font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Fecha de Factura</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)}
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Renglones de Medicamentos */}
              <div className="border border-slate-800 rounded-xl p-3 bg-[#0f172a] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-200 text-xs">Medicamentos Recibidos en Factura:</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2.5 py-1 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> + Agregar Medicamento
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="bg-slate-900 p-3 rounded-xl border border-slate-800 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-12 sm:col-span-4">
                        <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Producto</label>
                        <select
                          value={it.product_id}
                          onChange={e => handleUpdateItem(idx, 'product_id', Number(e.target.value))}
                          className="w-full p-1.5 bg-[#0f172a] border border-slate-700 text-white rounded-lg text-xs"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Nº Lote *</label>
                        <input
                          type="text"
                          required
                          value={it.batch_number}
                          onChange={e => handleUpdateItem(idx, 'batch_number', e.target.value)}
                          placeholder="LT-2026-X"
                          className="w-full p-1.5 bg-[#0f172a] border border-slate-700 text-white rounded-lg font-mono text-xs"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Vencimiento *</label>
                        <input
                          type="date"
                          required
                          value={it.expiry_date}
                          onChange={e => handleUpdateItem(idx, 'expiry_date', e.target.value)}
                          className="w-full p-1.5 bg-[#0f172a] border border-slate-700 text-white rounded-lg text-xs"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-1">
                        <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Cantidad</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={it.quantity}
                          onChange={e => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                          className="w-full p-1.5 bg-[#0f172a] border border-slate-700 text-white rounded-lg text-xs font-bold text-center"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Costo Unit ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={it.unit_cost}
                          onChange={e => handleUpdateItem(idx, 'unit_cost', Number(e.target.value))}
                          className="w-full p-1.5 bg-[#0f172a] border border-slate-700 text-white rounded-lg text-xs font-mono text-right"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-1 flex justify-end">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 text-xs font-bold text-slate-200">
                  <span>Total Factura Estimado:</span>
                  <span className="text-base text-emerald-400 font-mono">${totalPurchase.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Notas u Observaciones</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Observaciones de entrega, transporte, etc."
                  className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Procesando...' : 'Guardar Compra e Ingresar Lotes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
