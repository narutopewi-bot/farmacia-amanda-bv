import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultDbPath = path.join(__dirname, '..', 'farmacia.db');
const dbPath = process.env.DATABASE_PATH || defaultDbPath;

// Auto-seed persistent volume if custom path specified and file doesn't exist
if (process.env.DATABASE_PATH && !fs.existsSync(dbPath)) {
  try {
    const targetDir = path.dirname(dbPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    if (fs.existsSync(defaultDbPath)) {
      fs.copyFileSync(defaultDbPath, dbPath);
      console.log(`[DATABASE] Base de datos inicial sembrada con éxito en ${dbPath}`);
    }
  } catch (e) {
    console.error('[DATABASE] Error sembrando base de datos inicial:', e);
  }
}

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      generic_name TEXT,
      category TEXT NOT NULL,
      presentation TEXT,
      laboratory TEXT,
      prescription_required INTEGER DEFAULT 0,
      cost_price REAL DEFAULT 0.0,
      selling_price REAL NOT NULL,
      min_stock INTEGER DEFAULT 5,
      image_url TEXT,
      description TEXT,
      warehouse_location TEXT,
      has_iva INTEGER DEFAULT 0,
      iva_percent REAL DEFAULT 16.0,
      profit_margin REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      batch_number TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      initial_stock INTEGER NOT NULL DEFAULT 0,
      cost_price REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      location_desc TEXT,
      is_default INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tax_id TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      contact_person TEXT,
      balance_due REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      credit_limit REAL DEFAULT 0.0,
      current_debt REAL DEFAULT 0.0,
      credit_days INTEGER DEFAULT 30,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      id_number TEXT UNIQUE NOT NULL,
      phone TEXT,
      role TEXT NOT NULL, -- 'ADMIN', 'CAJERO', 'FARMACEUTICO', 'BODEGUERO'
      shift TEXT DEFAULT 'Mañana',
      active INTEGER DEFAULT 1,
      username TEXT UNIQUE NOT NULL,
      pin TEXT DEFAULT '1234',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cash_registers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER REFERENCES employees(id),
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      opening_balance REAL DEFAULT 0.0,
      closing_balance_system REAL DEFAULT 0.0,
      closing_balance_actual REAL DEFAULT 0.0,
      difference REAL DEFAULT 0.0,
      status TEXT DEFAULT 'OPEN', -- 'OPEN', 'CLOSED'
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS cash_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cash_register_id INTEGER NOT NULL REFERENCES cash_registers(id),
      type TEXT NOT NULL, -- 'INCOME', 'EXPENSE'
      amount REAL NOT NULL,
      reason TEXT NOT NULL,
      employee_id INTEGER REFERENCES employees(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL,
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
      employee_id INTEGER REFERENCES employees(id),
      purchase_date TEXT NOT NULL,
      total_amount REAL NOT NULL,
      payment_status TEXT DEFAULT 'PAID', -- 'PAID', 'PENDING'
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      batch_number TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost REAL NOT NULL,
      subtotal REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      employee_id INTEGER REFERENCES employees(id),
      cash_register_id INTEGER REFERENCES cash_registers(id),
      sale_type TEXT DEFAULT 'DIRECT', -- 'DIRECT', 'ONLINE_ORDER', 'DELIVERY'
      payment_method TEXT NOT NULL, -- 'CASH', 'CARD', 'TRANSFER', 'CREDIT', 'MIXED'
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0.0,
      tax REAL DEFAULT 0.0,
      total REAL NOT NULL,
      amount_paid REAL NOT NULL,
      change_given REAL DEFAULT 0.0,
      is_credit INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      batch_id INTEGER REFERENCES batches(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      unit_cost REAL NOT NULL,
      subtotal REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS credit_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      sale_id INTEGER REFERENCES sales(id),
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      notes TEXT,
      employee_id INTEGER REFERENCES employees(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS online_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      delivery_type TEXT NOT NULL, -- 'PICKUP', 'DELIVERY'
      delivery_address TEXT,
      payment_method TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'
      subtotal REAL NOT NULL,
      delivery_fee REAL DEFAULT 0.0,
      total REAL NOT NULL,
      notes TEXT,
      sale_id INTEGER REFERENCES sales(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS online_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES online_orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
      type TEXT NOT NULL, -- 'SALE', 'PURCHASE', 'ADJUSTMENT', 'TRANSFER', 'WASTE'
      quantity INTEGER NOT NULL, -- negative for out, positive for in
      reason TEXT,
      reference_id TEXT,
      employee_id INTEGER REFERENCES employees(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      pharmacy_name TEXT DEFAULT 'Expendio de Medicinas Amanda B&V C.A.',
      rif TEXT DEFAULT 'J-40192841-0',
      sanitary_license TEXT DEFAULT 'SICM: 50530',
      phone TEXT DEFAULT '0212-555-4321 / 0414-999-8877',
      address TEXT DEFAULT 'Av. Principal Los Rosales, Local 12, Caracas',
      welcome_message TEXT DEFAULT 'Salud y bienestar a tu alcance con los mejores precios',
      exchange_rate REAL DEFAULT 85.0,
      delivery_cost REAL DEFAULT 1.00,
      min_free_delivery REAL DEFAULT 30.00,
      bank_name TEXT DEFAULT 'Banco de Venezuela',
      bank_account_number TEXT DEFAULT '0102-0192-83-0001928374',
      bank_phone TEXT DEFAULT '0414-555-1234',
      bank_id_number TEXT DEFAULT 'J-40192841-0',
      bank_holder TEXT DEFAULT 'Amanda B&V C.A.',
      zelle_email TEXT DEFAULT 'pagos@amandabv.com',
      zelle_holder TEXT DEFAULT 'Amanda B&V C.A.'
    );

    CREATE TABLE IF NOT EXISTS sale_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      payment_method TEXT NOT NULL,
      currency TEXT NOT NULL, -- 'USD' or 'BS'
      amount REAL NOT NULL,
      amount_usd REAL NOT NULL,
      amount_bs REAL NOT NULL,
      reference TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safe migrations for multimoneda columns
  try { db.exec("ALTER TABLE online_orders ADD COLUMN payment_currency TEXT DEFAULT 'BS'"); } catch(e){}
  try { db.exec("ALTER TABLE online_orders ADD COLUMN payment_reference TEXT"); } catch(e){}
  try { db.exec("ALTER TABLE online_orders ADD COLUMN proof_image TEXT"); } catch(e){}
  try { db.exec("ALTER TABLE online_orders ADD COLUMN exchange_rate REAL DEFAULT 85.0"); } catch(e){}
  try { db.exec("ALTER TABLE online_orders ADD COLUMN total_bs REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE online_orders ADD COLUMN processed_by_employee_id INTEGER"); } catch(e){}
  try { db.exec("ALTER TABLE online_orders ADD COLUMN processed_by_name TEXT"); } catch(e){}
  try { db.exec("ALTER TABLE online_orders ADD COLUMN cash_register_id INTEGER"); } catch(e){}
  try { db.exec("ALTER TABLE online_orders ADD COLUMN invoice_number TEXT"); } catch(e){}

  try { db.exec("ALTER TABLE sales ADD COLUMN exchange_rate REAL DEFAULT 85.0"); } catch(e){}
  try { db.exec("ALTER TABLE sales ADD COLUMN total_bs REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE sales ADD COLUMN change_currency TEXT DEFAULT 'USD'"); } catch(e){}
  try { db.exec("ALTER TABLE sales ADD COLUMN change_amount REAL DEFAULT 0.0"); } catch(e){}

  // Settings extra columns
  try { db.exec("ALTER TABLE settings ADD COLUMN pharmacy_name TEXT DEFAULT 'Expendio de Medicinas Amanda B&V C.A.'"); } catch(e){}
  try { db.exec("ALTER TABLE settings ADD COLUMN rif TEXT DEFAULT 'J-40192841-0'"); } catch(e){}
  try { db.exec("ALTER TABLE settings ADD COLUMN sanitary_license TEXT DEFAULT 'SICM: 50530'"); } catch(e){}
  try { db.exec("ALTER TABLE settings ADD COLUMN phone TEXT DEFAULT '0212-555-4321 / 0414-999-8877'"); } catch(e){}
  try { db.exec("ALTER TABLE settings ADD COLUMN address TEXT DEFAULT 'Av. Principal Los Rosales, Local 12, Caracas'"); } catch(e){}
  try { db.exec("ALTER TABLE settings ADD COLUMN welcome_message TEXT DEFAULT 'Salud y bienestar a tu alcance con los mejores precios'"); } catch(e){}
  try { db.exec("ALTER TABLE settings ADD COLUMN delivery_cost REAL DEFAULT 1.00"); } catch(e){}
  try { db.exec("ALTER TABLE settings ADD COLUMN min_free_delivery REAL DEFAULT 30.00"); } catch(e){}
  try { db.exec("ALTER TABLE settings ADD COLUMN bcv_last_updated TEXT"); } catch(e){}
  try { db.exec("ALTER TABLE settings ADD COLUMN bcv_source TEXT"); } catch(e){}
  try { db.exec("ALTER TABLE settings ADD COLUMN bcv_auto_sync INTEGER DEFAULT 1"); } catch(e){}

  // Products IVA and profit margin columns migration
  try { db.exec("ALTER TABLE products ADD COLUMN has_iva INTEGER DEFAULT 0"); } catch(e){}
  try { db.exec("ALTER TABLE products ADD COLUMN iva_percent REAL DEFAULT 16.0"); } catch(e){}
  try { db.exec("ALTER TABLE products ADD COLUMN profit_margin REAL DEFAULT 0.0"); } catch(e){}

  // Prolago Cajas y Turnos migrations
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN numero INTEGER"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN nombre_caja TEXT DEFAULT 'Caja 1'"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN monto_apertura_usd REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN monto_apertura_bs REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN tasa_bcv_apertura REAL DEFAULT 1.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN tasa_bcv_cierre REAL DEFAULT 1.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN ventas_efectivo REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN ventas_zelle REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN ventas_pagomovil REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN ventas_punto REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN ventas_credito REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN total_ventas REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN ventas_pagomovil_bs REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN ventas_punto_bs REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN total_ventas_bs REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN abonos_efectivo REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN abonos_zelle REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN abonos_pagomovil REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN abonos_punto REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN total_abonos REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN total_esperado_efectivo REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN total_esperado_general REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN declarado_efectivo REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN declarado_zelle REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN declarado_pagomovil REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN declarado_punto REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN total_declarado REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN diferencia_efectivo REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN diferencia_general REAL DEFAULT 0.0"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN observaciones_apertura TEXT DEFAULT ''"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN observaciones_cierre TEXT DEFAULT ''"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN usuario_apertura_nombre TEXT DEFAULT 'Administrador'"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN usuario_cierre_id INTEGER"); } catch(e){}
  try { db.exec("ALTER TABLE cash_registers ADD COLUMN usuario_cierre_nombre TEXT DEFAULT ''"); } catch(e){}
  try { db.exec("ALTER TABLE credit_payments ADD COLUMN cash_register_id INTEGER"); } catch(e){}
  try { db.exec("ALTER TABLE credit_payments ADD COLUMN amount_bs REAL DEFAULT 0.0"); } catch(e){}

  // Employees permissions column migration
  try { db.exec("ALTER TABLE employees ADD COLUMN permissions TEXT DEFAULT '[]'"); } catch(e){}

  // Ensure default settings exist
  const settingCount = db.prepare('SELECT count(*) as count FROM settings').get().count;
  if (settingCount === 0) {
    db.prepare(`
      INSERT INTO settings (id, exchange_rate, delivery_cost, bank_name, bank_account_number, bank_phone, bank_id_number, bank_holder, zelle_email, zelle_holder, pharmacy_name, sanitary_license)
      VALUES (1, 85.0, 1.00, 'Banco de Venezuela', '0102-0192-83-0001928374', '0414-555-1234', 'J-40192841-0', 'Amanda B&V C.A.', 'pagos@amandabv.com', 'Amanda B&V C.A.', 'Expendio de Medicinas Amanda B&V C.A.', 'SICM: 50530')
    `).run();
  } else {
    // Ensure delivery cost is $1.00 and branding reflects Amanda B&V C.A.
    try {
      db.prepare('UPDATE settings SET delivery_cost = 1.00 WHERE delivery_cost > 1.00 OR delivery_cost IS NULL').run();
    } catch(e){}
    try {
      db.prepare(`
        UPDATE settings 
        SET pharmacy_name = 'Expendio de Medicinas Amanda B&V C.A.',
            sanitary_license = 'SICM: 50530',
            bank_holder = 'Amanda B&V C.A.'
        WHERE pharmacy_name LIKE '%FarmaSalud%' OR pharmacy_name LIKE '%Farma-Salud%' OR sanitary_license LIKE '%MSAS%';
      `).run();
    } catch(e){}
  }

  seedInitialData();

  // Comprobación y limpieza automática de datos de prueba existentes
  try {
    const hasMock = db.prepare("SELECT count(*) as count FROM products WHERE code IN ('7591001001', '01010')").get()?.count > 0;
    const hasOldSales = db.prepare("SELECT count(*) as count FROM sales").get()?.count > 0;
    const hasOldOrders = db.prepare("SELECT count(*) as count FROM online_orders WHERE order_number = 'ORD-1001'").get()?.count > 0;
    if (hasMock || hasOldSales || hasOldOrders) {
      clearTestData();
    }
  } catch (e) {
    console.error('[DATABASE] Error comprobando datos de prueba:', e);
  }
}

export function clearTestData() {
  db.pragma('foreign_keys = OFF');
  try {
    const tablesToClear = [
      'sale_payments',
      'sale_items',
      'sales',
      'credit_payments',
      'online_order_items',
      'online_orders',
      'stock_movements',
      'purchase_items',
      'purchases',
      'batches',
      'products',
      'cash_movements',
      'cash_registers'
    ];

    for (const table of tablesToClear) {
      try { db.prepare(`DELETE FROM ${table}`).run(); } catch(e){}
    }
    // Mantener únicamente Consumidor Final sin deuda
    try { db.prepare(`DELETE FROM customers WHERE id_number != 'V-12345678'`).run(); } catch(e){}
    try { db.prepare(`UPDATE customers SET current_debt = 0, credit_limit = 0 WHERE id_number = 'V-12345678'`).run(); } catch(e){}
    // Resetear balance de proveedores a cero
    try { db.prepare(`UPDATE suppliers SET balance_due = 0`).run(); } catch(e){}
    // Reiniciar contadores autoincrementales
    try {
      db.prepare(`DELETE FROM sqlite_sequence WHERE name IN (${tablesToClear.map(t => `'${t}'`).join(',')})`).run();
    } catch (e) {}
  } finally {
    db.pragma('foreign_keys = ON');
  }
  console.log('[DATABASE] Base de datos reseteada a cero: artículos, ventas, pedidos y abonos eliminados.');
}


function seedInitialData() {
  // 1. Depósitos / Almacenes
  const warehouseCount = db.prepare('SELECT count(*) as total FROM warehouses').get().total;
  if (warehouseCount === 0) {
    const insertWarehouse = db.prepare(`
      INSERT INTO warehouses (code, name, location_desc, is_default)
      VALUES (?, ?, ?, ?)
    `);
    insertWarehouse.run('ALM-01', 'Farmacia Principal / Mostrador', 'Estanterías A, B y C - Mostrador de atención', 1);
    insertWarehouse.run('ALM-02', 'Depósito Central / Bodega', 'Almacén trasero climatizado', 0);
    insertWarehouse.run('ALM-03', 'Nevera / Cadena de Frío (2°C - 8°C)', 'Refrigerador médico especializado', 0);
  }

  // 2. Empleados para inicio de sesión
  const empCount = db.prepare('SELECT count(*) as total FROM employees').get().total;
  if (empCount === 0) {
    const insertEmp = db.prepare(`
      INSERT INTO employees (name, id_number, phone, role, shift, username, pin)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertEmp.run('Carlos Mendoza', 'V-18492019', '0414-555-1234', 'ADMIN', 'Completo', 'admin', '1234');
    insertEmp.run('Dra. María Elena Rivas', 'V-15893201', '0412-444-5678', 'FARMACEUTICO', 'Mañana', 'mrivas', '2244');
    insertEmp.run('Alejandro Gómez', 'V-24890123', '0416-333-9012', 'CAJERO', 'Tarde', 'agomez', '1122');
    insertEmp.run('Pedro Salazar', 'V-21345678', '0424-777-8899', 'BODEGUERO', 'Mañana', 'psalazar', '3344');
  }

  // 3. Proveedores iniciales
  const supCount = db.prepare('SELECT count(*) as total FROM suppliers').get().total;
  if (supCount === 0) {
    const insertSupplier = db.prepare(`
      INSERT INTO suppliers (name, tax_id, phone, email, address, contact_person, balance_due)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertSupplier.run('Droguería Nena C.A.', 'J-00049281-2', '0212-555-0101', 'ventas@droguerianena.com', 'Zona Industrial Los Ruices, Edif. Nena', 'Lic. Roberto Silva', 0.0);
    insertSupplier.run('Distribuidora Cobeca', 'J-07019284-9', '0261-700-1122', 'contacto@cobeca.com', 'Av. 5 de Julio, Maracaibo', 'Ing. Patricia Urdaneta', 0.0);
    insertSupplier.run('Laboratorios Genfar S.A.', 'J-30491823-0', '0212-888-3400', 'pedidos@genfar.com', 'Av. Francisco de Miranda, Caracas', 'Marcos Velásquez', 0.0);
    insertSupplier.run('Laboratorios Calox International', 'J-00084921-5', '0212-999-7700', 'atencion@calox.com', 'Calle Los Laboratorios, Los Cortijos', 'Dra. Carmen Soto', 0.0);
  }

  // 4. Clientes: Consumidor Final genérico
  const custCount = db.prepare("SELECT count(*) as total FROM customers WHERE id_number = 'V-12345678'").get().total;
  if (custCount === 0) {
    const insertCustomer = db.prepare(`
      INSERT INTO customers (id_number, name, phone, email, address, credit_limit, current_debt, credit_days, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertCustomer.run('V-12345678', 'Consumidor Final', '0000-0000000', 'ventas@farmacia.com', 'Mostrador', 0, 0, 0, 'Cliente genérico mostrador');
  }

  // 5. Categorías iniciales de productos y medicamentos
  const catCount = db.prepare('SELECT count(*) as total FROM categories').get().total;
  if (catCount === 0) {
    const insertCat = db.prepare(`
      INSERT INTO categories (name, description)
      VALUES (?, ?)
    `);
    const initialCategories = [
      ['Analgésicos y Antiinflamatorios', 'Alivio del dolor corporal, muscular, articular y cefaleas.'],
      ['Antibióticos', 'Medicamentos antimicrobianos para combatir infecciones bacterianas.'],
      ['Cardiovascular y Presión Arterial', 'Antihipertensivos, reguladores de ritmo cardíaco y circulación.'],
      ['Diabetes y Endocrinología', 'Hipoglucemiantes orales, insulina y control metabólico.'],
      ['Antialérgicos y Antihistamínicos', 'Tratamiento de rinitis, alergias respiratorias y cutáneas.'],
      ['Gastrointestinal', 'Antiácidos, protectores gástricos, antidiarreicos y digestivos.'],
      ['Pediatría y Nutrición', 'Sueros orales, fórmulas lácteas y suplementos infantiles.'],
      ['Vitaminas y Suplementos', 'Multivitamínicos, minerales y refuerzo inmunológico.'],
      ['Material Médico y Desinfección', 'Inyectadoras, gasas, vendas, alcohol y bioseguridad.'],
      ['Cuidado Personal y Dermatología', 'Higiene, dermocosmética y cuidado de la piel.']
    ];
    for (const [name, desc] of initialCategories) {
      try { insertCat.run(name, desc); } catch (e) {}
    }
  }
}

