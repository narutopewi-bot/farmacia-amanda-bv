import React, { useState, useEffect } from 'react';
import { Warehouse as WarehouseIcon, MapPin, Plus, AlertTriangle, ArrowRightLeft, CheckCircle, X } from 'lucide-react';
import { Product, Warehouse } from '../types';

interface WarehouseViewProps {
  products: Product[];
  onRefresh: () => void;
}

export const WarehouseView: React.FC<WarehouseViewProps> = ({ products, onRefresh }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showNewWarehouseModal, setShowNewWarehouseModal] = useState(false);

  // New warehouse form
  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whDesc, setWhDesc] = useState('');

  // Adjustment form
  const [selectedProductId, setSelectedProductId] = useState<number>(products[0]?.id || 1);
  const [selectedBatchId, setSelectedBatchId] = useState<number>(0);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<'ADD' | 'SUBTRACT'>('ADD');
  const [adjustReason, setAdjustReason] = useState('Conteo físico periódico');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('/api/warehouses');
      const data = await res.json();
      setWarehouses(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: whName, code: whCode, location_desc: whDesc })
      });
      if (!res.ok) throw new Error('Error al crear almacén');
      setShowNewWarehouseModal(false);
      setWhName('');
      setWhCode('');
      setWhDesc('');
      fetchWarehouses();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) {
      alert('Debe seleccionar un lote para ajustar');
      return;
    }

    const qty = Number(adjustQty);
    if (!qty || qty <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const signedQty = adjustType === 'ADD' ? qty : -qty;
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProductId,
          batch_id: selectedBatchId,
          quantity: signedQty,
          reason: adjustReason,
          type: adjustType === 'ADD' ? 'ADJUSTMENT' : 'WASTE'
        })
      });

      if (!res.ok) throw new Error('Error al ajustar el inventario');

      setShowAdjustModal(false);
      setAdjustQty('');
      onRefresh();
      alert('¡Ajuste de inventario aplicado con éxito!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Top Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-sm">Depósitos, Almacenes & Ubicaciones</h3>
          <p className="text-xs text-slate-400">Gestión de áreas físicas, refrigeradores y ajustes auditados de inventario</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAdjustModal(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Ajuste Manual / Merma</span>
          </button>
          <button
            onClick={() => setShowNewWarehouseModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Depósito</span>
          </button>
        </div>
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {warehouses.map(wh => (
          <div key={wh.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-950/60 text-teal-400 border border-teal-800/80 flex items-center justify-center font-bold">
                <WarehouseIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">{wh.name}</h4>
                <span className="text-[10px] font-mono bg-[#0f172a] text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded">
                  {wh.code}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-300 mb-3">{wh.location_desc || 'Área de almacenamiento'}</p>
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Estado:</span>
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Operativo
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Product Physical Locations in Store */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h4 className="font-bold text-white text-xs">Ubicación Física por Medicamento (Mostrador y Pasillos)</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 border-b border-slate-800 text-slate-300 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Medicamento</th>
                <th className="py-2.5 px-4">Categoría</th>
                <th className="py-2.5 px-4">Ubicación Exacta</th>
                <th className="py-2.5 px-4 text-center">Stock Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-4 font-bold text-white">{p.name}</td>
                  <td className="py-2.5 px-4 text-slate-300">{p.category}</td>
                  <td className="py-2.5 px-4">
                    <span className="inline-flex items-center gap-1 bg-[#0f172a] border border-slate-700 text-slate-200 px-2 py-0.5 rounded text-[11px] font-medium">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      {p.warehouse_location || 'Estantería General'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center font-bold text-emerald-400 font-mono">{p.total_stock} und</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Ajuste Manual de Inventario */}
      {/* Modal: Ajuste Manual de Inventario */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">Ajuste Manual de Inventario</h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Medicamento *</label>
                <select
                  value={selectedProductId}
                  onChange={e => {
                    setSelectedProductId(Number(e.target.value));
                    setSelectedBatchId(0);
                  }}
                  className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Stock: {p.total_stock})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Lote Específico *</label>
                <select
                  value={selectedBatchId}
                  onChange={e => setSelectedBatchId(Number(e.target.value))}
                  className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value={0}>-- Seleccionar Lote --</option>
                  {selectedProduct?.batches?.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batch_number} (Stock: {b.stock} und - Vence: {b.expiry_date})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Tipo de Ajuste</label>
                  <select
                    value={adjustType}
                    onChange={e => setAdjustType(e.target.value as any)}
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ADD">+ Entrada / Corrección Físico</option>
                    <option value="SUBTRACT">- Salida / Merma / Rotura</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustQty}
                    onChange={e => setAdjustQty(e.target.value)}
                    placeholder="Ej: 5"
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Justificativo o Motivo *</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="Ej: Frasco roto durante descarga / Conteo mensual"
                  className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Aplicando...' : 'Aplicar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Almacén */}
      {showNewWarehouseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">Nuevo Depósito o Almacén</h3>
              <button onClick={() => setShowNewWarehouseModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Nombre del Depósito *</label>
                <input
                  type="text"
                  required
                  value={whName}
                  onChange={e => setWhName(e.target.value)}
                  placeholder="Ej: Nevera Vacunas / Depósito B"
                  className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Código Identificador *</label>
                <input
                  type="text"
                  required
                  value={whCode}
                  onChange={e => setWhCode(e.target.value)}
                  placeholder="Ej: ALM-04"
                  className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Descripción / Condiciones</label>
                <input
                  type="text"
                  value={whDesc}
                  onChange={e => setWhDesc(e.target.value)}
                  placeholder="Ej: Rango térmico 2°C - 8°C"
                  className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewWarehouseModal(false)}
                  className="px-4 py-2 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  Crear Depósito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
