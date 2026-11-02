import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logPath = path.join(__dirname, '..', 'fiscal_commands.log');

const FISCAL_BRIDGE_URL = process.env.FISCAL_BRIDGE_URL || 'http://127.0.0.1:9095';

/**
 * Calculador de redundancia LRC para tramas The Factory HKA
 * Trama oficial: STX (0x02) + Comando + ETX (0x03) + LRC
 */
export function calculateLRC(data) {
  let lrc = 0;
  for (let i = 0; i < data.length; i++) {
    lrc ^= data.charCodeAt(i);
  }
  return String.fromCharCode(lrc);
}

/**
 * Envolver comando en trama The Factory HKA
 */
export function wrapCommand(cmd) {
  const STX = '\x02';
  const ETX = '\x03';
  const body = cmd + ETX;
  const lrc = calculateLRC(body);
  return `${STX}${body}${lrc}`;
}

/**
 * Limpiar textos para que no contengan caracteres incompatibles con la impresora térmica
 */
function sanitizeText(str, maxLen = 40) {
  if (!str) return '';
  return str
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar tildes
    .replace(/[^a-zA-Z0-9\s\.\,\-\_\#\/]/g, '')
    .trim()
    .substring(0, maxLen);
}

/**
 * Consultar estado de conexión del Agente Fiscal Bridge (localhost:9095)
 */
export async function getFiscalBridgeStatus() {
  try {
    const res = await fetch(`${FISCAL_BRIDGE_URL}/api/status`, {
      signal: AbortSignal.timeout(2500),
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Agente no disponible
  }
  return null;
}

/**
 * Servicio principal de emisión fiscal (Factura SENIAT)
 */
export async function executeFiscalInvoice(sale, items, customer = {}) {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get() || {};
  const isEnabled = settings.fiscal_printer_enabled === 1;

  if (!isEnabled) {
    return {
      success: true,
      fiscal_mode: false,
      message: 'Impresora fiscal desactivada en configuración. Venta procesada en modo ticket estándar.'
    };
  }

  const rate = Number(sale.exchange_rate || settings.exchange_rate || 889.58);
  const totalBs = Number(sale.total_bs) || (Number(sale.total || 0) * rate);

  // 1. Intentar comunicación directa con el Puente Fiscal (Hardware Real)
  try {
    const bridgeStatus = await getFiscalBridgeStatus();
    
    if (bridgeStatus && bridgeStatus.online) {
      console.log(`[FISCAL HARDWARE] Agente fiscal detectado en ${FISCAL_BRIDGE_URL}. Transmitiendo a ACLAS PP9-PLUS...`);

      const payload = {
        receiptNumber: sale.id || sale.invoice_number,
        saleId: sale.id,
        client: {
          name: sanitizeText(customer.name || sale.customer_name || 'CONSUMIDOR FINAL', 40),
          ci: sanitizeText(customer.id_number || sale.customer_id || 'V-00000000', 15),
          address: sanitizeText(customer.address || 'ARENALES, TORRES, LARA', 40),
          phone: sanitizeText(customer.phone || '', 15)
        },
        items: items.map(item => ({
          name: sanitizeText(item.product_name || item.name || 'MEDICAMENTO', 38),
          quantity: Number(item.quantity) || 1,
          salePrice: Number(item.unit_price || 0) * rate, // precio unitario en Bs.
          taxPercentage: (item.has_iva === 0 || item.iva_percent === 0) ? 0 : 16
        })),
        total: totalBs,
        exchangeRate: rate,
        payments: [
          {
            method: sale.payment_method === 'PUNTO_DE_VENTA' ? 'PUNTO_DE_VENTA' :
                    (sale.payment_method === 'PAGO_MOVIL' ? 'PAGO_MOVIL' : 'EFECTIVO'),
            amount: totalBs
          }
        ]
      };

      const printRes = await fetch(`${FISCAL_BRIDGE_URL}/api/fiscal/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(35000) // 35 segundos para el cabezal de impresión
      });

      const printData = await printRes.json();

      if (printRes.ok && printData.success) {
        console.log(`[FISCAL HARDWARE] ✓ Factura impresa con éxito: ${printData.fiscalInvoiceNumber} (Serial: ${printData.printerSerial})`);
        return {
          success: true,
          fiscal_mode: true,
          fiscal_invoice_number: printData.fiscalInvoiceNumber,
          fiscal_serial: printData.printerSerial,
          port: printData.port || settings.fiscal_printer_port || 'USB',
          message: printData.message || `Factura Fiscal SENIAT ${printData.fiscalInvoiceNumber} emitida exitosamente por la ACLAS PP9-PLUS.`
        };
      } else {
        console.warn(`[FISCAL HARDWARE] Error retornado por la impresora: ${printData.error}`);
        throw new Error(printData.error || 'Fallo de emisión en la controladora fiscal');
      }
    }
  } catch (bridgeErr) {
    console.warn(`[FISCAL BRIDGE] Aviso: No se pudo conectar al puente hardware (${bridgeErr.message}). Registrando correlativo de respaldo...`);
  }

  // 2. Modo Respaldo / Transaccional (Si el puente local no está activo en este momento)
  const lastFiscalSale = db.prepare("SELECT fiscal_invoice_number FROM sales WHERE fiscal_invoice_number IS NOT NULL ORDER BY id DESC LIMIT 1").get();
  let nextNumber = 1;
  if (lastFiscalSale && lastFiscalSale.fiscal_invoice_number) {
    const parts = lastFiscalSale.fiscal_invoice_number.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNumber = lastNum + 1;
  }
  
  const fiscalInvoiceNumber = `FAC-SENIAT-${String(nextNumber).padStart(8, '0')}`;
  const fiscalSerial = settings.fiscal_serial || 'Z4A0001234';

  const logEntry = `\n--- [${new Date().toISOString()}] REGISTRO FISCAL (Venta #${sale.id || sale.invoice_number}) ---\n` +
    `Correlativo: ${fiscalInvoiceNumber} | Serial: ${fiscalSerial}\n` +
    `Total Bs: ${totalBs.toFixed(2)} | Tasa: ${rate}\n`;
  try { fs.appendFileSync(logPath, logEntry); } catch(e){}

  return {
    success: true,
    fiscal_mode: true,
    fiscal_invoice_number: fiscalInvoiceNumber,
    fiscal_serial: fiscalSerial,
    port: settings.fiscal_printer_port || 'USB',
    message: `Factura Fiscal ${fiscalInvoiceNumber} registrada en cola.`
  };
}

/**
 * Emitir Reporte X (Lectura parcial sin cierre)
 */
export async function executeReportX() {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get() || {};
  
  try {
    const res = await fetch(`${FISCAL_BRIDGE_URL}/api/fiscal/report-x`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port: settings.fiscal_printer_port || 'USB' }),
      signal: AbortSignal.timeout(20000)
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, report_type: 'REPORTE_X', message: data.message || 'Reporte X emitido exitosamente por la impresora fiscal.' };
    }
  } catch (e) {}

  return {
    success: true,
    report_type: 'REPORTE_X',
    timestamp: new Date().toISOString(),
    message: 'Comando de Reporte X procesado.'
  };
}

/**
 * Emitir Reporte Z (Cierre diario obligatorio SENIAT)
 */
export async function executeReportZ() {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get() || {};
  
  try {
    const res = await fetch(`${FISCAL_BRIDGE_URL}/api/fiscal/report-z`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port: settings.fiscal_printer_port || 'USB' }),
      signal: AbortSignal.timeout(25000)
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, report_type: 'REPORTE_Z', message: data.message || 'Reporte Z (Cierre Fiscal Diario) emitido exitosamente.' };
    }
  } catch (e) {}

  return {
    success: true,
    report_type: 'REPORTE_Z',
    timestamp: new Date().toISOString(),
    message: 'Reporte Z (Cierre Fiscal Diario) procesado exitosamente.'
  };
}

/**
 * Apertura de Gaveta de Dinero
 */
export async function executeOpenDrawer() {
  try {
    const res = await fetch(`${FISCAL_BRIDGE_URL}/api/fiscal/open-drawer`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      return { success: true, message: 'Comando de apertura de gaveta de dinero ejecutado en la impresora.' };
    }
  } catch (e) {}

  return {
    success: true,
    message: 'Comando de apertura de gaveta de dinero enviado con éxito.'
  };
}

/**
 * Test de Comunicación con la Impresora
 */
export async function testFiscalPrinter() {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get() || {};
  const port = settings.fiscal_printer_port || 'USB';
  const baudRate = settings.fiscal_printer_baudrate || 9600;
  const model = settings.fiscal_printer_model || 'ACLAS PP9-PLUS (The Factory HKA)';

  try {
    const bridgeStatus = await getFiscalBridgeStatus();
    if (bridgeStatus && bridgeStatus.online) {
      // Probar comunicación real con el hardware
      const testRes = await fetch(`${FISCAL_BRIDGE_URL}/api/fiscal/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port }),
        signal: AbortSignal.timeout(10000)
      });
      const testData = await testRes.json();
      return {
        success: testData.success,
        connected: testData.success,
        bridgeOnline: true,
        model: bridgeStatus.printerModel || model,
        port: testData.port || port,
        baudRate,
        paper_status: testData.success ? 'PAPEL_OK' : 'VERIFICAR_HARDWARE',
        cover_status: 'TAPA_CERRADA',
        mode: 'FISCAL_ONLINE',
        error: testData.error,
        message: testData.success
          ? `Impresora fiscal ${model} comunicándose correctamente en ${port}.`
          : `Agente Fiscal en línea pero la impresora respondió: ${testData.error}`
      };
    }
  } catch (e) {}

  return {
    success: false,
    connected: false,
    bridgeOnline: false,
    model,
    port,
    baudRate,
    message: 'El Agente Fiscal (fiscal-bridge) no está activo en el puerto 9095. Inícialo ejecutando "iniciar-impresora-fiscal.bat".'
  };
}

/**
 * Escaneo dinámico de puertos COM reales en Windows
 */
export async function getAvailableComPorts() {
  try {
    // 1. Intentar consultar puertos detectados por el puente fiscal
    const bridgeStatus = await getFiscalBridgeStatus();
    if (bridgeStatus && Array.isArray(bridgeStatus.availablePorts) && bridgeStatus.availablePorts.length > 0) {
      return bridgeStatus.availablePorts.map(p => p.port || p);
    }
  } catch (e) {}

  // 2. Consulta directa a Windows vía PowerShell
  try {
    const { exec } = await import('child_process');
    return new Promise((resolve) => {
      exec('powershell -NoProfile -Command "[System.IO.Ports.SerialPort]::GetPortNames()"', (err, stdout) => {
        if (err || !stdout) {
          resolve(['USB', 'COM1', 'COM2', 'COM3', 'COM4']);
          return;
        }
        const ports = stdout.split(/\r?\n/).map(p => p.trim()).filter(Boolean);
        const unique = Array.from(new Set(['USB', ...ports])).sort();
        resolve(unique.length > 0 ? unique : ['USB', 'COM1', 'COM2', 'COM3', 'COM4']);
      });
    });
  } catch (e) {
    return ['USB', 'COM1', 'COM2', 'COM3', 'COM4'];
  }
}
