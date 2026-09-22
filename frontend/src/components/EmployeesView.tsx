import React, { useState } from 'react';
import { UserCheck, Plus, Search, Shield, Key, Clock, Phone, X } from 'lucide-react';
import { Employee } from '../types';

interface EmployeesViewProps {
  employees: Employee[];
  onRefresh: () => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({ employees, onRefresh }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    id_number: '',
    phone: '',
    role: 'CAJERO' as 'ADMIN' | 'CAJERO' | 'FARMACEUTICO' | 'BODEGUERO',
    shift: 'Mañana',
    username: '',
    pin: '1234'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Error al registrar empleado');
      setShowModal(false);
      setFormData({ name: '', id_number: '', phone: '', role: 'CAJERO', shift: 'Mañana', username: '', pin: '1234' });
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Administrador ERP', bg: 'bg-purple-950/70 text-purple-300 border border-purple-800/80' };
      case 'FARMACEUTICO':
        return { label: 'Regente Farmacéutico', bg: 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/80' };
      case 'CAJERO':
        return { label: 'Cajero Mostrador / POS', bg: 'bg-blue-950/70 text-blue-300 border border-blue-800/80' };
      case 'BODEGUERO':
        return { label: 'Bodeguero / Depósito', bg: 'bg-amber-950/70 text-amber-300 border border-amber-800/80' };
      default:
        return { label: role, bg: 'bg-slate-800 text-slate-300 border border-slate-700' };
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-sm">Equipo & Empleados de Farmacia</h3>
          <p className="text-xs text-slate-400">Gestión de personal farmacéutico, cajeros, turnos y credenciales</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Empleado</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map(emp => {
          const badge = getRoleBadge(emp.role);
          return (
            <div key={emp.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-bold text-white text-sm">{emp.name}</h4>
                    <span className="text-[10px] font-mono text-slate-400">C.I: {emp.id_number}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 mt-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Turno: <strong className="text-white">{emp.shift}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{emp.phone || 'Sin teléfono'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Usuario: <strong className="font-mono text-white">{emp.username}</strong> &bull; PIN: ****</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Estado Operativo:</span>
                <span className="font-semibold text-emerald-400">Activo</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Nuevo Empleado */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">Registrar Personal Farmacéutico</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Alejandro Gómez"
                  className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Cédula / Identificación *</label>
                  <input
                    type="text"
                    required
                    value={formData.id_number}
                    onChange={e => setFormData({ ...formData, id_number: e.target.value })}
                    placeholder="V-24890123"
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0414-000-0000"
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Rol / Cargo *</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CAJERO">Cajero / Mostrador</option>
                    <option value="FARMACEUTICO">Regente Farmacéutico</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="BODEGUERO">Bodeguero / Depósito</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Turno de Trabajo</label>
                  <select
                    value={formData.shift}
                    onChange={e => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Mañana">Mañana (7am - 3pm)</option>
                    <option value="Tarde">Tarde (2pm - 10pm)</option>
                    <option value="Noche">Noche / Guardia</option>
                    <option value="Completo">Horario Completo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-[#0f172a] p-2.5 rounded-xl border border-slate-800">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Usuario Sistema *</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    placeholder="agomez"
                    className="w-full p-1.5 bg-[#090d16] border border-slate-700 text-white rounded-lg font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">PIN Rápido (Caja)</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={formData.pin}
                    onChange={e => setFormData({ ...formData, pin: e.target.value })}
                    placeholder="1234"
                    className="w-full p-1.5 bg-[#090d16] border border-slate-700 text-white rounded-lg font-mono text-xs text-center focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
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
                  Guardar Empleado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
