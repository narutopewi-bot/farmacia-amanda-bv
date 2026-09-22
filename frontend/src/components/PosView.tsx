import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, 
  Banknote, ArrowRightLeft, UserCheck, AlertCircle, CheckCircle2,
  DollarSign, Smartphone, Edit3, X, Check, Package, RefreshCw,
  ChevronDown, Wallet, Receipt, ChevronRight, Clock,
  Lock, Unlock, Printer, AlertTriangle, Calculator, UserPlus
} from 'lucide-react';
import { Product, Customer, Employee, Sale, Settings, SalePayment } from '../types';
import { Caja } from './CashRegisterView';

interface PosViewProps {
  products: Product[];
  customers: Customer[];
  employees: Employee[];
  settings: Settings;
  onUpdateExchangeRate: (rate: number) => Promise<void>;
  onSaleComplete: (sale: Sale) => void;
  onRefresh?: () => void;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export const PosView: React.FC<PosViewProps> = ({
  products,
  customers,
  employees,
  settings,
  onUpdateExchangeRate,
  onSaleComplete,
  onRefresh
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(1);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>(1);
  const [discount, setDiscount] = useState<string>('0');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Local customers list state & Quick Registration
  const [customersList, setCustomersList] = useState<Customer[]>(customers);

  useEffect(() => {
    setCustomersList(customers);
  }, [customers]);

  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustIdType, setNewCustIdType] = useState('V-');
  const [newCustIdNum, setNewCustIdNum] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustCreditLimit, setNewCustCreditLimit] = useState('0');
  const [newCustCreditDays, setNewCustCreditDays] = useState('30');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [customerSuccessToast, setCustomerSuccessToast] = useState<string | null>(null);

