import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, AlertTriangle, 
  Calendar, ShieldAlert, Edit2, Layers, CheckCircle, X,
  Upload, Image as ImageIcon, Camera, Trash2, HelpCircle, Sparkles, Check,
  ScanLine, Globe, RefreshCw
} from 'lucide-react';
import { Product, Category } from '../types';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface InventoryViewProps {
  products: Product[];
  categories?: Category[];
  onRefresh: () => void;
}

const PHARMACY_IMAGE_PRESETS = [
  { label: 'Pastillas / Blíster', url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60' },
  { label: 'Jarabe / Frasco', url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=500&auto=format&fit=crop&q=60' },
  { label: 'Inyectable / Ampolla', url: 'https://images.unsplash.com/photo-1579165466791-78822d31e67e?w=500&auto=format&fit=crop&q=60' },
  { label: 'Gotas / Gotero', url: 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=500&auto=format&fit=crop&q=60' },
  { label: 'Pomada / Crema', url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=60' },
  { label: 'Cuidado Personal', url: 'https://images.unsplash.com/photo-1556228722-d0b5be7490bf?w=500&auto=format&fit=crop&q=60' }
];

export const InventoryView: React.FC<InventoryViewProps> = ({ products, categories: categoriesProp = [], onRefresh }) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  
  // Modal states
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [selectedProductForBatch, setSelectedProductForBatch] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera Barcode Scanner State
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Internet Image Search State
  const [showImageSearchModal, setShowImageSearchModal] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [imageSearchResults, setImageSearchResults] = useState<{ image: string; thumbnail: string; title: string; source: string }[]>([]);
  const [imageSearchError, setImageSearchError] = useState<string | null>(null);

  // New Product Form
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    generic_name: '',
    category: 'Analgésicos y Antiinflamatorios',
    presentation: '',
    laboratory: '',
    prescription_required: false,
    cost_price: '',
    profit_margin: '50',
    selling_price: '',
    has_iva: false,
    iva_percent: 16,
    min_stock: '5',
    image_url: '',
    description: '',
    warehouse_location: '',
    batch_number: '',
    expiry_date: '',
    initial_stock: ''
  });

  // Bidirectional Cost, Margin and Price Handlers
  const handleCostChange = (val: string) => {
    const cost = parseFloat(val);
    const margin = parseFloat(formData.profit_margin);

    if (!isNaN(cost) && cost > 0 && !isNaN(margin)) {
      const calculatedSelling = (cost * (1 + margin / 100)).toFixed(2);
      setFormData(prev => ({
        ...prev,
        cost_price: val,
        selling_price: calculatedSelling
      }));
    } else if (!isNaN(cost) && cost > 0 && formData.selling_price) {
      const selling = parseFloat(formData.selling_price);
      if (!isNaN(selling) && selling > 0) {
        const calculatedMargin = (((selling - cost) / cost) * 100).toFixed(1);
        setFormData(prev => ({
          ...prev,
          cost_price: val,
          profit_margin: calculatedMargin
        }));
      } else {
        setFormData(prev => ({ ...prev, cost_price: val }));
      }
    } else {
      setFormData(prev => ({ ...prev, cost_price: val }));
    }
  };

  const handleMarginChange = (val: string) => {
    const margin = parseFloat(val);
    const cost = parseFloat(formData.cost_price);

    if (!isNaN(margin) && !isNaN(cost) && cost > 0) {
      const calculatedSelling = (cost * (1 + margin / 100)).toFixed(2);
      setFormData(prev => ({
        ...prev,
        profit_margin: val,
        selling_price: calculatedSelling
      }));
    } else {
      setFormData(prev => ({ ...prev, profit_margin: val }));
    }
  };

  const handleSellingPriceChange = (val: string) => {
    const selling = parseFloat(val);
    const cost = parseFloat(formData.cost_price);

    if (!isNaN(selling) && !isNaN(cost) && cost > 0) {
      const calculatedMargin = (((selling - cost) / cost) * 100).toFixed(1);
      setFormData(prev => ({
        ...prev,
        selling_price: val,
        profit_margin: calculatedMargin
      }));
    } else {
      setFormData(prev => ({ ...prev, selling_price: val }));
    }
  };

  const applyPresetMargin = (pct: number) => {
    const cost = parseFloat(formData.cost_price);
    const marginStr = pct.toString();
    if (!isNaN(cost) && cost > 0) {
      const calculatedSelling = (cost * (1 + pct / 100)).toFixed(2);
      setFormData(prev => ({
        ...prev,
        profit_margin: marginStr,
        selling_price: calculatedSelling
      }));
    } else {
      setFormData(prev => ({ ...prev, profit_margin: marginStr }));
    }
  };

  // New Batch Form
  const [batchData, setBatchData] = useState({
    batch_number: '',
    expiry_date: '',
    stock: '',
    cost_price: ''
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida (JPG, PNG o WEBP)');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert('La imagen no debe superar los 8MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, image_url: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Sound beep when barcode is recognized
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // AudioContext unavailable or muted
    }
  };

  const handleStartScanner = () => {
    setScannerError(null);
    setShowBarcodeScanner(true);
  };

  const handleStopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping camera scanner:', e);
      }
      html5QrCodeRef.current = null;
    }
    setShowBarcodeScanner(false);
  };

  const handleGenerateBarcode = () => {
    const randomSuffix = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const generated = `759${randomSuffix.slice(0, 9)}`;
    setFormData(prev => ({ ...prev, code: generated }));
  };

  // Barcode scanner effect for mobile camera
  useEffect(() => {
    let isMounted = true;
    if (!showBarcodeScanner) return;

    const initScanner = async () => {
      await new Promise(r => setTimeout(r, 150));
      const element = document.getElementById('barcode-reader');
      if (!element || !isMounted) return;

      try {
        const qrCode = new Html5Qrcode('barcode-reader', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE
          ],
          verbose: false
        });
        html5QrCodeRef.current = qrCode;

        await qrCode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 250, height: 160 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            playBeep();
            if (navigator.vibrate) {
              try { navigator.vibrate(100); } catch (_) {}
            }
            setFormData(prev => ({ ...prev, code: decodedText }));
            handleStopScanner();
          },
          () => {}
        );
      } catch (err: any) {
        console.error('Camera scanner init failed:', err);
        if (isMounted) {
          const isNotAllowed = err?.name === 'NotAllowedError' || err?.message?.includes('NotAllowedError');
          setScannerError(
            isNotAllowed
              ? 'Permiso de cámara denegado. Concede permisos de cámara en tu navegador.'
              : 'No se pudo iniciar la cámara. Verifica que no esté en uso por otra app.'
          );
        }
      }
    };

    initScanner();

    return () => {
      isMounted = false;
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(console.warn);
        }
        html5QrCodeRef.current = null;
      }
    };
  }, [showBarcodeScanner]);

  // Online image search handlers
  const handleOpenImageSearch = () => {
    const defaultTerm = (formData.name || formData.generic_name || '').trim();
    setImageSearchQuery(defaultTerm);
    setImageSearchResults([]);
    setImageSearchError(null);
    setShowImageSearchModal(true);
    if (defaultTerm) {
      executeImageSearch(defaultTerm);
    }
  };

  const executeImageSearch = async (term: string) => {
    if (!term.trim()) return;
    setIsSearchingImages(true);
    setImageSearchError(null);
    try {
      const res = await fetch(`/api/products/search-images?q=${encodeURIComponent(term.trim())}`);
      const data = await res.json();
      const list = Array.isArray(data.images) ? data.images : (Array.isArray(data.results) ? data.results : []);
      if (list.length > 0) {
        setImageSearchResults(list);
      } else {
        setImageSearchResults([]);
        setImageSearchError('No se encontraron imágenes para esta búsqueda. Intenta con la fórmula médica o nombre comercial.');
      }
    } catch (err: any) {
      console.error('Error fetching online images:', err);
      setImageSearchError('Error de conexión al buscar imágenes en línea.');
    } finally {
      setIsSearchingImages(false);
    }
  };

  const handleSelectOnlineImage = (url: string) => {
    setFormData(prev => ({ ...prev, image_url: url }));
    setShowImageSearchModal(false);
  };

  const availableCategoryNames = useMemo(() => {
    if (categoriesProp && categoriesProp.length > 0) {
      return categoriesProp.map(c => c.name);
    }
    const fromProducts = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
    return fromProducts.length > 0 ? fromProducts : [
      'Analgésicos y Antiinflamatorios',
      'Antibióticos',
      'Cardiovascular y Presión Arterial',
      'Diabetes y Endocrinología',
      'Antialérgicos y Antihistamínicos',
      'Gastrointestinal',
      'Pediatría y Nutrición',
      'Vitaminas y Suplementos',
      'Material Médico y Desinfección',
      'Cuidado Personal'
    ];
  }, [categoriesProp, products]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    availableCategoryNames.forEach(c => set.add(c));
    products.forEach(p => { if (p.category) set.add(p.category); });
    return ['ALL', ...Array.from(set)];
  }, [availableCategoryNames, products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.generic_name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        p.laboratory.toLowerCase().includes(search.toLowerCase());

      const matchCat = categoryFilter === 'ALL' || p.category === categoryFilter;

      let matchStock = true;
      if (stockFilter === 'LOW') matchStock = p.total_stock > 0 && p.total_stock <= p.min_stock;
      if (stockFilter === 'OUT') matchStock = p.total_stock <= 0;

      return matchSearch && matchCat && matchStock;
    });
  }, [products, search, categoryFilter, stockFilter]);

  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setFormData({
      code: '',
      name: '',
      generic_name: '',
      category: availableCategoryNames[0] || 'General',
      presentation: '',
      laboratory: '',
      prescription_required: false,
      cost_price: '',
      profit_margin: '50',
      selling_price: '',
      has_iva: false,
      iva_percent: 16,
      min_stock: '5',
      image_url: '',
      description: '',
      warehouse_location: '',
      batch_number: '',
      expiry_date: '',
      initial_stock: ''
    });
    setShowNewProductModal(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    const numCost = prod.cost_price ? prod.cost_price.toString() : '';
    const numSelling = prod.selling_price ? prod.selling_price.toString() : '';
    let marginStr = '50';
    if (prod.profit_margin !== undefined && prod.profit_margin !== null) {
      marginStr = prod.profit_margin.toString();
    } else if (Number(numCost) > 0 && Number(numSelling) > 0) {
      marginStr = (((Number(numSelling) - Number(numCost)) / Number(numCost)) * 100).toFixed(1);
    }

    setFormData({
      code: prod.code || '',
      name: prod.name || '',
      generic_name: prod.generic_name || '',
      category: prod.category || availableCategoryNames[0] || 'General',
      presentation: prod.presentation || '',
      laboratory: prod.laboratory || '',
      prescription_required: prod.prescription_required === 1,
      cost_price: numCost,
      profit_margin: marginStr,
      selling_price: numSelling,
      has_iva: prod.has_iva === 1,
      iva_percent: prod.iva_percent !== undefined ? prod.iva_percent : 16,
      min_stock: prod.min_stock !== undefined ? prod.min_stock.toString() : '5',
      image_url: prod.image_url || '',
      description: prod.description || '',
      warehouse_location: prod.warehouse_location || '',
      batch_number: '',
      expiry_date: '',
      initial_stock: ''
    });
    setShowNewProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProduct(true);
    try {
      const payload: any = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        generic_name: formData.generic_name.trim(),
        category: formData.category,
        presentation: formData.presentation.trim(),
        laboratory: formData.laboratory.trim(),
        prescription_required: formData.prescription_required,
        cost_price: Number(formData.cost_price) || 0,
        profit_margin: Number(formData.profit_margin) || 0,
        selling_price: Number(formData.selling_price) || 0,
        has_iva: formData.has_iva ? 1 : 0,
        iva_percent: formData.has_iva ? (Number(formData.iva_percent) || 16.0) : 0.0,
        min_stock: Number(formData.min_stock) || 5,
        image_url: formData.image_url,
        description: formData.description.trim(),
        warehouse_location: formData.warehouse_location.trim()
      };

      if (editingProduct) {
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Error al actualizar medicamento');
        }
      } else {
        payload.initial_batch = formData.batch_number ? {
          batch_number: formData.batch_number,
          expiry_date: formData.expiry_date,
          stock: Number(formData.initial_stock)
        } : null;

        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Error al crear medicamento');
        }
      }

      setShowNewProductModal(false);
      setEditingProduct(null);
      onRefresh();
      // Reset form
      setFormData({
        code: '', name: '', generic_name: '', category: availableCategoryNames[0] || 'General',
        presentation: '', laboratory: '', prescription_required: false,
        cost_price: '', profit_margin: '50', selling_price: '', has_iva: false, iva_percent: 16, min_stock: '5', image_url: '',
        description: '', warehouse_location: '', batch_number: '', expiry_date: '', initial_stock: ''
      });
    } catch (err: any) {
      alert(err.message || 'Error al procesar el producto');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    try {
      const res = await fetch(`/api/products/${productToDelete.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al eliminar producto');
      }
      setProductToDelete(null);
      if (editingProduct?.id === productToDelete.id) {
        setShowNewProductModal(false);
        setEditingProduct(null);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar medicamento');
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForBatch) return;

    try {
      const payload = {
        product_id: selectedProductForBatch.id,
        batch_number: batchData.batch_number,
        expiry_date: batchData.expiry_date,
        stock: Number(batchData.stock),
        cost_price: Number(batchData.cost_price || selectedProductForBatch.cost_price)
      };

      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al agregar lote');
      }

      setShowAddBatchModal(false);
      setSelectedProductForBatch(null);
      setBatchData({ batch_number: '', expiry_date: '', stock: '', cost_price: '' });
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const totalUnits = products.reduce((acc, p) => acc + p.total_stock, 0);
  const lowStockCount = products.filter(p => p.total_stock > 0 && p.total_stock <= p.min_stock).length;
  const outOfStockCount = products.filter(p => p.total_stock <= 0).length;

  return (
    <div className="space-y-5">
      
      {/* Top Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Medicamentos Registrados</p>
            <p className="text-xl font-extrabold text-white">{products.length}</p>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-950/60 border border-teal-800/60 text-teal-400 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Unidades en Inventario</p>
            <p className="text-xl font-extrabold text-white">{totalUnits}</p>
          </div>
        </div>

        <div 
          onClick={() => setStockFilter(stockFilter === 'LOW' ? 'ALL' : 'LOW')}
          className={`p-4 rounded-2xl border shadow-md flex items-center gap-3 cursor-pointer transition ${
            stockFilter === 'LOW' 
              ? 'bg-amber-950/50 border-amber-500/60 text-amber-200' 
              : 'bg-slate-900 border-slate-800 hover:border-amber-500/40 text-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-900/40 border border-amber-800/40 text-amber-400 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Stock Mínimo / Bajo</p>
            <p className="text-xl font-extrabold text-amber-400">{lowStockCount}</p>
          </div>
        </div>

        <div 
          onClick={() => setStockFilter(stockFilter === 'OUT' ? 'ALL' : 'OUT')}
          className={`p-4 rounded-2xl border shadow-md flex items-center gap-3 cursor-pointer transition ${
            stockFilter === 'OUT' 
              ? 'bg-red-950/50 border-red-500/60 text-red-200' 
              : 'bg-slate-900 border-slate-800 hover:border-red-500/40 text-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-red-900/40 border border-red-800/40 text-red-400 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Productos Agotados</p>
            <p className="text-xl font-extrabold text-red-400">{outOfStockCount}</p>
          </div>
        </div>
      </div>

      {/* Action and Search Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, principio activo, código o laboratorio..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-xl focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Filters and Add button */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="text-xs bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'ALL' ? 'Todas las Categorías' : c}</option>
            ))}
          </select>

          <button
            onClick={handleOpenNewProduct}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-700/20 transition active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Medicamento</span>
          </button>
        </div>

      </div>

      {/* Inventory Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 border-b border-slate-800 text-slate-300 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Medicamento / Principio Activo</th>
                <th className="py-3 px-4">Categoría & Presentación</th>
                <th className="py-3 px-4">Laboratorio</th>
                <th className="py-3 px-4 text-center">Ubicación</th>
                <th className="py-3 px-4 text-right">Costo</th>
                <th className="py-3 px-4 text-right">PVP Venta</th>
                <th className="py-3 px-4 text-center">Stock Total</th>
                <th className="py-3 px-4">Lotes & Vencimiento</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(product => {
                const isOutOfStock = product.total_stock <= 0;
                const isLowStock = product.total_stock > 0 && product.total_stock <= product.min_stock;

                return (
                  <tr key={product.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-400">
                      {product.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0 bg-slate-800"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        )}
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {product.name}
                            {product.prescription_required === 1 && (
                              <span className="text-[9px] bg-amber-950/60 border border-amber-800/60 text-amber-300 font-bold px-1.5 py-0.2 rounded" title="Requiere Receta">
                                Rx
                              </span>
                            )}
                          </div>
                          {product.generic_name && (
                            <div className="text-[11px] text-slate-400 italic">
                              {product.generic_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block bg-slate-800 text-slate-300 border border-slate-700/60 font-medium px-2 py-0.5 rounded-md text-[11px]">
                        {product.category}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {product.presentation}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-300">
                      {product.laboratory || '-'}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400 font-medium">
                      {product.warehouse_location || 'Estante'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono">
                      ${Number(product.cost_price).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-extrabold text-white font-mono">
                        ${Number(product.selling_price).toFixed(2)}
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        {Number(product.cost_price) > 0 && Number(product.selling_price) > Number(product.cost_price) ? (
                          <span 
                            className="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-mono" 
                            title={`Ganancia: +$${(Number(product.selling_price) - Number(product.cost_price)).toFixed(2)}`}
                          >
                            +{(((Number(product.selling_price) - Number(product.cost_price)) / Number(product.cost_price)) * 100).toFixed(0)}%
                          </span>
                        ) : null}
                        {product.has_iva === 1 ? (
                          <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60">
                            +IVA 16%
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                            Exento
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          isOutOfStock
                            ? 'bg-red-950/60 text-red-400 border border-red-800/60'
                            : isLowStock
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                            : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                        }`}
                      >
                        {product.total_stock} und
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {product.batches && product.batches.length > 0 ? (
                        <div className="space-y-1">
                          {product.batches.map(b => (
                            <div key={b.id} className="text-[10px] flex items-center gap-1 text-slate-300 font-mono">
                              <span className="font-semibold text-slate-200">{b.batch_number}:</span>
                              <span className="text-emerald-400">{b.stock} und</span>
                              <span className="text-slate-400">(Vence: {b.expiry_date})</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">Sin lotes activos</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditProduct(product)}
                          className="text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 font-semibold px-2.5 py-1 rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer shadow-xs"
                          title="Editar información de este medicamento"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProductForBatch(product);
                            setShowAddBatchModal(true);
                          }}
                          className="text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 font-semibold px-2.5 py-1 rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer shadow-xs"
                          title="Ingresar nuevo lote a este medicamento"
                        >
                          <Plus className="w-3.5 h-3.5 text-teal-400" />
                          <span>+ Lote</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Crear Nuevo Medicamento */}
      {showNewProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 border border-slate-800 text-white animate-in fade-in zoom-in-95 duration-200 max-h-[94vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                {editingProduct ? (
                  <Edit2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Package className="w-5 h-5 text-emerald-400" />
                )}
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    {editingProduct ? `Editar Medicamento: ${editingProduct.name}` : 'Registrar Nuevo Medicamento'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingProduct ? 'Modifica los precios, categoría, laboratorio o datos del producto.' : 'Ingresa los datos para el catálogo interno y la tienda online.'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowNewProductModal(false);
                  setEditingProduct(null);
                }} 
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 mt-3 text-xs overflow-y-auto flex-1 pr-1">
              
              {/* Código de barras y Nombre comercial */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-200">Código de Barras *</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleStartScanner}
                        className="px-2 py-0.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/50 rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                        title="Escanear código de barras con la cámara del celular"
                      >
                        <ScanLine className="w-3 h-3 text-emerald-400" />
                        <span>Cámara</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateBarcode}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                        title="Generar código de barras interno aleatorio"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Auto</span>
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ej: 7591001099"
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Escanea con la cámara del celular, pistola láser o usa código automático.
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-200">Nombre Comercial (Marca) *</label>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Atamel Forte 650mg / Brugesic 400mg"
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    El nombre de marca que viene en la caja.
                  </span>
                </div>
              </div>

              {/* Principio Activo y Categoría */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/60">
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="font-extrabold text-emerald-300">Principio Activo</label>
                    <span className="text-[9px] bg-emerald-900/80 text-emerald-200 border border-emerald-700/60 font-black px-1.5 py-0.2 rounded">
                      Fórmula Médica
                    </span>
                  </div>
                  <input
                    type="text"
                    value={formData.generic_name}
                    onChange={e => setFormData({ ...formData, generic_name: e.target.value })}
                    placeholder="Ej: Acetaminofén / Ibuprofeno / Amoxicilina"
                    className="w-full p-2 bg-[#0f172a] border border-emerald-700/70 text-white placeholder-slate-500 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-emerald-400/80 mt-1 block">
                    Componente químico curativo para búsquedas y sustitutos.
                  </span>
                </div>

                <div>
                  <label className="font-bold text-slate-200 block mb-1">Categoría *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white rounded-lg text-xs"
                  >
                    {availableCategoryNames.map(catName => (
                      <option key={catName} value={catName}>{catName}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Sección en la tienda online y reportes.
                  </span>
                </div>
              </div>

              {/* Presentación, Laboratorio y Ubicación */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-200 block mb-1">Presentación</label>
                  <input
                    type="text"
                    value={formData.presentation}
                    onChange={e => setFormData({ ...formData, presentation: e.target.value })}
                    placeholder="Ej: Caja x 20 Tabletas / Jarabe 120ml"
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Forma farmacéutica y contenido.
                  </span>
                </div>
                <div>
                  <label className="font-bold text-slate-200 block mb-1">Laboratorio / Fabricante</label>
                  <input
                    type="text"
                    value={formData.laboratory}
                    onChange={e => setFormData({ ...formData, laboratory: e.target.value })}
                    placeholder="Ej: Calox / Genfar / Bayer"
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Droguería fabricante del lote.
                  </span>
                </div>
                <div>
                  <label className="font-bold text-slate-200 block mb-1">Ubicación en Depósito</label>
                  <input
                    type="text"
                    value={formData.warehouse_location}
                    onChange={e => setFormData({ ...formData, warehouse_location: e.target.value })}
                    placeholder="Ej: Estante B - Tramo 2 / Nevera"
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white placeholder-slate-500 rounded-lg text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Dónde encontrarlo en la farmacia.
                  </span>
                </div>
              </div>

              {/* Estructura de Precios, Margen de Ganancia y PVP */}
              <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800 space-y-3.5 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <label className="font-extrabold text-white block text-xs flex items-center gap-1.5">
                      <span className="text-emerald-400">💰</span>
                      <span>Estructura de Costos, Margen y Precio de Venta</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Cálculo bidireccional: escribe el margen (%) para calcular el PVP, o escribe el PVP para calcular el margen.
                    </span>
                  </div>
                  {Number(formData.cost_price) > 0 && Number(formData.selling_price) > 0 && (
                    <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-xl border border-emerald-600/40 shadow-xs self-start sm:self-auto">
                      <span className="text-[10px] uppercase font-black text-slate-400">Ganancia Neta:</span>
                      <strong className="text-xs font-black text-emerald-400 font-mono">
                        +${(Number(formData.selling_price) - Number(formData.cost_price)).toFixed(2)}
                      </strong>
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.5 rounded font-mono">
                        +{formData.profit_margin || '0'}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1. Costo Unitario */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-xs">
                    <label className="font-bold text-slate-300 block text-xs mb-1">
                      1. Costo Proveedor ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.cost_price}
                        onChange={e => handleCostChange(e.target.value)}
                        placeholder="100.00"
                        className="w-full pl-6 pr-2 py-2 bg-[#0f172a] border border-slate-700 text-white rounded-lg font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 transition"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Lo que pagas a droguería.</span>
                  </div>

                  {/* 2. Margen de Ganancia (%) */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-emerald-600/40 shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-extrabold text-emerald-400 block text-xs">
                        2. Margen Ganancia (%)
                      </label>
                      <span className="text-[9px] font-black uppercase text-emerald-300 bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                        Auto
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        value={formData.profit_margin}
                        onChange={e => handleMarginChange(e.target.value)}
                        placeholder="50"
                        className="w-full pr-7 pl-2.5 py-2 bg-[#0f172a] border border-emerald-600/50 rounded-lg font-mono font-black text-xs text-emerald-400 focus:ring-2 focus:ring-emerald-500 transition"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-400 font-black text-xs">%</span>
                    </div>

                    {/* Presets rápidos */}
                    <div className="flex items-center gap-1 mt-1.5 overflow-x-auto">
                      <span className="text-[9px] text-slate-400 font-semibold mr-0.5">Rápido:</span>
                      {[25, 30, 40, 50, 70, 100].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => applyPresetMargin(pct)}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                            formData.profit_margin === pct.toString()
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. PVP Base Venta ($) */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-xs">
                    <label className="font-bold text-slate-300 block text-xs mb-1">
                      3. PVP Base Venta ($) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.selling_price}
                        onChange={e => handleSellingPriceChange(e.target.value)}
                        placeholder="150.00"
                        className="w-full pl-6 pr-2 py-2 bg-[#0f172a] border border-slate-700 text-white font-mono font-black text-xs focus:ring-2 focus:ring-emerald-500 transition"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Precio base al cliente.</span>
                  </div>
                </div>

                {/* Stock Mínimo y Control Rx */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-32">
                      <label className="font-bold text-slate-300 block text-[11px] mb-0.5">Stock Mínimo Alerta</label>
                      <input
                        type="number"
                        value={formData.min_stock}
                        onChange={e => setFormData({ ...formData, min_stock: e.target.value })}
                        placeholder="5"
                        className="w-full p-1.5 bg-slate-900 border border-slate-700 text-white rounded-lg text-xs font-bold font-mono"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 pt-3">
                      Avisa cuando queden pocas unidades.
                    </span>
                  </div>

                  <div className="flex items-center pt-2 sm:pt-4">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-300">
                      <input
                        type="checkbox"
                        checked={formData.prescription_required}
                        onChange={e => setFormData({ ...formData, prescription_required: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded bg-slate-900 border-slate-700 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs block font-bold text-white">Requiere Receta Médica (Rx)</span>
                        <span className="text-[10px] text-slate-400 font-normal">Medicamento psicotrópico o controlado</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Tarjeta de IVA (16% Opcional) */}
              <div className={`p-3.5 rounded-xl border transition-all ${
                formData.has_iva ? 'bg-amber-950/30 border-amber-800/60 shadow-xs' : 'bg-[#0f172a] border-slate-800'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.has_iva}
                      onChange={e => setFormData({ ...formData, has_iva: e.target.checked })}
                      className="w-5 h-5 text-emerald-600 rounded cursor-pointer bg-slate-900 border-slate-700"
                    />
                    <div>
                      <span className="font-extrabold text-xs text-white block">
                        Aplica IVA del 16% (Opcional)
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {formData.has_iva 
                          ? 'Este producto pagará 16% de IVA (típico en cuidado personal, cosméticos, golosinas o suplementos).' 
                          : 'Producto Exento de IVA (Tasa 0% - Ley de Medicamentos Esenciales del SENIAT).'}
                      </span>
                    </div>
                  </label>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full shrink-0 ${
                    formData.has_iva ? 'bg-amber-950/60 text-amber-300 border border-amber-800/80' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/80'
                  }`}>
                    {formData.has_iva ? 'Gravado (IVA 16%)' : 'Exento (IVA 0%)'}
                  </span>
                </div>

                {/* Calculation preview */}
                {formData.has_iva && Number(formData.selling_price) > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-amber-800/60 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-300">
                    <span>Base Imponible: <strong className="text-white">${Number(formData.selling_price).toFixed(2)}</strong></span>
                    <span>+ IVA (16%): <strong className="text-amber-400">${(Number(formData.selling_price) * 0.16).toFixed(2)}</strong></span>
                    <span className="font-black text-emerald-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-emerald-800/60 shadow-xs">
                      PVP Final con IVA: ${(Number(formData.selling_price) * 1.16).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Initial Batch Section (solo para nuevos productos) */}
              {!editingProduct ? (
                <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-800 space-y-2">
                  <p className="font-bold text-slate-300 text-[11px]">Lote Inicial de Entrada (Opcional):</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <input
                        type="text"
                        value={formData.batch_number}
                        onChange={e => setFormData({ ...formData, batch_number: e.target.value })}
                        placeholder="Número de Lote (Ej: LT-902)"
                        className="w-full p-1.5 bg-slate-900 border border-slate-700 text-white rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="date"
                        value={formData.expiry_date}
                        onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                        className="w-full p-1.5 bg-slate-900 border border-slate-700 text-white rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={formData.initial_stock}
                        onChange={e => setFormData({ ...formData, initial_stock: e.target.value })}
                        placeholder="Cantidad inicial"
                        className="w-full p-1.5 bg-slate-900 border border-slate-700 text-white rounded-lg text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0f172a] p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-200 block">Existencias Actuales:</span>
                    <span className="text-[11px] text-emerald-400 font-semibold">{editingProduct.total_stock} unidades disponibles en {editingProduct.batches?.length || 0} lote(s)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 italic">
                    Para modificar o registrar nuevos lotes, usa el botón "+ Lote" de la tabla.
                  </span>
                </div>
              )}

              {/* Imagen para la Tienda Online y POS */}
              <div className="bg-[#0f172a] p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-white block text-xs">
                      Foto del Medicamento (Para la Tienda Online y POS)
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Esta misma imagen se mostrará a tus clientes en la web y en la pantalla de cobro.
                    </span>
                  </div>
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {/* Action Buttons to select or upload */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenImageSearch}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-200" />
                    <span>Sacar Foto de Internet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Foto (Celular o PC)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer sm:hidden"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Tomar Foto</span>
                  </button>
                </div>

                {/* Live Preview Card if image is set */}
                {formData.image_url ? (
                  <div className="p-3 bg-slate-900 rounded-xl border border-emerald-800/60 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
                        <img 
                          src={formData.image_url} 
                          alt="Vista previa" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          Imagen Lista y Vinculada
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Se verá en el catálogo web y al momento de cobrar.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleOpenImageSearch}
                        className="px-2.5 py-1.5 bg-blue-900/60 hover:bg-blue-800/80 text-blue-300 border border-blue-700/60 font-semibold rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1"
                        title="Buscar otra foto en internet"
                      >
                        <Globe className="w-3 h-3" />
                        <span>Internet</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-lg text-[11px] transition cursor-pointer"
                      >
                        Subir otra
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                        className="p-1.5 text-red-400 hover:bg-red-950/60 rounded-lg transition cursor-pointer"
                        title="Eliminar foto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-900 rounded-xl border border-dashed border-slate-700 text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <ImageIcon className="w-5 h-5" />
                      <span className="text-[11px] font-medium">¿No tienes foto a mano? Elige un diseño rápido:</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {PHARMACY_IMAGE_PRESETS.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, image_url: p.url }))}
                          className="px-2 py-1 bg-slate-800 hover:bg-emerald-950/80 hover:text-emerald-300 text-slate-300 text-[10px] font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
                        >
                          + {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback URL input */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                    O pega un enlace web directo de imagen:
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full p-2 bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
                {editingProduct ? (
                  <button
                    type="button"
                    onClick={() => setProductToDelete(editingProduct)}
                    className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-950/60 border border-red-900/60 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Artículo</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewProductModal(false);
                      setEditingProduct(null);
                    }}
                    className="px-4 py-2 border border-slate-700 rounded-xl text-slate-300 font-medium hover:bg-slate-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingProduct}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md cursor-pointer active:scale-98 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span>{isSubmittingProduct ? 'Guardando...' : (editingProduct ? 'Guardar Cambios' : 'Guardar Medicamento')}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Agregar Lote a Medicamento Existente */}
      {showAddBatchModal && selectedProductForBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-800 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white">Nuevo Lote de Medicamento</h3>
                <p className="text-xs text-emerald-400 font-semibold">{selectedProductForBatch.name}</p>
              </div>
              <button onClick={() => setShowAddBatchModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBatch} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Número de Lote *</label>
                <input
                  type="text"
                  required
                  value={batchData.batch_number}
                  onChange={e => setBatchData({ ...batchData, batch_number: e.target.value })}
                  placeholder="Ej: LT-2026-X8"
                  className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Fecha de Expiración / Vencimiento *</label>
                <input
                  type="date"
                  required
                  value={batchData.expiry_date}
                  onChange={e => setBatchData({ ...batchData, expiry_date: e.target.value })}
                  className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Cantidad a Ingresar *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={batchData.stock}
                    onChange={e => setBatchData({ ...batchData, stock: e.target.value })}
                    placeholder="Ej: 50"
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Costo Unitario ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={batchData.cost_price}
                    onChange={e => setBatchData({ ...batchData, cost_price: e.target.value })}
                    placeholder={selectedProductForBatch.cost_price.toString()}
                    className="w-full p-2 bg-[#0f172a] border border-slate-700 text-white rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-4 py-2 border border-slate-700 rounded-xl text-slate-300 font-medium hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl cursor-pointer"
                >
                  Ingresar Stock de Lote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación de Medicamento */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-red-900/60 text-white animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-2.5 bg-red-950/80 border border-red-800/80 text-red-400 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  ¿Eliminar Medicamento?
                </h3>
                <p className="text-xs text-red-300 font-semibold">{productToDelete.name}</p>
              </div>
            </div>

            <div className="py-4 space-y-2 text-xs text-slate-300">
              <p>
                ¿Estás seguro de que deseas eliminar permanentemente este artículo del inventario?
              </p>
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-200 text-[11px] leading-relaxed">
                <strong>Atención:</strong> Esta acción borrará la ficha del producto y todos sus lotes asociados ({productToDelete.total_stock} unidades registradas).
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 border border-slate-700 rounded-xl text-slate-300 font-medium hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={handleConfirmDeleteProduct}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingProduct ? 'Eliminando...' : 'Sí, Eliminar Artículo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Escáner de Código de Barras con la Cámara del Celular */}
      {showBarcodeScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
            {/* Cabecera */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 rounded-xl">
                  <ScanLine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm">Escáner de Código de Barras</h3>
                  <p className="text-[11px] text-slate-400">Apunta la cámara a la caja o frasco del medicamento</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleStopScanner}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewfinder cámara */}
            <div className="p-4 flex flex-col items-center justify-center bg-black/50">
              <div className="relative w-full max-w-xs sm:max-w-sm rounded-xl overflow-hidden border-2 border-emerald-500/70 bg-black shadow-inner flex items-center justify-center min-h-[260px]">
                <div id="barcode-reader" className="w-full"></div>
                {/* Laser animation */}
                <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-400 shadow-[0_0_12px_#10b981] pointer-events-none animate-pulse"></div>
              </div>

              {scannerError && (
                <div className="mt-3 p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-2 w-full">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{scannerError}</span>
                </div>
              )}

              <div className="mt-3 text-center text-xs text-slate-300 flex items-center gap-1.5 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Enfoca el código de barras (EAN-13, UPC, 128 o QR). Emitirá un bip al detectar.</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <button
                type="button"
                onClick={handleGenerateBarcode}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Generar Auto</span>
              </button>
              <button
                type="button"
                onClick={handleStopScanner}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cerrar Cámara
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Búsqueda y Extracción de Fotos de Medicamento desde Internet */}
      {showImageSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Cabecera */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-950/80 border border-blue-700/60 text-blue-400 rounded-xl">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm">Sacar Foto de Internet</h3>
                  <p className="text-[11px] text-slate-400">Busca cajas, envases y empaques reales de farmacia</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImageSearchModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de Búsqueda */}
            <div className="p-3 bg-slate-900 border-b border-slate-800">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  executeImageSearch(imageSearchQuery);
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={imageSearchQuery}
                    onChange={(e) => setImageSearchQuery(e.target.value)}
                    placeholder="Ej: Atamel 650mg caja / Amoxicilina 500mg cápsulas / Ibuprofeno jarabe..."
                    className="w-full pl-9 pr-3 py-2 bg-[#0f172a] border border-slate-700 text-white rounded-xl text-xs placeholder-slate-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearchingImages || !imageSearchQuery.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  {isSearchingImages ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>Buscar</span>
                </button>
              </form>
            </div>

            {/* Contenido / Cuadrícula de Imágenes */}
            <div className="p-4 overflow-y-auto flex-1 min-h-[300px] bg-slate-950/40">
              {isSearchingImages ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                  <p className="text-xs text-slate-300 font-medium">Buscando fotos reales del medicamento en la web...</p>
                </div>
              ) : imageSearchError ? (
                <div className="p-6 text-center space-y-2">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-xs text-amber-200 font-semibold">{imageSearchError}</p>
                  <p className="text-[11px] text-slate-400">Prueba ajustando el nombre, por ejemplo: "Atamel 500mg" o "Ibuprofeno caja".</p>
                </div>
              ) : imageSearchResults.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs">
                  Escribe el nombre del medicamento en la barra superior y pulsa "Buscar".
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {imageSearchResults.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectOnlineImage(img.image)}
                      className="group relative bg-[#0f172a] border border-slate-700 hover:border-blue-500 rounded-xl overflow-hidden cursor-pointer transition transform hover:scale-[1.02] shadow-sm hover:shadow-lg flex flex-col"
                    >
                      <div className="w-full h-32 bg-slate-900 overflow-hidden flex items-center justify-center relative">
                        <img
                          src={img.thumbnail || img.image}
                          alt={img.title || 'Foto de producto'}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/30 transition flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-md transition transform translate-y-1 group-hover:translate-y-0">
                            Usar Esta Foto
                          </span>
                        </div>
                      </div>
                      <div className="p-2 flex-1 flex flex-col justify-between">
                        <p className="text-[10px] text-slate-300 line-clamp-2 leading-tight font-medium" title={img.title}>
                          {img.title || 'Foto de medicamento'}
                        </p>
                        <span className="text-[9px] text-slate-500 mt-1 block">
                          {img.source || 'Internet'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pie del Modal */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/70 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Toca cualquier imagen para seleccionarla y guardarla en la ficha.
              </span>
              <button
                type="button"
                onClick={() => setShowImageSearchModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
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
