import express from 'express';
import http from 'http';
import https from 'https';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db, initDatabase } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../../frontend/dist');

initDatabase();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Settings & Exchange Rate Endpoints
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const {
      pharmacy_name, rif, sanitary_license, phone, address,
      welcome_message, exchange_rate, delivery_cost, min_free_delivery,
      bank_name, bank_account_number, bank_phone, bank_id_number, bank_holder,
      zelle_email, zelle_holder
    } = req.body;

    db.prepare(`
      UPDATE settings SET
        pharmacy_name = ?, rif = ?, sanitary_license = ?, phone = ?, address = ?,
        welcome_message = ?, exchange_rate = ?, delivery_cost = ?, min_free_delivery = ?,
        bank_name = ?, bank_account_number = ?, bank_phone = ?, bank_id_number = ?, bank_holder = ?,
        zelle_email = ?, zelle_holder = ?
      WHERE id = 1
    `).run(
      pharmacy_name || 'Farmacia FarmaSalud C.A.',
      rif || 'J-40192841-0',
      sanitary_license || 'MSAS-9821',
      phone || '',
      address || '',
      welcome_message || '',
      Number(exchange_rate) || 85.0,
      Number(delivery_cost) || 1.00,
      Number(min_free_delivery) || 30.00,
      bank_name || '',
      bank_account_number || '',
      bank_phone || '',
      bank_id_number || '',
      bank_holder || '',
      zelle_email || '',
      zelle_holder || ''
    );

    const updated = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    io.emit('settings_updated', updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// SERVICIO DE SINCRONIZACIÓN AUTOMÁTICA DE TASA OFICIAL BCV
// =========================================================================
async function fetchBcvRateOnline() {
  // Estrategia 1: DolarAPI (Servicio CDN de alta disponibilidad con réplica del BCV)
  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.promedio && Number(data.promedio) > 0) {
        return {
          rate: Number(Number(data.promedio).toFixed(2)),
          exact_rate: Number(data.promedio),
          source: 'DolarAPI (BCV Oficial)',
          date: data.fechaActualizacion || new Date().toISOString()
        };
      }
    }
  } catch (err) {
    console.warn('[BCV Sync] DolarAPI no disponible, intentando scraping directo:', err.message);
  }

  // Estrategia 2: Conexión y Scraping Directo al Portal Oficial del BCV (bcv.org.ve)
  try {
    const bcvDirect = await new Promise((resolve) => {
      const req = https.get('https://www.bcv.org.ve/', { rejectUnauthorized: false, timeout: 8000 }, (res) => {
        let html = '';
        res.on('data', chunk => html += chunk);
        res.on('end', () => {
          const m = html.match(/id=["']dolar["'][\s\S]*?<strong[^>]*>\s*([\d,\.]+)\s*<\/strong>/i);
          const dateM = html.match(/class=["']date-display-single["'][^>]*>([^<]+)<\/span>/i);
          if (m) {
            const raw = parseFloat(m[1].trim().replace(/\./g, '').replace(',', '.'));
            resolve({
              rate: Number(raw.toFixed(2)),
              exact_rate: raw,
              source: 'BCV Oficial Directo (bcv.org.ve)',
              date: dateM ? dateM[1].trim() : new Date().toISOString()
            });
          } else {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });

    if (bcvDirect) return bcvDirect;
  } catch (err) {
    console.warn('[BCV Sync] Scraping directo BCV no disponible:', err.message);
  }

  return null;
}

async function syncBcvExchangeRate(force = false) {
  try {
    const currentSettings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    if (!force && currentSettings && currentSettings.bcv_auto_sync === 0) {
      return { success: false, reason: 'auto_sync_disabled' };
    }

    const bcvInfo = await fetchBcvRateOnline();
    if (!bcvInfo || !bcvInfo.rate || bcvInfo.rate <= 0) {
      return { success: false, reason: 'rate_fetch_failed' };
    }

    // Actualizar base de datos con la tasa oficial BCV
    db.prepare(`
      UPDATE settings SET
        exchange_rate = ?,
        bcv_last_updated = ?,
        bcv_source = ?
      WHERE id = 1
    `).run(bcvInfo.rate, bcvInfo.date, bcvInfo.source);

    const updated = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    io.emit('settings_updated', updated);
    console.log(`[BCV AUTO-SYNC] Tasa oficial BCV sincronizada con éxito: Bs. ${bcvInfo.rate} (${bcvInfo.source} - ${bcvInfo.date})`);

    return {
      success: true,
      rate: bcvInfo.rate,
      exact_rate: bcvInfo.exact_rate,
      date: bcvInfo.date,
      source: bcvInfo.source,
      settings: updated
    };
  } catch (err) {
    console.error('[BCV Sync] Error al sincronizar tasa BCV:', err.message);
    return { success: false, error: err.message };
  }
}

// Endpoints BCV
app.post('/api/bcv/sync', async (req, res) => {
  const result = await syncBcvExchangeRate(true);
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

app.get('/api/bcv/rate', async (req, res) => {
  try {
    const bcv = await fetchBcvRateOnline();
    const settings = db.prepare('SELECT exchange_rate, bcv_last_updated, bcv_source, bcv_auto_sync FROM settings WHERE id = 1').get();
    res.json({
      online: bcv,
      current_system: settings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sincronización automática de tasa BCV al iniciar el servidor (después de 3 segundos)
setTimeout(() => {
  syncBcvExchangeRate(false);
}, 3000);

// Intervalo de sincronización periódica cada 30 minutos
setInterval(() => {
  syncBcvExchangeRate(false);
}, 30 * 60 * 1000);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected to real-time events:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Helper to notify all clients about stock update
function broadcastStockUpdate(productId) {
  const product = getProductWithStock(productId);
  io.emit('stock_updated', product);
}

function getProductWithStock(id) {
  const prod = db.prepare(`
    SELECT p.*, 
      COALESCE(SUM(b.stock), 0) as total_stock,
      MIN(CASE WHEN b.stock > 0 THEN b.expiry_date ELSE NULL END) as nearest_expiry
    FROM products p
    LEFT JOIN batches b ON p.id = b.product_id
    WHERE p.id = ?
    GROUP BY p.id
  `).get(id);

  if (prod) {
    prod.batches = db.prepare(`
      SELECT * FROM batches 
      WHERE product_id = ? 
      ORDER BY expiry_date ASC
    `).all(id);
  }
  return prod;
}

// ==========================================
// 1. PRODUCTOS E INVENTARIO
// ==========================================
app.get('/api/products', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*, 
        COALESCE(SUM(b.stock), 0) as total_stock,
        MIN(CASE WHEN b.stock > 0 THEN b.expiry_date ELSE NULL END) as nearest_expiry,
        COUNT(CASE WHEN b.stock > 0 THEN 1 ELSE NULL END) as active_batches_count
      FROM products p
      LEFT JOIN batches b ON p.id = b.product_id
      GROUP BY p.id
      ORDER BY p.name ASC
    `).all();

    // Attach batches to each product
    const allBatches = db.prepare(`SELECT * FROM batches ORDER BY expiry_date ASC`).all();
    const batchesByProduct = {};
    for (const b of allBatches) {
      if (!batchesByProduct[b.product_id]) batchesByProduct[b.product_id] = [];
      batchesByProduct[b.product_id].push(b);
    }

    for (const p of products) {
      p.batches = batchesByProduct[p.id] || [];
    }

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', (req, res) => {
  try {
    const prod = getProductWithStock(req.params.id);
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(prod);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const {
      code, name, generic_name, category, presentation, laboratory,
      prescription_required, cost_price, selling_price, min_stock,
      image_url, description, warehouse_location, initial_batch,
      has_iva, iva_percent, profit_margin
    } = req.body;

    const numCost = Number(cost_price) || 0;
    const numSelling = Number(selling_price) || 0;
    const calcMargin = profit_margin !== undefined && profit_margin !== null && profit_margin !== '' 
      ? Number(profit_margin) 
      : (numCost > 0 ? ((numSelling - numCost) / numCost) * 100 : 0);

    const insertProd = db.prepare(`
      INSERT INTO products (
        code, name, generic_name, category, presentation, laboratory,
        prescription_required, cost_price, selling_price, min_stock,
        image_url, description, warehouse_location, has_iva, iva_percent, profit_margin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertProd.run(
      code, name, generic_name || '', category, presentation || '', laboratory || '',
      prescription_required ? 1 : 0, numCost, numSelling,
      Number(min_stock) || 5, image_url || '', description || '', warehouse_location || '',
      has_iva ? 1 : 0, Number(iva_percent) || 16.0, calcMargin
    );

    const productId = result.lastInsertRowid;

    if (initial_batch && initial_batch.batch_number && Number(initial_batch.stock) > 0) {
      db.prepare(`
        INSERT INTO batches (product_id, batch_number, expiry_date, stock, initial_stock, cost_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        productId,
        initial_batch.batch_number,
        initial_batch.expiry_date || '2028-12-31',
        Number(initial_batch.stock),
        Number(initial_batch.stock),
        numCost
      );
    }

    const newProd = getProductWithStock(productId);
    io.emit('product_created', newProd);
    res.status(201).json(newProd);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const {
      code, name, generic_name, category, presentation, laboratory,
      prescription_required, cost_price, selling_price, min_stock,
      image_url, description, warehouse_location, has_iva, iva_percent, profit_margin
    } = req.body;

    const numCost = Number(cost_price) || 0;
    const numSelling = Number(selling_price) || 0;
    const calcMargin = profit_margin !== undefined && profit_margin !== null && profit_margin !== '' 
      ? Number(profit_margin) 
      : (numCost > 0 ? ((numSelling - numCost) / numCost) * 100 : 0);

    db.prepare(`
      UPDATE products SET
        code = ?, name = ?, generic_name = ?, category = ?, presentation = ?,
        laboratory = ?, prescription_required = ?, cost_price = ?, selling_price = ?,
        min_stock = ?, image_url = ?, description = ?, warehouse_location = ?,
        has_iva = ?, iva_percent = ?, profit_margin = ?
      WHERE id = ?
    `).run(
      code, name, generic_name || '', category, presentation || '', laboratory || '',
      prescription_required ? 1 : 0, numCost, numSelling,
      Number(min_stock) || 5, image_url || '', description || '', warehouse_location || '',
      has_iva ? 1 : 0, Number(iva_percent) || 16.0, calcMargin,
      req.params.id
    );

    const updated = getProductWithStock(req.params.id);
    io.emit('stock_updated', updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lotes y Vencimientos
app.get('/api/batches/expiring', (req, res) => {
  try {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const batches = db.prepare(`
      SELECT b.*, p.name as product_name, p.code as product_code, p.category, p.selling_price
      FROM batches b
      JOIN products p ON b.product_id = p.id
      WHERE b.stock > 0 AND b.expiry_date <= ?
      ORDER BY b.expiry_date ASC
    `).all(in90Days);

    const categorized = batches.map(b => {
      let status = 'UPCOMING';
      if (b.expiry_date < today) status = 'EXPIRED';
      else if (b.expiry_date <= in30Days) status = 'CRITICAL';
      else status = 'WARNING';
      return { ...b, status };
    });

    res.json(categorized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/batches', (req, res) => {
  try {
    const { product_id, batch_number, expiry_date, stock, cost_price } = req.body;
    const result = db.prepare(`
      INSERT INTO batches (product_id, batch_number, expiry_date, stock, initial_stock, cost_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(product_id, batch_number, expiry_date, Number(stock), Number(stock), Number(cost_price) || 0);

    // Record stock movement
    db.prepare(`
      INSERT INTO stock_movements (product_id, batch_id, type, quantity, reason)
      VALUES (?, ?, 'ADJUSTMENT', ?, 'Ingreso manual de lote')
    `).run(product_id, result.lastInsertRowid, Number(stock));

    broadcastStockUpdate(product_id);
    res.status(201).json({ id: result.lastInsertRowid, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. VENTAS Y FACTURACIÓN (POS)
// ==========================================
app.post('/api/sales', (req, res) => {
  const transaction = db.transaction(() => {
    const {
      customer_id, employee_id, payment_method,
      items, discount = 0, tax = 0, notes, sale_type = 'DIRECT',
      payments = [],
      exchange_rate = 85.0,
      change_currency = 'USD',
      change_amount = 0
    } = req.body;

    // Check open cash register (use requested id or latest open)
    let openCash = null;
    if (req.body.cash_register_id) {
      openCash = db.prepare(`SELECT * FROM cash_registers WHERE id = ? AND status = 'OPEN'`).get(req.body.cash_register_id);
    }
    if (!openCash) {
      openCash = db.prepare(`SELECT * FROM cash_registers WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1`).get();
    }
    const cashRegisterId = openCash ? openCash.id : null;

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += Number(item.unit_price) * Number(item.quantity);
    }
    const total = subtotal - Number(discount) + Number(tax);
    const rate = Number(exchange_rate) || 85.0;
    const totalBs = total * rate;

    // Calculate total amount paid in USD across all payment methods
    let totalPaidUsd = 0;
    if (payments && payments.length > 0) {
      for (const p of payments) {
        totalPaidUsd += Number(p.amount_usd);
      }
    } else {
      totalPaidUsd = Number(req.body.amount_paid) || total;
    }

    const changeGivenUsd = Math.max(0, totalPaidUsd - total);
    const finalChangeAmount = change_amount !== undefined ? Number(change_amount) : (change_currency === 'BS' ? changeGivenUsd * rate : changeGivenUsd);

    let primaryPaymentMethod = payment_method || (payments.length > 1 ? 'MIXED' : (payments[0]?.payment_method || 'CASH'));

    // Generate sequential invoice number
    const lastSale = db.prepare(`SELECT id FROM sales ORDER BY id DESC LIMIT 1`).get();
    const nextNum = (lastSale ? lastSale.id : 0) + 1;
    const invoiceNumber = `FAC-${String(nextNum).padStart(6, '0')}`;

    const isCredit = (primaryPaymentMethod === 'CREDIT' || payments.some(p => p.payment_method === 'CREDIT')) ? 1 : 0;

    // Insert sale record
    const saleRes = db.prepare(`
      INSERT INTO sales (
        invoice_number, customer_id, employee_id, cash_register_id,
        sale_type, payment_method, subtotal, discount, tax, total,
        amount_paid, change_given, is_credit, notes,
        exchange_rate, total_bs, change_currency, change_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceNumber, customer_id || 1, employee_id || 1, cashRegisterId,
      sale_type, primaryPaymentMethod, subtotal, discount, tax, total,
      totalPaidUsd, changeGivenUsd, isCredit, notes || '',
      rate, totalBs, change_currency, finalChangeAmount
    );

    const saleId = saleRes.lastInsertRowid;

    // Save individual payments in sale_payments
    if (payments && payments.length > 0) {
      for (const p of payments) {
        db.prepare(`
          INSERT INTO sale_payments (sale_id, payment_method, currency, amount, amount_usd, amount_bs, reference)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(saleId, p.payment_method, p.currency, Number(p.amount), Number(p.amount_usd), Number(p.amount_bs), p.reference || '');

        if (p.payment_method === 'CREDIT' && customer_id) {
          db.prepare(`UPDATE customers SET current_debt = current_debt + ? WHERE id = ?`).run(Number(p.amount_usd), customer_id);
        }
      }
    } else if (isCredit && customer_id) {
      db.prepare(`UPDATE customers SET current_debt = current_debt + ? WHERE id = ?`).run(total, customer_id);
    }

    // Deduct stock using FEFO (First Expired, First Out)
    for (const item of items) {
      let qtyNeeded = Number(item.quantity);

      const batches = db.prepare(`
        SELECT * FROM batches 
        WHERE product_id = ? AND stock > 0 
        ORDER BY expiry_date ASC
      `).all(item.product_id);

      const totalAvail = batches.reduce((acc, b) => acc + b.stock, 0);
      if (totalAvail < qtyNeeded) {
        const prod = db.prepare('SELECT name FROM products WHERE id = ?').get(item.product_id);
        throw new Error(`Stock insuficiente para "${prod ? prod.name : 'Producto'}". Solicitado: ${qtyNeeded}, Disponible: ${totalAvail}`);
      }

      for (const batch of batches) {
        if (qtyNeeded <= 0) break;
        const take = Math.min(batch.stock, qtyNeeded);
        
        db.prepare(`UPDATE batches SET stock = stock - ? WHERE id = ?`).run(take, batch.id);

        db.prepare(`
          INSERT INTO sale_items (sale_id, product_id, batch_id, quantity, unit_price, unit_cost, subtotal)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(saleId, item.product_id, batch.id, take, item.unit_price, batch.cost_price, take * item.unit_price);

        db.prepare(`
          INSERT INTO stock_movements (product_id, batch_id, type, quantity, reason, reference_id, employee_id)
          VALUES (?, ?, 'SALE', ?, 'Venta mostrador POS', ?, ?)
        `).run(item.product_id, batch.id, -take, invoiceNumber, employee_id || 1);

        qtyNeeded -= take;
      }
    }

    return { 
      saleId, 
      invoiceNumber, 
      total, 
      totalBs, 
      changeGiven: finalChangeAmount, 
      changeCurrency: change_currency,
      exchangeRate: rate 
    };
  });

  try {
    const saleResult = transaction();

    for (const item of req.body.items) {
      broadcastStockUpdate(item.product_id);
    }

    io.emit('sale_completed', { invoiceNumber: saleResult.invoiceNumber, total: saleResult.total });

    res.status(201).json({
      success: true,
      ...saleResult
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/sales', (req, res) => {
  try {
    const sales = db.prepare(`
      SELECT s.*, c.name as customer_name, e.name as employee_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN employees e ON s.employee_id = e.id
      ORDER BY s.id DESC
      LIMIT 100
    `).all();

    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sales/:id', (req, res) => {
  try {
    const sale = db.prepare(`
      SELECT s.*, c.name as customer_name, c.id_number as customer_id_number, c.phone as customer_phone,
             e.name as employee_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN employees e ON s.employee_id = e.id
      WHERE s.id = ?
    `).get(req.params.id);

    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });

    sale.items = db.prepare(`
      SELECT si.*, p.name as product_name, p.code as product_code, b.batch_number, b.expiry_date
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      LEFT JOIN batches b ON si.batch_id = b.id
      WHERE si.sale_id = ?
    `).all(req.params.id);

    sale.payments = db.prepare(`
      SELECT * FROM sale_payments
      WHERE sale_id = ?
      ORDER BY id ASC
    `).all(req.params.id);

    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. CLIENTES Y CUENTAS POR COBRAR (CRÉDITO)
// ==========================================
app.get('/api/customers', (req, res) => {
  try {
    const customers = db.prepare(`
      SELECT c.*,
        COALESCE((SELECT COUNT(*) FROM sales WHERE customer_id = c.id), 0) as total_purchases
      FROM customers c
      ORDER BY c.name ASC
    `).all();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const { id_number, name, phone, email, address, credit_limit, credit_days, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre del cliente es obligatorio' });
    }
    const result = db.prepare(`
      INSERT INTO customers (id_number, name, phone, email, address, credit_limit, credit_days, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id_number ? id_number.trim() : '', name.trim(), phone ? phone.trim() : '', email ? email.trim() : '', address ? address.trim() : '', Number(credit_limit) || 0, Number(credit_days) || 30, notes || '');
    
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    io.emit('customer_created', customer);
    res.status(201).json({ id: result.lastInsertRowid, success: true, customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const { id_number, name, phone, email, address, credit_limit, credit_days, notes } = req.body;
    db.prepare(`
      UPDATE customers SET
        id_number = ?, name = ?, phone = ?, email = ?, address = ?,
        credit_limit = ?, credit_days = ?, notes = ?
      WHERE id = ?
    `).run(id_number, name, phone, email, address, Number(credit_limit) || 0, Number(credit_days) || 30, notes, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers/:id/statement', (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });

    const creditSales = db.prepare(`
      SELECT * FROM sales 
      WHERE customer_id = ? AND is_credit = 1
      ORDER BY created_at DESC
    `).all(req.params.id);

    const payments = db.prepare(`
      SELECT cp.*, e.name as employee_name
      FROM credit_payments cp
      LEFT JOIN employees e ON cp.employee_id = e.id
      WHERE cp.customer_id = ?
      ORDER BY cp.created_at DESC
    `).all(req.params.id);

    res.json({ customer, creditSales, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers/:id/pay-credit', (req, res) => {
  const transaction = db.transaction(() => {
    const { amount, payment_method, notes, employee_id } = req.body;
    const payAmount = Number(amount);
    if (payAmount <= 0) throw new Error('El monto debe ser mayor a cero');

    const customer = db.prepare('SELECT current_debt FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) throw new Error('Cliente no encontrado');

    // Reduce customer debt
    const newDebt = Math.max(0, customer.current_debt - payAmount);
    db.prepare('UPDATE customers SET current_debt = ? WHERE id = ?').run(newDebt, req.params.id);

    const openCash = db.prepare(`SELECT id, tasa_bcv_apertura FROM cash_registers WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1`).get();
    const cfg = db.prepare('SELECT exchange_rate FROM settings WHERE id = 1').get();
    const rate = Number(cfg?.exchange_rate) || Number(openCash?.tasa_bcv_apertura) || 85.0;
    const amountBs = Number((payAmount * rate).toFixed(2));
    const cashRegId = openCash ? openCash.id : null;

    // Record credit payment with cash_register_id and amount_bs
    const paymentRes = db.prepare(`
      INSERT INTO credit_payments (customer_id, amount, payment_method, notes, employee_id, cash_register_id, amount_bs)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.id, payAmount, payment_method, notes || 'Abono a cuenta corriente', employee_id || 1, cashRegId, amountBs);

    // If paid in cash, record in cash movements
    if (payment_method === 'CASH' && cashRegId) {
      db.prepare(`
        INSERT INTO cash_movements (cash_register_id, type, amount, reason, employee_id)
        VALUES (?, 'INCOME', ?, 'Abono a crédito de cliente', ?)
      `).run(cashRegId, payAmount, employee_id || 1);
    }

    return { paymentId: paymentRes.lastInsertRowid, newDebt };
  });

  try {
    const result = transaction();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Dedicated Credit Accounts & Receivables Overview
app.get('/api/credits', (req, res) => {
  try {
    const debtors = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM sales WHERE customer_id = c.id AND is_credit = 1) as total_credit_sales,
        (SELECT MAX(created_at) FROM sales WHERE customer_id = c.id AND is_credit = 1) as last_credit_sale_date,
        (SELECT MAX(created_at) FROM credit_payments WHERE customer_id = c.id) as last_payment_date
      FROM customers c
      WHERE c.current_debt > 0 OR c.credit_limit > 0
      ORDER BY c.current_debt DESC, c.name ASC
    `).all();

    const recentPayments = db.prepare(`
      SELECT cp.*, c.name as customer_name, c.id_number as customer_id_number, e.name as employee_name
      FROM credit_payments cp
      JOIN customers c ON cp.customer_id = c.id
      LEFT JOIN employees e ON cp.employee_id = e.id
      ORDER BY cp.created_at DESC
      LIMIT 50
    `).all();

    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(current_debt), 0) as total_debt,
        COALESCE(SUM(credit_limit), 0) as total_credit_limit,
        COUNT(CASE WHEN current_debt > 0 THEN 1 END) as active_debtors_count,
        COUNT(CASE WHEN credit_limit > 0 THEN 1 END) as total_credit_accounts
      FROM customers
    `).get();

    res.json({ debtors, recentPayments, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. PROVEEDORES
// ==========================================
app.get('/api/suppliers', (req, res) => {
  try {
    const suppliers = db.prepare(`
      SELECT s.*, 
        COALESCE((SELECT COUNT(*) FROM purchases WHERE supplier_id = s.id), 0) as total_purchases
      FROM suppliers s
      ORDER BY s.name ASC
    `).all();
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/suppliers', (req, res) => {
  try {
    const { name, tax_id, phone, email, address, contact_person } = req.body;
    const result = db.prepare(`
      INSERT INTO suppliers (name, tax_id, phone, email, address, contact_person)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, tax_id || '', phone || '', email || '', address || '', contact_person || '');
    res.status(201).json({ id: result.lastInsertRowid, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/suppliers/:id', (req, res) => {
  try {
    const { name, tax_id, phone, email, address, contact_person } = req.body;
    db.prepare(`
      UPDATE suppliers SET
        name = ?, tax_id = ?, phone = ?, email = ?, address = ?, contact_person = ?
      WHERE id = ?
    `).run(name, tax_id, phone, email, address, contact_person, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. COMPRAS Y RECEPCIÓN DE MERCANCÍA
// ==========================================
app.get('/api/purchases', (req, res) => {
  try {
    const purchases = db.prepare(`
      SELECT p.*, s.name as supplier_name, e.name as employee_name
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN employees e ON p.employee_id = e.id
      ORDER BY p.id DESC
    `).all();

    for (const p of purchases) {
      p.items = db.prepare(`
        SELECT pi.*, pr.name as product_name, pr.code as product_code
        FROM purchase_items pi
        JOIN products pr ON pi.product_id = pr.id
        WHERE pi.purchase_id = ?
      `).all(p.id);
    }

    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/purchases', (req, res) => {
  const transaction = db.transaction(() => {
    const { invoice_number, supplier_id, employee_id, purchase_date, items, notes } = req.body;
    
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += Number(item.quantity) * Number(item.unit_cost);
    }

    // Insert purchase invoice
    const purchRes = db.prepare(`
      INSERT INTO purchases (invoice_number, supplier_id, employee_id, purchase_date, total_amount, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(invoice_number, supplier_id, employee_id || 1, purchase_date || new Date().toISOString().split('T')[0], totalAmount, notes || '');

    const purchaseId = purchRes.lastInsertRowid;

    for (const item of items) {
      const qty = Number(item.quantity);
      const unitCost = Number(item.unit_cost);
      const subtotal = qty * unitCost;

      // Add purchase item
      db.prepare(`
        INSERT INTO purchase_items (purchase_id, product_id, batch_number, expiry_date, quantity, unit_cost, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(purchaseId, item.product_id, item.batch_number, item.expiry_date, qty, unitCost, subtotal);

      // Create new batch for this product
      const batchRes = db.prepare(`
        INSERT INTO batches (product_id, batch_number, expiry_date, stock, initial_stock, cost_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(item.product_id, item.batch_number, item.expiry_date, qty, qty, unitCost);

      // Update product cost price
      db.prepare(`UPDATE products SET cost_price = ? WHERE id = ?`).run(unitCost, item.product_id);

      // Record stock movement
      db.prepare(`
        INSERT INTO stock_movements (product_id, batch_id, type, quantity, reason, reference_id, employee_id)
        VALUES (?, ?, 'PURCHASE', ?, 'Factura de compra de proveedor', ?, ?)
      `).run(item.product_id, batchRes.lastInsertRowid, qty, invoice_number, employee_id || 1);
    }

    return { purchaseId, totalAmount };
  });

  try {
    const result = transaction();

    // Broadcast stock updates
    for (const item of req.body.items) {
      broadcastStockUpdate(item.product_id);
    }

    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 6. DEPÓSITO Y ALMACENES
// ==========================================
app.get('/api/warehouses', (req, res) => {
  try {
    const warehouses = db.prepare(`SELECT * FROM warehouses ORDER BY id ASC`).all();
    res.json(warehouses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/warehouses', (req, res) => {
  try {
    const { code, name, location_desc, is_default } = req.body;
    const result = db.prepare(`
      INSERT INTO warehouses (code, name, location_desc, is_default)
      VALUES (?, ?, ?, ?)
    `).run(code, name, location_desc || '', is_default ? 1 : 0);
    res.status(201).json({ id: result.lastInsertRowid, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory/adjust', (req, res) => {
  try {
    const { product_id, batch_id, quantity, reason, type } = req.body;
    const qty = Number(quantity); // positive to add, negative to deduct
    db.prepare(`UPDATE batches SET stock = stock + ? WHERE id = ?`).run(qty, batch_id);

    db.prepare(`
      INSERT INTO stock_movements (product_id, batch_id, type, quantity, reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(product_id, batch_id, type || 'ADJUSTMENT', qty, reason || 'Ajuste manual de inventario');

    broadcastStockUpdate(product_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. EMPLEADOS Y AUTENTICACIÓN (LOGIN)
// ==========================================
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, pin } = req.body;
    if (!username || !pin) {
      return res.status(400).json({ error: 'Debe ingresar el usuario y el PIN/contraseña' });
    }

    const searchUser = username.trim().toLowerCase();
    const searchPin = String(pin).trim();

    const employee = db.prepare(`
      SELECT id, name, id_number, phone, role, shift, username, active, permissions
      FROM employees
      WHERE (LOWER(username) = ? OR (? = 'cajero' AND role = 'CAJERO')) AND pin = ?
    `).get(searchUser, searchUser, searchPin);

    if (!employee) {
      return res.status(401).json({ error: 'Credenciales inválidas. Verifique usuario o contraseña.' });
    }

    if (!employee.active) {
      return res.status(403).json({ error: 'Este usuario se encuentra inactivo. Contacte al Administrador.' });
    }

    let perms = [];
    try {
      perms = employee.permissions ? JSON.parse(employee.permissions) : [];
    } catch (e) {
      perms = [];
    }

    res.json({
      success: true,
      user: { ...employee, permissions: perms }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quick login staff list (for touchscreen PIN login)
app.get('/api/auth/staff', (req, res) => {
  try {
    const staff = db.prepare(`
      SELECT id, name, role, shift, username
      FROM employees
      WHERE active = 1
      ORDER BY role ASC, name ASC
    `).all();
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/employees', (req, res) => {
  try {
    const employees = db.prepare(`SELECT * FROM employees ORDER BY name ASC`).all();
    const parsed = employees.map(emp => {
      let perms = [];
      try {
        perms = emp.permissions ? JSON.parse(emp.permissions) : [];
      } catch (e) {
        perms = [];
      }
      return { ...emp, permissions: perms };
    });
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/employees', (req, res) => {
  try {
    const { name, id_number, phone, role, shift, username, pin, permissions } = req.body;
    const permsJson = Array.isArray(permissions) ? JSON.stringify(permissions) : '[]';
    const result = db.prepare(`
      INSERT INTO employees (name, id_number, phone, role, shift, username, pin, permissions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, id_number, phone || '', role, shift || 'Mañana', username, pin || '1234', permsJson);
    res.status(201).json({ id: result.lastInsertRowid, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/employees/:id', (req, res) => {
  try {
    const { name, id_number, phone, role, shift, username, pin, active, permissions } = req.body;
    const permsJson = permissions !== undefined 
      ? (Array.isArray(permissions) ? JSON.stringify(permissions) : String(permissions))
      : undefined;

    if (permsJson !== undefined) {
      db.prepare(`
        UPDATE employees SET
          name = ?, id_number = ?, phone = ?, role = ?, shift = ?,
          username = ?, pin = ?, active = ?, permissions = ?
        WHERE id = ?
      `).run(name, id_number, phone, role, shift, username, pin, active !== undefined ? (active ? 1 : 0) : 1, permsJson, req.params.id);
    } else {
      db.prepare(`
        UPDATE employees SET
          name = ?, id_number = ?, phone = ?, role = ?, shift = ?,
          username = ?, pin = ?, active = ?
        WHERE id = ?
      `).run(name, id_number, phone, role, shift, username, pin, active !== undefined ? (active ? 1 : 0) : 1, req.params.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/employees/:id/permissions', (req, res) => {
  try {
    const { permissions, role } = req.body;
    const permsJson = Array.isArray(permissions) ? JSON.stringify(permissions) : '[]';
    if (role) {
      db.prepare('UPDATE employees SET permissions = ?, role = ? WHERE id = ?').run(permsJson, role, req.params.id);
    } else {
      db.prepare('UPDATE employees SET permissions = ? WHERE id = ?').run(permsJson, req.params.id);
    }
    res.json({ success: true, message: 'Permisos del trabajador actualizados correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/employees/:id/pin', (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || pin.length < 4) {
      return res.status(400).json({ error: 'El PIN o contraseña debe contener al menos 4 caracteres o dígitos' });
    }
    db.prepare('UPDATE employees SET pin = ? WHERE id = ?').run(String(pin).trim(), req.params.id);
    res.json({ success: true, message: 'PIN de acceso y caja actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. CONTROL DE CAJAS Y TURNOS (ARQUITECTURA PROLAGO)
// ==========================================

function calcularMetricasCaja(caja) {
  if (!caja) return null;
  const cfg = db.prepare('SELECT exchange_rate FROM settings WHERE id = 1').get();
  const tasaOficial = cfg ? Number(cfg.exchange_rate) || 85.0 : 85.0;
  const tasaApertura = Number(caja.tasa_bcv_apertura) || tasaOficial;
  const tasaCierre = Number(caja.tasa_bcv_cierre) || tasaApertura;
  const isCerrada = (caja.status === 'CLOSED' || caja.estado === 'cerrada');
  const tasaTurno = isCerrada ? tasaCierre : tasaOficial;

  // 1. Facturas / Ventas asociadas a la caja
  const sales = db.prepare(`
    SELECT s.*, c.name as customer_name
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.cash_register_id = ?
    ORDER BY s.id DESC
  `).all(caja.id);

  let ventas_efectivo = 0;
  let ventas_zelle = 0;
  let ventas_pagomovil = 0;
  let ventas_punto = 0;
  let ventas_credito = 0;
  let total_ventas = 0;

  let ventas_pagomovil_bs = 0;
  let ventas_punto_bs = 0;
  let ventas_efectivo_bs = 0;
  let total_ventas_bs = 0;

  for (const s of sales) {
    const saleRate = Number(s.exchange_rate) || tasaTurno;
    const saleTotUsd = Number(s.total) || 0;
    const saleTotBs = Number(s.total_bs) || (saleTotUsd * saleRate);

    total_ventas += saleTotUsd;
    total_ventas_bs += saleTotBs;

    const payments = db.prepare('SELECT * FROM sale_payments WHERE sale_id = ?').all(s.id);
    if (payments && payments.length > 0) {
      for (const p of payments) {
        const m = (p.payment_method || '').toUpperCase();
        const amtUsd = Number(p.amount_usd) || 0;
        const amtBs = Number(p.amount_bs) || (amtUsd * saleRate);

        if (m.includes('CASH') || m === 'EFECTIVO') {
          ventas_efectivo += amtUsd;
          ventas_efectivo_bs += amtBs;
        } else if (m.includes('ZELLE')) {
          ventas_zelle += amtUsd;
        } else if (m.includes('PAGO_MOVIL') || m.includes('TRANSFER') || m === 'PAGOMOVIL') {
          ventas_pagomovil += amtUsd;
          ventas_pagomovil_bs += amtBs;
        } else if (m.includes('CARD') || m.includes('PUNTO') || m === 'PUNTO') {
          ventas_punto += amtUsd;
          ventas_punto_bs += amtBs;
        } else if (m.includes('CREDIT') || m === 'CREDITO') {
          ventas_credito += amtUsd;
        } else {
          ventas_efectivo += amtUsd;
          ventas_efectivo_bs += amtBs;
        }
      }
    } else {
      const m = (s.payment_method || '').toUpperCase();
      if (m.includes('CASH') || m === 'EFECTIVO') {
        ventas_efectivo += saleTotUsd;
        ventas_efectivo_bs += saleTotBs;
      } else if (m.includes('ZELLE')) {
        ventas_zelle += saleTotUsd;
      } else if (m.includes('TRANSFER') || m.includes('PAGO_MOVIL') || m === 'PAGOMOVIL') {
        ventas_pagomovil += saleTotUsd;
        ventas_pagomovil_bs += saleTotBs;
      } else if (m.includes('CARD') || m.includes('PUNTO') || m === 'PUNTO') {
        ventas_punto += saleTotUsd;
        ventas_punto_bs += saleTotBs;
      } else if (m.includes('CREDIT') || m === 'CREDITO' || s.is_credit) {
        ventas_credito += saleTotUsd;
      } else {
        ventas_efectivo += saleTotUsd;
        ventas_efectivo_bs += saleTotBs;
      }
    }
  }

  // 2. Abonos de cuentas por cobrar (credit_payments) asociados a la caja
  const abonos = db.prepare(`
    SELECT cp.*, c.name as customer_name
    FROM credit_payments cp
    LEFT JOIN customers c ON cp.customer_id = c.id
    WHERE cp.cash_register_id = ? OR (cp.cash_register_id IS NULL AND cp.created_at >= ? AND (? IS NULL OR cp.created_at <= ?))
    ORDER BY cp.id DESC
  `).all(caja.id, caja.opened_at, caja.closed_at, caja.closed_at);

  let abonos_efectivo = 0;
  let abonos_zelle = 0;
  let abonos_pagomovil = 0;
  let abonos_punto = 0;
  let total_abonos = 0;
  let abonos_pagomovil_bs = 0;
  let abonos_punto_bs = 0;
  let abonos_efectivo_bs = 0;
  let total_abonos_bs = 0;

  for (const a of abonos) {
    const amtUsd = Number(a.amount) || 0;
    const amtBs = Number(a.amount_bs) || (amtUsd * tasaTurno);
    total_abonos += amtUsd;
    total_abonos_bs += amtBs;

    const m = (a.payment_method || '').toUpperCase();
    if (m.includes('CASH') || m === 'EFECTIVO') {
      abonos_efectivo += amtUsd;
      abonos_efectivo_bs += amtBs;
    } else if (m.includes('ZELLE')) {
      abonos_zelle += amtUsd;
    } else if (m.includes('PAGO_MOVIL') || m.includes('TRANSFER') || m === 'PAGOMOVIL') {
      abonos_pagomovil += amtUsd;
      abonos_pagomovil_bs += amtBs;
    } else if (m.includes('CARD') || m.includes('PUNTO') || m === 'PUNTO') {
      abonos_punto += amtUsd;
      abonos_punto_bs += amtBs;
    } else {
      abonos_efectivo += amtUsd;
      abonos_efectivo_bs += amtBs;
    }
  }

  const montoAperturaUsd = Number(caja.monto_apertura_usd || caja.opening_balance) || 0;
  const montoAperturaBs = Number(caja.monto_apertura_bs) || Number((montoAperturaUsd * tasaTurno).toFixed(2));

  const total_esperado_efectivo = Number((montoAperturaUsd + ventas_efectivo + abonos_efectivo).toFixed(2));
  const total_esperado_general = Number((montoAperturaUsd + (total_ventas - ventas_credito) + total_abonos).toFixed(2));

  return {
    ...caja,
    monto_apertura_usd: Number(montoAperturaUsd.toFixed(2)),
    monto_apertura_bs: Number(montoAperturaBs.toFixed(2)),
    tasa_bcv_apertura: tasaApertura,
    tasa_bcv_cierre: tasaCierre,
    ventas_efectivo: Number(ventas_efectivo.toFixed(2)),
    ventas_zelle: Number(ventas_zelle.toFixed(2)),
    ventas_pagomovil: Number(ventas_pagomovil.toFixed(2)),
    ventas_punto: Number(ventas_punto.toFixed(2)),
    ventas_credito: Number(ventas_credito.toFixed(2)),
    total_ventas: Number(total_ventas.toFixed(2)),
    ventas_pagomovil_bs: Number(ventas_pagomovil_bs.toFixed(2)),
    ventas_punto_bs: Number(ventas_punto_bs.toFixed(2)),
    ventas_efectivo_bs: Number(ventas_efectivo_bs.toFixed(2)),
    total_ventas_bs: Number(total_ventas_bs.toFixed(2)),
    abonos_efectivo: Number(abonos_efectivo.toFixed(2)),
    abonos_zelle: Number(abonos_zelle.toFixed(2)),
    abonos_pagomovil: Number(abonos_pagomovil.toFixed(2)),
    abonos_punto: Number(abonos_punto.toFixed(2)),
    total_abonos: Number(total_abonos.toFixed(2)),
    abonos_pagomovil_bs: Number(abonos_pagomovil_bs.toFixed(2)),
    abonos_punto_bs: Number(abonos_punto_bs.toFixed(2)),
    abonos_efectivo_bs: Number(abonos_efectivo_bs.toFixed(2)),
    total_abonos_bs: Number(total_abonos_bs.toFixed(2)),
    total_esperado_efectivo,
    total_esperado_general,
    salesList: sales,
    abonosList: abonos
  };
}

function serializarCaja(cajaRow, detalle = false) {
  if (!cajaRow) return null;
  const m = calcularMetricasCaja(cajaRow);
  const cfg = db.prepare('SELECT exchange_rate FROM settings WHERE id = 1').get();
  const tasaOficial = cfg ? Number(cfg.exchange_rate) || 85.0 : 85.0;

  const formatFecha = (d) => {
    if (!d) return '';
    try {
      const date = new Date(d);
      return date.toLocaleDateString('es-VE') + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return d;
    }
  };

  const estado = (m.status === 'CLOSED' || m.estado === 'cerrada') ? 'cerrada' : 'abierta';

  const res = {
    id: m.id,
    numero: m.numero || m.id,
    nombre_caja: m.nombre_caja || 'Caja 1',
    estado,
    fecha_apertura: formatFecha(m.opened_at),
    fecha_cierre: formatFecha(m.closed_at),
    usuario_apertura_id: m.employee_id || 1,
    usuario_apertura_nombre: m.usuario_apertura_nombre || m.employee_name || 'Administrador',
    usuario_cierre_id: m.usuario_cierre_id,
    usuario_cierre_nombre: m.usuario_cierre_nombre || '',
    monto_apertura_usd: m.monto_apertura_usd,
    monto_apertura_bs: m.monto_apertura_bs,
    tasa_bcv_apertura: m.tasa_bcv_apertura,
    tasa_bcv_cierre: m.tasa_bcv_cierre,

    ventas_efectivo: m.ventas_efectivo,
    ventas_zelle: m.ventas_zelle,
    ventas_pagomovil: m.ventas_pagomovil,
    ventas_punto: m.ventas_punto,
    ventas_credito: m.ventas_credito,
    total_ventas: m.total_ventas,

    ventas_pagomovil_bs: m.ventas_pagomovil_bs,
    ventas_punto_bs: m.ventas_punto_bs,
    ventas_efectivo_bs: m.ventas_efectivo_bs,
    total_ventas_bs: m.total_ventas_bs,

    abonos_efectivo: m.abonos_efectivo,
    abonos_zelle: m.abonos_zelle,
    abonos_pagomovil: m.abonos_pagomovil,
    abonos_punto: m.abonos_punto,
    total_abonos: m.total_abonos,
    abonos_pagomovil_bs: m.abonos_pagomovil_bs,
    abonos_punto_bs: m.abonos_punto_bs,
    abonos_efectivo_bs: m.abonos_efectivo_bs,
    total_abonos_bs: m.total_abonos_bs,

    total_esperado_efectivo: m.total_esperado_efectivo,
    total_esperado_general: m.total_esperado_general,

    declarado_efectivo: Number(m.declarado_efectivo || m.closing_balance_actual || 0),
    declarado_zelle: Number(m.declarado_zelle || 0),
    declarado_pagomovil: Number(m.declarado_pagomovil || 0),
    declarado_punto: Number(m.declarado_punto || 0),
    total_declarado: Number(m.total_declarado || m.closing_balance_actual || 0),

    diferencia_efectivo: Number(m.diferencia_efectivo || m.difference || 0),
    diferencia_general: Number(m.diferencia_general || 0),

    observaciones_apertura: m.observaciones_apertura || m.notes || '',
    observaciones_cierre: m.observaciones_cierre || ''
  };

  if (detalle) {
    res.facturas = (m.salesList || []).map(f => ({
      id: f.id,
      numero: f.invoice_number,
      cliente: f.customer_name || 'Cliente Ocasional',
      total: Number(f.total) || 0,
      condicion: f.payment_method,
      hora: formatFecha(f.created_at)
    }));
    res.abonos_lista = (m.abonosList || []).map(a => ({
      id: a.id,
      factura_id: a.sale_id,
      cliente: a.customer_name || 'Cliente',
      monto_usd: Number(a.amount) || 0,
      metodo_pago: a.payment_method,
      hora: formatFecha(a.created_at)
    }));
  }

  return res;
}

// 8.1. Consultar estado global de cajas (Consolidado + Terminales Abiertas)
app.get('/api/cajas/estado', (req, res) => {
  try {
    const cfg = db.prepare('SELECT exchange_rate FROM settings WHERE id = 1').get();
    const tasa_bcv = cfg ? Number(cfg.exchange_rate) || 85.0 : 85.0;

    const abiertas = db.prepare(`
      SELECT cr.*, e.name as employee_name
      FROM cash_registers cr
      LEFT JOIN employees e ON cr.employee_id = e.id
      WHERE cr.status = 'OPEN'
      ORDER BY cr.id ASC
    `).all();

    const cajas_ocupadas_nombres = abiertas.map(c => c.nombre_caja).filter(Boolean);
    const cajas_activas_serializadas = abiertas.map(c => serializarCaja(c, false));
    const primeraCaja = abiertas.length > 0 ? serializarCaja(abiertas[0], true) : null;

    res.json({
      activa: abiertas.length > 0,
      caja: primeraCaja,
      cajas_abiertas: cajas_activas_serializadas,
      cajas_ocupadas_nombres,
      total_cajas_abiertas: abiertas.length,
      tasa_bcv
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8.2. Abrir turno / caja
app.post('/api/cajas/abrir', (req, res) => {
  try {
    const { nombre_caja, monto_apertura_usd, monto_apertura_bs, observaciones, employee_id, employee_name } = req.body;
    const nom = (nombre_caja || 'Caja 1').trim();

    // Validar si el nombre_caja ya está abierto
    const yaAbierta = db.prepare("SELECT * FROM cash_registers WHERE status = 'OPEN' AND nombre_caja = ?").get(nom);
    if (yaAbierta) {
      return res.status(400).json({
        detail: `La '${nom}' ya se encuentra abierta. Seleccione otra caja o cierre el turno anterior.`
      });
    }

    const cfg = db.prepare('SELECT exchange_rate FROM settings WHERE id = 1').get();
    const tasa_bcv = cfg ? Number(cfg.exchange_rate) || 85.0 : 85.0;

    const last = db.prepare('SELECT MAX(numero) as max_num, MAX(id) as max_id FROM cash_registers').get();
    const nuevoNum = ((last?.max_num || last?.max_id || 0) + 1);

    const mUsd = Math.max(0, Number(monto_apertura_usd) || 0);
    const mBs = (monto_apertura_bs && Number(monto_apertura_bs) > 0) ? Number(monto_apertura_bs) : Number((mUsd * tasa_bcv).toFixed(2));

    const empId = employee_id || 1;
    const empNombre = employee_name || (db.prepare('SELECT name FROM employees WHERE id = ?').get(empId)?.name || 'Administrador');

    const result = db.prepare(`
      INSERT INTO cash_registers (
        numero, nombre_caja, employee_id, opened_at, opening_balance,
        monto_apertura_usd, monto_apertura_bs, tasa_bcv_apertura, tasa_bcv_cierre,
        status, total_esperado_efectivo, total_esperado_general,
        observaciones_apertura, usuario_apertura_nombre
      ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?)
    `).run(
      nuevoNum, nom, empId, mUsd,
      mUsd, mBs, tasa_bcv, tasa_bcv,
      mUsd, mUsd,
      observaciones || '', empNombre
    );

    const nuevaId = result.lastInsertRowid;
    const nuevaCaja = db.prepare('SELECT * FROM cash_registers WHERE id = ?').get(nuevaId);

    res.json({
      status: 'ok',
      caja: serializarCaja(nuevaCaja, true)
    });
  } catch (err) {
    res.status(500).json({ detail: err.message, error: err.message });
  }
});

// 8.3. Cerrar turno / caja (Arqueo Z)
app.post('/api/cajas/cerrar', (req, res) => {
  try {
    const {
      caja_id,
      declarado_efectivo,
      declarado_zelle,
      declarado_pagomovil,
      declarado_punto,
      observaciones,
      usuario_cierre_id,
      usuario_cierre_nombre
    } = req.body;

    let caja = null;
    if (caja_id) {
      caja = db.prepare("SELECT * FROM cash_registers WHERE id = ? AND status = 'OPEN'").get(caja_id);
    }
    if (!caja) {
      caja = db.prepare("SELECT * FROM cash_registers WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
    }

    if (!caja) {
      return res.status(400).json({ detail: 'No hay ninguna caja abierta actualmente para cerrar' });
    }

    const cfg = db.prepare('SELECT exchange_rate FROM settings WHERE id = 1').get();
    const tasa_bcv = cfg ? Number(cfg.exchange_rate) || 85.0 : 85.0;

    const metricas = calcularMetricasCaja(caja);

    const dec_ef = Math.max(0, Number(declarado_efectivo) || 0);
    const dec_zelle = Math.max(0, Number(declarado_zelle) || 0);
    const dec_pm = Math.max(0, Number(declarado_pagomovil) || 0);
    const dec_punto = Math.max(0, Number(declarado_punto) || 0);
    const total_dec = Number((dec_ef + dec_zelle + dec_pm + dec_punto).toFixed(2));

    const dif_efectivo = Number((dec_ef - metricas.total_esperado_efectivo).toFixed(2));
    const dif_general = Number((total_dec - metricas.total_esperado_general).toFixed(2));

    const userCierreNombre = usuario_cierre_nombre || 'Administrador';

    db.prepare(`
      UPDATE cash_registers SET
        closed_at = CURRENT_TIMESTAMP,
        status = 'CLOSED',
        tasa_bcv_cierre = ?,
        ventas_efectivo = ?,
        ventas_zelle = ?,
        ventas_pagomovil = ?,
        ventas_punto = ?,
        ventas_credito = ?,
        total_ventas = ?,
        ventas_pagomovil_bs = ?,
        ventas_punto_bs = ?,
        total_ventas_bs = ?,
        abonos_efectivo = ?,
        abonos_zelle = ?,
        abonos_pagomovil = ?,
        abonos_punto = ?,
        total_abonos = ?,
        total_esperado_efectivo = ?,
        total_esperado_general = ?,
        declarado_efectivo = ?,
        declarado_zelle = ?,
        declarado_pagomovil = ?,
        declarado_punto = ?,
        total_declarado = ?,
        diferencia_efectivo = ?,
        diferencia_general = ?,
        observaciones_cierre = ?,
        usuario_cierre_id = ?,
        usuario_cierre_nombre = ?,
        closing_balance_system = ?,
        closing_balance_actual = ?,
        difference = ?
      WHERE id = ?
    `).run(
      tasa_bcv,
      metricas.ventas_efectivo,
      metricas.ventas_zelle,
      metricas.ventas_pagomovil,
      metricas.ventas_punto,
      metricas.ventas_credito,
      metricas.total_ventas,
      metricas.ventas_pagomovil_bs,
      metricas.ventas_punto_bs,
      metricas.total_ventas_bs,
      metricas.abonos_efectivo,
      metricas.abonos_zelle,
      metricas.abonos_pagomovil,
      metricas.abonos_punto,
      metricas.total_abonos,
      metricas.total_esperado_efectivo,
      metricas.total_esperado_general,
      dec_ef,
      dec_zelle,
      dec_pm,
      dec_punto,
      total_dec,
      dif_efectivo,
      dif_general,
      observaciones || '',
      usuario_cierre_id || 1,
      userCierreNombre,
      metricas.total_esperado_efectivo,
      dec_ef,
      dif_efectivo,
      caja.id
    );

    const cajaCerrada = db.prepare('SELECT * FROM cash_registers WHERE id = ?').get(caja.id);

    res.json({
      status: 'ok',
      caja: serializarCaja(cajaCerrada, true)
    });
  } catch (err) {
    res.status(500).json({ detail: err.message, error: err.message });
  }
});

// 8.4. Listar historial de cajas y turnos
app.get('/api/cajas', (req, res) => {
  try {
    const { nombre_caja, limit = 100, offset = 0 } = req.query;
    let query = `
      SELECT cr.*, e.name as employee_name
      FROM cash_registers cr
      LEFT JOIN employees e ON cr.employee_id = e.id
    `;
    const params = [];

    if (nombre_caja && nombre_caja.trim() !== '' && nombre_caja.trim().toUpperCase() !== 'TODAS') {
      query += ` WHERE cr.nombre_caja = ? `;
      params.push(nombre_caja.trim());
    }

    query += ` ORDER BY cr.id DESC LIMIT ? OFFSET ? `;
    params.push(Number(limit) || 100, Number(offset) || 0);

    const cajas = db.prepare(query).all(...params);
    res.json(cajas.map(c => serializarCaja(c, false)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8.5. Detalle de caja con facturas y abonos (Comprobante / Ticket 80mm)
app.get('/api/cajas/:id', (req, res) => {
  try {
    const caja = db.prepare(`
      SELECT cr.*, e.name as employee_name
      FROM cash_registers cr
      LEFT JOIN employees e ON cr.employee_id = e.id
      WHERE cr.id = ?
    `).get(req.params.id);

    if (!caja) return res.status(404).json({ detail: 'Caja no encontrada' });
    res.json(serializarCaja(caja, true));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Adapters retrocompatibles para endpoints antiguos
app.get('/api/cash-register/current', (req, res) => {
  try {
    const current = db.prepare(`
      SELECT cr.*, e.name as employee_name
      FROM cash_registers cr
      LEFT JOIN employees e ON cr.employee_id = e.id
      WHERE cr.status = 'OPEN'
      ORDER BY cr.id DESC
      LIMIT 1
    `).get();

    if (!current) {
      return res.json({ isOpen: false });
    }

    const s = serializarCaja(current, true);
    res.json({
      isOpen: true,
      register: current,
      openingBalance: s.monto_apertura_usd,
      cashSales: s.ventas_efectivo,
      otherSales: [
        { payment_method: 'ZELLE', total: s.ventas_zelle },
        { payment_method: 'PAGO_MOVIL', total: s.ventas_pagomovil },
        { payment_method: 'CARD', total: s.ventas_punto },
        { payment_method: 'CREDIT', total: s.ventas_credito }
      ],
      movements: [],
      incomes: s.abonos_efectivo,
      expenses: 0,
      expectedCashInDrawer: s.total_esperado_efectivo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cash-register/open', (req, res) => {
  // Redirigir a lógica nueva
  req.url = '/api/cajas/abrir';
  app._router.handle(req, res);
});

app.post('/api/cash-register/close', (req, res) => {
  req.url = '/api/cajas/cerrar';
  app._router.handle(req, res);
});

app.get('/api/cash-register/history', (req, res) => {
  try {
    const history = db.prepare(`
      SELECT cr.*, e.name as employee_name
      FROM cash_registers cr
      LEFT JOIN employees e ON cr.employee_id = e.id
      ORDER BY cr.id DESC
      LIMIT 30
    `).all();
    res.json(history.map(c => serializarCaja(c, false)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cash-register/movement', (req, res) => {
  try {
    const { cash_register_id, type, amount, reason, employee_id } = req.body;
    const result = db.prepare(`
      INSERT INTO cash_movements (cash_register_id, type, amount, reason, employee_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(cash_register_id || 1, type, Number(amount), reason || '', employee_id || 1);
    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. TIENDA ONLINE Y GESTIÓN DE PEDIDOS
// ==========================================
app.get('/api/orders', (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT * FROM online_orders
      ORDER BY id DESC
    `).all();

    for (const ord of orders) {
      ord.items = db.prepare(`
        SELECT oi.*, p.image_url, p.code as product_code
        FROM online_order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `).all(ord.id);
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create order from the public store
app.post('/api/orders', (req, res) => {
  const transaction = db.transaction(() => {
    const {
      customer_name, customer_phone, customer_email,
      delivery_type, delivery_address, payment_method,
      items, notes, delivery_fee = 0,
      payment_currency = 'BS', payment_reference = '',
      proof_image = '', exchange_rate = 85.0
    } = req.body;

    // Verify stock availability
    for (const item of items) {
      const stockRow = db.prepare(`
        SELECT COALESCE(SUM(stock), 0) as total_stock, p.name
        FROM products p
        LEFT JOIN batches b ON p.id = b.product_id
        WHERE p.id = ?
        GROUP BY p.id
      `).get(item.product_id);

      if (!stockRow || stockRow.total_stock < item.quantity) {
        throw new Error(`Stock insuficiente para "${stockRow ? stockRow.name : 'Producto'}". Disponibles: ${stockRow ? stockRow.total_stock : 0}`);
      }
    }

    let subtotal = 0;
    for (const item of items) {
      subtotal += Number(item.unit_price) * Number(item.quantity);
    }

    // Regla de Delivery:
    // - Delivery GRATIS si la factura / subtotal es de 10 o más dólares ($10+)
    // - Delivery de $1.00 dólar si la factura es menor a 10 dólares (de 9 hacia abajo)
    // - $0.00 si el cliente selecciona Retiro en Farmacia (PICKUP)
    let calculatedDeliveryFee = 0;
    if (delivery_type === 'DELIVERY') {
      calculatedDeliveryFee = subtotal >= 10.0 ? 0.00 : 1.00;
    }

    const total = subtotal + calculatedDeliveryFee;
    const rate = Number(exchange_rate) || 85.0;
    const totalBs = total * rate;

    const countOrders = db.prepare(`SELECT id FROM online_orders ORDER BY id DESC LIMIT 1`).get();
    const nextNum = (countOrders ? countOrders.id : 0) + 1;
    const orderNumber = `ORD-${String(nextNum).padStart(4, '0')}`;

    const orderRes = db.prepare(`
      INSERT INTO online_orders (
        order_number, customer_name, customer_phone, customer_email,
        delivery_type, delivery_address, payment_method, status,
        subtotal, delivery_fee, total, notes,
        payment_currency, payment_reference, proof_image, exchange_rate, total_bs
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderNumber, customer_name, customer_phone, customer_email || '',
      delivery_type, delivery_address || '', payment_method,
      subtotal, calculatedDeliveryFee, total, notes || '',
      payment_currency, payment_reference, proof_image, rate, totalBs
    );

    const orderId = orderRes.lastInsertRowid;

    for (const item of items) {
      db.prepare(`
        INSERT INTO online_order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(orderId, item.product_id, item.product_name, item.quantity, item.unit_price, item.quantity * item.unit_price);
    }

    return { orderId, orderNumber, total, totalBs };
  });

  try {
    const result = transaction();

    // Fetch full order for socket broadcast
    const fullOrder = db.prepare('SELECT * FROM online_orders WHERE id = ?').get(result.orderId);
    fullOrder.items = db.prepare('SELECT * FROM online_order_items WHERE order_id = ?').all(result.orderId);

    // Notify admin panel with sound & badge trigger
    io.emit('new_online_order', fullOrder);

    res.status(201).json({
      success: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      total: result.total
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/orders/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    db.prepare('UPDATE online_orders SET status = ? WHERE id = ?').run(status, req.params.id);
    io.emit('order_status_updated', { orderId: req.params.id, status });
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Convert online order into finalized POS sale
app.post('/api/orders/:id/convert-to-sale', (req, res) => {
  const transaction = db.transaction(() => {
    const order = db.prepare('SELECT * FROM online_orders WHERE id = ?').get(req.params.id);
    if (!order) throw new Error('Pedido no encontrado');
    if (order.status === 'DELIVERED') throw new Error('Este pedido ya fue despachado y facturado');

    const orderItems = db.prepare('SELECT * FROM online_order_items WHERE order_id = ?').all(req.params.id);

    // 1. Identificar o validar la caja abierta donde ingresar el cobro
    let openCash = null;
    if (req.body.cash_register_id) {
      openCash = db.prepare("SELECT * FROM cash_registers WHERE id = ? AND status = 'OPEN'").get(req.body.cash_register_id);
    }
    if (!openCash && req.body.employee_id) {
      openCash = db.prepare("SELECT * FROM cash_registers WHERE employee_id = ? AND status = 'OPEN' ORDER BY id DESC LIMIT 1").get(req.body.employee_id);
    }
    if (!openCash) {
      openCash = db.prepare("SELECT * FROM cash_registers WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
    }

    if (!openCash) {
      throw new Error('No hay ninguna caja abierta en este momento. Por favor abra una caja en el Módulo de Ventas o Control de Caja para poder facturar y cuadrar el cobro.');
    }

    // 2. Identificar el empleado responsable que despacha / recibe
    let employeeId = req.body.employee_id || openCash.employee_id || 1;
    let employeeRow = db.prepare('SELECT id, name FROM employees WHERE id = ?').get(employeeId);
    let employeeName = req.body.employee_name || (employeeRow ? employeeRow.name : 'Administrador');

    // 3. Cliente: buscar por teléfono/nombre o crearlo automáticamente
    let customer = db.prepare('SELECT id FROM customers WHERE phone = ? OR name = ?').get(order.customer_phone, order.customer_name);
    let customerId = customer ? customer.id : null;
    if (!customerId && order.customer_name) {
      try {
        const newCust = db.prepare(`
          INSERT INTO customers (name, phone, address, email)
          VALUES (?, ?, ?, ?)
        `).run(order.customer_name, order.customer_phone || '', order.delivery_address || '', order.customer_email || '');
        customerId = newCust.lastInsertRowid;
      } catch(e) {
        customerId = 1;
      }
    }
    if (!customerId) customerId = 1;

    // 4. Mapeo de método de pago y tasa de cambio
    const cfg = db.prepare('SELECT exchange_rate FROM settings WHERE id = 1').get();
    const rate = Number(order.exchange_rate) || Number(cfg?.exchange_rate) || 85.0;
    const totalBs = Number(order.total_bs) || Number((order.total * rate).toFixed(2));

    const rawMethod = (order.payment_method || 'PAGO_MOVIL').toUpperCase();
    let cleanPaymentMethod = 'PAGO_MOVIL';
    if (rawMethod.includes('PAGO_MOVIL') || rawMethod.includes('PAGOMOVIL')) {
      cleanPaymentMethod = 'PAGO_MOVIL';
    } else if (rawMethod.includes('TRANSFER')) {
      cleanPaymentMethod = 'TRANSFERENCIA';
    } else if (rawMethod.includes('ZELLE')) {
      cleanPaymentMethod = 'ZELLE';
    } else if (rawMethod.includes('EFECTIVO') || rawMethod.includes('CASH')) {
      cleanPaymentMethod = 'EFECTIVO';
    } else if (rawMethod.includes('CARD') || rawMethod.includes('PUNTO') || rawMethod.includes('TARJETA')) {
      cleanPaymentMethod = 'PUNTO';
    } else {
      cleanPaymentMethod = rawMethod;
    }

    // 5. Generar número de factura correlativo
    const lastSale = db.prepare(`SELECT id FROM sales ORDER BY id DESC LIMIT 1`).get();
    const nextNum = (lastSale ? lastSale.id : 0) + 1;
    const invoiceNumber = `FAC-${String(nextNum).padStart(6, '0')}`;

    // 6. Insertar venta asociada a la caja abierta
    const saleRes = db.prepare(`
      INSERT INTO sales (
        invoice_number, customer_id, employee_id, cash_register_id,
        sale_type, payment_method, subtotal, discount, tax, total,
        amount_paid, change_given, is_credit, notes,
        exchange_rate, total_bs, change_currency, change_amount
      ) VALUES (?, ?, ?, ?, 'ONLINE_ORDER', ?, ?, 0, 0, ?, ?, 0, 0, ?, ?, ?, 'USD', 0)
    `).run(
      invoiceNumber, customerId, employeeId, openCash.id,
      cleanPaymentMethod, order.subtotal, order.total, order.total,
      `Facturación Pedido Web #${order.order_number} (${order.delivery_type === 'DELIVERY' ? 'Delivery' : 'Retiro'})`,
      rate, totalBs
    );

    const saleId = saleRes.lastInsertRowid;

    // 7. Insertar desglose de pago en sale_payments para cuadre multimoneda en caja
    const paymentCurrency = order.payment_currency || (cleanPaymentMethod === 'ZELLE' ? 'USD' : 'BS');
    const paymentAmount = paymentCurrency === 'BS' ? totalBs : order.total;
    db.prepare(`
      INSERT INTO sale_payments (sale_id, payment_method, currency, amount, amount_usd, amount_bs, reference)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      saleId, cleanPaymentMethod, paymentCurrency,
      paymentAmount, order.total, totalBs,
      order.payment_reference || ''
    );

    // Si fue en efectivo, asentar movimiento en caja
    if (cleanPaymentMethod === 'EFECTIVO') {
      db.prepare(`
        INSERT INTO cash_movements (cash_register_id, type, amount, reason, employee_id)
        VALUES (?, 'INCOME', ?, ?, ?)
      `).run(openCash.id, order.total, `Cobro Pedido Online #${order.order_number}`, employeeId);
    }

    // 8. Rebajar inventario por FEFO (First Expired, First Out)
    for (const item of orderItems) {
      let qtyNeeded = item.quantity;
      const batches = db.prepare(`
        SELECT * FROM batches WHERE product_id = ? AND stock > 0 ORDER BY expiry_date ASC
      `).all(item.product_id);

      for (const batch of batches) {
        if (qtyNeeded <= 0) break;
        const take = Math.min(batch.stock, qtyNeeded);
        db.prepare(`UPDATE batches SET stock = stock - ? WHERE id = ?`).run(take, batch.id);

        db.prepare(`
          INSERT INTO sale_items (sale_id, product_id, batch_id, quantity, unit_price, unit_cost, subtotal)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(saleId, item.product_id, batch.id, take, item.unit_price, batch.cost_price, take * item.unit_price);

        db.prepare(`
          INSERT INTO stock_movements (product_id, batch_id, type, quantity, reason, reference_id, employee_id)
          VALUES (?, ?, 'SALE', ?, 'Facturación Pedido Web', ?, ?)
        `).run(item.product_id, batch.id, -take, invoiceNumber, employeeId);

        qtyNeeded -= take;
      }
    }

    // 9. Actualizar pedido online con estatus DELIVERED, cajero que recibió y caja
    db.prepare(`
      UPDATE online_orders 
      SET status = 'DELIVERED', 
          sale_id = ?, 
          processed_by_employee_id = ?, 
          processed_by_name = ?, 
          cash_register_id = ?,
          invoice_number = ?
      WHERE id = ?
    `).run(saleId, employeeId, employeeName, openCash.id, invoiceNumber, req.params.id);

    return {
      saleId,
      invoiceNumber,
      orderItems,
      employeeId,
      employeeName,
      cashRegisterId: openCash.id,
      cashRegisterName: openCash.nombre_caja,
      total: order.total,
      totalBs,
      exchangeRate: rate,
      paymentMethod: cleanPaymentMethod,
      paymentReference: order.payment_reference || '',
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      deliveryType: order.delivery_type,
      deliveryAddress: order.delivery_address || '',
      orderNumber: order.order_number
    };
  });

  try {
    const result = transaction();

    // Broadcast stock updates
    for (const it of result.orderItems) {
      broadcastStockUpdate(it.product_id);
    }
    io.emit('order_status_updated', { 
      orderId: req.params.id, 
      status: 'DELIVERED', 
      invoiceNumber: result.invoiceNumber,
      employeeName: result.employeeName,
      cashRegisterName: result.cashRegisterName
    });
    io.emit('sale_completed', { invoiceNumber: result.invoiceNumber, total: result.total });
    io.emit('caja_movimiento', { cajaId: result.cashRegisterId, tipo: 'VENTA_ONLINE' });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 10. REPORTES Y ANALÍTICA COMPLETA
// ==========================================
app.get('/api/reports/dashboard', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Today sales
    const todaySales = db.prepare(`
      SELECT 
        COALESCE(SUM(total), 0) as total,
        COUNT(*) as count
      FROM sales
      WHERE created_at LIKE ?
    `).get(`${today}%`);

    // Total products & low stock
    const productsStats = db.prepare(`
      SELECT 
        COUNT(p.id) as total_products,
        COUNT(CASE WHEN COALESCE((SELECT SUM(stock) FROM batches WHERE product_id = p.id), 0) <= p.min_stock THEN 1 ELSE NULL END) as low_stock_count
      FROM products p
    `).get();

    // Pending orders
    const pendingOrders = db.prepare(`
      SELECT COUNT(*) as count FROM online_orders WHERE status = 'PENDING'
    `).get().count;

    // Total customer debt
    const totalDebt = db.prepare(`
      SELECT COALESCE(SUM(current_debt), 0) as total FROM customers
    `).get().total;

    // Expiring in next 60 days
    const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const expiringCount = db.prepare(`
      SELECT COUNT(*) as count FROM batches WHERE stock > 0 AND expiry_date <= ?
    `).get(in60Days).count;

    res.json({
      todaySales: todaySales.total,
      todaySalesCount: todaySales.count,
      totalProducts: productsStats.total_products,
      lowStockCount: productsStats.low_stock_count,
      pendingOrders,
      totalDebt,
      expiringCount: expiringCount || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10.0 PANEL DE CONTROL EJECUTIVO (INICIO)
// ==========================================
app.get('/api/dashboard/overview', (req, res) => {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get() || {};
    const rate = Number(settings.exchange_rate) || 85.0;

    // 1. Core KPIs
    const productsCount = db.prepare(`SELECT COUNT(*) as count FROM products`).get().count;
    const inventoryUnits = db.prepare(`SELECT COALESCE(SUM(stock), 0) as total FROM batches`).get().total;

    const monthSales = db.prepare(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total_usd,
        COALESCE(SUM(total_bs), 0) as total_bs
      FROM sales
      WHERE date(created_at) >= date(?)
    `).get(firstDayOfMonth);

    const customersStats = db.prepare(`
      SELECT 
        COUNT(*) as total_customers,
        COALESCE(SUM(current_debt), 0) as total_debt,
        COUNT(CASE WHEN current_debt > 0 THEN 1 END) as debtors_count
      FROM customers
    `).get();

    const monthSalesUsd = monthSales.total_usd;
    const monthSalesBs = monthSales.total_bs > 0 ? monthSales.total_bs : (monthSalesUsd * rate);
    const avgTicket = monthSales.count > 0 ? (monthSalesUsd / monthSales.count) : 0;

    // 2. Cost & Profit (P&L) for current month
    const monthItems = db.prepare(`
      SELECT 
        COALESCE(SUM(si.quantity * CASE WHEN si.unit_cost > 0 THEN si.unit_cost ELSE p.cost_price END), 0) as total_cogs,
        COALESCE(SUM(CASE WHEN p.has_iva = 1 THEN (si.quantity * si.unit_price * 0.16) ELSE 0 END), 0) as total_tax
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE date(s.created_at) >= date(?)
    `).get(firstDayOfMonth);

    const monthCogs = monthItems.total_cogs;
    const monthTax = monthItems.total_tax;
    const netRevenue = Math.max(0, monthSalesUsd - monthTax);
    const grossProfit = Math.max(0, netRevenue - monthCogs);
    const grossMarginPct = monthCogs > 0 ? Number(((grossProfit / monthCogs) * 100).toFixed(1)) : 0;
    const netMarginPct = monthSalesUsd > 0 ? Number(((grossProfit / monthSalesUsd) * 100).toFixed(1)) : 0;

    // 3. Cash Register Reconciliation
    const openRegister = db.prepare(`
      SELECT * FROM cash_registers 
      WHERE status = 'OPEN' 
      ORDER BY id DESC LIMIT 1
    `).get() || db.prepare(`
      SELECT * FROM cash_registers 
      ORDER BY id DESC LIMIT 1
    `).get();

    let cashReconciliation = {
      status: openRegister ? openRegister.status : 'CLOSED',
      openingBalance: openRegister ? openRegister.opening_balance : 0,
      cashSales: 0,
      incomes: 0,
      expenses: 0,
      expectedCashUsd: 0,
      expectedCashBs: 0
    };

    if (openRegister) {
      const movements = db.prepare(`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as incomes,
          COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as expenses
        FROM cash_movements WHERE cash_register_id = ?
      `).get(openRegister.id);

      const cashSalesRow = db.prepare(`
        SELECT COALESCE(SUM(amount_usd), 0) as total_cash_sales
        FROM sale_payments sp
        JOIN sales s ON sp.sale_id = s.id
        WHERE (sp.payment_method = 'CASH_USD' OR sp.payment_method = 'CASH_BS' OR sp.payment_method = 'CASH')
          AND s.cash_register_id = ?
      `).get(openRegister.id);

      cashReconciliation.cashSales = cashSalesRow ? cashSalesRow.total_cash_sales : 0;
      cashReconciliation.incomes = movements.incomes;
      cashReconciliation.expenses = movements.expenses;
      cashReconciliation.expectedCashUsd = Math.max(0, openRegister.opening_balance + cashReconciliation.cashSales + movements.incomes - movements.expenses);
      cashReconciliation.expectedCashBs = cashReconciliation.expectedCashUsd * rate;
    }

    // 4. Daily timeline historical metrics (Days of current month)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const salesByDayRaw = db.prepare(`
      SELECT 
        CAST(strftime('%d', created_at) AS INTEGER) as day_num,
        COALESCE(SUM(total), 0) as sales_usd,
        COUNT(*) as trans_count
      FROM sales
      WHERE date(created_at) >= date(?)
      GROUP BY strftime('%d', created_at)
    `).all(firstDayOfMonth);

    const salesByDayMap = {};
    salesByDayRaw.forEach(r => { salesByDayMap[r.day_num] = r.sales_usd; });

    const timelineDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      timelineDays.push({
        day: d,
        label: `Día ${d}`,
        sales: salesByDayMap[d] || 0,
        credit: d === 15 || d === 20 ? 120 : (d % 5 === 0 ? 60 : 0),
        clients: Math.min(customersStats.total_customers, Math.floor(d * 1.5) + 3),
        inventory: productsCount
      });
    }

    // 5. Critical Alerts
    const lowStockList = db.prepare(`
      SELECT 
        p.id, p.name, p.code, p.category, p.min_stock, p.image_url,
        COALESCE(SUM(b.stock), 0) as total_stock
      FROM products p
      LEFT JOIN batches b ON p.id = b.product_id
      GROUP BY p.id
      HAVING total_stock <= p.min_stock
      ORDER BY total_stock ASC
      LIMIT 6
    `).all();

    const expiringBatchesList = db.prepare(`
      SELECT 
        b.id, b.batch_number, b.expiry_date, b.stock,
        p.name as product_name, p.code as product_code
      FROM batches b
      JOIN products p ON b.product_id = p.id
      WHERE b.stock > 0 AND date(b.expiry_date) <= date(?)
      ORDER BY b.expiry_date ASC
      LIMIT 6
    `).all(in90Days);

    const pendingOrdersList = db.prepare(`
      SELECT id, order_number, customer_name, total, delivery_type, created_at
      FROM online_orders
      WHERE status = 'PENDING'
      ORDER BY id DESC
      LIMIT 5
    `).all();

    res.json({
      kpi: {
        inventoryCount: productsCount,
        inventoryUnits,
        monthSalesUsd,
        monthSalesBs,
        monthSalesCount: monthSales.count,
        pendingCreditsUsd: customersStats.total_debt,
        debtorsCount: customersStats.debtors_count,
        totalCustomers: customersStats.total_customers,
        avgTicket,
        rate
      },
      pnl: {
        grossRevenue: monthSalesUsd,
        cogs: monthCogs,
        tax: monthTax,
        netProfit: grossProfit,
        grossMarginPct,
        netMarginPct
      },
      cashReconciliation,
      timelineDays,
      alerts: {
        lowStockList,
        lowStockCount: lowStockList.length,
        expiringBatchesList,
        expiringCount: expiringBatchesList.length,
        pendingOrdersList,
        pendingOrdersCount: pendingOrdersList.length
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/sales-detailed', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT s.*, c.name as customer_name, e.name as employee_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN employees e ON s.employee_id = e.id
    `;
    const params = [];

    if (startDate && endDate) {
      query += ` WHERE date(s.created_at) BETWEEN ? AND ? `;
      params.push(startDate, endDate);
    }
    query += ` ORDER BY s.id DESC LIMIT 200`;

    const sales = db.prepare(query).all(...params);

    // Payment methods summary
    const methods = db.prepare(`
      SELECT payment_method, COUNT(*) as count, SUM(total) as total
      FROM sales
      GROUP BY payment_method
    `).all();

    // Top selling products
    const topProducts = db.prepare(`
      SELECT p.name, SUM(si.quantity) as total_qty, SUM(si.subtotal) as total_revenue
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      GROUP BY p.id
      ORDER BY total_revenue DESC
      LIMIT 10
    `).all();

    res.json({ sales, methods, topProducts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/inventory-valuation', (req, res) => {
  try {
    const valuation = db.prepare(`
      SELECT 
        COUNT(DISTINCT p.id) as total_items,
        COALESCE(SUM(b.stock), 0) as total_units,
        COALESCE(SUM(b.stock * b.cost_price), 0) as valuation_at_cost,
        COALESCE(SUM(b.stock * p.selling_price), 0) as valuation_at_retail
      FROM products p
      LEFT JOIN batches b ON p.id = b.product_id
    `).get();

    valuation.projected_profit = valuation.valuation_at_retail - valuation.valuation_at_cost;
    valuation.margin_percentage = valuation.valuation_at_retail > 0 
      ? ((valuation.projected_profit / valuation.valuation_at_retail) * 100).toFixed(1) 
      : 0;

    res.json(valuation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10.1 REPORTE FINANCIERO Y FISCAL (SENIAT)
// ==========================================
app.get('/api/reports/financial', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = `WHERE date(s.created_at) BETWEEN date(?) AND date(?)`;
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = `WHERE date(s.created_at) >= date(?)`;
      params.push(startDate);
    } else if (endDate) {
      dateFilter = `WHERE date(s.created_at) <= date(?)`;
      params.push(endDate);
    }

    // 1. Overall Sales and Invoices Totals
    const salesSummary = db.prepare(`
      SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(s.subtotal), 0) as gross_subtotal,
        COALESCE(SUM(s.discount), 0) as total_discounts,
        COALESCE(SUM(s.tax), 0) as total_tax,
        COALESCE(SUM(s.total), 0) as total_revenue_usd,
        COALESCE(SUM(s.total_bs), 0) as total_revenue_bs,
        COALESCE(AVG(s.exchange_rate), 85.0) as avg_rate
      FROM sales s
      ${dateFilter}
    `).get(...params);

    // 2. Cost of Goods Sold & Tax Classification from sale_items
    const itemsSummary = db.prepare(`
      SELECT 
        COALESCE(SUM(si.quantity), 0) as total_units_sold,
        COALESCE(SUM(si.quantity * CASE WHEN si.unit_cost > 0 THEN si.unit_cost ELSE p.cost_price END), 0) as total_cogs,
        COALESCE(SUM(CASE WHEN p.has_iva = 1 THEN (si.quantity * si.unit_price) ELSE 0 END), 0) as taxed_base_amount,
        COALESCE(SUM(CASE WHEN p.has_iva = 0 OR p.has_iva IS NULL THEN (si.quantity * si.unit_price) ELSE 0 END), 0) as exempt_amount
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      ${dateFilter}
    `).get(...params);

    const avgRate = Number(salesSummary.avg_rate) || 85.0;
    const totalRevenue = salesSummary.total_revenue_usd;
    const totalTax = salesSummary.total_tax > 0 ? salesSummary.total_tax : (itemsSummary.taxed_base_amount * 0.16);
    const netRevenue = Math.max(0, totalRevenue - totalTax);
    const totalCogs = itemsSummary.total_cogs;
    const grossProfit = Math.max(0, netRevenue - totalCogs);
    const profitMarginPercent = totalCogs > 0 ? ((grossProfit / totalCogs) * 100) : 0;

    // 3. Payment Methods Breakdown (Multi-moneda)
    const paymentsBreakdown = db.prepare(`
      SELECT 
        sp.payment_method,
        sp.currency,
        COUNT(DISTINCT sp.sale_id) as count,
        COALESCE(SUM(sp.amount), 0) as total_native,
        COALESCE(SUM(sp.amount_usd), 0) as total_usd,
        COALESCE(SUM(sp.amount_bs), 0) as total_bs
      FROM sale_payments sp
      JOIN sales s ON sp.sale_id = s.id
      ${dateFilter}
      GROUP BY sp.payment_method, sp.currency
      ORDER BY total_usd DESC
    `).all(...params);

    // 4. Daily timeline for chronological trend charts
    const dailyTimeline = db.prepare(`
      SELECT 
        date(s.created_at) as sale_date,
        COUNT(s.id) as count,
        COALESCE(SUM(s.total), 0) as total_sales,
        COALESCE(SUM(s.tax), 0) as total_tax,
        COALESCE(SUM(s.total_bs), 0) as total_bs,
        COALESCE((
          SELECT SUM(si2.quantity * CASE WHEN si2.unit_cost > 0 THEN si2.unit_cost ELSE p2.cost_price END)
          FROM sale_items si2
          JOIN products p2 ON si2.product_id = p2.id
          WHERE si2.sale_id IN (SELECT id FROM sales WHERE date(created_at) = date(s.created_at))
        ), 0) as daily_cogs
      FROM sales s
      ${dateFilter}
      GROUP BY date(s.created_at)
      ORDER BY date(s.created_at) ASC
    `).all(...params);

    // 5. Top Profitable Products in period
    const topProfitableProducts = db.prepare(`
      SELECT 
        p.id,
        p.name,
        p.category,
        p.has_iva,
        SUM(si.quantity) as qty_sold,
        SUM(si.subtotal) as total_revenue,
        SUM(si.quantity * CASE WHEN si.unit_cost > 0 THEN si.unit_cost ELSE p.cost_price END) as total_cost,
        (SUM(si.subtotal) - SUM(si.quantity * CASE WHEN si.unit_cost > 0 THEN si.unit_cost ELSE p.cost_price END)) as net_profit
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      ${dateFilter}
      GROUP BY p.id
      ORDER BY net_profit DESC
      LIMIT 15
    `).all(...params);

    // 6. Recent invoices for fiscal audit
    const invoices = db.prepare(`
      SELECT 
        s.id, s.invoice_number, s.created_at, s.payment_method,
        s.subtotal, s.discount, s.tax, s.total, s.total_bs, s.exchange_rate,
        c.name as customer_name, c.id_number as customer_id_number,
        e.name as employee_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN employees e ON s.employee_id = e.id
      ${dateFilter}
      ORDER BY s.id DESC
      LIMIT 100
    `).all(...params);

    res.json({
      period: { startDate: startDate || '', endDate: endDate || '' },
      summary: {
        totalInvoices: salesSummary.total_invoices,
        totalUnitsSold: itemsSummary.total_units_sold,
        totalRevenueUsd: totalRevenue,
        totalRevenueBs: totalRevenue * avgRate,
        grossSubtotal: salesSummary.gross_subtotal,
        totalDiscounts: salesSummary.total_discounts,
        totalTaxUsd: totalTax,
        totalTaxBs: totalTax * avgRate,
        netRevenueUsd: netRevenue,
        netRevenueBs: netRevenue * avgRate,
        totalCogsUsd: totalCogs,
        totalCogsBs: totalCogs * avgRate,
        grossProfitUsd: grossProfit,
        grossProfitBs: grossProfit * avgRate,
        profitMarginPercent: Number(profitMarginPercent.toFixed(1)),
        exemptSalesUsd: itemsSummary.exempt_amount,
        exemptSalesBs: itemsSummary.exempt_amount * avgRate,
        taxedSalesBaseUsd: itemsSummary.taxed_base_amount,
        taxedSalesBaseBs: itemsSummary.taxed_base_amount * avgRate,
        avgRate
      },
      paymentsBreakdown,
      dailyTimeline: dailyTimeline.map(d => ({
        ...d,
        daily_profit: Math.max(0, (d.total_sales - d.total_tax) - d.daily_cogs)
      })),
      topProfitableProducts,
      invoices
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dedicated Sales & Dispatch Report for Web Store & Delivery
app.get('/api/reports/online-sales', (req, res) => {
  try {
    const { startDate, endDate, status, deliveryType } = req.query;

    let whereClauses = [];
    let params = [];

    if (startDate && endDate) {
      whereClauses.push('date(o.created_at) BETWEEN ? AND ?');
      params.push(startDate, endDate);
    }

    if (status && status !== 'ALL') {
      whereClauses.push('o.status = ?');
      params.push(status);
    }

    if (deliveryType && deliveryType !== 'ALL') {
      whereClauses.push('o.delivery_type = ?');
      params.push(deliveryType);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Fetch all matching orders
    const orders = db.prepare(`
      SELECT o.*
      FROM online_orders o
      ${whereStr}
      ORDER BY o.id DESC
    `).all(...params);

    // Fetch items for each order
    const getItems = db.prepare(`
      SELECT oi.*, p.category, p.prescription_required as requires_prescription
      FROM online_order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `);

    orders.forEach(order => {
      order.items = getItems.all(order.id);
    });

    // Summary statistics
    const totals = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN total ELSE 0 END), 0) as total_revenue_usd,
        COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN total_bs ELSE 0 END), 0) as total_revenue_bs,
        COALESCE(SUM(CASE WHEN status = 'DELIVERED' AND delivery_type = 'DELIVERY' THEN 1 ELSE 0 END), 0) as delivered_count,
        COALESCE(SUM(CASE WHEN status = 'DELIVERED' AND delivery_type = 'PICKUP' THEN 1 ELSE 0 END), 0) as pickup_count,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) as pending_count,
        COALESCE(SUM(CASE WHEN status = 'PREPARING' THEN 1 ELSE 0 END), 0) as preparing_count,
        COALESCE(SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END), 0) as cancelled_count
      FROM online_orders
    `).get();

    // Payment methods breakdown for delivered/completed orders
    const paymentMethods = db.prepare(`
      SELECT 
        payment_method, 
        COUNT(*) as count, 
        COALESCE(SUM(total), 0) as total_usd,
        COALESCE(SUM(total_bs), 0) as total_bs
      FROM online_orders
      WHERE status = 'DELIVERED'
      GROUP BY payment_method
    `).all();

    // Top medicines sold via Web/Delivery
    const topMedicines = db.prepare(`
      SELECT 
        oi.product_name,
        SUM(oi.quantity) as total_units_sold,
        SUM(oi.subtotal) as total_usd,
        COUNT(DISTINCT oi.order_id) as orders_count
      FROM online_order_items oi
      JOIN online_orders o ON oi.order_id = o.id
      WHERE o.status = 'DELIVERED'
      GROUP BY oi.product_id, oi.product_name
      ORDER BY total_units_sold DESC
      LIMIT 10
    `).all();

    res.json({
      orders,
      summary: totals,
      paymentMethods,
      topMedicines
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve production frontend assets if dist exists
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Pharmacy ERP & E-commerce server running on http://localhost:${PORT}`);
});
