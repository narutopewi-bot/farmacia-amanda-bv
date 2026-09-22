import React, { useState, useEffect } from 'react';
import { 
  Pill, ShoppingCart, Package, AlertTriangle, Users, 
  Truck, ShoppingBag, Warehouse as WarehouseIcon, UserCheck, 
  Landmark, Bell, BarChart3, Store, CheckCircle, ExternalLink,
  CreditCard, Settings as SettingsIcon, Menu, X, LayoutDashboard
} from 'lucide-react';
import { socket } from './socket';
import { Product, Customer, Supplier, Employee, OnlineOrder, Sale, Settings } from './types';

// Components
import { Navbar } from './components/Navbar';
import { DashboardHomeView } from './components/DashboardHomeView';
import { PosView } from './components/PosView';
import { InventoryView } from './components/InventoryView';
import { ExpiriesView } from './components/ExpiriesView';
import { PurchasesView } from './components/PurchasesView';
import { CustomersView } from './components/CustomersView';
import { CreditsView } from './components/CreditsView';
import { SuppliersView } from './components/SuppliersView';
import { WarehouseView } from './components/WarehouseView';
import { EmployeesView } from './components/EmployeesView';
import { CashRegisterView } from './components/CashRegisterView';
import { OrdersView } from './components/OrdersView';
import { ReportsView } from './components/ReportsView';
import { OnlineOrdersReportView } from './components/OnlineOrdersReportView';
import { OnlineStoreView } from './components/OnlineStoreView';
import { SettingsView } from './components/SettingsView';
import { ReceiptModal } from './components/ReceiptModal';
import { LoginModal } from './components/LoginModal';

type AdminTab = 
  | 'dashboard'
  | 'pos' 
  | 'inventory' 
  | 'expiries' 
  | 'purchases' 
  | 'customers' 
  | 'credits' 
  | 'suppliers' 
  | 'warehouse' 
  | 'employees' 
  | 'cash' 
  | 'orders' 
  | 'online_reports'
  | 'reports'
  | 'settings';

