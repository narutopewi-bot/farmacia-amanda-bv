import React, { useState } from 'react';
import { Truck, Plus, Search, Building2, Phone, Mail, MapPin, X } from 'lucide-react';
import { Supplier } from '../types';

interface SuppliersViewProps {
  suppliers: Supplier[];
  onRefresh: () => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({ suppliers, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    tax_id: '',
    phone: '',
    email: '',
    address: '',
    contact_person: ''
  });

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.tax_id.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_person.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Error al registrar proveedor');

      setShowModal(false);
      setFormData({ name: '', tax_id: '', phone: '', email: '', address: '', contact_person: '' });
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar droguería o laboratorio..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-xl focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Proveedor</span>
        </button>
      </div>

      {/* Grid of Suppliers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => (
          <div key={s.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-white text-sm">{s.name}</h3>
                  <span className="text-[10px] font-mono bg-[#0f172a] text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded">
                    RIF/NIT: {s.tax_id || 'N/A'}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 mt-3">
                {s.contact_person && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Contacto: <strong className="text-white">{s.contact_person}</strong></span>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{s.phone}</span>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{s.email}</span>
                  </div>
                )}
                {s.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-slate-400 line-clamp-2">{s.address}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Saldo por Pagar:</span>
              <span className={`font-mono font-bold ${s.balance_due > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                ${s.balance_due.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Nuevo Proveedor */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">Registrar Droguería / Laboratorio</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Razón Social *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Droguería Nena C.A."
                  className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">RIF / NIT / RUC</label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
                    placeholder="J-0000000-0"
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0212-5550000"
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Persona de Contacto / Vendedor</label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Ej: Lic. Carlos Pérez"
                  className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="pedidos@laboratorio.com"
                  className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Dirección Fiscal / Despacho</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Zona Industrial..."
                  className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-emerald-500"
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
