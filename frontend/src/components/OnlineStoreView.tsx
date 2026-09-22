import React, { useState, useMemo, useRef } from 'react';
import { 
  Search, ShoppingCart, Truck, Store, Plus, Minus, 
  Trash2, CheckCircle2, Upload, Image as ImageIcon,
  Building2, Smartphone, Copy, Check, X, FileText
} from 'lucide-react';
import { Product, Settings } from '../types';

interface OnlineStoreViewProps {
  products: Product[];
  settings: Settings;
  onOrderPlaced?: () => void;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export const OnlineStoreView: React.FC<OnlineStoreViewProps> = ({ products, settings, onOrderPlaced }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Checkout form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryType, setDeliveryType] = useState<'PICKUP' | 'DELIVERY'>('DELIVERY');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'PAGO_MOVIL' | 'TRANSFERENCIA' | 'EFECTIVO' | 'ZELLE'>('PAGO_MOVIL');
  const [paymentCurrency, setPaymentCurrency] = useState<'BS' | 'USD'>('BS');
  const [paymentReference, setPaymentReference] = useState('');
  const [proofImage, setProofImage] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const rate = settings?.exchange_rate || 85.0;

  const categories = useMemo(() => {
    return ['ALL', ...Array.from(new Set(products.map(p => p.category))).filter(Boolean)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = search.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        p.generic_name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q);

      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCategory]);