  const handleSaveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      alert('Por favor ingrese el nombre del cliente.');
      return;
    }

    setIsSavingCustomer(true);
    try {
      const fullId = newCustIdNum.trim() ? `${newCustIdType}${newCustIdNum.trim()}` : '';
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_number: fullId,
          name: newCustName.trim(),
          phone: newCustPhone.trim(),
          email: newCustEmail.trim(),
          address: newCustAddress.trim(),
          credit_limit: Number(newCustCreditLimit) || 0,
          credit_days: Number(newCustCreditDays) || 30
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar cliente');

      const created: Customer = data.customer || {
        id: data.id,
        id_number: fullId,
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        email: newCustEmail.trim(),
        address: newCustAddress.trim(),
        credit_limit: Number(newCustCreditLimit) || 0,
        current_debt: 0,
        credit_days: Number(newCustCreditDays) || 30,
        notes: ''
      };

      setCustomersList(prev => {
        const exists = prev.some(c => c.id === created.id);
        return exists ? prev : [...prev, created];
      });
      setSelectedCustomerId(created.id);

      setNewCustIdNum('');
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      setNewCustAddress('');
      setNewCustCreditLimit('0');
      setNewCustCreditDays('30');
      setShowNewCustomerModal(false);

      if (onRefresh) onRefresh();

      setCustomerSuccessToast(`✓ Cliente "${created.name}" registrado y seleccionado para esta venta`);
      setTimeout(() => setCustomerSuccessToast(null), 3500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // Exchange rate modal & BCV Auto Sync
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState(settings?.exchange_rate?.toString() || '85.00');
  const [isSyncingBcv, setIsSyncingBcv] = useState(false);

  const handleSyncBcv = async () => {
    setIsSyncingBcv(true);
    try {
      const res = await fetch('/api/bcv/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setTempRate(data.rate.toString());
        showPosNotification(`¡Tasa oficial BCV actualizada a Bs. ${data.rate.toFixed(2)}! (${data.date})`, 'success');
      } else {
        showPosNotification(data.error || 'No se pudo obtener la tasa BCV', 'error');
      }
    } catch (err: any) {
      showPosNotification('Error al conectar con el servicio BCV', 'error');
    } finally {
      setIsSyncingBcv(false);
    }
  };

  // Prolago Multi-currency cashier state
  const [saleType, setSaleType] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [payCashUsd, setPayCashUsd] = useState<string>('');
  const [payPagoMovilBs, setPayPagoMovilBs] = useState<string>('');
  const [refPagoMovil, setRefPagoMovil] = useState<string>('');
  const [payCardBs, setPayCardBs] = useState<string>('');
  const [refCard, setRefCard] = useState<string>('');
  const [payCashBs, setPayCashBs] = useState<string>('');
  const [payZelleUsd, setPayZelleUsd] = useState<string>('');
  const [refZelle, setRefZelle] = useState<string>('');
  const [payCreditUsd, setPayCreditUsd] = useState<string>('');
  const [creditDays, setCreditDays] = useState<number>(15);
  const [changeCurrency, setChangeCurrency] = useState<'USD' | 'BS'>('USD');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [showMobileCart, setShowMobileCart] = useState<boolean>(false);

  const rate = settings?.exchange_rate || 85.0;

  // =========================================================================
  // CAJA (CASH REGISTER) MULTI-TERMINAL STATE DIRECTLY IN POS (VENTAS)
  // =========================================================================
  const [cajasAbiertas, setCajasAbiertas] = useState<Caja[]>([]);
  const [cajasOcupadasNombres, setCajasOcupadasNombres] = useState<string[]>([]);
  const [selectedCajaId, setSelectedCajaId] = useState<number | null>(null);
  const [showPosOpenModal, setShowPosOpenModal] = useState(false);
  const [showPosCloseModal, setShowPosCloseModal] = useState(false);
  const [showPosTicketModal, setShowPosTicketModal] = useState(false);
  const [cajaTicket, setCajaTicket] = useState<Caja | null>(null);
  const [posActionLoading, setPosActionLoading] = useState(false);
  const [posToast, setPosToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form states for Apertura de Caja in POS
  const [posOpenNombre, setPosOpenNombre] = useState('Caja 1');
  const [posOpenUsd, setPosOpenUsd] = useState('100.00');
  const [posOpenBs, setPosOpenBs] = useState((100 * (settings?.exchange_rate || 85.0)).toFixed(2));
  const [posOpenEmpleadoId, setPosOpenEmpleadoId] = useState<number>(1);
  const [posOpenNotes, setPosOpenNotes] = useState('');

  // Form states for Cierre de Caja in POS
  const [posCloseDecEfectivo, setPosCloseDecEfectivo] = useState('');
  const [posCloseDecZelle, setPosCloseDecZelle] = useState('0.00');
  const [posCloseDecPagoMovil, setPosCloseDecPagoMovil] = useState('0.00');
  const [posCloseDecPunto, setPosCloseDecPunto] = useState('0.00');
  const [posCloseNotes, setPosCloseNotes] = useState('');

  const currentActiveCaja = useMemo(() => {
    return cajasAbiertas.find(c => c.id === selectedCajaId) || null;
  }, [cajasAbiertas, selectedCajaId]);

  const expectedEfectivoPos = useMemo(() => {
    if (!currentActiveCaja) return 0;
    return (currentActiveCaja.monto_apertura_usd || 0) + (currentActiveCaja.ventas_efectivo || 0) + (currentActiveCaja.abonos_efectivo || 0);
  }, [currentActiveCaja]);

  const difCierrePos = (parseFloat(posCloseDecEfectivo) || 0) - expectedEfectivoPos;

  const showPosNotification = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setPosToast({ text, type });
    setTimeout(() => setPosToast(null), 4500);
  };

  const fetchCajasPos = async () => {
    try {
      const res = await fetch('/api/cajas/estado');
      if (res.ok) {
        const data = await res.json();
        const abiertas: Caja[] = data.cajas_abiertas || [];
        setCajasAbiertas(abiertas);
        setCajasOcupadasNombres(data.cajas_ocupadas_nombres || []);

        const savedId = localStorage.getItem('pos_active_caja_id');
        if (savedId) {
          const numId = Number(savedId);
          const found = abiertas.find(c => c.id === numId);
          if (found) {
            setSelectedCajaId(found.id);
            return;
          }
        }

        if (abiertas.length === 1) {
          setSelectedCajaId(abiertas[0].id);
          localStorage.setItem('pos_active_caja_id', String(abiertas[0].id));
        } else if (abiertas.length === 0) {
          setSelectedCajaId(null);
          localStorage.removeItem('pos_active_caja_id');
        }
      }
    } catch (err) {
      console.error('Error al sincronizar estado de cajas en POS:', err);
    }
  };

  useEffect(() => {
    fetchCajasPos();
  }, []);

  const handleOpenPosAbrir = () => {
    const ocupadas = cajasOcupadasNombres || [];
    let suggested = 'Caja 1';
    if (ocupadas.includes('Caja 1')) suggested = 'Caja 2';
    if (ocupadas.includes('Caja 1') && ocupadas.includes('Caja 2')) suggested = 'Caja 3';
    if (ocupadas.includes('Caja 1') && ocupadas.includes('Caja 2') && ocupadas.includes('Caja 3')) suggested = 'Caja 4';

    setPosOpenNombre(suggested);
    setPosOpenUsd('100.00');
    setPosOpenBs((100 * rate).toFixed(2));
    setPosOpenEmpleadoId(selectedEmployeeId || employees[0]?.id || 1);
    setPosOpenNotes('');
    setShowPosOpenModal(true);
  };

  const handleOpenPosCerrar = (caja: Caja) => {
    setPosCloseDecEfectivo('');
    setPosCloseDecZelle(caja.ventas_zelle.toFixed(2));
    setPosCloseDecPagoMovil(caja.ventas_pagomovil.toFixed(2));
    setPosCloseDecPunto(caja.ventas_punto.toFixed(2));
    setPosCloseNotes('');
    setShowPosCloseModal(true);
  };

  const handleSwitchCaja = (cajaId: number) => {
    setSelectedCajaId(cajaId);
    localStorage.setItem('pos_active_caja_id', String(cajaId));
    const target = cajasAbiertas.find(c => c.id === cajaId);
    if (target) {
      showPosNotification(`Conectado a ${target.nombre_caja} (Turno #${target.numero} - ${target.usuario_apertura_nombre})`, 'info');
    }
  };

  const handleSubmitPosAbrir = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosActionLoading(true);
    const emp = employees.find(x => x.id === posOpenEmpleadoId) || employees[0];

    try {
      const res = await fetch('/api/cajas/abrir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_caja: posOpenNombre,
          monto_apertura_usd: parseFloat(posOpenUsd) || 0,
          monto_apertura_bs: parseFloat(posOpenBs) || 0,
          observaciones: posOpenNotes,
          employee_id: emp?.id || 1,
          employee_name: emp?.name || 'Cajero'
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowPosOpenModal(false);
        setSelectedCajaId(data.caja.id);
        localStorage.setItem('pos_active_caja_id', String(data.caja.id));
        showPosNotification(`¡${data.caja.nombre_caja} abierta con éxito! Turno #${data.caja.numero} por ${emp?.name || 'Cajero'}`, 'success');
        await fetchCajasPos();
      } else {
        showPosNotification(data.detail || data.error || 'Error al abrir caja', 'error');
      }
    } catch (err: any) {
      showPosNotification(err.message || 'Error de conexión al abrir caja', 'error');
    } finally {
      setPosActionLoading(false);
    }
  };

  const handleSubmitPosCierre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentActiveCaja) return;
    setPosActionLoading(true);

    try {
      const res = await fetch('/api/cajas/cerrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caja_id: currentActiveCaja.id,
          declarado_efectivo: parseFloat(posCloseDecEfectivo) || 0,
          declarado_zelle: parseFloat(posCloseDecZelle) || 0,
          declarado_pagomovil: parseFloat(posCloseDecPagoMovil) || 0,
          declarado_punto: parseFloat(posCloseDecPunto) || 0,
          observaciones: posCloseNotes,
          usuario_cierre_id: currentActiveCaja.usuario_apertura_id,
          usuario_cierre_nombre: currentActiveCaja.usuario_apertura_nombre
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowPosCloseModal(false);
        localStorage.removeItem('pos_active_caja_id');
        setSelectedCajaId(null);
        showPosNotification(`¡Turno #${data.caja.numero} de ${data.caja.nombre_caja} cerrado con éxito!`, 'success');
        await fetchCajasPos();
        setCajaTicket(data.caja);
        setShowPosTicketModal(true);
      } else {
        showPosNotification(data.detail || data.error || 'Error al cerrar caja', 'error');
      }
    } catch (err: any) {
      showPosNotification(err.message || 'Error al procesar el cierre de caja', 'error');
    } finally {
      setPosActionLoading(false);
    }
  };

  // Categories list matching mockup
  const categories = useMemo(() => {
    const rawCategories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
    const standardOrder = ['Antibióticos', 'Analgésicos', 'Cuidado Personal', 'Vitaminas', 'Inyectables', 'Pediatría'];
    const rest = rawCategories.filter(c => !standardOrder.includes(c));
    return ['ALL', ...standardOrder.filter(c => rawCategories.includes(c)), ...rest];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = 
        p.name.toLowerCase().includes(q) ||
        (p.generic_name && p.generic_name.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.laboratory && p.laboratory.toLowerCase().includes(q));
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCategory]);

  const selectedCustomer = customersList.find(c => c.id === selectedCustomerId) || customers.find(c => c.id === selectedCustomerId);

  // Financial calculations
  const subtotal = cart.reduce((acc, item) => acc + item.product.selling_price * item.quantity, 0);
  const taxUsd = cart.reduce((acc, item) => {
    if (item.product.has_iva === 1) {
      const pct = item.product.iva_percent ?? 16.0;
      return acc + (item.product.selling_price * item.quantity * (pct / 100));
    }
    return acc;
  }, 0);
  const numDiscount = Number(discount) || 0;
  const totalUsd = Math.max(0, subtotal + taxUsd - numDiscount);
  const totalBs = totalUsd * rate;

  // Prolago Multi-currency real-time calculations
  const numPayCashUsd = parseFloat(payCashUsd) || 0;
  const numPayZelleUsd = parseFloat(payZelleUsd) || 0;
  const numPayCreditUsd = parseFloat(payCreditUsd) || 0;

  const numPayPagoMovilBs = parseFloat(payPagoMovilBs) || 0;
  const eqPagoMovilUsd = numPayPagoMovilBs > 0 ? numPayPagoMovilBs / rate : 0;

  const numPayCardBs = parseFloat(payCardBs) || 0;
  const eqCardUsd = numPayCardBs > 0 ? numPayCardBs / rate : 0;

  const numPayCashBs = parseFloat(payCashBs) || 0;
  const eqCashBsUsd = numPayCashBs > 0 ? numPayCashBs / rate : 0;

  const totalPaidUsd = numPayCashUsd + numPayZelleUsd + numPayCreditUsd + eqPagoMovilUsd + eqCardUsd + eqCashBsUsd;
  const totalPaidBs = totalPaidUsd * rate;

  const diffUsd = totalUsd - totalPaidUsd;
  const diffBs = diffUsd * rate;

  const remainingUsd = diffUsd > 0.009 ? diffUsd : 0;
  const remainingBs = remainingUsd * rate;

  const changeUsd = diffUsd < -0.009 ? Math.abs(diffUsd) : 0;
  const changeBs = changeUsd * rate;

  // Quantity in cart map
  const cartQuantityMap = useMemo(() => {
    const map: Record<number, number> = {};
    cart.forEach(item => {
      map[item.product.id] = item.quantity;
    });
    return map;
  }, [cart]);

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.total_stock <= 0) {
      alert(`¡"${product.name}" está agotado en inventario!`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.total_stock) {
          alert(`Stock máximo disponible alcanzado: ${product.total_stock} unidades.`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    const prod = products.find(p => p.id === productId);
    if (prod && qty > prod.total_stock) {
      alert(`Stock máximo disponible: ${prod.total_stock}`);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const assignRemainingToMethod = (method: 'cashUsd' | 'zelleUsd' | 'pagoMovilBs' | 'cardBs' | 'cashBs' | 'creditUsd') => {
    let othersUsd = 0;
    if (method !== 'cashUsd') othersUsd += numPayCashUsd;
    if (method !== 'zelleUsd') othersUsd += numPayZelleUsd;
    if (method !== 'pagoMovilBs') othersUsd += eqPagoMovilUsd;
    if (method !== 'cardBs') othersUsd += eqCardUsd;
    if (method !== 'cashBs') othersUsd += eqCashBsUsd;
    if (method !== 'creditUsd') othersUsd += numPayCreditUsd;

    const remaining = Math.max(0, Math.round((totalUsd - othersUsd) * 100) / 100);
    const remainingInBs = Math.max(0, Math.round((remaining * rate) * 100) / 100);

    if (method === 'cashUsd') setPayCashUsd(remaining > 0 ? remaining.toFixed(2) : '');
    else if (method === 'zelleUsd') setPayZelleUsd(remaining > 0 ? remaining.toFixed(2) : '');
    else if (method === 'pagoMovilBs') setPayPagoMovilBs(remainingInBs > 0 ? remainingInBs.toFixed(2) : '');
    else if (method === 'cardBs') setPayCardBs(remainingInBs > 0 ? remainingInBs.toFixed(2) : '');
    else if (method === 'cashBs') setPayCashBs(remainingInBs > 0 ? remainingInBs.toFixed(2) : '');
    else if (method === 'creditUsd') setPayCreditUsd(remaining > 0 ? remaining.toFixed(2) : '');
  };

  const assignAllToCredit = () => {
    setPayCashUsd('');
    setPayZelleUsd('');
    setPayPagoMovilBs('');
    setRefPagoMovil('');
    setPayCardBs('');
    setRefCard('');
    setPayCashBs('');
    setRefZelle('');
    setPayCreditUsd(totalUsd.toFixed(2));
  };

  const clearCart = () => {
    setCart([]);
    setPayCashUsd('');
    setPayPagoMovilBs('');
    setRefPagoMovil('');
    setPayCardBs('');
    setRefCard('');
    setPayCashBs('');
    setPayZelleUsd('');
    setRefZelle('');
    setPayCreditUsd('');
    setDiscount('0');
    setErrorMsg('');
    setIsPaymentModalOpen(false);
  };

  const handleOpenCheckoutModal = () => {
    if (cart.length === 0) {
      alert('El carrito está vacío. Seleccione medicamentos del catálogo.');
      return;
    }

    if (!currentActiveCaja) {
      alert('⚠️ Para facturar debe abrir o tener una caja activa asignada en este terminal (ej: Caja 1 o Caja 2). Abriendo ventana de apertura...');
      handleOpenPosAbrir();
      return;
    }

    if (saleType === 'CREDITO') {
      if (!selectedCustomer || selectedCustomer.id === 1) {
        alert('Para emitir una factura a crédito, debe seleccionar un cliente registrado (no Consumidor Final).');
        return;
      }
      assignAllToCredit();
    } else {
      setPayCashUsd(totalUsd.toFixed(2));
      setPayZelleUsd('');
      setPayPagoMovilBs('');
      setRefPagoMovil('');
      setPayCardBs('');
      setRefCard('');
      setPayCashBs('');
      setPayCreditUsd('');
      setRefZelle('');
    }
    setErrorMsg('');
    setIsPaymentModalOpen(true);
  };

  const handleExecuteCheckout = async () => {
    if (cart.length === 0) {
      setErrorMsg('El carrito está vacío');
      return;
    }

    if (!currentActiveCaja) {
      setErrorMsg('No hay una caja activa asignada a este terminal. Debe abrir una caja para cobrar.');
      handleOpenPosAbrir();
      return;
    }

    if (diffUsd > 0.009) {
      setErrorMsg(`Monto incompleto. Falta por cubrir: $${diffUsd.toFixed(2)} USD o Bs. ${diffBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} VES.`);
      return;
    }

    const isCredit = saleType === 'CREDITO' || numPayCreditUsd > 0;
    if (isCredit && (!selectedCustomer || selectedCustomer.id === 1)) {
      setErrorMsg('Para venta a crédito, debe seleccionar un cliente registrado.');
      return;
    }

    const paymentsToSave: SalePayment[] = [];
    if (numPayCashUsd > 0) {
      paymentsToSave.push({
        payment_method: 'CASH_USD',
        currency: 'USD',
        amount: numPayCashUsd,
        amount_usd: numPayCashUsd,
        amount_bs: numPayCashUsd * rate,
        reference: ''
      });
    }
    if (numPayZelleUsd > 0) {
      paymentsToSave.push({
        payment_method: 'ZELLE_USD',
        currency: 'USD',
        amount: numPayZelleUsd,
        amount_usd: numPayZelleUsd,
        amount_bs: numPayZelleUsd * rate,
        reference: refZelle
      });
    }
    if (numPayPagoMovilBs > 0) {
      paymentsToSave.push({
        payment_method: 'PAGO_MOVIL',
        currency: 'BS',
        amount: numPayPagoMovilBs,
        amount_usd: eqPagoMovilUsd,
        amount_bs: numPayPagoMovilBs,
        reference: refPagoMovil
      });
    }
    if (numPayCardBs > 0) {
      paymentsToSave.push({
        payment_method: 'CARD_BS',
        currency: 'BS',
        amount: numPayCardBs,
        amount_usd: eqCardUsd,
        amount_bs: numPayCardBs,
        reference: refCard
      });
    }
    if (numPayCashBs > 0) {
      paymentsToSave.push({
        payment_method: 'CASH_BS',
        currency: 'BS',
        amount: numPayCashBs,
        amount_usd: eqCashBsUsd,
        amount_bs: numPayCashBs,
        reference: ''
      });
    }
    if (numPayCreditUsd > 0) {
      paymentsToSave.push({
        payment_method: 'CREDIT',
        currency: 'USD',
        amount: numPayCreditUsd,
        amount_usd: numPayCreditUsd,
        amount_bs: numPayCreditUsd * rate,
        reference: `Plazo: ${creditDays} días`
      });
    }

    if (paymentsToSave.length === 0) {
      setErrorMsg('Debe ingresar un monto en al menos un método de pago.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      const payload = {
        cash_register_id: currentActiveCaja?.id || null,
        customer_id: selectedCustomerId,
        employee_id: selectedEmployeeId,
        sale_type: isCredit ? 'CREDIT' : 'CONTADO',
        payment_method: paymentsToSave.length === 1 ? paymentsToSave[0].payment_method : (isCredit ? 'CREDIT' : 'MIXED'),
        discount: numDiscount,
        tax: Number(taxUsd.toFixed(2)),
        exchange_rate: rate,
        change_currency: changeCurrency,
        change_amount: changeCurrency === 'USD' ? changeUsd : changeBs,
        payments: paymentsToSave,
        items: cart.map(i => ({
          product_id: i.product.id,
          unit_price: i.product.selling_price,
          quantity: i.quantity
        }))
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar la venta');

      const saleRes = await fetch(`/api/sales/${data.saleId}`);
      const fullSale = await saleRes.json();

      onSaleComplete(fullSale);
      clearCart();
      fetchCajasPos();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveRate = async () => {
    const newR = Number(tempRate);
    if (!newR || newR <= 0) return;
    await onUpdateExchangeRate(newR);
    setIsEditingRate(false);
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-[#0f172a] text-slate-100 rounded-3xl p-4 sm:p-6 space-y-5 animate-in fade-in duration-200 shadow-2xl border border-slate-800">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR: TITLE + CAJA CONTROLS + SEARCH                          */}
      {/* ========================================================================= */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
        
        {/* Brand Title with Green Cross Icon */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center shadow-lg shadow-emerald-950/40 shrink-0">
            <span className="text-white font-black text-2xl leading-none select-none">✚</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase flex items-center gap-2">
              VENTAS
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-slate-400 font-medium">
                Tasa Oficial BCV: <strong className="text-amber-400 font-mono text-xs">Bs. {rate.toFixed(2)}</strong>
              </span>
              <button 
                type="button"
                onClick={handleSyncBcv}
                disabled={isSyncingBcv}
                className="px-2 py-0.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                title="Consultar y sincronizar tasa oficial del Banco Central de Venezuela en vivo"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isSyncingBcv ? 'animate-spin text-emerald-400' : ''}`} />
                <span>{isSyncingBcv ? 'Consultando...' : 'Sincronizar BCV'}</span>
              </button>
              <button 
                type="button"
                onClick={() => setIsEditingRate(true)}
                className="text-slate-400 hover:text-slate-200 underline cursor-pointer text-[10px]"
              >
                Manual
              </button>
            </div>
          </div>
        </div>

        {/* CASH REGISTER (CAJA) MULTI-TERMINAL CONTROL CENTER */}
        <div className="flex items-center flex-wrap gap-2.5">
          {currentActiveCaja ? (
            <div className="flex items-center flex-wrap gap-2 bg-[#162032] border border-emerald-500/40 rounded-2xl px-3.5 py-2 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white tracking-wide">{currentActiveCaja.nombre_caja}</span>
                    <span className="text-[10px] bg-emerald-950/80 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-800">
                      Turno #{currentActiveCaja.numero}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    Cajero: <strong className="text-slate-200">{currentActiveCaja.usuario_apertura_nombre}</strong> &bull; Fondo: <span className="text-amber-400 font-mono font-bold">${(currentActiveCaja.monto_apertura_usd || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Selector si hay más de 1 caja abierta en la farmacia */}
              {cajasAbiertas.length > 1 && (
                <select
                  value={currentActiveCaja.id}
                  onChange={(e) => handleSwitchCaja(Number(e.target.value))}
                  className="bg-[#0f172a] text-slate-200 text-[10px] font-bold py-1 px-2 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer ml-1"
                  title="Cambiar caja activa en este terminal"
                >
                  {cajasAbiertas.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre_caja} ({c.usuario_apertura_nombre})
                    </option>
                  ))}
                </select>
              )}

              {/* Botón Cerrar Caja */}
              <button
                type="button"
                onClick={() => handleOpenPosCerrar(currentActiveCaja)}
                className="ml-1 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 hover:border-rose-600 text-rose-300 hover:text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Cerrar turno de esta caja y emitir arqueo Z"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Cerrar Caja</span>
              </button>

              {/* Botón Abrir otra caja si quedan libres */}
              {cajasOcupadasNombres.length < 4 && (
                <button
                  type="button"
                  onClick={handleOpenPosAbrir}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Abrir un terminal adicional (ej: Caja 2)"
                >
                  <Plus className="w-3 h-3 text-emerald-400" />
                  <span>Abrir otra</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center flex-wrap gap-2">
              {/* Botón destacado Abrir Caja */}
              <button
                type="button"
                onClick={handleOpenPosAbrir}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-950/60 flex items-center gap-2 border border-emerald-400/40 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] animate-pulse hover:animate-none"
              >
                <Unlock className="w-4 h-4 text-emerald-200" />
                <span>ABRIR CAJA EN VENTAS</span>
              </button>

              {/* Conectar a caja existente si ya hay cajas abiertas por otros terminales */}
              {cajasAbiertas.length > 0 && (
                <div className="flex items-center gap-1.5 bg-[#162032] border border-amber-500/40 rounded-xl px-3 py-1.5">
                  <span className="text-[10px] text-amber-300 font-bold">Conectar a:</span>
                  <select
                    onChange={(e) => handleSwitchCaja(Number(e.target.value))}
                    defaultValue=""
                    className="bg-[#0f172a] text-slate-200 text-[10px] font-bold py-1 px-2 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="" disabled>Seleccionar caja en red...</option>
                    {cajasAbiertas.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombre_caja} ({c.usuario_apertura_nombre} - Turno #{c.numero})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {cajasAbiertas.length === 0 && (
                <span className="text-[11px] text-amber-400/90 font-medium bg-amber-950/40 border border-amber-800/40 px-3 py-1.5 rounded-xl">
                  ⚠️ Sin caja activa. Abre una caja para registrar ventas.
                </span>
              )}
            </div>
          )}
        </div>

        {/* Search Bar matching mockup input */}
        <div className="flex items-center gap-2.5 w-full xl:w-auto">
          <div className="relative flex-1 xl:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar medicamentos..."
              className="w-full bg-[#1e293b] border border-slate-700/80 rounded-full pl-10 pr-9 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mobile Cart Button */}
          <button
            type="button"
            onClick={() => setShowMobileCart(true)}
            className="lg:hidden relative p-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md"
          >
            <ShoppingCart className="w-4 h-4" />
            {cart.length > 0 && (
              <span className="w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center font-black">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CATEGORY FILTER PILLS (Horizontal Touch Scroll, matching Mockup 2)     */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none select-none">
        {categories.map(cat => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#10b981] text-white shadow-md shadow-emerald-950/50'
                  : 'bg-[#1e293b] text-slate-300 hover:bg-[#334155] hover:text-white border border-slate-700/60'
              }`}
            >
              {cat === 'ALL' ? 'Todos los Medicamentos' : cat}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE: 70% PRODUCT GRID + 30% RIGHT CART DRAWER               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ----------------------------------------------------------------------- */}
        {/* LEFT: 4-COLUMN TOUCH CARDS GRID (Matches Mockup 2 exactly)              */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-8 space-y-4">
          {filteredProducts.length === 0 ? (
            <div className="bg-[#162032] border border-slate-800 rounded-2xl p-16 text-center text-slate-400 space-y-2">
              <Package className="w-12 h-12 mx-auto text-slate-600 mb-2" />
              <p className="font-extrabold text-white text-base">No se encontraron medicamentos</p>
              <p className="text-xs text-slate-400">Intenta con otro término de búsqueda o selecciona otra categoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredProducts.map(product => {
                const qtyInCart = cartQuantityMap[product.id] || 0;
                const isOutOfStock = product.total_stock <= 0;

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`bg-[#162032] border rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 select-none shadow-sm cursor-pointer hover:border-emerald-500/70 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] relative group ${
                      isOutOfStock
                        ? 'border-slate-800/60 opacity-50 cursor-not-allowed'
                        : 'border-slate-800/90'
                    }`}
                  >
                    {/* White Image Container (Exactly like mockup 2) */}
                    <div className="w-full bg-white rounded-xl h-32 flex items-center justify-center p-2.5 relative overflow-hidden shadow-inner">
                      
                      {/* Green Stock Pill on Top Right of White Container */}
                      <span className={`absolute top-2 right-2 text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs ${
                        isOutOfStock 
                          ? 'bg-red-500 text-white' 
                          : 'bg-[#10b981] text-white'
                      }`}>
                        {isOutOfStock ? 'Agotado' : `${product.total_stock} disp.`}
                      </span>

                      {/* In Cart Indicator */}
                      {qtyInCart > 0 && (
                        <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {qtyInCart} en orden
                        </span>
                      )}

                      {/* Medicine Image or High Quality Realistic Box Graphic */}
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col justify-between p-1 select-none">
                          <div className="h-2 w-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"></div>
                          <div className="text-center my-auto">
                            <span className="text-slate-900 font-extrabold text-xs block leading-tight truncate px-1">
                              {product.name}
                            </span>
                            <span className="text-slate-400 font-semibold text-[9px] block truncate">
                              {product.laboratory || 'Uso Farmacéutico'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold px-1 border-t border-slate-100 pt-0.5">
                            <span>{product.presentation || 'Caja'}</span>
                            <span className="text-emerald-700 font-extrabold">RX</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Product Name & Generic Name */}
                    <div className="mt-2.5 mb-1.5 min-w-0">
                      <h3 className="text-white font-extrabold text-xs sm:text-sm leading-snug truncate group-hover:text-emerald-300 transition">
                        {product.name}
                      </h3>
                      <p className="text-slate-400 text-[11px] font-medium truncate mt-0.5">
                        {product.generic_name || product.presentation || 'Medicamento'}
                      </p>
                    </div>

                    {/* Dual Price on One Line (Matches Mockup 2) */}
                    <div className="text-xs font-semibold mt-1 pt-1.5 border-t border-slate-800/80 flex items-baseline gap-1.5 truncate">
                      <span className="text-white font-black text-sm font-mono">
                        ${product.selling_price.toFixed(2)}
                      </span>
                      <span className="text-slate-400 text-[10px] font-medium font-mono truncate">
                        / Bs. {(product.selling_price * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* RIGHT: ELEGANT FLOATING CART DRAWER (Matches Mockup 2 exactly)          */}
        {/* ----------------------------------------------------------------------- */}
        <div className="hidden lg:block lg:col-span-4 sticky top-20">
          <div className="bg-[#162032] border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xl min-h-[580px] text-white">
            
            <div>
              {/* Header: Cart (X) and Close/Clear */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white">
                    Cart <span className="text-emerald-400 font-extrabold font-mono">({cart.reduce((a, b) => a + b.quantity, 0)})</span>
                  </h2>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer"
                    title="Vaciar carrito"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Cart Items List with White Thumbnails (Matches Mockup 2) */}
              <div className="py-3 space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="py-14 text-center text-slate-500 space-y-1">
                    <p className="text-sm font-bold text-slate-400">El carrito está vacío</p>
                    <p className="text-xs text-slate-500">Toca cualquier tarjeta de medicamento para añadirla a la orden.</p>
                  </div>
                ) : (
                  cart.map(({ product, quantity }) => (
                    <div
                      key={product.id}
                      className="bg-[#0f172a] rounded-xl p-2.5 flex items-center gap-3 border border-slate-800/60 hover:border-slate-700 transition"
                    >
                      {/* White Box Thumbnail */}
                      <div className="w-12 h-12 bg-white rounded-lg p-1 shrink-0 flex items-center justify-center overflow-hidden shadow-xs">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-slate-800 font-bold text-[10px]">RX</span>
                        )}
                      </div>

                      {/* Product Name and Price Row (Dual layout) */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-white font-extrabold text-xs truncate">
                            {product.name}
                          </h4>
                          <span className="text-white font-black text-xs font-mono shrink-0">
                            ${(product.selling_price * quantity).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <span className="text-slate-400 text-[10px] truncate">
                            {product.generic_name || product.presentation || 'Medicamento'}
                          </span>
                          <span className="text-slate-400 text-[10px] font-mono shrink-0">
                            Bs. {(product.selling_price * quantity * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        
                        {/* Stepper inline */}
                        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-800/80">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(product.id, quantity - 1)}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold text-emerald-400 font-mono w-4 text-center">
                              {quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(product.id, quantity + 1)}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(product.id)}
                            className="text-slate-500 hover:text-rose-400 cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Summary (Matches Mockup 2 lines exactly) */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-white">${subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>IVA (16%)</span>
                <span className="font-mono font-bold text-amber-400">
                  {taxUsd > 0 ? `$${taxUsd.toFixed(2)} / Bs. ${(taxUsd * rate).toFixed(2)}` : 'Exento'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Tasa de cambio</span>
                <span className="font-mono text-slate-400">Bs. {rate.toFixed(2)}</span>
              </div>

              {/* Minimal Client Selector Dropdown with Quick Register Button */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cliente</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerModal(true)}
                    className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30 transition cursor-pointer active:scale-95"
                    title="Registrar nuevo cliente rápido sin salir del POS"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>+ Nuevo</span>
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(Number(e.target.value))}
                    className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer font-medium pr-8"
                  >
                    {customersList.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.id_number ? `(${c.id_number})` : ''} {c.current_debt > 0 ? `[Deuda: $${c.current_debt.toFixed(2)}]` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Chip informativo si no es Consumidor Final */}
                {selectedCustomer && selectedCustomer.id !== 1 && (
                  <div className="mt-1.5 p-2 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">{selectedCustomer.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {selectedCustomer.id_number || 'Sin C.I.'} {selectedCustomer.phone ? `• ${selectedCustomer.phone}` : ''}
                      </span>
                    </div>
                    {selectedCustomer.credit_limit > 0 && (
                      <div className="text-right">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Límite Crédito</span>
                        <span className="font-mono font-bold text-emerald-400">${selectedCustomer.credit_limit.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mode Toggle: Contado / Crédito */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSaleType('CONTADO')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                    saleType === 'CONTADO'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  Contado
                </button>
                <button
                  type="button"
                  onClick={() => setSaleType('CREDITO')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                    saleType === 'CREDITO'
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  Crédito
                </button>
              </div>

              {/* Giant Solid Green Action Button (Matches Mockup 2 exactly) */}
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handleOpenCheckoutModal}
                className="w-full mt-2 py-3.5 bg-[#10b981] hover:bg-[#059669] active:scale-[0.99] text-white font-black text-sm rounded-xl transition shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Cobrar Venta &bull; ${totalUsd.toFixed(2)} / Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </button>

            </div>

          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL DE PAGO / COBRO MULTIMONEDA INTELIGENTE (ADAPTADO DE PROLAGO)     */}
      {/* ========================================================================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-[#162032] border border-slate-800 rounded-3xl p-5 sm:p-7 w-full max-w-xl text-white shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            
            {/* Header con Identificación Clara */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">Cobro Multimoneda Inteligente</h3>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] uppercase border ${
                    saleType === 'CREDITO'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {saleType === 'CREDITO' ? 'A Crédito (Por Cobrar)' : 'Contado'}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 mt-0.5">
                  <span>Cliente: <strong className="text-white">{selectedCustomer?.name || 'Consumidor Final'}</strong> {selectedCustomer?.id_number ? `(${selectedCustomer.id_number})` : ''}</span>
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerModal(true)}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1 cursor-pointer ml-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>+ Registrar / Cambiar</span>
                  </button>
                  <span>&bull; Tasa BCV: <strong className="text-amber-400 font-mono">{rate.toFixed(2)} Bs./$</strong></span>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner de Total Factura Multimoneda */}
            <div className="grid grid-cols-2 gap-3 bg-[#0f172a] border border-slate-800 p-4 rounded-2xl shadow-inner">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Total Factura ($)</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">${totalUsd.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Total en Bolívares</span>
                <span className="text-xl sm:text-2xl font-black text-white font-mono">
                  Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* SECCIÓN ESPECIAL CUANDO ES VENTA A CRÉDITO */}
            {saleType === 'CREDITO' && (
              <div className="p-3.5 bg-rose-950/30 border border-rose-800/60 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-300 text-xs flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-rose-400" />
                    Plazo de Vencimiento:
                  </span>
                  <select
                    value={creditDays}
                    onChange={e => setCreditDays(Number(e.target.value))}
                    className="px-3 py-1 bg-[#0f172a] border border-rose-800/80 rounded-lg text-xs font-bold text-rose-200 focus:outline-none cursor-pointer"
                  >
                    <option value={7}>7 días</option>
                    <option value={15}>15 días</option>
                    <option value={30}>30 días</option>
                    <option value={45}>45 días</option>
                  </select>
                </div>
                <div className="flex">
                  <button
                    type="button"
                    onClick={assignAllToCredit}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Dejar Totalidad a Crédito (100%)</span>
                  </button>
                </div>
                <p className="text-[10px] text-rose-400/90 font-medium text-center">
                  Si el cliente abona una inicial, ingrésela abajo en Efectivo o Pago Móvil y el saldo restante quedará a crédito.
                </p>
              </div>
            )}

            {/* INDICADOR EN VIVO DE SALDO PENDIENTE O VUELTO */}
            <div className={`p-4 rounded-2xl border transition-all ${
              diffUsd > 0.009
                ? 'bg-rose-950/30 border-rose-800/70 text-rose-200'
                : diffUsd < -0.009
                ? 'bg-blue-950/30 border-blue-800/70 text-blue-200'
                : 'bg-emerald-950/30 border-emerald-800/70 text-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-xs font-black uppercase tracking-wider block ${
                    diffUsd > 0.009 ? 'text-rose-400' : diffUsd < -0.009 ? 'text-blue-400' : 'text-emerald-400'
                  }`}>
                    {diffUsd > 0.009
                      ? (saleType === 'CREDITO' ? 'Resta por asignar a crédito o inicial:' : 'Resta por pagar:')
                      : diffUsd < -0.009
                      ? 'Cambio / Vuelto a entregar:'
                      : (saleType === 'CREDITO' ? 'Total asignado (Inicial + Crédito):' : 'Pago completado:')}
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className={`text-2xl sm:text-3xl font-black font-mono ${
                      diffUsd > 0.009 ? 'text-rose-400' : diffUsd < -0.009 ? 'text-blue-400' : 'text-emerald-400'
                    }`}>
                      ${diffUsd > 0.009 ? diffUsd.toFixed(2) : diffUsd < -0.009 ? changeUsd.toFixed(2) : '0.00'} USD
                    </span>
                    <span className="text-xs font-bold text-slate-400">o</span>
                    <span className={`text-lg sm:text-xl font-black font-mono ${
                      diffUsd > 0.009 ? 'text-rose-300' : diffUsd < -0.009 ? 'text-blue-300' : 'text-emerald-300'
                    }`}>
                      Bs. {Number((diffUsd > 0.009 ? diffBs : diffUsd < -0.009 ? changeBs : 0).toFixed(2)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} VES
                    </span>
                  </div>
                </div>

                {/* Vuelto Currency Selector when there is change */}
                {diffUsd < -0.009 && (
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-blue-300 font-bold uppercase">Entregar en:</span>
                    <div className="flex gap-1 bg-[#0f172a] p-0.5 rounded-lg border border-blue-900/50">
                      <button
                        type="button"
                        onClick={() => setChangeCurrency('USD')}
                        className={`px-2 py-0.5 rounded text-xs font-black transition cursor-pointer ${
                          changeCurrency === 'USD' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        $ USD
                      </button>
                      <button
                        type="button"
                        onClick={() => setChangeCurrency('BS')}
                        className={`px-2 py-0.5 rounded text-xs font-black transition cursor-pointer ${
                          changeCurrency === 'BS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Bs. VES
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[11px] font-semibold text-slate-300 mt-2 pt-2 border-t border-slate-800/60">
                {diffUsd > 0.009
                  ? `Si el cliente cancela el restante en Bolívares (Pago Móvil / Punto / Efectivo Bs.), debe pagar exactamente: Bs. ${Number(diffBs.toFixed(2)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
                  : diffUsd < -0.009
                  ? `Entregar vuelto al cliente: $${changeUsd.toFixed(2)} USD o su equivalente Bs. ${Number(changeBs.toFixed(2)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
                  : 'El monto cobrado cubre exactamente la totalidad de la factura.'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* LISTA DE FORMAS DE PAGO CON CONVERSIÓN BIDIRECCIONAL INTELIGENTE */}
            <div className="space-y-2.5 text-xs max-h-[44vh] overflow-y-auto pr-1">

              {/* 1. EFECTIVO DÓLARES ($) */}
              <div className="p-3 bg-[#0f172a] hover:bg-[#131d33] rounded-2xl border border-slate-800 transition">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="text-emerald-400 font-bold">💵</span>
                    Efectivo Dólares Físicos ($ USD)
                  </span>
                  <button
                    type="button"
                    onClick={() => assignRemainingToMethod('cashUsd')}
                    className="text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer"
                  >
                    Pagar restante con este método
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={payCashUsd}
                    onChange={e => setPayCashUsd(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 bg-[#162032] border border-slate-700 rounded-xl font-mono font-bold text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 2. PAGO MÓVIL / TRANSFERENCIA (BOLÍVARES) */}
              <div className="p-3 bg-blue-950/20 hover:bg-blue-950/30 rounded-2xl border border-blue-900/40 transition space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-blue-300 flex items-center gap-1.5">
                    <span>📱</span>
                    Pago Móvil / Transferencia (en Bolívares Bs.)
                  </span>
                  <button
                    type="button"
                    onClick={() => assignRemainingToMethod('pagoMovilBs')}
                    className="text-[10px] bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer"
                  >
                    Pagar restante en Bs.
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-8 relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-400">Bs.</span>
                    <input
                      type="number"
                      step="0.01"
                      value={payPagoMovilBs}
                      onChange={e => setPayPagoMovilBs(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-3 py-2 bg-[#0f172a] border border-blue-800/60 rounded-xl font-mono font-bold text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-4 text-right bg-[#0f172a] p-2 rounded-xl border border-blue-900/40">
                    <span className="text-[10px] text-slate-400 block">Equivale a:</span>
                    <span className="font-mono font-black text-blue-400 text-xs">${eqPagoMovilUsd.toFixed(2)} USD</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-blue-300 uppercase tracking-wider mb-0.5">
                    # Referencia Pago Móvil / Transferencia
                  </label>
                  <input
                    type="text"
                    value={refPagoMovil}
                    onChange={e => setRefPagoMovil(e.target.value)}
                    placeholder="Ej: 481920 (Referencia bancaria...)"
                    className="w-full px-3 py-1.5 bg-[#0f172a] border border-blue-800/60 rounded-xl text-xs font-mono font-bold text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 3. PUNTO DE VENTA (BOLÍVARES) */}
              <div className="p-3 bg-amber-950/20 hover:bg-amber-950/30 rounded-2xl border border-amber-900/40 transition space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span>💳</span>
                    Punto de Venta / Tarjeta Débito (en Bolívares Bs.)
                  </span>
                  <button
                    type="button"
                    onClick={() => assignRemainingToMethod('cardBs')}
                    className="text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer"
                  >
                    Pagar restante en Bs.
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-8 relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-400">Bs.</span>
                    <input
                      type="number"
                      step="0.01"
                      value={payCardBs}
                      onChange={e => setPayCardBs(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-3 py-2 bg-[#0f172a] border border-amber-800/60 rounded-xl font-mono font-bold text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-4 text-right bg-[#0f172a] p-2 rounded-xl border border-amber-900/40">
                    <span className="text-[10px] text-slate-400 block">Equivale a:</span>
                    <span className="font-mono font-black text-amber-400 text-xs">${eqCardUsd.toFixed(2)} USD</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-0.5">
                    # Lote / Aprobación de Punto (Opcional)
                  </label>
                  <input
                    type="text"
                    value={refCard}
                    onChange={e => setRefCard(e.target.value)}
                    placeholder="Ej: 009214"
                    className="w-full px-3 py-1.5 bg-[#0f172a] border border-amber-800/60 rounded-xl text-xs font-mono font-bold text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 4. EFECTIVO EN BOLÍVARES (BS. VES) */}
              <div className="p-3 bg-[#0f172a] hover:bg-[#131d33] rounded-2xl border border-slate-800 transition space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span>💵</span>
                    Efectivo en Bolívares Físicos (Bs. VES)
                  </span>
                  <button
                    type="button"
                    onClick={() => assignRemainingToMethod('cashBs')}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer"
                  >
                    Pagar restante en Bs.
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-8 relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-400">Bs.</span>
                    <input
                      type="number"
                      step="0.01"
                      value={payCashBs}
                      onChange={e => setPayCashBs(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-3 py-2 bg-[#162032] border border-slate-700 rounded-xl font-mono font-bold text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-4 text-right bg-[#162032] p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Equivale a:</span>
                    <span className="font-mono font-black text-emerald-400 text-xs">${eqCashBsUsd.toFixed(2)} USD</span>
                  </div>
                </div>
              </div>

              {/* 5. ZELLE ($ USD) */}
              <div className="p-3 bg-purple-950/20 hover:bg-purple-950/30 rounded-2xl border border-purple-900/40 transition space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-300 flex items-center gap-1.5">
                    <span>⚡</span>
                    Zelle ($ USD)
                  </span>
                  <button
                    type="button"
                    onClick={() => assignRemainingToMethod('zelleUsd')}
                    className="text-[10px] bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer"
                  >
                    Pagar restante con este método
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={payZelleUsd}
                    onChange={e => setPayZelleUsd(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 bg-[#0f172a] border border-purple-800/60 rounded-xl font-mono font-bold text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <input
                  type="text"
                  value={refZelle}
                  onChange={e => setRefZelle(e.target.value)}
                  placeholder="Titular / correo de envío (Opcional)..."
                  className="w-full px-3 py-1.5 bg-[#0f172a] border border-purple-800/60 rounded-xl text-xs font-mono font-bold text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* 6. CRÉDITO ($ USD) */}
              {(saleType === 'CREDITO' || (selectedCustomer && selectedCustomer.id !== 1)) && (
                <div className="p-3 bg-rose-950/20 hover:bg-rose-950/30 rounded-2xl border border-rose-900/40 transition space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-300 flex items-center gap-1.5">
                      <span>👤</span>
                      Monto que queda a Crédito ($ USD)
                    </span>
                    <button
                      type="button"
                      onClick={() => assignRemainingToMethod('creditUsd')}
                      className="text-[10px] bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer"
                    >
                      Dejar restante a crédito
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={payCreditUsd}
                      onChange={e => setPayCreditUsd(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 bg-[#0f172a] border border-rose-800/60 rounded-xl font-mono font-bold text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isProcessing || diffUsd > 0.009}
                onClick={handleExecuteCheckout}
                className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-black text-sm rounded-xl transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Facturando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{saleType === 'CREDITO' ? 'Registrar Venta a Crédito' : 'Completar Venta e Imprimir'}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. BCV RATE EDIT MODAL                                                    */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 5. BCV RATE EDIT & AUTO-SYNC MODAL                                        */}
      {/* ========================================================================= */}
      {isEditingRate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#162032] border border-slate-800 rounded-3xl p-5 w-full max-w-sm text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                  🏦
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Tasa Oficial BCV</h3>
                  <p className="text-[10px] text-slate-400">Banco Central de Venezuela</p>
                </div>
              </div>
              <button onClick={() => setIsEditingRate(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sincronización Automática con 1 Clic */}
            <div className="p-3 bg-[#0f172a] rounded-2xl border border-slate-800 space-y-2 text-center">
              <p className="text-[11px] text-slate-300 font-medium leading-tight">
                Consulta en vivo al Banco Central de Venezuela:
              </p>
              <button
                type="button"
                onClick={handleSyncBcv}
                disabled={isSyncingBcv}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBcv ? 'animate-spin' : ''}`} />
                <span>{isSyncingBcv ? 'Consultando al BCV...' : 'Sincronizar Tasa Oficial Ahora'}</span>
              </button>
              {settings?.bcv_last_updated && (
                <p className="text-[9px] text-slate-400">
                  Fecha BCV: <strong className="text-emerald-400">{settings.bcv_last_updated}</strong>
                </p>
              )}
            </div>

            {/* Ajuste Manual */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs text-slate-300 block font-bold">
                O cambiar manualmente (Bs./USD):
              </label>
              <input
                type="number"
                step="0.01"
                value={tempRate}
                onChange={e => setTempRate(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-2.5 text-base font-mono text-white font-black focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditingRate(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleSaveRate}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Guardar Manual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MOBILE CART SLIDE-OVER                                                 */}
      {/* ========================================================================= */}
      {showMobileCart && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="bg-[#162032] border-l border-slate-800 w-full max-w-sm h-full p-4 flex flex-col justify-between text-white overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                <h3 className="font-black text-sm text-white">Cart ({cart.reduce((a, b) => a + b.quantity, 0)})</h3>
              </div>
              <button onClick={() => setShowMobileCart(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 space-y-2 flex-1 overflow-y-auto">
              {cart.map(({ product, quantity }) => (
                <div key={product.id} className="p-2 rounded-xl bg-[#0f172a] border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-bold text-white truncate">{product.name}</p>
                    <p className="text-[10px] text-slate-400">${product.selling_price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQuantity(product.id, quantity - 1)} className="p-1 bg-slate-800 rounded">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-black font-mono w-5 text-center">{quantity}</span>
                    <button onClick={() => updateQuantity(product.id, quantity + 1)} className="p-1 bg-slate-800 rounded">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => removeFromCart(product.id)} className="p-1 text-slate-500 hover:text-rose-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Total:</span>
                <span className="font-mono font-black text-emerald-400 text-base">${totalUsd.toFixed(2)}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMobileCart(false);
                  handleOpenCheckoutModal();
                }}
                className="w-full py-3 bg-[#10b981] text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5"
              >
                <span>Cobrar Venta &bull; ${totalUsd.toFixed(2)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: APERTURA DE CAJA EN VENTAS (PRO LAGO MULTI-TERMINAL)            */}
      {/* ========================================================================= */}
      {showPosOpenModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#162032] border border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 text-slate-100 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">Apertura de Caja &bull; Ventas</h3>
                  <p className="text-xs text-slate-400">Inicia tu turno de caja para habilitar cobros en este terminal</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPosOpenModal(false)} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPosAbrir} className="space-y-4 text-xs">
              {/* Selector de Terminal */}
              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Selecciona el Terminal / Caja:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Caja 1', 'Caja 2', 'Caja 3', 'Caja 4'].map((boxName) => {
                    const isOccupied = cajasOcupadasNombres.includes(boxName);
                    const isSelected = posOpenNombre === boxName;
                    const occupyingCaja = cajasAbiertas.find(c => c.nombre_caja === boxName);

                    return (
                      <button
                        key={boxName}
                        type="button"
                        disabled={isOccupied}
                        onClick={() => setPosOpenNombre(boxName)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          isOccupied
                            ? 'bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed'
                            : isSelected
                            ? 'bg-emerald-600/20 border-emerald-500 ring-2 ring-emerald-500/30 text-white'
                            : 'bg-[#0f172a] border-slate-700 hover:border-slate-600 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-extrabold text-sm">{boxName}</span>
                          {isOccupied ? (
                            <span className="text-[9px] bg-rose-950/80 text-rose-400 border border-rose-800/80 px-1.5 py-0.5 rounded font-bold">
                              Ocupada
                            </span>
                          ) : (
                            <span className="text-[9px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 px-1.5 py-0.5 rounded font-bold">
                              Disponible
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 truncate">
                          {isOccupied ? `Turno de: ${occupyingCaja?.usuario_apertura_nombre || 'En uso'}` : 'Lista para iniciar'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cajero Responsable */}
              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Cajero Responsable:
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={posOpenEmpleadoId}
                    onChange={(e) => setPosOpenEmpleadoId(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#0f172a] border border-slate-700 rounded-xl text-slate-200 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fondo Inicial USD y Bs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Fondo Inicial (USD $):
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      value={posOpenUsd}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPosOpenUsd(val);
                        const n = parseFloat(val) || 0;
                        setPosOpenBs((n * rate).toFixed(2));
                      }}
                      placeholder="100.00"
                      className="w-full pl-8 pr-3 py-2 bg-[#0f172a] border border-slate-700 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Equivalente en Bs. (Tasa {rate.toFixed(2)}):
                  </label>
                  <div className="relative">
                    <span className="text-[11px] font-bold text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">Bs.</span>
                    <input
                      type="number"
                      step="0.01"
                      value={posOpenBs}
                      onChange={(e) => setPosOpenBs(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#0f172a] border border-slate-700 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Observaciones de Apertura (Opcional):
                </label>
                <input
                  type="text"
                  value={posOpenNotes}
                  onChange={(e) => setPosOpenNotes(e.target.value)}
                  placeholder="Ej: Billetes de baja denominación para cambio..."
                  className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Botones de acción */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPosOpenModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={posActionLoading || !posOpenNombre}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{posActionLoading ? 'Abriendo...' : 'Iniciar Turno y Habilitar Cobros'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL: ARQUEO Y CIERRE DE CAJA EN VENTAS                               */}
      {/* ========================================================================= */}
      {showPosCloseModal && currentActiveCaja && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#162032] border border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full p-6 text-slate-100 overflow-y-auto max-h-[92vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    Arqueo y Cierre de Caja &bull; {currentActiveCaja.nombre_caja}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Turno #{currentActiveCaja.numero} &bull; Cajero: {currentActiveCaja.usuario_apertura_nombre}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPosCloseModal(false)} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPosCierre} className="space-y-4 text-xs">
              {/* Tarjeta de Resumen en Sistema */}
              <div className="p-3.5 bg-[#0f172a] rounded-2xl border border-slate-800 space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Resumen de Movimientos en el Turno:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-400">Fondo Inicial</p>
                    <p className="text-xs font-black font-mono text-white">${currentActiveCaja.monto_apertura_usd.toFixed(2)}</p>
                  </div>
                  <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-400">Ventas Efectivo</p>
                    <p className="text-xs font-black font-mono text-emerald-400">${currentActiveCaja.ventas_efectivo.toFixed(2)}</p>
                  </div>
                  <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-400">Ventas Electrónicas</p>
                    <p className="text-xs font-black font-mono text-blue-400">
                      ${(currentActiveCaja.ventas_zelle + currentActiveCaja.ventas_pagomovil + currentActiveCaja.ventas_punto).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-2 bg-emerald-950/40 rounded-xl border border-emerald-800/50">
                    <p className="text-[10px] text-emerald-300 font-bold">Total Esperado Gaveta</p>
                    <p className="text-xs font-black font-mono text-emerald-300">
                      ${expectedEfectivoPos.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Declarar Efectivo Físico Contado */}
              <div>
                <label className="block font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                  1. Efectivo Contado Físicamente en Gaveta (USD $):
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={posCloseDecEfectivo}
                    onChange={(e) => setPosCloseDecEfectivo(e.target.value)}
                    placeholder="Monto contado por el cajero..."
                    className="w-full pl-8 pr-3 py-2.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white font-mono font-black text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Badge de Diferencia en tiempo real */}
              <div className={`p-3 rounded-xl border flex items-center justify-between font-bold ${
                posCloseDecEfectivo === ''
                  ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                  : Math.abs(difCierrePos) < 0.01
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : difCierrePos > 0
                  ? 'bg-blue-950/60 border-blue-500/50 text-blue-300'
                  : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
              }`}>
                <span>Diferencia en Efectivo:</span>
                <span className="font-mono font-black text-sm">
                  {posCloseDecEfectivo === ''
                    ? 'Ingrese monto contado arriba'
                    : Math.abs(difCierrePos) < 0.01
                    ? '✔ CUADRE EXACTO ($0.00)'
                    : difCierrePos > 0
                    ? `SOBRANTE: +$${difCierrePos.toFixed(2)}`
                    : `FALTANTE: -$${Math.abs(difCierrePos).toFixed(2)}`}
                </span>
              </div>

              {/* Balances electrónicos */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Zelle ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={posCloseDecZelle}
                    onChange={(e) => setPosCloseDecZelle(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Pago Móvil ($ eq)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={posCloseDecPagoMovil}
                    onChange={(e) => setPosCloseDecPagoMovil(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Punto de Venta ($ eq)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={posCloseDecPunto}
                    onChange={(e) => setPosCloseDecPunto(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Observaciones de Cierre */}
              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Observaciones de Cierre:
                </label>
                <input
                  type="text"
                  value={posCloseNotes}
                  onChange={(e) => setPosCloseNotes(e.target.value)}
                  placeholder="Ej: Cuadre conforme sin novedades..."
                  className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Botones de acción */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPosCloseModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={posActionLoading || posCloseDecEfectivo === ''}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl shadow-lg shadow-rose-950/50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{posActionLoading ? 'Cerrando...' : 'Confirmar Cierre de Caja'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL: COMPROBANTE TÉRMICO 80MM DE CIERRE / ARQUEO Z                   */}
      {/* ========================================================================= */}
      {showPosTicketModal && cajaTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0b1120] border border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 text-slate-100 overflow-y-auto max-h-[92vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 print:hidden">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-sm font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Comprobante de Cierre</h3>
                  <p className="text-xs text-slate-400">{cajaTicket.nombre_caja} &bull; Turno #{cajaTicket.numero}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPosTicketModal(false)} 
                className="text-slate-400 hover:text-white text-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SECCIÓN IMPRIMIBLE TICKET 80MM */}
            <div
              id="seccionTicketCajaPosImprimir"
              className="p-4 bg-white text-black rounded-xl border border-slate-300 text-xs font-mono space-y-3 shadow-inner"
            >
              <div className="text-center border-b border-dashed border-slate-400 pb-2">
                <h4 className="font-black text-sm uppercase">EXPENDIO DE MEDICINAS AMANDA B&V C.A.</h4>
                <p className="text-[10px] text-slate-700">RIF: J-40192841-0 &bull; SICM: 50530</p>
                <p className="font-bold mt-1 text-[11px] text-slate-900">CORTE Y CIERRE DE CAJA</p>
                <p className="text-[10px] text-slate-600">{cajaTicket.fecha_cierre || 'En curso'}</p>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between"><span>Caja / Terminal:</span><strong className="text-emerald-800">{cajaTicket.nombre_caja}</strong></div>
                <div className="flex justify-between"><span>Turno Consecutivo:</span><strong>#{cajaTicket.numero}</strong></div>
                <div className="flex justify-between"><span>Apertura por:</span><span>{cajaTicket.usuario_apertura_nombre}</span></div>
                <div className="flex justify-between"><span>Cierre por:</span><span>{cajaTicket.usuario_cierre_nombre || cajaTicket.usuario_apertura_nombre}</span></div>
                <div className="flex justify-between"><span>Fecha Apertura:</span><span>{cajaTicket.fecha_apertura}</span></div>
              </div>

              <div className="border-t border-b border-dashed border-slate-400 py-2 space-y-1 text-[11px]">
                <div className="flex justify-between"><span>Fondo Inicial ($):</span><strong>${cajaTicket.monto_apertura_usd.toFixed(2)}</strong></div>
                <div className="flex justify-between"><span>Ventas Efectivo:</span><span>${cajaTicket.ventas_efectivo.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Ventas Zelle:</span><span>${cajaTicket.ventas_zelle.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold"><span>Ventas Pago Móvil:</span><span>Bs. {(cajaTicket.ventas_pagomovil_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between font-bold"><span>Ventas Punto de Venta:</span><span>Bs. {(cajaTicket.ventas_punto_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between font-bold"><span>Ventas Crédito:</span><span>${cajaTicket.ventas_credito.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-300">
                  <span>TOTAL VENTAS ($):</span><strong>${cajaTicket.total_ventas.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between font-black text-slate-900">
                  <span>TOTAL VENTAS (Bs.):</span>
                  <strong>Bs. {(cajaTicket.total_ventas_bs || (cajaTicket.total_ventas * (cajaTicket.tasa_bcv_apertura || 85.0))).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-bold"><span>Total Esperado Efectivo:</span><strong>${cajaTicket.total_esperado_efectivo.toFixed(2)}</strong></div>
                <div className="flex justify-between font-bold"><span>Efectivo Declarado:</span><strong>${cajaTicket.declarado_efectivo.toFixed(2)}</strong></div>
                <div className={`flex justify-between text-xs font-black pt-1 border-t border-slate-400 ${
                  cajaTicket.diferencia_efectivo === 0 ? 'text-slate-900' :
                  cajaTicket.diferencia_efectivo > 0 ? 'text-emerald-800' : 'text-rose-800'
                }`}>
                  <span>DIFERENCIA:</span>
                  <strong>{cajaTicket.diferencia_efectivo >= 0 ? '+$' : '-$'}{Math.abs(cajaTicket.diferencia_efectivo).toFixed(2)}</strong>
                </div>
              </div>

              {cajaTicket.observaciones_cierre && (
                <div className="border-t border-dashed border-slate-400 pt-1 text-[10px] text-slate-600">
                  <span>Nota: {cajaTicket.observaciones_cierre}</span>
                </div>
              )}

              {/* Firmas */}
              <div className="border-t border-dashed border-slate-400 pt-3 text-center text-[10px] space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="border-b border-slate-500 w-4/5 mx-auto mb-1"></div>
                    <span>Cajero Entrega</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-500 w-4/5 mx-auto mb-1"></div>
                    <span>Supervisor Recibe</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2 print:hidden">
              <button
                type="button"
                onClick={() => setShowPosTicketModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Nuevo Cliente (POS Rápido) */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-[#1e293b] text-slate-100 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-700 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300 font-bold shadow-md">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Registrar Nuevo Cliente (POS)</h3>
                  <p className="text-[11px] text-emerald-100">
                    Quedará guardado y seleccionado de inmediato para esta venta.
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowNewCustomerModal(false)} 
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCustomer} className="p-5 space-y-3.5 text-xs">
              
              {/* Documento / Cédula / RIF */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span>Cédula de Identidad / RIF:</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={newCustIdType}
                    onChange={(e) => setNewCustIdType(e.target.value)}
                    className="w-24 p-2.5 bg-[#0f172a] border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  >
                    <option value="V-">V- (Venezolano)</option>
                    <option value="E-">E- (Extranjero)</option>
                    <option value="J-">J- (Jurídico)</option>
                    <option value="G-">G- (Gubernamental)</option>
                  </select>
                  <input
                    type="text"
                    value={newCustIdNum}
                    onChange={(e) => setNewCustIdNum(e.target.value)}
                    placeholder="Ej: 18456123 o 40192841-0"
                    className="flex-1 p-2.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Nombre y Apellido */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">
                  Nombre y Apellido / Razón Social: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Ej: María González"
                  className="w-full p-2.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              {/* Teléfono & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Teléfono (WhatsApp):</label>
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="Ej: 0414-1234567"
                    className="w-full p-2.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Correo Electrónico:</label>
                  <input
                    type="email"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="w-full p-2.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Dirección */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Dirección de Domicilio / Entrega:</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="Ej: Calle Principal Los Rosales, Edif. 4, Apto 2"
                  className="w-full p-2.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              {/* Condiciones de Crédito */}
              <div className="p-3 bg-[#0f172a] rounded-2xl border border-slate-800 space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Condiciones de Crédito (Cuentas por Cobrar)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Límite de Crédito ($ USD):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newCustCreditLimit}
                      onChange={(e) => setNewCustCreditLimit(e.target.value)}
                      placeholder="0.00"
                      className="w-full p-2 bg-[#1e293b] border border-slate-700 rounded-xl text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Plazo de Pago:</label>
                    <select
                      value={newCustCreditDays}
                      onChange={(e) => setNewCustCreditDays(e.target.value)}
                      className="w-full p-2 bg-[#1e293b] border border-slate-700 rounded-xl text-white font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    >
                      <option value="15">15 días</option>
                      <option value="30">30 días</option>
                      <option value="45">45 días</option>
                      <option value="60">60 días</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  disabled={isSavingCustomer}
                  className="px-4 py-2 text-slate-300 hover:text-white font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg shadow-emerald-700/30 transition flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingCustomer ? 'Guardando...' : 'Guardar y Seleccionar en Venta'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Floating Customer Toast in POS */}
      {customerSuccessToast && (
        <div className="fixed bottom-5 left-5 z-50 px-4 py-3 rounded-2xl shadow-2xl border bg-emerald-950 border-emerald-500 text-emerald-200 flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{customerSuccessToast}</span>
        </div>
      )}

      {/* Floating Toast Notification in POS */}
      {posToast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-bottom-5 ${
          posToast.type === 'success' ? 'bg-emerald-950 border-emerald-500 text-emerald-200' :
          posToast.type === 'error' ? 'bg-rose-950 border-rose-500 text-rose-200' :
          'bg-slate-900 border-slate-700 text-slate-200'
        }`}>
          {posToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
          <span>{posToast.text}</span>
        </div>
      )}

      {/* Estilos para impresión de ticket térmico 80mm en POS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #seccionTicketCajaPosImprimir, #seccionTicketCajaPosImprimir * {
            visibility: visible;
          }
          #seccionTicketCajaPosImprimir {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 4mm !important;
            background: white !important;
            color: black !important;
            font-family: monospace !important;
          }
          @page {
            margin: 2mm;
            size: 80mm auto;
          }
        }
      `}</style>

    </div>
  );
};
