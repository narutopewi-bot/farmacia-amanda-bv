import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'farmacia.db');

const CLOUD_URL = process.env.CLOUD_URL || 'https://expendiodemedicinaamandabv.com';

export async function runLocalSync(options = { initial: false, push: true, pull: true }) {
  console.log(`[SYNC LOCAL] Conectando con servidor en la nube (${CLOUD_URL})...`);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Asegurar columna sync_status
  try { db.exec("ALTER TABLE sales ADD COLUMN sync_status TEXT DEFAULT 'PENDING'"); } catch (e) {}

  let results = {
    connected: false,
    pulled_products: 0,
    pulled_batches: 0,
    pushed_sales: 0,
    error: null
  };

  try {
    // 1. Probar conectividad rápida
    const pingRes = await fetch(`${CLOUD_URL}/api/settings`, { signal: AbortSignal.timeout(6000) });
    if (!pingRes.ok) throw new Error(`Servidor nube no respondió correctamente (Status: ${pingRes.status})`);
    results.connected = true;

    // 2. PUSH: Subir ventas locales pendientes a la nube
    if (options.push) {
      const pendingSales = db.prepare("SELECT * FROM sales WHERE sync_status = 'PENDING'").all();
      if (pendingSales.length > 0) {
        console.log(`[SYNC LOCAL] Se encontraron ${pendingSales.length} ventas offline pendientes por subir...`);
        const getItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?');
        const salesPayload = pendingSales.map(s => ({
          ...s,
          items: getItems.all(s.id)
        }));

        const pushRes = await fetch(`${CLOUD_URL}/api/sync/push-sales`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sales: salesPayload }),
          signal: AbortSignal.timeout(15000)
        });

        if (pushRes.ok) {
          const pushData = await pushRes.json();
          const markSynced = db.prepare("UPDATE sales SET sync_status = 'SYNCED' WHERE id = ?");
          db.transaction(() => {
            for (const s of pendingSales) {
              markSynced.run(s.id);
            }
          })();
          results.pushed_sales = pushData.imported_count || pendingSales.length;
          console.log(`[SYNC LOCAL] ✓ ${results.pushed_sales} ventas offline sincronizadas con éxito a Railway.`);
        }
      } else {
        console.log('[SYNC LOCAL] No hay ventas offline pendientes por subir.');
      }
    }

    // 3. PULL: Descargar medicamentos, lotes y configuración de la nube
    if (options.pull) {
      console.log('[SYNC LOCAL] Descargando catálogo y existencias actualizadas desde Railway...');
      const pullRes = await fetch(`${CLOUD_URL}/api/sync/export-full`, { signal: AbortSignal.timeout(15000) });
      if (pullRes.ok) {
        const cloudData = await pullRes.json();

        const updateTx = db.transaction(() => {
          // Categorías
          if (Array.isArray(cloudData.categories)) {
            const upsertCat = db.prepare(`
              INSERT INTO categories (id, name, description)
              VALUES (@id, @name, @description)
              ON CONFLICT(name) DO UPDATE SET description = excluded.description
            `);
            for (const c of cloudData.categories) {
              try { upsertCat.run(c); } catch (e) {}
            }
          }

          // Empleados
          if (Array.isArray(cloudData.employees)) {
            const upsertEmp = db.prepare(`
              INSERT INTO employees (id, name, id_number, phone, role, shift, active, username, pin, permissions)
              VALUES (@id, @name, @id_number, @phone, @role, @shift, @active, @username, @pin, @permissions)
              ON CONFLICT(username) DO UPDATE SET
                name = excluded.name, role = excluded.role, pin = excluded.pin, permissions = excluded.permissions
            `);
            for (const emp of cloudData.employees) {
              try { upsertEmp.run({ ...emp, permissions: emp.permissions || '[]' }); } catch (e) {}
            }
          }

          // Ajustes y Tasa BCV
          if (cloudData.settings && cloudData.settings.exchange_rate) {
            db.prepare(`
              UPDATE settings SET
                pharmacy_name = ?, exchange_rate = ?, bcv_last_updated = ?, bcv_source = ?
              WHERE id = 1
            `).run(
              cloudData.settings.pharmacy_name || 'Expendio de Medicinas Amanda B&V C.A.',
              Number(cloudData.settings.exchange_rate) || 85.0,
              cloudData.settings.bcv_last_updated || new Date().toISOString(),
              cloudData.settings.bcv_source || 'Oficial BCV'
            );
          }

          // Productos
          if (Array.isArray(cloudData.products)) {
            const upsertProd = db.prepare(`
              INSERT INTO products (
                id, code, name, generic_name, category, presentation, laboratory,
                prescription_required, cost_price, selling_price, min_stock,
                image_url, description, warehouse_location, has_iva, iva_percent, profit_margin
              ) VALUES (
                @id, @code, @name, @generic_name, @category, @presentation, @laboratory,
                @prescription_required, @cost_price, @selling_price, @min_stock,
                @image_url, @description, @warehouse_location, @has_iva, @iva_percent, @profit_margin
              )
              ON CONFLICT(id) DO UPDATE SET
                code = excluded.code, name = excluded.name, generic_name = excluded.generic_name,
                category = excluded.category, presentation = excluded.presentation, laboratory = excluded.laboratory,
                cost_price = excluded.cost_price, selling_price = excluded.selling_price, min_stock = excluded.min_stock,
                image_url = excluded.image_url, has_iva = excluded.has_iva, iva_percent = excluded.iva_percent,
                profit_margin = excluded.profit_margin, warehouse_location = excluded.warehouse_location
            `);

            for (const p of cloudData.products) {
              try { upsertProd.run(p); results.pulled_products++; } catch (e) {}
            }
          }

          // Lotes
          if (Array.isArray(cloudData.batches)) {
            const upsertBatch = db.prepare(`
              INSERT INTO batches (id, product_id, batch_number, expiry_date, stock, initial_stock, cost_price)
              VALUES (@id, @product_id, @batch_number, @expiry_date, @stock, @initial_stock, @cost_price)
              ON CONFLICT(id) DO UPDATE SET
                stock = excluded.stock, expiry_date = excluded.expiry_date, cost_price = excluded.cost_price
            `);
            for (const b of cloudData.batches) {
              try { upsertBatch.run(b); results.pulled_batches++; } catch (e) {}
            }
          }
        });

        updateTx();
        console.log(`[SYNC LOCAL] ✓ ${results.pulled_products} medicamentos y ${results.pulled_batches} lotes actualizados en la base de datos local.`);
      }
    }

  } catch (err) {
    results.error = err.message;
    console.warn(`[SYNC LOCAL] Aviso: No se pudo contactar con la nube (${err.message}). La Caja Principal continuará operando en Modo Offline Local.`);
  } finally {
    db.close();
  }

  return results;
}

// Ejecución directa por línea de comandos
if (process.argv[1] && process.argv[1].endsWith('sync-local.js')) {
  const isInitial = process.argv.includes('--initial');
  runLocalSync({ initial: isInitial, push: true, pull: true })
    .then(res => {
      if (res.connected) {
        console.log('[SYNC LOCAL] Sincronización completada exitosamente.');
      } else {
        console.log('[SYNC LOCAL] Listo para vender en Modo Offline.');
      }
      process.exit(0);
    })
    .catch(e => {
      console.error('[SYNC LOCAL] Error:', e);
      process.exit(0);
    });
}
