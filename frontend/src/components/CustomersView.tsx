import React, { useState } from 'react';
import { Users, Plus, Search, DollarSign, CreditCard, Receipt, CheckCircle, X, AlertCircle } from 'lucide-react';
import { Customer } from '../types';

interface CustomersViewProps {
  customers: Customer[];
  onRefresh: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ customers, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [statementData, setStatementData] = useState<any>(null);

  // Form New Customer
  const [newCustomer, setNewCustomer] = useState({
    id_number: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    credit_limit: '',
    credit_days: '30',
    notes: ''
  });

  // Form Pay Credit / Abono
  const [abonoAmount, setAbonoAmount] = useState('');
  const [abonoMethod, setAbonoMethod] = useState<'CASH' | 'TRANSFER' | 'CARD'>('CASH');
  const [abonoNotes, setAbonoNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.id_number.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const totalDebt = customers.reduce((acc, c) => acc + c.current_debt, 0);
  const totalCreditLimit = customers.reduce((acc, c) => acc + c.credit_limit, 0);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCustomer,
          credit_limit: Number(newCustomer.credit_limit) || 0,
          credit_days: Number(newCustomer.credit_days) || 30
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al registrar cliente');
      }

      setShowNewModal(false);
      setNewCustomer({ id_number: '', name: '', phone: '', email: '', address: '', credit_limit: '', credit_days: '30', notes: '' });
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenStatement = async (cust: Customer) => {
    setSelectedCustomer(cust);
    setShowStatementModal(true);
    try {
      const res = await fetch(`/api/customers/${cust.id}/statement`);
      const data = await res.json();
      setStatementData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePayCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setIsProcessing(true);

    try {
      const res = await fetch(`/api/customers/${selectedCustomer.id}/pay-credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(abonoAmount),
          payment_method: abonoMethod,
          notes: abonoNotes,
          employee_id: 1
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al procesar el abono');
      }

      setAbonoAmount('');
      setAbonoNotes('');
      // Reload statement
      const refreshRes = await fetch(`/api/customers/${selectedCustomer.id}/statement`);
      const refreshData = await refreshRes.json();
      setStatementData(refreshData);
      setSelectedCustomer(refreshData.customer);
      onRefresh();
      alert('¡Abono registrado con éxito!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/60 text-blue-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Clientes Registrados</p>
            <p className="text-xl font-extrabold text-white">{customers.length}</p>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Clientes con Cuenta de Crédito</p>
            <p className="text-xl font-extrabold text-emerald-400">
              {customers.filter(c => c.credit_limit > 0).length}
            </p>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800/60 text-red-400 flex items-center justify-center font-bold">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Clientes Deudores</p>
            <p className="text-xl font-extrabold text-red-400">
              {customers.filter(c => c.current_debt > 0).length}
            </p>
          </div>
        </div>
      </div>

      {/* Action and Search Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, cédula o teléfono..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-xl focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-700/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nuevo Cliente</span>
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 border-b border-slate-800 text-slate-300 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Cédula / RIF</th>
                <th className="py-3 px-4">Nombre del Cliente</th>
                <th className="py-3 px-4">Contacto (Tel / Email)</th>
                <th className="py-3 px-4">Dirección</th>
                <th className="py-3 px-4 text-right">Límite Crédito</th>
                <th className="py-3 px-4 text-right">Saldo Deudor</th>
                <th className="py-3 px-4 text-center">Compras Totales</th>
                <th className="py-3 px-4 text-center">Historial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(c => {
                const hasDebt = c.current_debt > 0;

                return (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-300">
                      {c.id_number}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {c.name}
                      {c.id === 1 && (
                        <span className="text-[10px] text-slate-400 block font-normal">(Genérico Mostrador)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{c.phone || '-'}</div>
                      <div className="text-[10px] text-slate-400">{c.email || ''}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                      {c.address || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-300">
                      ${c.credit_limit.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold">
                      <span className={hasDebt ? 'text-red-400 bg-red-950/60 border border-red-800/60 px-2 py-0.5 rounded-md' : 'text-slate-500'}>
                        ${c.current_debt.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-300 font-bold">
                      {c.total_purchases || 0} ventas
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenStatement(c)}
                        className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Receipt className="w-3 h-3 text-emerald-400" />
                        <span>Ficha / Historial</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Nuevo Cliente */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-800 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white">Registrar Nuevo Cliente</h3>
              </div>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Cédula / DNI / RIF *</label>
                  <input
                    type="text"
                    required
                    value={newCustomer.id_number}
                    onChange={e => setNewCustomer({ ...newCustomer, id_number: e.target.value })}
                    placeholder="Ej: V-19283741"
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={newCustomer.name}
                    onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="Ej: Laura Morales"
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Teléfono Móvil</label>
                  <input
                    type="text"
                    value={newCustomer.phone}
                    onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="0414-1234567"
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder="cliente@correo.com"
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Dirección de Entrega / Habitación</label>
                <input
                  type="text"
                  value={newCustomer.address}
                  onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Urbanización, Calle, Edificio, Apto..."
                  className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/60">
                <div>
                  <label className="font-semibold text-emerald-300 block mb-1">Línea de Crédito Autorizada ($)</label>
                  <input
                    type="number"
                    step="10"
                    value={newCustomer.credit_limit}
                    onChange={e => setNewCustomer({ ...newCustomer, credit_limit: e.target.value })}
                    placeholder="Ej: 150.00"
                    className="w-full p-2 bg-[#0f172a] border border-emerald-700 rounded-lg font-bold text-white placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-emerald-300 block mb-1">Días de Crédito (Plazo)</label>
                  <input
                    type="number"
                    value={newCustomer.credit_days}
                    onChange={e => setNewCustomer({ ...newCustomer, credit_days: e.target.value })}
                    placeholder="30"
                    className="w-full p-2 bg-[#0f172a] border border-emerald-700 rounded-lg font-bold text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border border-slate-700 rounded-xl text-slate-300 font-medium hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl cursor-pointer"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Estado de Cuenta y Abono a Crédito */}
      {showStatementModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-800 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base">Estado de Cuenta & Crédito</h3>
                <p className="text-xs text-slate-400">{selectedCustomer.name} ({selectedCustomer.id_number})</p>
              </div>
              <button onClick={() => setShowStatementModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Debt Overview Cards */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="p-3 bg-red-950/40 rounded-xl border border-red-800/60 text-center">
                <span className="text-[10px] text-red-400 font-bold block uppercase">Deuda Actual</span>
                <span className="text-xl font-black text-red-400 font-mono">${selectedCustomer.current_debt.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-[#0f172a] rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Límite Aprobado</span>
                <span className="text-xl font-black text-white font-mono">${selectedCustomer.credit_limit.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-800/60 text-center">
                <span className="text-[10px] text-emerald-400 font-bold block uppercase">Crédito Disponible</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  ${Math.max(0, selectedCustomer.credit_limit - selectedCustomer.current_debt).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Form Abono */}
            {selectedCustomer.current_debt > 0 && (
              <form onSubmit={handlePayCredit} className="bg-[#0f172a] p-4 rounded-xl border border-slate-800 mb-4 text-xs">
                <h4 className="font-bold text-white mb-2 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Registrar Abono o Pago de Deuda</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-300 block mb-0.5">Monto a Abonar ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      max={selectedCustomer.current_debt}
                      value={abonoAmount}
                      onChange={e => setAbonoAmount(e.target.value)}
                      placeholder={`Máx $${selectedCustomer.current_debt.toFixed(2)}`}
                      className="w-full p-1.5 bg-slate-900 border border-slate-700 text-white rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-300 block mb-0.5">Método de Pago</label>
                    <select
                      value={abonoMethod}
                      onChange={e => setAbonoMethod(e.target.value as any)}
                      className="w-full p-1.5 bg-slate-900 border border-slate-700 text-white rounded-lg font-medium"
                    >
                      <option value="CASH">Efectivo (Entra a Caja)</option>
                      <option value="TRANSFER">Transferencia / Pago Móvil</option>
                      <option value="CARD">Tarjeta de Débito/Crédito</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition cursor-pointer"
                    >
                      {isProcessing ? 'Procesando...' : 'Registrar Abono'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Past Credit Sales and Payments History */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 text-xs">
              <h4 className="font-bold text-white text-xs">Historial de Pagos y Abonos Recibidos:</h4>
              {statementData?.payments?.length === 0 ? (
                <p className="text-slate-500 text-xs italic">No hay abonos registrados para este cliente.</p>
              ) : (
                <div className="space-y-1">
                  {statementData?.payments?.map((p: any) => (
                    <div key={p.id} className="p-2 bg-[#0f172a] border border-slate-800 rounded-lg flex justify-between items-center text-[11px]">
                      <div>
                        <span className="font-bold text-emerald-400">+${p.amount.toFixed(2)}</span>
                        <span className="text-slate-400 ml-2">({p.payment_method})</span>
                        <p className="text-[9px] text-slate-500">{new Date(p.created_at).toLocaleString()} - Por: {p.employee_name || 'Cajero'}</p>
                      </div>
                      <span className="text-[10px] bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-semibold px-2 py-0.5 rounded">
                        Abono Aplicado
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 mt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowStatementModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs cursor-pointer border border-slate-700"
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