  const addToCart = (product: Product) => {
    if (product.total_stock <= 0) return;

    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.total_stock) {
          alert(`Disponibilidad máxima alcanzada (${product.total_stock} unidades).`);
          return prev;
        }
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });

    // Notify the user with a brief toast message without opening the cart drawer
    setToastMessage(`✓ "${product.name}" agregado al carrito`);
    setTimeout(() => {
      setToastMessage(prev => prev === `✓ "${product.name}" agregado al carrito` ? null : prev);
    }, 2200);
  };

  const updateQuantity = (productId: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    const prod = products.find(p => p.id === productId);
    if (prod && qty > prod.total_stock) {
      alert(`Solo disponemos de ${prod.total_stock} unidades en farmacia.`);
      return;
    }
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const subtotalUsd = cart.reduce((acc, i) => acc + (i.product.selling_price * i.quantity), 0);
  const taxUsd = cart.reduce((acc, i) => {
    if (i.product.has_iva === 1) {
      const pct = i.product.iva_percent ?? 16.0;
      return acc + (i.product.selling_price * i.quantity * (pct / 100));
    }
    return acc;
  }, 0);
  const invoiceSubtotal = subtotalUsd + taxUsd;

  // Condiciones de Delivery solicitadas por el usuario:
  // - Factura de 10 o más dólares ($10+): Delivery GRATIS ($0.00)
  // - Factura de 9 hacia abajo (< $10): Delivery cuesta 1 dólar ($1.00)
  // - Retiro en farmacia (PICKUP): Siempre gratis ($0.00)
  const isFreeDeliveryQualified = invoiceSubtotal >= 10.0;
  const remainingForFreeDelivery = Math.max(0, 10.0 - invoiceSubtotal);
  const deliveryFeeUsd = deliveryType === 'DELIVERY' ? (isFreeDeliveryQualified ? 0.00 : 1.00) : 0.00;
  const totalUsd = invoiceSubtotal + deliveryFeeUsd;
  const totalBs = totalUsd * rate;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Handle capture upload & convert to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor seleccione una imagen válida (JPG, PNG o WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen no debe superar los 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProofImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (deliveryType === 'DELIVERY' && !deliveryAddress.trim()) {
      setErrorMessage('Por favor ingrese su dirección de entrega para el delivery.');
      return;
    }

    if ((paymentMethod === 'PAGO_MOVIL' || paymentMethod === 'TRANSFERENCIA') && !paymentReference.trim()) {
      setErrorMessage('Por favor ingrese el número de referencia del Pago Móvil o Transferencia.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        delivery_type: deliveryType,
        delivery_address: deliveryType === 'DELIVERY' ? deliveryAddress : '',
        payment_method: paymentMethod,
        payment_currency: paymentCurrency,
        payment_reference: paymentReference,
        proof_image: proofImage,
        exchange_rate: rate,
        delivery_fee: deliveryFeeUsd,
        notes: orderNotes,
        items: cart.map(i => ({
          product_id: i.product.id,
          product_name: i.product.name,
          quantity: i.quantity,
          unit_price: i.product.selling_price
        }))
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar pedido');

      setOrderCompleted(data);
      setCart([]);
      setProofImage('');
      setPaymentReference('');
      setShowCartDrawer(false);
      if (onOrderPlaced) onOrderPlaced();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      
      {/* Top Exchange Rate Notification Bar */}
      <div className="bg-[#00331b] text-emerald-100 text-xs py-2 px-4 text-center font-semibold shadow-xs border-b border-[#002b17]">
        <span>Tasa de Cambio Oficial: </span>
        <strong className="text-white font-mono bg-[#004725] px-2 py-0.5 rounded ml-1 border border-emerald-500/30">
          1 USD = {rate.toFixed(2)} Bs.
        </strong>
        <span className="hidden sm:inline ml-2 text-emerald-200">
          &bull; 🚚 ¡Delivery GRATIS por compras de $10 o más! (Menores a $10: Delivery $1.00)
        </span>
      </div>

      {/* Hero Banner with Official Logo */}
      <div className="bg-gradient-to-r from-[#004725] via-[#005930] to-[#012b18] text-white py-6 sm:py-8 px-4 sm:px-6 lg:px-8 shadow-inner border-b-4 border-[#cf152b]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2.5 sm:space-y-3 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#cf152b] animate-pulse" />
              <span className="text-[11px] sm:text-xs uppercase font-extrabold tracking-wider text-emerald-200">
                Expendio de Medicinas &bull; SICM: 50530
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Amanda B&V <span className="text-emerald-300">C.A.</span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 font-medium">
              Tus medicamentos e insumos médicos con la mejor atención, entrega express y pagos directos en Bs. y Dólares.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
              <span className="px-2.5 py-1 bg-emerald-500/20 rounded-xl text-[11px] sm:text-xs font-bold text-emerald-200 border border-emerald-400/30 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-300" />
                Delivery GRATIS ($10+) o $1.00
              </span>
              <span className="px-2.5 py-1 bg-white/10 rounded-xl text-[11px] sm:text-xs font-bold text-white border border-white/20 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
                Pago Móvil Directo
              </span>
            </div>
          </div>

          {/* Official Banner / Logo Card */}
          <div className="shrink-0 max-w-[280px] sm:max-w-md w-full rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30 bg-white p-2">
            <img 
              src="/logo.jpg" 
              alt="Expendio de Medicinas Amanda B&V C.A." 
              className="w-full h-auto object-contain rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Main Catalog Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        
        {/* Search & Categories Box */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-lg border border-slate-200 space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="¿Qué medicamento buscas? (Ej: Paracetamol, Amoxicilina, dolor de cabeza, gripe...)"
              className="w-full pl-12 pr-4 py-3 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#006837] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'Todos los Productos' : cat}
              </button>
            ))}

            {cart.length > 0 && (
              <button
                onClick={() => setShowCartDrawer(true)}
                className="px-3.5 py-1.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition bg-[#cf152b] hover:bg-[#b30e20] text-white shadow-sm flex items-center gap-1.5 ml-auto cursor-pointer active:scale-95"
                title="Abrir carrito y pagar"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Ver Carrito ({cart.reduce((a, b) => a + b.quantity, 0)})</span>
              </button>
            )}
          </div>
        </div>

        {/* Products Grid */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-extrabold text-lg text-slate-900">
              Medicamentos Disponibles ({filteredProducts.length})
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Precios calculados en $ USD y Bolívares (Bs.)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredProducts.map(prod => {
              const inStock = prod.total_stock > 0;
              const priceBs = prod.selling_price * rate;

              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  {/* Image */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    <img
                      src={prod.image_url || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60'}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      <span className="text-[10px] font-bold bg-white/90 backdrop-blur-xs text-slate-800 px-2 py-0.5 rounded-md shadow-xs">
                        {prod.category}
                      </span>
                      {prod.prescription_required === 1 && (
                        <span className="text-[9px] font-extrabold bg-amber-500 text-white px-1.5 py-0.5 rounded shadow-xs">
                          Requiere Receta (Rx)
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2 right-2">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs ${
                          inStock ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                        }`}
                      >
                        {inStock ? `Disponible (${prod.total_stock})` : 'Agotado'}
                      </span>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                        {prod.name}
                      </h3>
                      {prod.generic_name && (
                        <p className="text-[11px] text-slate-500 italic mt-0.5">
                          {prod.generic_name}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">
                        {prod.presentation || 'Presentación farmacológica'}
                      </p>
                      {prod.laboratory && (
                        <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                          Lab: {prod.laboratory}
                        </p>
                      )}
                    </div>

                    {/* Dual Currency Price */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl font-black text-slate-900">
                            ${prod.selling_price.toFixed(2)}
                          </span>
                          {prod.has_iva === 1 ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              +IVA 16%
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              Exento
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-black text-[#006837] font-mono">
                          Bs. {priceBs.toFixed(2)}
                        </p>
                      </div>

                      {(() => {
                        const inCartItem = cart.find(i => i.product.id === prod.id);
                        const inCartQty = inCartItem ? inCartItem.quantity : 0;
                        return (
                          <button
                            onClick={() => addToCart(prod)}
                            disabled={!inStock}
                            className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer ${
                              !inStock
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : inCartQty > 0
                                ? 'bg-[#006837] hover:bg-[#00542c] text-white ring-2 ring-[#cf152b]'
                                : 'bg-[#006837] hover:bg-[#00542c] text-white'
                            }`}
                            title={inCartQty > 0 ? `${inCartQty} unidades en tu carrito. Haz clic para agregar otra.` : 'Agregar al carrito'}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>
                              {!inStock ? 'Agotado' : inCartQty > 0 ? `Comprar (${inCartQty})` : 'Comprar'}
                            </span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Floating Notification Toast when adding items */}
      {toastMessage && (
        <div className="fixed bottom-24 right-6 z-50 bg-[#00381e]/95 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-2xl border border-emerald-400/40 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Cart Button (Opens payment drawer only when customer clicks) */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 z-40">
          <button
            onClick={() => setShowCartDrawer(true)}
            className="w-full sm:w-auto bg-gradient-to-r from-[#006837] to-[#004f29] hover:from-[#00542c] hover:to-[#003d1f] text-white font-extrabold px-5 py-3 rounded-2xl shadow-2xl shadow-emerald-950/40 flex items-center justify-between sm:justify-start gap-3.5 transition active:scale-95 cursor-pointer ring-4 ring-[#cf152b]/50 animate-in fade-in slide-in-from-bottom-4 duration-200"
            title="Haz clic para revisar tus productos y proceder al pago"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-6 h-6" />
                <span className="absolute -top-2 -right-2 bg-[#cf152b] text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-white">
                  {cart.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase font-black text-emerald-200 tracking-wider">
                  Revisar y Pagar
                </div>
                <div className="text-xs sm:text-sm font-black">
                  Ver Carrito ({cart.reduce((acc, i) => acc + i.quantity, 0)}) &bull; ${totalUsd.toFixed(2)}
                </div>
              </div>
            </div>
            <span className="text-sm font-black text-emerald-200 sm:hidden">&rarr;</span>
          </button>
        </div>
      )}

      {/* Cart & Direct Payment Drawer */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Carrito & Pago en Línea</h3>
              </div>
              <button onClick={() => setShowCartDrawer(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Product list */}
              <div className="space-y-2">
                {cart.map(({ product, quantity }) => (
                  <div key={product.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 truncate">{product.name}</h4>
                      <p className="text-[10px] text-slate-500">
                        ${product.selling_price.toFixed(2)} / Bs. {(product.selling_price * rate).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg">
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right w-18">
                        <span className="font-mono font-bold text-xs text-slate-900 block">
                          ${(product.selling_price * quantity).toFixed(2)}
                        </span>
                        <span className="font-mono font-extrabold text-[10px] text-emerald-700 block">
                          Bs. {(product.selling_price * quantity * rate).toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => removeFromCart(product.id)}
                        className="p-1 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Free Delivery Promo Banner */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition-all ${
                isFreeDeliveryQualified 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                    isFreeDeliveryQualified ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="text-[11px] leading-tight">
                    {isFreeDeliveryQualified ? (
                      <p className="font-black text-emerald-900">
                        🎉 ¡Tu pedido califica para <span className="underline decoration-emerald-500">DELIVERY GRATIS</span>!
                      </p>
                    ) : (
                      <p className="font-bold text-amber-950">
                        Agrega <strong className="text-[#cf152b] font-mono font-black">${remainingForFreeDelivery.toFixed(2)}</strong> más para <span className="underline decoration-amber-500">DELIVERY GRATIS</span>
                      </p>
                    )}
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      Compras de $10+: <strong>Gratis</strong> &bull; Compras menores a $10: <strong>$1.00</strong>
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right font-mono font-black text-xs">
                  {isFreeDeliveryQualified ? (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase">
                      ¡GRATIS!
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-full text-[10px] font-extrabold">
                      ${deliveryFeeUsd.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Total Summary Box */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-inner space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span>Subtotal productos:</span>
                  <span className="font-mono">${subtotalUsd.toFixed(2)} / Bs. {(subtotalUsd * rate).toFixed(2)}</span>
                </div>
                {taxUsd > 0 && (
                  <div className="flex justify-between items-center text-xs text-amber-300">
                    <span>IVA (16% Gravados):</span>
                    <span className="font-mono">+${taxUsd.toFixed(2)} / +Bs. {(taxUsd * rate).toFixed(2)}</span>
                  </div>
                )}
                {deliveryType === 'DELIVERY' && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <span>Costo Delivery:</span>
                      {isFreeDeliveryQualified ? (
                        <span className="text-[9px] bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 font-black px-1.5 py-0.2 rounded">
                          PROMO $10+
                        </span>
                      ) : (
                        <span className="text-[9px] bg-amber-500/30 text-amber-300 border border-amber-500/50 font-bold px-1.5 py-0.2 rounded">
                          Menor a $10
                        </span>
                      )}
                    </span>
                    <span className={`font-mono font-bold ${isFreeDeliveryQualified ? 'text-emerald-400 font-black' : 'text-slate-200'}`}>
                      {isFreeDeliveryQualified ? '¡GRATIS! ($0.00)' : `+$${deliveryFeeUsd.toFixed(2)} / +Bs. ${(deliveryFeeUsd * rate).toFixed(2)}`}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-700 flex justify-between items-end">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total en Dólares ($)</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">${totalUsd.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total en Bolívares (Bs.)</span>
                    <span className="text-2xl font-black text-teal-300 font-mono">Bs. {totalBs.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">
                
                {/* Contact Data */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">
                    1. Datos de Contacto y Despacho
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Nombre y Apellido *</label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="Ej: Carmen Gómez"
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Teléfono Móvil *</label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        placeholder="0414-123-4567"
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Método de Entrega</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryType('DELIVERY')}
                        className={`p-2.5 rounded-xl border font-bold text-xs flex flex-col items-center gap-1 transition ${
                          deliveryType === 'DELIVERY'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-500 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        <Truck className="w-4 h-4 text-emerald-600" />
                        <span>Delivery Express {isFreeDeliveryQualified ? '(¡GRATIS!)' : '(+$1.00)'}</span>
                        <span className="text-[10px] font-normal text-slate-500">
                          {isFreeDeliveryQualified ? '🎉 Compras de $10 o más' : 'Gratis si compras $10 o más'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeliveryType('PICKUP')}
                        className={`p-2.5 rounded-xl border font-bold text-xs flex flex-col items-center gap-1 ${
                          deliveryType === 'PICKUP'
                            ? 'bg-teal-50 text-teal-800 border-teal-500'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        <Store className="w-4 h-4" />
                        <span>Retiro en Farmacia (Gratis)</span>
                      </button>
                    </div>
                  </div>

                  {deliveryType === 'DELIVERY' && (
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Dirección Exacta de Entrega *</label>
                      <textarea
                        required
                        rows={2}
                        value={deliveryAddress}
                        onChange={e => setDeliveryAddress(e.target.value)}
                        placeholder="Calle, Residencia, Piso, Apto, Punto de referencia..."
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl resize-none"
                      />
                    </div>
                  )}
                </div>

                {/* Payment Options (Direct Banking & Proof) */}
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">
                    2. Método de Pago & Datos Bancarios
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('PAGO_MOVIL');
                        setPaymentCurrency('BS');
                      }}
                      className={`p-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'PAGO_MOVIL'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Pago Móvil (Bs.)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('TRANSFERENCIA');
                        setPaymentCurrency('BS');
                      }}
                      className={`p-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'TRANSFERENCIA'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Transferencia (Bs.)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('EFECTIVO');
                        setPaymentCurrency('USD');
                      }}
                      className={`p-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'EFECTIVO'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>💵 Efectivo al Recibir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('ZELLE');
                        setPaymentCurrency('USD');
                      }}
                      className={`p-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'ZELLE'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>⚡ Zelle (USD)</span>
                    </button>
                  </div>

                  {/* Bank Details Card when Pago Movil or Transferencia */}
                  {(paymentMethod === 'PAGO_MOVIL' || paymentMethod === 'TRANSFERENCIA') && (
                    <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/60">
                        <span className="font-extrabold text-emerald-900 text-xs flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                          Datos para Pago Móvil / Transferencia:
                        </span>
                        <span className="text-[10px] font-black text-emerald-800 font-mono">
                          Monto exacto: Bs. {totalBs.toFixed(2)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-1.5 bg-white rounded-lg border border-emerald-100 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] text-slate-400 block font-semibold">BANCO</span>
                            <strong className="text-slate-800 text-[11px]">{settings.bank_name}</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(settings.bank_name, 'banco')}
                            className="text-slate-400 hover:text-emerald-700 p-1"
                          >
                            {copiedField === 'banco' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>

                        <div className="p-1.5 bg-white rounded-lg border border-emerald-100 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] text-slate-400 block font-semibold">TELÉFONO</span>
                            <strong className="text-slate-800 text-[11px] font-mono">{settings.bank_phone}</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(settings.bank_phone, 'telefono')}
                            className="text-slate-400 hover:text-emerald-700 p-1"
                          >
                            {copiedField === 'telefono' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>

                        <div className="p-1.5 bg-white rounded-lg border border-emerald-100 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] text-slate-400 block font-semibold">CÉDULA / RIF</span>
                            <strong className="text-slate-800 text-[11px] font-mono">{settings.bank_id_number}</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(settings.bank_id_number, 'cedula')}
                            className="text-slate-400 hover:text-emerald-700 p-1"
                          >
                            {copiedField === 'cedula' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>

                        <div className="p-1.5 bg-white rounded-lg border border-emerald-100 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] text-slate-400 block font-semibold">TITULAR</span>
                            <strong className="text-slate-800 text-[10px] truncate block max-w-[120px]">{settings.bank_holder}</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(settings.bank_holder, 'titular')}
                            className="text-slate-400 hover:text-emerald-700 p-1"
                          >
                            {copiedField === 'titular' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {paymentMethod === 'TRANSFERENCIA' && settings.bank_account_number && (
                        <div className="p-1.5 bg-white rounded-lg border border-emerald-100 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] text-slate-400 block font-semibold">Nº CUENTA</span>
                            <strong className="text-slate-800 text-[11px] font-mono">{settings.bank_account_number}</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(settings.bank_account_number, 'cuenta')}
                            className="text-slate-400 hover:text-emerald-700 p-1"
                          >
                            {copiedField === 'cuenta' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Zelle Details Card */}
                  {paymentMethod === 'ZELLE' && (
                    <div className="bg-purple-50 border border-purple-200 p-3 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-purple-200">
                        <span className="font-extrabold text-purple-900 text-xs">Datos para Zelle:</span>
                        <span className="text-xs font-black text-purple-900 font-mono">Monto: ${totalUsd.toFixed(2)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-1.5 bg-white rounded-lg border border-purple-100">
                          <span className="text-[9px] text-slate-400 block font-semibold">CORREO</span>
                          <strong className="text-slate-800 text-[11px] font-mono">{settings.zelle_email}</strong>
                        </div>
                        <div className="p-1.5 bg-white rounded-lg border border-purple-100">
                          <span className="text-[9px] text-slate-400 block font-semibold">TITULAR</span>
                          <strong className="text-slate-800 text-[11px]">{settings.zelle_holder}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reference input for digital payments */}
                  {(paymentMethod === 'PAGO_MOVIL' || paymentMethod === 'TRANSFERENCIA' || paymentMethod === 'ZELLE') && (
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Número de Referencia del Pago * (Últimos 4 o 6 dígitos)
                      </label>
                      <input
                        type="text"
                        required
                        value={paymentReference}
                        onChange={e => setPaymentReference(e.target.value)}
                        placeholder="Ej: 981245"
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-xs"
                      />
                    </div>
                  )}

                  {/* Upload Image Proof Capture */}
                  {(paymentMethod === 'PAGO_MOVIL' || paymentMethod === 'TRANSFERENCIA' || paymentMethod === 'ZELLE') && (
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Adjuntar Capture / Comprobante de Pago
                      </label>

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />

                      {proofImage ? (
                        <div className="relative rounded-2xl overflow-hidden border border-emerald-300 bg-slate-50 p-2 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={proofImage}
                              alt="Comprobante"
                              className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                            />
                            <div>
                              <p className="font-bold text-emerald-800 text-xs flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Comprobante adjuntado
                              </p>
                              <p className="text-[10px] text-slate-400">Listo para enviar con el pedido</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setProofImage('');
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full p-3 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl flex flex-col items-center justify-center gap-1 bg-slate-50 hover:bg-emerald-50/40 transition text-slate-600"
                        >
                          <Upload className="w-5 h-5 text-emerald-600" />
                          <span className="font-bold text-xs">Subir Capture de Pago Móvil / Comprobante</span>
                          <span className="text-[10px] text-slate-400">Toma una foto o selecciona de tu galería</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Notas Adicionales (Opcional)</label>
                    <input
                      type="text"
                      value={orderNotes}
                      onChange={e => setOrderNotes(e.target.value)}
                      placeholder="Ej: Cambio para billete de $20 / Contactar antes de salir"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  {errorMessage && (
                    <p className="text-red-600 text-xs bg-red-50 p-2 rounded-lg border border-red-200 font-medium">
                      {errorMessage}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition active:scale-98 mt-3"
                  >
                    {isSubmitting ? 'Verificando y enviando...' : `Confirmar Pedido (${paymentCurrency === 'BS' ? `Bs. ${totalBs.toFixed(2)}` : `$${totalUsd.toFixed(2)}`})`}
                  </button>
                </div>

              </form>
            </div>

          </div>
        </div>
      )}

      {/* Order Success Modal */}
      {orderCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            
            <h3 className="text-xl font-black text-slate-900">¡Pago y Pedido Recibidos!</h3>
            <p className="text-xs text-slate-500 mt-1">
              Tu pedido ha sido enviado con éxito al sistema de la farmacia:
            </p>

            <div className="my-4 p-3 bg-slate-50 rounded-2xl border border-slate-200 font-mono font-black text-lg text-emerald-700">
              #{orderCompleted.orderNumber}
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 text-left space-y-1 my-3">
              <p>Monto Total: <strong>${orderCompleted.total?.toFixed(2)} USD</strong> (Bs. {orderCompleted.totalBs?.toFixed(2)})</p>
              <p>Estado del pago: <span className="font-semibold text-emerald-700">Comprobante Registrado para Validación</span></p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              El personal de la farmacia validará el capture del pago móvil e iniciará de inmediato el despacho de tus medicamentos.
            </p>

            <button
              onClick={() => setOrderCompleted(null)}
              className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
            >
              Volver a la Tienda
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