export function App() {
  const [currentView, setCurrentView] = useState<'admin' | 'store'>('admin');
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // User session state (default persisted or prompt login)
  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
    try {
      const saved = localStorage.getItem('farmasalud_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // Check URL view parameter (e.g. ?view=store, /tienda, /store, #tienda)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (
      params.get('view') === 'store' ||
      path.includes('/tienda') ||
      path.includes('/store') ||
      path.includes('/catalogo') ||
      hash.includes('tienda') ||
      hash.includes('store')
    ) {
      setCurrentView('store');
    }
  }, []);

  const handleLoginSuccess = (user: Employee) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('farmasalud_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    setShowLoginModal(false);
    setCurrentView('admin');
    // Cajero goes straight to POS
    if (user.role === 'CAJERO') {
      setActiveTab('pos');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('farmasalud_user');
    } catch (e) {
      console.error(e);
    }
  };

  // Core Data
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [settings, setSettings] = useState<Settings>({
    id: 1,
    exchange_rate: 85.0,
    bank_name: 'Banco de Venezuela',
    bank_account_number: '0102-0192-83-0001928374',
    bank_phone: '0414-555-1234',
    bank_id_number: 'J-40192841-0',
    bank_holder: 'Farmacia FarmaSalud C.A.',
    zelle_email: 'pagos@farmasalud.com',
    zelle_holder: 'FarmaSalud Inc'
  });
  const [loading, setLoading] = useState(true);

  // Printable receipt state
  const [currentSaleReceipt, setCurrentSaleReceipt] = useState<Sale | null>(null);

  // Audio for live web order alerts
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio alert could not play automatically:', e);
    }
  };

  // Fetch all core datasets
  const fetchAllData = async () => {
    try {
      const [pRes, cRes, sRes, eRes, oRes, setRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/customers'),
        fetch('/api/suppliers'),
        fetch('/api/employees'),
        fetch('/api/orders'),
        fetch('/api/settings')
      ]);

      const [pJson, cJson, sJson, eJson, oJson, setJson] = await Promise.all([
        pRes.json(),
        cRes.json(),
        sRes.json(),
        eRes.json(),
        oRes.json(),
        setRes.json()
      ]);

      setProducts(pJson);
      setCustomers(cJson);
      setSuppliers(sJson);
      setEmployees(eJson);
      if (currentUser && Array.isArray(eJson)) {
        const freshUser = eJson.find((emp: Employee) => emp.id === currentUser.id);
        if (freshUser) {
          setCurrentUser(freshUser);
          try {
            localStorage.setItem('farmasalud_user', JSON.stringify(freshUser));
          } catch (e) {}
        }
      }
      setOrders(oJson);
      if (setJson && setJson.id) setSettings(setJson);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateExchangeRate = async (rate: number) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, exchange_rate: rate })
      });
      const updated = await res.json();
      setSettings(updated);
    } catch (err) {
      console.error('Error updating exchange rate:', err);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Sockets setup
    function onConnect() {
      setIsConnected(true);
    }
    function onDisconnect() {
      setIsConnected(false);
    }

    // Bidirectional stock update
    function onStockUpdated(updatedProduct: Product) {
      setProducts(prev => {
        const index = prev.findIndex(p => p.id === updatedProduct.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = updatedProduct;
          return next;
        }
        return [updatedProduct, ...prev];
      });
    }

    // Live order alert from web store
    function onNewOrder(newOrder: OnlineOrder) {
      playAlertSound();
      setOrders(prev => [newOrder, ...prev]);
    }

    function onOrderStatusUpdated({ orderId, status }: { orderId: number; status: any }) {
      setOrders(prev => prev.map(o => o.id === Number(orderId) ? { ...o, status } : o));
    }

    function onSettingsUpdated(updatedSettings: Settings) {
      setSettings(updatedSettings);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('stock_updated', onStockUpdated);
    socket.on('new_online_order', onNewOrder);
    socket.on('order_status_updated', onOrderStatusUpdated);
    socket.on('settings_updated', onSettingsUpdated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('stock_updated', onStockUpdated);
      socket.off('new_online_order', onNewOrder);
      socket.off('order_status_updated', onOrderStatusUpdated);
      socket.off('settings_updated', onSettingsUpdated);
    };
  }, []);

  const pendingOrdersCount = orders.filter(o => o.status === 'PENDING').length;

  // Role based filtering: If cajero, only show POS, Caja, Clientes and Pedidos
  const allSidebarLinks = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard, roles: ['ADMIN', 'CAJERO'] },
    { id: 'pos', label: 'VENTAS', icon: ShoppingCart, roles: ['ADMIN', 'CAJERO', 'FARMACEUTICO'] },
    { id: 'inventory', label: 'Medicamentos e Inventario', icon: Package, roles: ['ADMIN', 'FARMACEUTICO', 'BODEGUERO'] },
    { id: 'expiries', label: 'Lotes y Vencimientos', icon: AlertTriangle, badge: 'Semáforo', roles: ['ADMIN', 'FARMACEUTICO'] },
    { id: 'purchases', label: 'Compras a Proveedores', icon: ShoppingBag, roles: ['ADMIN'] },
    { id: 'customers', label: 'Clientes', icon: Users, roles: ['ADMIN', 'CAJERO'] },
    { id: 'credits', label: 'Créditos & Cuentas por Cobrar', icon: CreditCard, roles: ['ADMIN'] },
    { id: 'suppliers', label: 'Droguerías y Proveedores', icon: Truck, roles: ['ADMIN'] },
    { id: 'warehouse', label: 'Depósitos y Almacenes', icon: WarehouseIcon, roles: ['ADMIN', 'BODEGUERO'] },
    { id: 'employees', label: 'Empleados y Turnos', icon: UserCheck, roles: ['ADMIN'] },
    { id: 'cash', label: 'Control de Caja', icon: Landmark, roles: ['ADMIN', 'CAJERO'] },
    { 
      id: 'orders', 
      label: 'Pedidos Tienda Online', 
      icon: Bell, 
      badge: pendingOrdersCount > 0 ? `${pendingOrdersCount}` : undefined,
      badgeColor: 'bg-red-500 text-white',
      roles: ['ADMIN', 'CAJERO']
    },
    { id: 'online_reports', label: 'Ventas Web & Delivery', icon: Truck, roles: ['ADMIN'] },
    { id: 'reports', label: 'Reportes y Analítica', icon: BarChart3, roles: ['ADMIN'] },
    { id: 'settings', label: 'Configuración del Sistema', icon: SettingsIcon, roles: ['ADMIN'] },
  ];

  const sidebarLinks = allSidebarLinks.filter(link => {
    if (!currentUser) return true; // Show all if admin preview
    // If user has custom granular permissions configured:
    if (currentUser.permissions && Array.isArray(currentUser.permissions) && currentUser.permissions.length > 0) {
      return currentUser.permissions.includes(link.id);
    }
    // If ADMIN and no specific custom restriction:
    if (currentUser.role === 'ADMIN') return true;
    // Fallback based on base role:
    return link.roles.includes(currentUser.role);
  });

  // Automatically switch tab if current activeTab is not permitted
  useEffect(() => {
    if (currentUser && sidebarLinks.length > 0 && !sidebarLinks.some(l => l.id === activeTab)) {
      setActiveTab(sidebarLinks[0].id as AdminTab);
    }
  }, [sidebarLinks, activeTab, currentUser]);

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col font-sans text-slate-100">
      
      {/* Universal Top Bar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        pendingOrdersCount={pendingOrdersCount}
        onOpenOrdersTab={() => {
          setCurrentView('admin');
          setActiveTab('orders');
        }}
        isConnected={isConnected}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenLogin={() => setShowLoginModal(true)}
        settings={settings}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
      />

      {/* Main Content Area */}
      {currentView === 'store' ? (
        // Public Online Store View
        <OnlineStoreView
          products={products}
          settings={settings}
          onOrderPlaced={() => {
            fetchAllData();
          }}
        />
      ) : (
        // Administrative ERP View: Left Sidebar flush against the wall
        <div className="flex-1 w-full flex flex-col md:flex-row bg-[#090d16]">
          
          {/* Admin Sidebar Navigation: Docked to left wall on Desktop (Uniform Dark) */}
          <aside className="hidden md:flex md:w-64 shrink-0 bg-[#0f172a] border-r border-slate-800 p-3.5 flex-col justify-between md:min-h-[calc(100vh-4rem)] md:sticky md:top-16 md:h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="space-y-1">
              <div className="px-3 py-2 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                Módulos del Sistema
              </div>

              {sidebarLinks.map(link => {
                const Icon = link.icon;
                const isActive = activeTab === link.id;

                return (
                  <button
                    key={link.id}
                    onClick={() => setActiveTab(link.id as AdminTab)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition text-left cursor-pointer ${
                      isActive
                        ? 'bg-[#006837] text-white shadow-md'
                        : 'text-slate-300 hover:bg-slate-850 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </div>

                    {link.badge && (
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                          link.badgeColor || (isActive ? 'bg-[#004725] text-emerald-100' : 'bg-slate-800 text-slate-300 border border-slate-700/80')
                        }`}
                      >
                        {link.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Online Store Switch Card at bottom of sidebar */}
            <div className="mt-5 p-3 rounded-xl bg-[#162032] border border-slate-800 text-white space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <Store className="w-3.5 h-3.5" />
                <span>Tienda Online Activa</span>
              </div>
              <p className="text-[10px] text-slate-300">
                Comparte el link con tus clientes para que hagan pedidos web en tiempo real.
              </p>
              <a
                href="/?view=store"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-[#cf152b] hover:bg-[#b30e20] text-white font-extrabold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Abrir Tienda Web</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </aside>

          {/* Mobile Slide-Over Navigation Drawer */}
          {isMobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-50 flex">
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              
              {/* Drawer Content (Uniform Dark) */}
              <div className="relative w-4/5 max-w-xs bg-[#0f172a] border-r border-slate-800 text-slate-100 h-full shadow-2xl flex flex-col justify-between p-4 overflow-y-auto z-10 animate-in slide-in-from-left duration-200">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <img src="/emblem.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
                      <div>
                        <span className="font-extrabold text-sm text-white block uppercase">Amanda B&V</span>
                        <span className="text-[10px] text-emerald-400 font-bold">Panel Administrativo</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* User profile info in drawer */}
                  {currentUser && (
                    <div className="mb-3 p-2.5 bg-[#162032] rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xs text-white">{currentUser.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {currentUser.role === 'ADMIN' ? '👑 Admin' : '👤 Cajero'} &bull; {currentUser.shift || 'Turno'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="text-[10px] font-bold text-red-400 bg-red-950/40 hover:bg-red-900/60 px-2 py-1 rounded-lg border border-red-800/60 cursor-pointer"
                      >
                        Salir
                      </button>
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="px-2 py-1 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                      Módulos del Sistema
                    </div>
                    {sidebarLinks.map(link => {
                      const Icon = link.icon;
                      const isActive = activeTab === link.id;

                      return (
                        <button
                          key={link.id}
                          onClick={() => {
                            setActiveTab(link.id as AdminTab);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition text-left cursor-pointer ${
                            isActive
                              ? 'bg-[#006837] text-white shadow-md'
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{link.label}</span>
                          </div>

                          {link.badge && (
                            <span
                              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                                link.badgeColor || (isActive ? 'bg-[#004725] text-emerald-100' : 'bg-slate-800 text-slate-300 border border-slate-700/80')
                              }`}
                            >
                              {link.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Online store button in drawer */}
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <a
                    href="/?view=store"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-[#cf152b] hover:bg-[#b30e20] text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Store className="w-4 h-4" />
                    <span>Ver Tienda Online</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Module Screen Content */}
          <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-7 pb-24 md:pb-8 overflow-x-hidden bg-[#090d16]">
            {loading ? (
              <div className="bg-slate-900 p-12 text-center rounded-2xl border border-slate-800 text-slate-400 text-xs">
                Cargando datos del sistema farmacéutico...
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <DashboardHomeView
                    onNavigateTab={(tab) => setActiveTab(tab)}
                    settings={settings}
                    currentUser={currentUser}
                  />
                )}

                {activeTab === 'pos' && (
                  <PosView
                    products={products}
                    customers={customers}
                    employees={employees}
                    settings={settings}
                    onUpdateExchangeRate={handleUpdateExchangeRate}
                    onRefresh={fetchAllData}
                    onSaleComplete={(sale) => {
                      fetchAllData();
                      setCurrentSaleReceipt(sale);
                    }}
                  />
                )}

                {activeTab === 'inventory' && (
                  <InventoryView
                    products={products}
                    onRefresh={fetchAllData}
                  />
                )}

                {activeTab === 'expiries' && (
                  <ExpiriesView />
                )}

                {activeTab === 'purchases' && (
                  <PurchasesView
                    products={products}
                    suppliers={suppliers}
                    onRefresh={fetchAllData}
                  />
                )}

                {activeTab === 'customers' && (
                  <CustomersView
                    customers={customers}
                    onRefresh={fetchAllData}
                  />
                )}

                {activeTab === 'credits' && (
                  <CreditsView
                    employees={employees}
                    onRefresh={fetchAllData}
                  />
                )}

                {activeTab === 'suppliers' && (
                  <SuppliersView
                    suppliers={suppliers}
                    onRefresh={fetchAllData}
                  />
                )}

                {activeTab === 'warehouse' && (
                  <WarehouseView
                    products={products}
                    onRefresh={fetchAllData}
                  />
                )}

                {activeTab === 'employees' && (
                  <EmployeesView
                    employees={employees}
                    onRefresh={fetchAllData}
                  />
                )}

                {activeTab === 'cash' && (
                  <CashRegisterView
                    employees={employees}
                  />
                )}

                {activeTab === 'orders' && (
                  <OrdersView
                    orders={orders}
                    onRefresh={fetchAllData}
                    onOpenReceipt={(sale) => {
                      setCurrentSaleReceipt(sale);
                    }}
                    currentUser={currentUser}
                    employees={employees}
                    settings={settings}
                  />
                )}

                {activeTab === 'online_reports' && (
                  <OnlineOrdersReportView
                    settings={settings}
                  />
                )}

                {activeTab === 'reports' && (
                  <ReportsView />
                )}

                {activeTab === 'settings' && (
                  <SettingsView
                    settings={settings}
                    employees={employees}
                    currentUser={currentUser}
                    onRefresh={fetchAllData}
                  />
                )}
              </>
            )}
          </main>
 
          {/* Staff Mobile Bottom Navigation Bar */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-800 px-2 py-1 flex items-center justify-around shadow-xl">
            <button
              onClick={() => {
                setActiveTab('pos');
                setIsMobileMenuOpen(false);
              }}
              className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-extrabold transition cursor-pointer ${
                activeTab === 'pos' ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/80' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-5 h-5 mb-0.5" />
              <span>POS Facturar</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('orders');
                setIsMobileMenuOpen(false);
              }}
              className={`relative flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-extrabold transition cursor-pointer ${
                activeTab === 'orders' ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/80' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bell className="w-5 h-5 mb-0.5" />
              <span>Pedidos Web</span>
              {pendingOrdersCount > 0 && (
                <span className="absolute top-0 right-3 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                  {pendingOrdersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('cash');
                setIsMobileMenuOpen(false);
              }}
              className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-extrabold transition cursor-pointer ${
                activeTab === 'cash' ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/80' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Landmark className="w-5 h-5 mb-0.5" />
              <span>Caja</span>
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-extrabold transition cursor-pointer ${
                isMobileMenuOpen ? 'text-red-400 bg-red-950/60 border border-red-800/80' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Menu className="w-5 h-5 mb-0.5" />
              <span>Módulos</span>
            </button>
          </nav>

        </div>
      )}

      {/* Printable Receipt Modal */}
      <ReceiptModal
        sale={currentSaleReceipt}
        settings={settings}
        onClose={() => setCurrentSaleReceipt(null)}
      />

      {/* Login Modal: Activated if no user session or user clicked 'Ingresar' */}
      {(showLoginModal || (!currentUser && currentView === 'admin')) && (
        <LoginModal
          onLoginSuccess={handleLoginSuccess}
          onGoToStore={() => {
            setShowLoginModal(false);
            setCurrentView('store');
          }}
        />
      )}

    </div>
  );
}

export default App;
