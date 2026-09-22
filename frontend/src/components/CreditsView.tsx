import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Receipt, 
  User, 
  Phone, 
  ArrowUpRight, 
  RefreshCw,
  X,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Customer, Employee } from '../types';

interface CreditsViewProps {
  employees: Employee[];
  onRefresh: () => void;
}

interface CreditsData {
  debtors: (Customer & {
    total_credit_sales?: number;
    last_credit_sale_date?: string;
    last_payment_date?: string;
  })[];
  recentPayments: Array<{
    id: number;
    customer_id: number;
    customer_name: string;
    customer_id_number: string;
    amount: number;
    payment_method: string;
    notes?: string;
    employee_name?: string;
    created_at: string;
  }>;
  summary: {
    total_debt: number;
    total_credit_limit: number;
    active_debtors_count: number;
    total_credit_accounts: number;
  };
}

export const CreditsView: React.FC<CreditsViewProps> = ({ employees, onRefresh }) => {
  const [data, setData] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'WITH_DEBT' | 'SOLVENT'>('WITH_DEBT');
  
  // Statement and Payment Modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [statementData, setStatementData] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [abonoAmount, setAbonoAmount] = useState('');
  const [abonoMethod, setAbonoMethod] = useState<'CASH' | 'TRANSFER' | 'CARD'>('CASH');
  const [abonoNotes, setAbonoNotes] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>(employees[0]?.id || 1);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchCredits = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/credits');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching credits data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const handleOpenStatement = async (cust: Customer) => {
    setSelectedCustomer(cust);
    setShowPaymentModal(true);
    setAbonoAmount('');
    setAbonoNotes('');
    try {
      const res = await fetch(`/api/customers/${cust.id}/statement`);
      const stmt = await res.json();
      setStatementData(stmt);
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
          notes: abonoNotes || 'Abono en módulo de créditos',
          employee_id: selectedEmployeeId
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Error al procesar el abono');

      // Refresh statement inside modal
      const stmtRes = await fetch(`/api/customers/${selectedCustomer.id}/statement`);
      const updatedStmt = await stmtRes.json();
      setStatementData(updatedStmt);
      setSelectedCustomer(updatedStmt.customer);
      setAbonoAmount('');
      setAbonoNotes('');

      fetchCredits();
      onRefresh();
      alert('¡Abono registrado con éxito!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredDebtors = (data?.debtors || []).filter(c => {
    const matchSearch = 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.id_number.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search);
    
    if (!matchSearch) return false;
    if (filterType === 'WITH_DEBT') return c.current_debt > 0;
    if (filterType === 'SOLVENT') return c.current_debt === 0;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2.5 bg-amber-950/60 border border-amber-800/60 text-amber-400 rounded-xl">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">
              Cuentas por Cobrar & Créditos a Clientes
            </h2>
            <p className="text-xs text-slate-400">
              Control independiente de líneas de crédito autorizadas, facturas a crédito pendientes y cobro de abonos
            </p>
          </div>
        </div>

        <button
          onClick={fetchCredits}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs transition flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-900 to-rose-950 border border-red-800/60 p-5 rounded-2xl text-white shadow-md">
          <div className="flex items-center justify-between text-rose-200 text-xs font-bold mb-1">
            <span>Deuda Total por Cobrar</span>
            <DollarSign className="w-4 h-4 text-rose-300" />
          </div>
          <div className="text-2xl font-black font-mono">
            ${data?.summary.total_debt.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-rose-200 font-semibold mt-1">
            En {data?.summary.active_debtors_count || 0} clientes deudores
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
            <span>Línea de Crédito Otorgada</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ${data?.summary.total_credit_limit.toFixed(2) || '0.00'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Cupo global aprobado a clientes
          </p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
            <span>Clientes con Crédito Activo</span>
            <User className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {data?.summary.total_credit_accounts || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Clientes con cupo mayor a $0
          </p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
            <span>Disponible Restante</span>
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            ${Math.max(0, (data?.summary.total_credit_limit || 0) - (data?.summary.total_debt || 0)).toFixed(2)}
          </div>
          <p className="text-[11px] text-teal-400 font-semibold mt-1">
            Margen de crédito libre
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente, cédula o teléfono..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-xl font-medium focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-400">Filtrar:</span>
          <div className="flex bg-[#0f172a] border border-slate-800 p-1 rounded-xl gap-1 text-xs">
            <button
              onClick={() => setFilterType('WITH_DEBT')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                filterType === 'WITH_DEBT' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Con Deuda Pendiente
            </button>
            <button
              onClick={() => setFilterType('SOLVENT')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                filterType === 'SOLVENT' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Solventes ($0 Deuda)
            </button>
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                filterType === 'ALL' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos los Cupos
            </button>
          </div>
        </div>
      </div>

      {/* Debtors & Credit Accounts Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-black text-sm text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span>Listado de Cuentas de Crédito ({filteredDebtors.length})</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-300 font-bold text-[11px] border-b border-slate-800 uppercase">
              <tr>
                <th className="p-3.5">Cliente / Cédula</th>
                <th className="p-3.5">Contacto</th>
                <th className="p-3.5 text-right">Límite Aprobado</th>
                <th className="p-3.5 text-right">Saldo Deudor</th>
                <th className="p-3.5 text-right">Crédito Libre</th>
                <th className="p-3.5 text-center">Plazo</th>
                <th className="p-3.5 text-center">Última Actividad</th>
                <th className="p-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredDebtors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No se encontraron cuentas de crédito con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredDebtors.map(c => {
                  const available = Math.max(0, c.credit_limit - c.current_debt);
                  const hasDebt = c.current_debt > 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition">
                      {/* Cliente */}
                      <td className="p-3.5">
                        <div className="font-extrabold text-white">{c.name}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{c.id_number}</div>
                      </td>

                      {/* Contacto */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 text-slate-300 font-medium">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.phone || '-'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{c.email || ''}</div>
                      </td>

                      {/* Límite Aprobado */}
                      <td className="p-3.5 text-right font-mono font-bold text-slate-300">
                        ${c.credit_limit.toFixed(2)}
                      </td>

                      {/* Saldo Deudor */}
                      <td className="p-3.5 text-right font-mono">
                        {hasDebt ? (
                          <span className="font-black text-red-400 bg-red-950/60 border border-red-800/60 px-2 py-0.5 rounded-lg">
                            ${c.current_debt.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-lg">
                            $0.00
                          </span>
                        )}
                      </td>

                      {/* Crédito Libre */}
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                        ${available.toFixed(2)}
                      </td>

                      {/* Plazo */}
                      <td className="p-3.5 text-center font-semibold text-slate-300">
                        {c.credit_days || 30} días
                      </td>

                      {/* Última Actividad */}
                      <td className="p-3.5 text-center text-[10px] text-slate-400">
                        {c.last_payment_date ? (
                          <div>Abono: {new Date(c.last_payment_date).toLocaleDateString()}</div>
                        ) : c.last_credit_sale_date ? (
                          <div>Compra: {new Date(c.last_credit_sale_date).toLocaleDateString()}</div>
                        ) : (
                          <div>Sin compras recientes</div>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleOpenStatement(c)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer ${
                            hasDebt
                              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          }`}
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>{hasDebt ? 'Cobrar / Abonar' : 'Ver Estado'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Estado de Cuenta y Abono a Crédito */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-800 text-white animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-950/60 border border-amber-800/60 text-amber-400 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">Estado de Cuenta & Registro de Cobro</h3>
                  <p className="text-xs text-slate-400">{selectedCustomer.name} · Cédula: {selectedCustomer.id_number}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overview Debt Cards */}
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
                <span className="text-[10px] text-emerald-400 font-bold block uppercase">Disponible Restante</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  ${Math.max(0, selectedCustomer.credit_limit - selectedCustomer.current_debt).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Form Abono */}
            {selectedCustomer.current_debt > 0 ? (
              <form onSubmit={handlePayCredit} className="bg-[#0f172a] p-4 rounded-xl border border-slate-800 mb-4 text-xs">
                <h4 className="font-black text-white mb-2.5 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Cobrar Abono o Pago Total de Deuda</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-0.5">Monto ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      max={selectedCustomer.current_debt}
                      value={abonoAmount}
                      onChange={e => setAbonoAmount(e.target.value)}
                      placeholder={`Máx $${selectedCustomer.current_debt.toFixed(2)}`}
                      className="w-full p-2 bg-slate-900 border border-slate-700 text-white rounded-lg font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-0.5">Forma de Pago</label>
                    <select
                      value={abonoMethod}
                      onChange={e => setAbonoMethod(e.target.value as any)}
                      className="w-full p-2 bg-slate-900 border border-slate-700 text-white rounded-lg font-semibold"
                    >
                      <option value="CASH">💵 Efectivo (Caja)</option>
                      <option value="TRANSFER">🏦 Transferencia / Pago Móvil</option>
                      <option value="CARD">💳 Punto / Tarjeta</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-0.5">Empleado</label>
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(Number(e.target.value))}
                      className="w-full p-2 bg-slate-900 border border-slate-700 text-white rounded-lg font-semibold"
                    >
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition shadow-xs cursor-pointer"
                    >
                      {isProcessing ? 'Guardando...' : 'Aplicar Abono'}
                    </button>
                  </div>
                </div>

                <div className="mt-2">
                  <input
                    type="text"
                    value={abonoNotes}
                    onChange={e => setAbonoNotes(e.target.value)}
                    placeholder="Nota de comprobante o referencia (opcional)..."
                    className="w-full p-2 bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-lg text-xs"
                  />
                </div>
              </form>
            ) : (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 rounded-xl text-xs font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Este cliente se encuentra totalmente al día y solvente. No tiene saldo pendiente por cobrar.</span>
              </div>
            )}

            {/* Invoices and Payments History */}
            <div className="space-y-4 max-h-64 overflow-y-auto pr-1 text-xs">
              {/* Credit Invoices History */}
              <div>
                <h4 className="font-extrabold text-white text-xs mb-1.5">Facturas Emitidas a Crédito:</h4>
                {statementData?.creditSales?.length === 0 ? (
                  <p className="text-slate-500 italic">No hay facturas a crédito registradas.</p>
                ) : (
                  <div className="space-y-1">
                    {statementData?.creditSales?.map((s: any) => (
                      <div key={s.id} className="p-2 bg-[#0f172a] border border-slate-800 rounded-lg flex justify-between items-center text-[11px]">
                        <div>
                          <span className="font-bold text-white font-mono">{s.invoice_number}</span>
                          <span className="text-slate-400 ml-2">{new Date(s.created_at).toLocaleString()}</span>
                        </div>
                        <div className="font-bold font-mono text-red-400">
                          ${Number(s.total).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payments History */}
              <div>
                <h4 className="font-extrabold text-white text-xs mb-1.5">Abonos y Pagos Recibidos:</h4>
                {statementData?.payments?.length === 0 ? (
                  <p className="text-slate-500 italic">No hay abonos registrados para este cliente.</p>
                ) : (
                  <div className="space-y-1">
                    {statementData?.payments?.map((p: any) => (
                      <div key={p.id} className="p-2 bg-[#0f172a] border border-slate-800 rounded-lg flex justify-between items-center text-[11px]">
                        <div>
                          <span className="font-bold text-emerald-400 font-mono">+${Number(p.amount).toFixed(2)}</span>
                          <span className="text-slate-400 ml-2">({p.payment_method})</span>
                          {p.notes && <span className="text-slate-400 ml-2 italic">"{p.notes}"</span>}
                          <p className="text-[10px] text-slate-500">{new Date(p.created_at).toLocaleString()} · Cajero: {p.employee_name || 'Cajero'}</p>
                        </div>
                        <span className="text-[10px] bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-extrabold px-2 py-0.5 rounded">
                          Abonado
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 mt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition cursor-pointer border border-slate-700"
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
