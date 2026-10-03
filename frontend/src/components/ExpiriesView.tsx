import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Clock, Trash2, ShieldAlert, Edit2, Calendar } from 'lucide-react';
import { Batch } from '../types';

export const ExpiriesView: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'EXPIRED' | 'CRITICAL' | 'WARNING'>('ALL');
  const [loading, setLoading] = useState(true);
  const [showEditDateModal, setShowEditDateModal] = useState(false);
  const [selectedBatchForDate, setSelectedBatchForDate] = useState<Batch | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [isSavingDate, setIsSavingDate] = useState(false);

  const handleOpenEditDate = (b: Batch) => {
    setSelectedBatchForDate(b);
    setNewExpiryDate(b.expiry_date || '');
    setShowEditDateModal(true);
  };

  const handleSaveDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchForDate) return;
    setIsSavingDate(true);
    try {
      const res = await fetch(`/api/batches/${selectedBatchForDate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiry_date: newExpiryDate })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al actualizar fecha de lote');
      }
      setShowEditDateModal(false);
      setSelectedBatchForDate(null);
      fetchBatches();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingDate(false);
    }
  };

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/batches/expiring');
      const data = await res.json();
      setBatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const filtered = batches.filter(b => {
    if (filter === 'ALL') return true;
    return b.status === filter;
  });

  const expiredCount = batches.filter(b => b.status === 'EXPIRED').length;
  const criticalCount = batches.filter(b => b.status === 'CRITICAL').length;
  const warningCount = batches.filter(b => b.status === 'WARNING').length;

  const handleRetireBatch = async (batch: Batch) => {
    if (!confirm(`¿Desea retirar el lote "${batch.batch_number}" de ${batch.product_name} del inventario activo por motivo de caducidad/merma?`)) return;

    try {
      await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: batch.product_id,
          batch_id: batch.id,
          quantity: -batch.stock,
          reason: 'Retiro preventivo por vencimiento/merma',
          type: 'WASTE'
        })
      });
      fetchBatches();
    } catch (err) {
      alert('Error al ajustar el inventario');
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Expiry Traffic Light Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setFilter(filter === 'EXPIRED' ? 'ALL' : 'EXPIRED')}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-md flex items-center justify-between ${
            filter === 'EXPIRED' ? 'bg-red-950/70 border-red-500 text-white' : 'bg-slate-900 border-slate-800 hover:border-red-500/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/80 text-red-400 border border-red-800/80 flex items-center justify-center font-bold">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-red-300">Lotes Vencidos (Caducados)</p>
              <p className="text-2xl font-black text-red-400 font-mono">{expiredCount}</p>
            </div>
          </div>
          <span className="text-[10px] bg-red-900/60 text-red-200 border border-red-700/60 font-bold px-2 py-0.5 rounded-full">
            Retirar Inmediato
          </span>
        </div>

        <div
          onClick={() => setFilter(filter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-md flex items-center justify-between ${
            filter === 'CRITICAL' ? 'bg-orange-950/70 border-orange-500 text-white' : 'bg-slate-900 border-slate-800 hover:border-orange-500/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-950/80 text-orange-400 border border-orange-800/80 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-orange-300">Críticos (Vencen &lt; 30 Días)</p>
              <p className="text-2xl font-black text-orange-400 font-mono">{criticalCount}</p>
            </div>
          </div>
          <span className="text-[10px] bg-orange-900/60 text-orange-200 border border-orange-700/60 font-bold px-2 py-0.5 rounded-full">
            Prioridad FEFO
          </span>
        </div>

        <div
          onClick={() => setFilter(filter === 'WARNING' ? 'ALL' : 'WARNING')}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-md flex items-center justify-between ${
            filter === 'WARNING' ? 'bg-amber-950/70 border-amber-500 text-white' : 'bg-slate-900 border-slate-800 hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/80 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-300">Alerta (Vencen &lt; 90 Días)</p>
              <p className="text-2xl font-black text-amber-400 font-mono">{warningCount}</p>
            </div>
          </div>
          <span className="text-[10px] bg-amber-900/60 text-amber-200 border border-amber-700/60 font-bold px-2 py-0.5 rounded-full">
            En Observación
          </span>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-sm">Control Sanitario de Vencimiento de Medicamentos</h3>
            <p className="text-xs text-slate-400">Gestión de lotes conforme a normativa sanitaria y venta asistida por fecha</p>
          </div>
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                filter === 'ALL' ? 'bg-[#006837] text-white shadow-xs' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Todos ({batches.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Cargando lotes...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">¡Todo en orden sanitario!</p>
            <p className="text-xs text-slate-400">No hay lotes con alerta para el filtro seleccionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 border-b border-slate-800 text-slate-300 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Medicamento</th>
                  <th className="py-3 px-4">Lote</th>
                  <th className="py-3 px-4">Fecha de Vencimiento</th>
                  <th className="py-3 px-4 text-center">Stock Afectado</th>
                  <th className="py-3 px-4 text-right">Costo / Pérdida</th>
                  <th className="py-3 px-4 text-center">Acción Preventiva</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map(b => {
                  let badge = { text: 'En Rango', bg: 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/80' };
                  if (b.status === 'EXPIRED') badge = { text: '¡VENCIDO!', bg: 'bg-red-950/70 text-red-300 border border-red-800/80' };
                  if (b.status === 'CRITICAL') badge = { text: '< 30 Días', bg: 'bg-orange-950/70 text-orange-300 border border-orange-800/80' };
                  if (b.status === 'WARNING') badge = { text: '< 90 Días', bg: 'bg-amber-950/70 text-amber-300 border border-amber-800/80' };

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${badge.bg}`}>
                          {badge.text}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {b.product_name}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-300">
                        {b.batch_number}
                      </td>
                      <td className="py-3 px-4 font-bold font-mono text-white">
                        {b.expiry_date}
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-slate-200">
                        {b.stock} unidades
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300">
                        ${(b.stock * b.cost_price).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditDate(b)}
                            className="px-2.5 py-1 text-xs text-amber-400 hover:text-white hover:bg-amber-600 border border-amber-800/80 rounded-lg transition cursor-pointer flex items-center gap-1 font-bold"
                            title="Modificar fecha de vencimiento"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Modificar Fecha</span>
                          </button>
                          <button
                            onClick={() => handleRetireBatch(b)}
                            className="px-2.5 py-1 text-xs text-red-400 hover:text-white hover:bg-red-600 border border-red-800/80 rounded-lg transition cursor-pointer"
                            title="Dar de baja o registrar merma"
                          >
                            Retirar / Merma
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Modificar Fecha de Vencimiento de Lote */}
      {showEditDateModal && selectedBatchForDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-sm flex items-center gap-2 text-amber-400">
                <Calendar className="w-4 h-4" />
                <span>Modificar Fecha de Vencimiento</span>
              </h3>
              <button
                onClick={() => setShowEditDateModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDate} className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Medicamento:</label>
                <div className="font-bold text-white text-sm bg-slate-800 p-2.5 rounded-xl border border-slate-700">
                  {selectedBatchForDate.product_name}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Número de Lote:</label>
                <div className="font-mono font-bold text-slate-300 text-xs bg-slate-800 p-2.5 rounded-xl border border-slate-700">
                  {selectedBatchForDate.batch_number}
                </div>
              </div>

              <div>
                <label className="text-xs text-amber-300 font-bold block mb-1">Nueva Fecha de Vencimiento:</label>
                <input
                  type="date"
                  required
                  value={newExpiryDate}
                  onChange={e => setNewExpiryDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-amber-500/50 rounded-xl text-white font-bold text-sm focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditDateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingDate}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSavingDate ? 'Guardando...' : 'Guardar Fecha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
