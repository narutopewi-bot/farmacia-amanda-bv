import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Building2, 
  CreditCard, 
  Lock, 
  Save, 
  Truck, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  ShieldCheck, 
  Smartphone, 
  MapPin, 
  FileText,
  UserCheck,
  RefreshCw,
  Eye,
  EyeOff,
  ShoppingCart,
  Landmark,
  Users,
  Package,
  AlertTriangle,
  ShoppingBag,
  Warehouse as WarehouseIcon,
  BarChart3,
  Bell,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  HelpCircle,
  Info,
  Clock,
  Shield,
  Tags,
  Plus,
  Edit2,
  Trash2,
  Search,
  X
} from 'lucide-react';
import { Settings, Employee, Category } from '../types';

interface SettingsViewProps {
  settings: Settings;
  employees: Employee[];
  currentUser: Employee | null;
  categories?: Category[];
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  settings, 
  employees, 
  currentUser,
  categories = [],
  onRefresh 
}) => {
  const [activeTab, setActiveTab] = useState<'BANK' | 'PROFILE' | 'PASSWORDS' | 'DELIVERY' | 'CATEGORIES'>('BANK');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Bank Details & Exchange Rate Form State
  const [bankForm, setBankForm] = useState({
    exchange_rate: settings.exchange_rate?.toString() || '85.00',
    bank_name: settings.bank_name || 'Banco de Venezuela',
    bank_account_number: settings.bank_account_number || '',
    bank_phone: settings.bank_phone || '',
    bank_id_number: settings.bank_id_number || '',
    bank_holder: settings.bank_holder || '',
    zelle_email: settings.zelle_email || '',
    zelle_holder: settings.zelle_holder || ''
  });

  // 2. Pharmacy Business Profile Form State
  const [profileForm, setProfileForm] = useState({
    pharmacy_name: settings.pharmacy_name || 'Expendio de Medicinas Amanda B&V C.A.',
    rif: settings.rif || 'J-40192841-0',
    sanitary_license: settings.sanitary_license || 'SICM: 50530',
    phone: settings.phone || '0212-555-4321 / 0414-999-8877',
    address: settings.address || 'Av. Principal Los Rosales, Local 12, Caracas',
    welcome_message: settings.welcome_message || 'Salud y bienestar a tu alcance con los mejores precios'
  });

  // 3. Delivery Rates Form State
  const [deliveryForm, setDeliveryForm] = useState({
    delivery_cost: settings.delivery_cost?.toString() || '1.00',
    min_free_delivery: settings.min_free_delivery?.toString() || '30.00'
  });

  // 4. Password / PIN & Permissions Change State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>(currentUser?.id || (employees[0]?.id || 1));
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'CAJERO' | 'FARMACEUTICO' | 'BODEGUERO'>('CAJERO');
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  // 5. Category Management State
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' });
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  const AVAILABLE_MODULES = [
    { id: 'dashboard', name: 'Inicio / Panel Principal', desc: 'Resumen de ventas diarias y accesos directos.', icon: SettingsIcon, cat: 'General' },
    { id: 'pos', name: 'Punto de Venta (VENTAS)', desc: 'Facturación en mostrador, emisión de tickets y cobro en $ y Bs.', icon: ShoppingCart, cat: 'Caja y Ventas' },
    { id: 'cash', name: 'Control de Caja y Turnos', desc: 'Apertura de terminal, arqueos ciegos y comprobantes de cierre.', icon: Landmark, cat: 'Caja y Ventas' },
    { id: 'customers', name: 'Directorio de Clientes', desc: 'Búsqueda de clientes y registro rápido de clientes nuevos.', icon: Users, cat: 'Caja y Ventas' },
    { id: 'credits', name: 'Créditos & Cuentas por Cobrar', desc: 'Consulta de saldos pendientes y registro de abonos de dinero.', icon: CreditCard, cat: 'Administración' },
    { id: 'inventory', name: 'Medicamentos e Inventario', desc: 'Stock de medicamentos, precios en $ y Bs, y catálogo.', icon: Package, cat: 'Inventario' },
    { id: 'expiries', name: 'Lotes y Semáforo de Vencimientos', desc: 'Alertas de medicinas próximas a caducar a 30, 60 y 90 días.', icon: AlertTriangle, cat: 'Inventario' },
    { id: 'purchases', name: 'Compras a Proveedores', desc: 'Ingreso de facturas de droguerías y costos en divisas.', icon: ShoppingBag, cat: 'Inventario' },
    { id: 'suppliers', name: 'Droguerías y Proveedores', desc: 'Directorio de laboratorios, distribuidores médicos y contactos.', icon: Truck, cat: 'Inventario' },
    { id: 'warehouse', name: 'Depósitos y Almacenes', desc: 'Gestión de anaqueles, depósito y traslados de mercancía.', icon: WarehouseIcon, cat: 'Inventario' },
    { id: 'orders', name: 'Pedidos Tienda Online', desc: 'Recepción y despacho de pedidos web de clientes.', icon: Bell, cat: 'Delivery & Web' },
    { id: 'online_reports', name: 'Ventas Web & Delivery', desc: 'Supervisión de pedidos a domicilio y motorizados.', icon: Truck, cat: 'Delivery & Web' },
    { id: 'reports', name: 'Reportes y Analítica SENIAT', desc: 'Libro fiscal SENIAT, rentabilidad neta y gráficos gerenciales.', icon: BarChart3, cat: 'Gerencia' },
    { id: 'employees', name: 'Empleados y Turnos', desc: 'Directorio del equipo de farmacia, turnos y horarios.', icon: UserCheck, cat: 'Gerencia' },
    { id: 'settings', name: 'Configuración del Sistema', desc: 'Cuentas bancarias, tasa BCV, RIF y datos fiscales.', icon: SettingsIcon, cat: 'Gerencia' },
  ];

  useEffect(() => {
    const emp = employees.find(e => e.id === selectedEmployeeId);
    if (emp) {
      setSelectedRole(emp.role);
      const perms = Array.isArray(emp.permissions) ? emp.permissions : [];
      if (perms.length > 0) {
        setSelectedPermissions(perms);
      } else {
        if (emp.role === 'ADMIN') {
          setSelectedPermissions(AVAILABLE_MODULES.map(m => m.id));
        } else if (emp.role === 'CAJERO') {
          setSelectedPermissions(['dashboard', 'pos', 'cash', 'customers', 'orders']);
        } else if (emp.role === 'FARMACEUTICO') {
          setSelectedPermissions(['dashboard', 'pos', 'inventory', 'expiries', 'customers']);
        } else if (emp.role === 'BODEGUERO') {
          setSelectedPermissions(['dashboard', 'inventory', 'warehouse', 'suppliers']);
        } else {
          setSelectedPermissions(['dashboard', 'pos']);
        }
      }
    }
  }, [selectedEmployeeId, employees]);

  useEffect(() => {
    setBankForm({
      exchange_rate: settings.exchange_rate?.toString() || '85.00',
      bank_name: settings.bank_name || '',
      bank_account_number: settings.bank_account_number || '',
      bank_phone: settings.bank_phone || '',
      bank_id_number: settings.bank_id_number || '',
      bank_holder: settings.bank_holder || '',
      zelle_email: settings.zelle_email || '',
      zelle_holder: settings.zelle_holder || ''
    });

    setProfileForm({
      pharmacy_name: settings.pharmacy_name || 'Expendio de Medicinas Amanda B&V C.A.',
      rif: settings.rif || 'J-40192841-0',
      sanitary_license: settings.sanitary_license || 'SICM: 50530',
      phone: settings.phone || '',
      address: settings.address || '',
      welcome_message: settings.welcome_message || ''
    });

    setDeliveryForm({
      delivery_cost: settings.delivery_cost?.toString() || '1.00',
      min_free_delivery: settings.min_free_delivery?.toString() || '30.00'
    });
  }, [settings]);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg('');
    } else {
      setSuccessMsg(msg);
      setErrorMsg('');
    }
    setTimeout(() => {
      setSuccessMsg('');
      setErrorMsg('');
    }, 4000);
  };

  // Save Bank or General Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        ...profileForm,
        ...bankForm,
        exchange_rate: Number(bankForm.exchange_rate) || 85.0,
        delivery_cost: Number(deliveryForm.delivery_cost) || 2.50,
        min_free_delivery: Number(deliveryForm.min_free_delivery) || 30.00
      };

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Error al guardar la configuración');

      onRefresh();
      showNotification('¡Configuración actualizada y sincronizada con éxito!');
    } catch (err: any) {
      showNotification(err.message || 'Error al actualizar', true);
    } finally {
      setIsSaving(false);
    }
  };

  // Change Employee PIN or Password
  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      showNotification('El nuevo PIN y su confirmación no coinciden', true);
      return;
    }
    if (newPin.length < 4) {
      showNotification('El PIN debe tener al menos 4 caracteres o dígitos', true);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/employees/${selectedEmployeeId}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar la contraseña');

      setNewPin('');
      setConfirmPin('');
      onRefresh();
      showNotification('¡Contraseña / PIN de usuario actualizado con éxito!');
    } catch (err: any) {
      showNotification(err.message || 'Error al actualizar PIN', true);
    } finally {
      setIsSaving(false);
    }
  };

  const applyPreset = (preset: 'ALL' | 'CASHIER' | 'PHARMACIST' | 'WAREHOUSE' | 'NONE') => {
    switch (preset) {
      case 'ALL':
        setSelectedPermissions(AVAILABLE_MODULES.map(m => m.id));
        setSelectedRole('ADMIN');
        break;
      case 'CASHIER':
        setSelectedPermissions(['dashboard', 'pos', 'cash', 'customers', 'orders']);
        setSelectedRole('CAJERO');
        break;
      case 'PHARMACIST':
        setSelectedPermissions(['dashboard', 'pos', 'inventory', 'expiries', 'customers']);
        setSelectedRole('FARMACEUTICO');
        break;
      case 'WAREHOUSE':
        setSelectedPermissions(['dashboard', 'inventory', 'warehouse', 'suppliers']);
        setSelectedRole('BODEGUERO');
        break;
      case 'NONE':
        setSelectedPermissions([]);
        break;
    }
  };

  const togglePermission = (permId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleSavePermissions = async () => {
    setIsSavingPermissions(true);
    try {
      const res = await fetch(`/api/employees/${selectedEmployeeId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: selectedPermissions,
          role: selectedRole
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar permisos');
      const empName = employees.find(e => e.id === selectedEmployeeId)?.name || 'trabajador';
      showNotification(`¡Permisos de ${empName} guardados y actualizados con éxito!`);
      onRefresh();
    } catch (err: any) {
      showNotification(err.message || 'Error al guardar permisos', true);
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCategoryFormData({ name: '', description: '' });
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryFormData({ name: cat.name, description: cat.description || '' });
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = categoryFormData.name.trim();
    if (!trimmedName) {
      showNotification('El nombre de la categoría es obligatorio', true);
      return;
    }

    setIsCategorySubmitting(true);
    try {
      if (editingCategory) {
        const res = await fetch(`/api/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trimmedName,
            description: categoryFormData.description.trim()
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al actualizar la categoría');
        showNotification(`Categoría "${trimmedName}" actualizada exitosamente`);
      } else {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trimmedName,
            description: categoryFormData.description.trim()
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al crear la categoría');
        showNotification(`Categoría "${trimmedName}" creada exitosamente`);
      }
      setShowCategoryModal(false);
      setCategoryFormData({ name: '', description: '' });
      setEditingCategory(null);
      onRefresh();
    } catch (err: any) {
      showNotification(err.message || 'Error al procesar la categoría', true);
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsDeletingCategory(true);
    try {
      const res = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar la categoría');
      showNotification(`Categoría "${categoryToDelete.name}" eliminada correctamente`);
      setCategoryToDelete(null);
      onRefresh();
    } catch (err: any) {
      showNotification(err.message || 'Error al eliminar la categoría', true);
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const filteredCategories = categories.filter(cat => {
    const q = categorySearch.toLowerCase().trim();
    if (!q) return true;
    return cat.name.toLowerCase().includes(q) || (cat.description && cat.description.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#0f172a] text-emerald-400 rounded-2xl border border-slate-800 shadow-sm">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">
                Panel de Configuración del Sistema
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-950/70 text-emerald-300 border border-emerald-800/80 px-2.5 py-0.5 rounded-full">
                Control Total
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Modifica cuentas bancarias, Pago Móvil, Zelle, tasa BCV, datos fiscales y contraseñas de cajeros
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs transition flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Recargar Datos</span>
        </button>
      </div>

      {/* Notifications Alert */}
      {successMsg && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-950/70 border border-red-800 text-red-200 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('BANK')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'BANK'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Cuentas Bancarias & Tasa ($ / Bs)</span>
        </button>

        <button
          onClick={() => setActiveTab('PASSWORDS')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'PASSWORDS'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Permisos de Trabajadores & PINs de Caja</span>
        </button>

        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'PROFILE'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Datos de la Farmacia & Ticket</span>
        </button>

        <button
          onClick={() => setActiveTab('DELIVERY')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'DELIVERY'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Tarifas de Delivery & Web</span>
        </button>

        <button
          onClick={() => setActiveTab('CATEGORIES')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'CATEGORIES'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Tags className="w-4 h-4" />
          <span>Categorías de Medicamentos</span>
          {categories.length > 0 && (
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
              activeTab === 'CATEGORIES' ? 'bg-emerald-800 text-white' : 'bg-slate-800 text-emerald-300 border border-slate-700'
            }`}>
              {categories.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: BANK DETAILS & TASA BCV */}
      {activeTab === 'BANK' && (
        <form onSubmit={handleSaveSettings} className="space-y-5">
          {/* Tasa BCV Highlight Card */}
          <div className="bg-gradient-to-r from-emerald-700 to-teal-800 p-5 rounded-2xl text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 border border-emerald-600/40">
            <div>
              <div className="flex items-center gap-2 text-emerald-200 font-bold text-xs uppercase tracking-wider">
                <DollarSign className="w-4 h-4" />
                <span>Tasa Oficial de Cambio (USD a Bolívares)</span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Esta tasa actualiza en tiempo real los precios de la Tienda Online y del Punto de Venta POS.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-[#090d16]/70 p-2 rounded-2xl backdrop-blur-xs border border-emerald-500/30">
              <span className="text-sm font-black text-emerald-300">1 USD =</span>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={bankForm.exchange_rate}
                  onChange={e => setBankForm({ ...bankForm, exchange_rate: e.target.value })}
                  className="w-32 py-1.5 px-3 bg-[#0f172a] text-emerald-400 font-mono font-black text-base rounded-xl text-center border border-slate-700 focus:outline-emerald-500"
                />
              </div>
              <span className="text-sm font-black text-emerald-300">Bs.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Pago Móvil & Cuentas Nacionales (Bs) */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-extrabold text-sm text-white">Datos para Pago Móvil y Transferencias (Bs.)</h3>
                  <p className="text-[11px] text-slate-400">Se muestran al cliente en el carrito de la tienda web</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Nombre del Banco Receptor</label>
                  <input
                    type="text"
                    required
                    value={bankForm.bank_name}
                    onChange={e => setBankForm({ ...bankForm, bank_name: e.target.value })}
                    placeholder="Ej: Banco de Venezuela, Banesco, Mercantil..."
                    className="w-full p-2.5 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Número de Teléfono (Pago Móvil)</label>
                  <input
                    type="text"
                    required
                    value={bankForm.bank_phone}
                    onChange={e => setBankForm({ ...bankForm, bank_phone: e.target.value })}
                    placeholder="Ej: 0414-555-1234"
                    className="w-full p-2.5 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Cédula o RIF Titular</label>
                    <input
                      type="text"
                      required
                      value={bankForm.bank_id_number}
                      onChange={e => setBankForm({ ...bankForm, bank_id_number: e.target.value })}
                      placeholder="Ej: J-40192841-0"
                      className="w-full p-2.5 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Nombre del Titular</label>
                    <input
                      type="text"
                      required
                      value={bankForm.bank_holder}
                      onChange={e => setBankForm({ ...bankForm, bank_holder: e.target.value })}
                      placeholder="Ej: Farmacia FarmaSalud C.A."
                      className="w-full p-2.5 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Número de Cuenta Bancaria (20 dígitos)</label>
                  <input
                    type="text"
                    value={bankForm.bank_account_number}
                    onChange={e => setBankForm({ ...bankForm, bank_account_number: e.target.value })}
                    placeholder="0102-0000-00-0000000000"
                    className="w-full p-2.5 bg-[#0f172a] border border-slate-700 rounded-xl font-mono font-bold text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Zelle & Divisas ($) */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <CreditCard className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="font-extrabold text-sm text-white">Datos para Pagos en Dólares (Zelle / Divisas)</h3>
                  <p className="text-[11px] text-slate-400">Datos mostrados para transferencias internacionales o Zelle</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Correo Electrónico de Zelle</label>
                  <input
                    type="email"
                    value={bankForm.zelle_email}
                    onChange={e => setBankForm({ ...bankForm, zelle_email: e.target.value })}
                    placeholder="pagos@farmaciasalud.com"
                    className="w-full p-2.5 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Nombre del Titular Zelle</label>
                  <input
                    type="text"
                    value={bankForm.zelle_holder}
                    onChange={e => setBankForm({ ...bankForm, zelle_holder: e.target.value })}
                    placeholder="FarmaSalud LLC / Carlos Mendoza"
                    className="w-full p-2.5 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="p-3 bg-purple-950/60 border border-purple-800/80 rounded-xl text-purple-200 text-[11px] space-y-1 mt-4">
                  <div className="font-bold flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <span>Transparencia en la Tienda</span>
                  </div>
                  <p className="text-purple-300">
                    Al actualizar estos datos, el cliente verá la tarjeta bancaria con el botón de copiar cuenta y el monto exacto a transferir calculado a la tasa oficial del día.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando Cambios...' : 'Guardar Información Bancaria'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: PERMISOS DE TRABAJADORES & PINS DE CAJA */}
      {activeTab === 'PASSWORDS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Employee list selection */}
          <div className="lg:col-span-4 bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Trabajadores de Farmacia</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {employees.length} usuarios
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Selecciona al trabajador para definir qué puede hacer en el sistema y cambiar su clave PIN.
            </p>

            <div className="space-y-2 mt-3">
              {employees.map(emp => {
                const isSelected = selectedEmployeeId === emp.id;
                const isAdmin = emp.role === 'ADMIN';
                const activePermsCount = emp.permissions && Array.isArray(emp.permissions) && emp.permissions.length > 0
                  ? emp.permissions.length
                  : (isAdmin ? AVAILABLE_MODULES.length : (emp.role === 'CAJERO' ? 5 : (emp.role === 'FARMACEUTICO' ? 5 : 4)));

                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => {
                      setSelectedEmployeeId(emp.id);
                      setNewPin('');
                      setConfirmPin('');
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                        : 'bg-[#0f172a] border-slate-800 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                        <span>{emp.name}</span>
                        {currentUser?.id === emp.id && (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800">
                            Tú
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Usuario: <span className="font-bold text-slate-200">@{emp.username}</span> · {emp.shift || 'Turno'}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 pt-0.5">
                        <Shield className="w-3 h-3" />
                        <span>{activePermsCount} de {AVAILABLE_MODULES.length} módulos permitidos</span>
                      </div>
                    </div>

                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 ${
                      isAdmin ? 'bg-purple-950/70 text-purple-300 border border-purple-800/80' : 'bg-blue-950/70 text-blue-300 border border-blue-800/80'
                    }`}>
                      {emp.role}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-3 bg-[#0f172a] border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1 mt-4">
              <div className="font-bold text-slate-200 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                <span>Seguridad Individual</span>
              </div>
              <p>
                Cada trabajador opera con su propio usuario y PIN. Esto garantiza que cada venta, cuadre de caja y movimiento quede auditado con su nombre responsable.
              </p>
            </div>
          </div>

          {/* Right Column: Permissions Matrix & PIN Form */}
          <div className="lg:col-span-8 space-y-5">
            {/* Selected Employee Info Banner */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-white text-base">
                    {employees.find(e => e.id === selectedEmployeeId)?.name}
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    (@{employees.find(e => e.id === selectedEmployeeId)?.username})
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  C.I: {employees.find(e => e.id === selectedEmployeeId)?.id_number} &bull; Turno: {employees.find(e => e.id === selectedEmployeeId)?.shift || 'Mañana'}
                </p>
              </div>

              {/* Role Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-300 whitespace-nowrap">
                  Rol Principal:
                </label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as any)}
                  className="bg-[#0f172a] border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ADMIN">👑 Administrador (Acceso Total)</option>
                  <option value="CAJERO">👤 Cajero (Ventas Mostrador)</option>
                  <option value="FARMACEUTICO">💊 Regente Farmacéutico</option>
                  <option value="BODEGUERO">📦 Bodeguero / Almacén</option>
                </select>
              </div>
            </div>

            {/* CARD 1: EXPLICACIÓN Y ACTUALIZACIÓN DE PIN DE CAJA */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-950/70 border border-amber-800/80 text-amber-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <span>¿Cómo funciona el PIN de la Caja? & Actualizar Clave</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Código secreto personal que desbloquea la terminal de ventas y firma los cierres
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPin ? 'Ocultar' : 'Ver PIN'}</span>
                </button>
              </div>

              {/* Explicación didáctica */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
                <div className="p-3 bg-[#0f172a] rounded-xl border border-slate-800 space-y-1">
                  <div className="font-bold text-amber-400 flex items-center gap-1">
                    <span>1. Desbloqueo</span>
                  </div>
                  <p className="text-slate-300 leading-snug">
                    Al entrar a trabajar, el cajero introduce su usuario y su PIN secreto para operar la pantalla de ventas.
                  </p>
                </div>
                <div className="p-3 bg-[#0f172a] rounded-xl border border-slate-800 space-y-1">
                  <div className="font-bold text-emerald-400 flex items-center gap-1">
                    <span>2. Firma de Caja</span>
                  </div>
                  <p className="text-slate-300 leading-snug">
                    Al presionar "Abrir Caja", el sistema le asigna la responsabilidad de esa gaveta a su nombre y nadie más puede alterar su dinero.
                  </p>
                </div>
                <div className="p-3 bg-[#0f172a] rounded-xl border border-slate-800 space-y-1">
                  <div className="font-bold text-blue-400 flex items-center gap-1">
                    <span>3. Cuadre y Cierre</span>
                  </div>
                  <p className="text-slate-300 leading-snug">
                    Al terminar el turno, el cajero cuenta su efectivo físico, realiza su arqueo ciego y el ticket fiscal sale firmado con su usuario.
                  </p>
                </div>
              </div>

              {/* Formulario de cambio de PIN */}
              <form onSubmit={handleUpdatePin} className="pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">
                      Nuevo PIN de Caja (mínimo 4 dígitos) *
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPin ? 'text' : 'password'}
                        required
                        maxLength={10}
                        value={newPin}
                        onChange={e => setNewPin(e.target.value)}
                        placeholder="Ej: 1234, 4321..."
                        className="w-full pl-9 pr-3 py-2.5 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-xl font-mono text-sm font-bold focus:outline-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 block mb-1">
                      Confirmar Nuevo PIN *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPin ? 'text' : 'password'}
                        required
                        maxLength={10}
                        value={confirmPin}
                        onChange={e => setNewPin(e.target.value)}
                        placeholder="Repite el nuevo PIN..."
                        className="w-full pl-9 pr-3 py-2.5 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-xl font-mono text-sm font-bold focus:outline-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end mt-3">
                  <button
                    type="submit"
                    disabled={isSaving || !newPin || !confirmPin}
                    className={`py-2.5 px-5 rounded-xl font-bold text-xs text-white transition flex items-center justify-center gap-2 cursor-pointer ${
                      isSaving || !newPin || !confirmPin
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : 'bg-emerald-600 hover:bg-emerald-500 shadow-md'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Guardando PIN...' : 'Actualizar PIN de este Trabajador'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* CARD 2: ASIGNACIÓN DE PERMISOS: ¿QUÉ HACE CADA UNO DE MIS TRABAJADORES? */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-950/70 border border-purple-800/80 text-purple-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">
                      Asignación de Permisos: ¿Qué hace cada uno de mis trabajadores?
                    </h4>
                    <p className="text-xs text-slate-400">
                      Marca o desmarca con un clic las pantallas y funciones que este usuario puede usar
                    </p>
                  </div>
                </div>

                <div className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-800 self-start sm:self-auto">
                  {selectedPermissions.length} de {AVAILABLE_MODULES.length} módulos habilitados
                </div>
              </div>

              {/* Plantillas Rápidas (1 Clic) */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Plantillas Rápidas (Asignación en 1 Clic):
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('ALL')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white border border-purple-900/50 hover:border-purple-600 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Acceso Total (Admin)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('CASHIER')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white border border-blue-900/50 hover:border-blue-600 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-blue-400" />
                    <span>Cajero Estándar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('PHARMACIST')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white border border-emerald-900/50 hover:border-emerald-600 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Package className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Regente Farmacéutico</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('WAREHOUSE')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-amber-900/50 hover:border-amber-600 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <WarehouseIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>Bodeguero / Almacén</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('NONE')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 border border-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Desmarcar Todos
                  </button>
                </div>
              </div>

              {/* Matriz interactiva de módulos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2">
                {AVAILABLE_MODULES.map(mod => {
                  const isEnabled = selectedPermissions.includes(mod.id);
                  const Icon = mod.icon;

                  return (
                    <div
                      key={mod.id}
                      onClick={() => togglePermission(mod.id)}
                      className={`p-3 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer select-none ${
                        isEnabled
                          ? 'bg-emerald-950/40 border-emerald-500/80 shadow-sm'
                          : 'bg-[#0f172a] border-slate-800/80 opacity-60 hover:opacity-100 hover:border-slate-700'
                      }`}
                    >
                      <div className="pt-0.5">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                          isEnabled
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-transparent'
                        }`}>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`font-bold text-xs flex items-center gap-1.5 ${
                            isEnabled ? 'text-white' : 'text-slate-400'
                          }`}>
                            <Icon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{mod.name}</span>
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-400">
                            {mod.cat}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {mod.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botón Guardar Permisos */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Los cambios se aplican automáticamente en la barra lateral del trabajador.
                </span>

                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={isSavingPermissions}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingPermissions ? 'Guardando Permisos...' : 'Guardar Permisos del Trabajador'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PHARMACY BUSINESS PROFILE */}
      {activeTab === 'PROFILE' && (
        <form onSubmit={handleSaveSettings} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
          <div className="pb-3 border-b border-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-extrabold text-sm text-white">Perfil de la Farmacia & Datos de Facturación</h3>
              <p className="text-[11px] text-slate-400">Estos datos aparecen en el encabezado de los tickets y comprobantes impresos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Nombre Comercial de la Farmacia</label>
              <input
                type="text"
                required
                value={profileForm.pharmacy_name}
                onChange={e => setProfileForm({ ...profileForm, pharmacy_name: e.target.value })}
                placeholder="Farmacia FarmaSalud C.A."
                className="w-full p-2.5 bg-[#0f172a] border border-slate-700 rounded-xl font-bold text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Número de RIF Fiscal</label>
              <input
                type="text"
                required
                value={profileForm.rif}
                onChange={e => setProfileForm({ ...profileForm, rif: e.target.value })}
                placeholder="J-40192841-0"
                className="w-full p-2.5 bg-[#0f172a] border border-slate-700 rounded-xl font-mono font-bold text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Permiso Sanitario / Registro MSAS</label>
              <input
                type="text"
                value={profileForm.sanitary_license}
                onChange={e => setProfileForm({ ...profileForm, sanitary_license: e.target.value })}
                placeholder="MSAS-9821 / DGF-0192"
                className="w-full p-2.5 bg-[#0f172a] border border-slate-700 rounded-xl font-medium text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Teléfonos de Atención al Cliente</label>
              <input
                type="text"
                value={profileForm.phone}
                onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="(0212) 555-4321 / 0414-999-8877"
                className="w-full p-2.5 bg-[#0f172a] border border-slate-700 rounded-xl font-medium text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-slate-300 block mb-1">Dirección Física del Local</label>
              <input
                type="text"
                value={profileForm.address}
                onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                placeholder="Av. Principal Los Rosales, Local 12, Caracas"
                className="w-full p-2.5 bg-[#0f172a] border border-slate-700 rounded-xl font-medium text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-slate-300 block mb-1">Mensaje de Bienvenida en Tienda Web</label>
              <input
                type="text"
                value={profileForm.welcome_message}
                onChange={e => setProfileForm({ ...profileForm, welcome_message: e.target.value })}
                placeholder="Tu salud y bienestar a tu alcance con los mejores precios"
                className="w-full p-2.5 bg-[#0f172a] border border-slate-700 rounded-xl font-medium text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Actualizar Perfil de Farmacia'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: DELIVERY RATES & ONLINE STORE CONFIG */}
      {activeTab === 'DELIVERY' && (
        <form onSubmit={handleSaveSettings} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
          <div className="pb-3 border-b border-slate-800 flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-extrabold text-sm text-white">Tarifas de Envíos y Delivery</h3>
              <p className="text-[11px] text-slate-400">Configura el costo del motorizado y el umbral para delivery gratis</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-300 block mb-1">
                Costo Base de Delivery ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                <input
                  type="number"
                  step="0.10"
                  required
                  value={deliveryForm.delivery_cost}
                  onChange={e => setDeliveryForm({ ...deliveryForm, delivery_cost: e.target.value })}
                  placeholder="1.00"
                  className="w-full pl-8 pr-3 py-2.5 bg-[#0f172a] border border-slate-700 rounded-xl font-mono font-bold text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Se cobrará automáticamente al cliente cuando elija entrega a domicilio.
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">
                Monto Mínimo de Compra para Delivery Gratis ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                <input
                  type="number"
                  step="1.00"
                  required
                  value={deliveryForm.min_free_delivery}
                  onChange={e => setDeliveryForm({ ...deliveryForm, min_free_delivery: e.target.value })}
                  placeholder="10.00"
                  className="w-full pl-8 pr-3 py-2.5 bg-[#0f172a] border border-slate-700 rounded-xl font-mono font-bold text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Si el pedido supera este monto, el delivery será gratuito automáticamente.
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Actualizar Tarifas de Delivery'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: CATEGORIES MANAGEMENT */}
      {activeTab === 'CATEGORIES' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Header Banner */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 rounded-2xl shadow-xs">
                <Tags className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                  <span>Gestor de Categorías de Medicamentos</span>
                  <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded-full font-bold">
                    {categories.length} categorías
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Crea nuevas categorías, renombra o elimina las existentes para organizar el inventario y la tienda online.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateCategory}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer self-start sm:self-auto shrink-0 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Categoría</span>
            </button>
          </div>

          {/* Search bar and counter */}
          <div className="bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={categorySearch}
                onChange={e => setCategorySearch(e.target.value)}
                placeholder="Buscar categoría por nombre o descripción..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-xl focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="text-xs text-slate-400 font-medium">
              Mostrando <strong className="text-white">{filteredCategories.length}</strong> de <strong className="text-white">{categories.length}</strong> categorías
            </div>
          </div>

          {/* Categories Table */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 border-b border-slate-800 text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Nombre de la Categoría</th>
                    <th className="py-3 px-4">Descripción</th>
                    <th className="py-3 px-4 text-center">Medicamentos Registrados</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <Tags className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-60" />
                        <p className="font-bold text-white text-xs">No se encontraron categorías</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {categorySearch ? 'Intenta con otro término de búsqueda.' : 'Crea tu primera categoría con el botón superior.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((cat, idx) => (
                      <tr key={cat.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono text-slate-500 font-semibold text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                              <Tags className="w-3.5 h-3.5" />
                            </span>
                            <span className="font-bold text-white text-xs">{cat.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                          {cat.description || (
                            <span className="text-slate-500 italic text-[11px]">Sin descripción</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            (cat.product_count || 0) > 0
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/80'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {cat.product_count || 0} {(cat.product_count === 1) ? 'medicamento' : 'medicamentos'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCategory(cat)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                              title="Editar categoría"
                            >
                              <Edit2 className="w-3 h-3 text-emerald-400" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setCategoryToDelete(cat)}
                              className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-950/80 text-red-300 border border-red-900/60 hover:border-red-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                              title="Eliminar categoría"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR CATEGORÍA */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-slate-800 text-white animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Tags className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  {editingCategory ? 'Modificar Categoría' : 'Nueva Categoría Farmacéutica'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={categoryFormData.name}
                  onChange={e => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  placeholder="Ej: Pediatría y Maternidad / Dermatología"
                  className="w-full p-2.5 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Aparecerá en el desplegable de inventario y filtros de búsqueda.
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={categoryFormData.description}
                  onChange={e => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  placeholder="Breve detalle sobre los medicamentos y productos que comprende esta categoría..."
                  className="w-full p-2.5 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 border border-slate-700 rounded-xl text-slate-300 font-medium hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCategorySubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{isCategorySubmitting ? 'Guardando...' : (editingCategory ? 'Guardar Cambios' : 'Crear Categoría')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN DE CATEGORÍA */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-red-900/60 text-white animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-2.5 bg-red-950/80 border border-red-800/80 text-red-400 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  ¿Eliminar Categoría?
                </h3>
                <p className="text-xs text-red-300 font-semibold">{categoryToDelete.name}</p>
              </div>
            </div>

            <div className="py-4 space-y-2 text-xs text-slate-300">
              <p>
                ¿Estás seguro de que deseas eliminar permanentemente esta categoría?
              </p>
              {(categoryToDelete.product_count || 0) > 0 ? (
                <div className="p-3 bg-amber-950/50 border border-amber-800/60 rounded-xl text-amber-200 text-[11px] leading-relaxed">
                  <strong>Aviso Importante:</strong> Hay <strong>{categoryToDelete.product_count}</strong> medicamento(s) registrado(s) bajo esta categoría. Al eliminarla, serán reasignados automáticamente a la categoría <strong>'General'</strong> para preservar tus existencias.
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Esta categoría no tiene medicamentos asignados actualmente.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingCategory}
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 border border-slate-700 rounded-xl text-slate-300 font-medium hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingCategory}
                onClick={handleConfirmDeleteCategory}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingCategory ? 'Eliminando...' : 'Sí, Eliminar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
