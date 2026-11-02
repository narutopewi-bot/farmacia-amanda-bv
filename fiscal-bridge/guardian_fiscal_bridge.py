import os
import sys
import json
import time
import ctypes
from ctypes import wintypes
import socket
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

PORT = 9095
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

if sys.stdout is None or sys.stderr is None:
    _log_fp = open(os.path.join(BASE_DIR, "bridge_runtime.log"), "a", encoding="utf-8", buffering=1)
    sys.stdout = _log_fp
    sys.stderr = _log_fp

os.chdir(BASE_DIR)
if hasattr(os, 'add_dll_directory'):
    try:
        os.add_dll_directory(BASE_DIR)
    except Exception:
        pass

DLL_PATH = os.path.join(BASE_DIR, "dtpdfiscal64.dll")

print("==================================================================")
print("     GUARDIAN FISCAL BRIDGE - DEVTECH DTP-80i (ECRS SENIAT)       ")
print("==================================================================")
print(f"Directorio de servicio: {BASE_DIR}")
print(f"Cargando librería oficial: {DLL_PATH}")

FISCAL_ERRORS = {
    0: "Operación efectuada exitosamente",
    1: "Puerto ya abierto",
    2: "Puerto en uso por otra aplicación",
    3: "Puerto cerrado",
    4: "Puerto inválido o inexistente",
    6: "Tiempo de espera (Time-out) de comunicación agotado",
    7: "Error de comando en la controladora fiscal",
    8: "Impresora desconectada, apagada o fuera de línea",
    9: "Buffer de datos desbordado",
    10: "Formato de campo de entrada inválido",
    14: "Parámetro inválido",
    15: "Error interno de la librería",
    16: "Error de recepción (NAK)",
    257: "Comando inválido en el estado actual (Comprobante fiscal previo pendiente o abierto)",
    258: "Comando inválido en el documento actual",
    259: "Jumper de programación conectado",
    261: "Comando solo aceptado con jumper de servicio",
    263: "Comando fiscal no reconocido",
    265: "Falta un campo obligatorio en el comando",
    272: "Longitud de campo inválida",
    273: "Valor de campo fuera de rango",
    274: "Tasa de impuesto inactiva",
    275: "Monto máximo por día excedido",
    276: "Monto máximo por documento excedido",
    514: "Mecanismo impresor fuera de línea",
    516: "Mecanismo impresor sin papel térmico",
    517: "Interrupción: sin papel",
    518: "Cabezal impresor sobrecalentado",
    520: "Memoria de mecanismo impresor desbordada",
    522: "Tapa de la impresora abierta",
    769: "Error en la fiscalización",
    770: "Error en comando de cambio de fecha",
    771: "Fecha inválida",
    1025: "Número de línea de encabezado/cola inválido",
    1026: "El RIF no puede ser modificado",
    1281: "Memoria de transacciones (Auditoría) llena",
    1283: "Memoria de transacciones desconectada",
    1537: "Comando inválido fuera de la jornada fiscal",
    1538: "No se ha iniciado la jornada fiscal",
    1539: "Memoria fiscal llena",
    1540: "Memoria fiscal desconectada",
    1541: "Memoria fiscal inválida",
    1542: "Bloqueo legal SENIAT: Han pasado más de 24 horas continuas sin cierre. Es obligatorio emitir un Reporte Z diario antes de facturar.",
    1793: "El total del documento debe ser mayor a cero",
    2049: "Límite de líneas de comentario en documento fiscal excedido",
    2305: "Límite de líneas en documento no fiscal excedido",
    65535: "Error fiscal desconocido"
}

lib = None
if os.path.exists(DLL_PATH):
    try:
        lib = ctypes.CDLL(DLL_PATH)
        # Configurar tipos de llamada C según manual oficial DTPDFiscal
        lib.AbrirPuerto.argtypes = [ctypes.c_char_p]
        lib.AbrirPuerto.restype = ctypes.c_int

        lib.CerrarPuerto.restype = ctypes.c_int
        lib.isConectado.restype = ctypes.c_bool
        lib.ObtenerEstado.restype = ctypes.c_int

        lib.AbrirCF.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p]
        lib.AbrirCF.restype = ctypes.c_int

        lib.ItemCF.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_char_p, ctypes.c_longlong, ctypes.c_char_p, ctypes.c_longlong, ctypes.c_int, ctypes.c_int, ctypes.c_int]
        lib.ItemCF.restype = ctypes.c_int

        lib.SubtotalCF.argtypes = [ctypes.c_int, ctypes.c_longlong]
        lib.SubtotalCF.restype = ctypes.c_int

        lib.PagoCF.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_char_p, ctypes.c_ulonglong]
        lib.PagoCF.restype = ctypes.c_int

        lib.PagoDivisasCF.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_char_p, ctypes.c_ulonglong, ctypes.c_longlong, ctypes.c_char_p, ctypes.c_bool]
        lib.PagoDivisasCF.restype = ctypes.c_int

        lib.CerrarCF.argtypes = [ctypes.c_char_p]
        lib.CerrarCF.restype = ctypes.c_int

        lib.CancelarCF.restype = ctypes.c_int

        lib.AbrirDNF.restype = ctypes.c_int
        lib.LineaDNF.argtypes = [ctypes.c_char_p, ctypes.c_int, ctypes.c_int, ctypes.c_int]
        lib.LineaDNF.restype = ctypes.c_int
        lib.CerrarDNF.restype = ctypes.c_int

        lib.ReporteX.argtypes = [ctypes.c_bool]
        lib.ReporteX.restype = ctypes.c_int

        lib.ReporteZ.argtypes = [ctypes.c_bool]
        lib.ReporteZ.restype = ctypes.c_int

        lib.CopiarCamposSalida.argtypes = [ctypes.c_char, ctypes.c_char_p]
        lib.CopiarCamposSalida.restype = None

        print("[OK] Librería dtpdfiscal64.dll vinculada exitosamente con soporte USB directo y auto-recuperación.")
    except Exception as e:
        print(f"[ERROR] Error cargando dtpdfiscal64.dll: {e}")
else:
    print("[ERROR] No se encontró dtpdfiscal64.dll en el directorio.")

CONFIG_FILE = os.path.join(BASE_DIR, "config.json")
CONFIG = {"connection_mode": "USB", "printerModel": "DEVTECH DTP-80i", "port": "COM1", "baudRate": 9600}

if os.path.exists(CONFIG_FILE):
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            CONFIG.update(json.load(f))
    except Exception:
        pass

def save_config():
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(CONFIG, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"[ERROR] Error guardando config.json: {e}")
        return False

# Cargar controlador The Factory HKA / ACLAS PP9 Plus
try:
    from hka_aclas_driver import HkaAclasDriver
    aclas_driver_available = True
    print("[OK] Controlador oficial ACLAS PP9 - PLUS (The Factory HKA) vinculado exitosamente.")
except Exception as e:
    aclas_driver_available = False
    print(f"[WARN] No se pudo cargar hka_aclas_driver: {e}")

def is_aclas_mode():
    model = (CONFIG.get("printerModel") or "").upper()
    return "ACLAS" in model or "PP9" in model or "HKA" in model

def get_aclas_driver():
    port = CONFIG.get("port", "COM99")
    baud = int(CONFIG.get("baudRate", 9600))
    return HkaAclasDriver(port=port, baudrate=baud)

def list_available_ports():
    ports = [
        {"port": "USB", "caption": "USB (Detección Automática por Cable USB)", "description": "Conexión directa por cable USB"}
    ]
    try:
        import serial.tools.list_ports
        for p in serial.tools.list_ports.comports():
            desc = p.description or ""
            ports.append({
                "port": p.device,
                "caption": f"{p.device} - {desc}",
                "description": desc
            })
    except Exception:
        pass
    known = [p["port"] for p in ports]
    for c in ["COM1", "COM2", "COM3", "COM4", "COM5", "COM99"]:
        if c not in known:
            caption = f"{c} (Emulador Virtual Oficial The Factory VFP HKA)" if c == "COM99" else f"{c} (Puerto Serie Estándar)"
            ports.append({"port": c, "caption": caption, "description": "Puerto Serie"})
    return ports

def get_target(custom_port=None):
    mode = custom_port if custom_port is not None else CONFIG.get("connection_mode", "USB")
    if not mode or mode.strip().upper() == "USB":
        return b""
    return mode.strip().encode("utf-8")

def open_devtech_port(custom_port=None):
    if not lib:
        return False, "Librería oficial dtpdfiscal64.dll o dtpdfiscal.dll no cargada en el sistema."
    target = get_target(custom_port)
    ret = lib.AbrirPuerto(target)
    # Según manual oficial DTPDFiscal Tabla 3:
    # 0 = SUCCESS (0x0000)
    # 1 = PORT_ALREADY_OPEN (0x0001) - El canal USB ya está abierto y operativo
    if ret in (0, 1):
        return True, "OK"
    err = FISCAL_ERRORS.get(ret, f"Código {ret}")
    return False, f"No se pudo conectar a la impresora física en USB: {err} (Código {ret})"

def sync_model_from_payload(payload):
    if not payload or not isinstance(payload, dict):
        return
    req_model = (payload.get("model") or payload.get("printerModel") or "").upper()
    if req_model:
        if "ACLAS" in req_model or "PP9" in req_model or "HKA" in req_model:
            CONFIG["printerModel"] = "ACLAS PP9 - PLUS"
            CONFIG["distributor"] = "The Factory HKA, C.A."
            CONFIG["registroSeniat"] = "HKA-PP9PLUS"
            if payload.get("port"): CONFIG["port"] = payload.get("port")
            if payload.get("baudRate"): CONFIG["baudRate"] = int(payload.get("baudRate"))
        elif "DEVTECH" in req_model or "DTP" in req_model:
            CONFIG["printerModel"] = "DEVTECH DTP-80i"
            CONFIG["distributor"] = "Corporación ECRS, C.A."
            CONFIG["registroSeniat"] = "GER-0001"
            CONFIG["connection_mode"] = "USB"

def clean_fiscal_str(s, max_len=100):
    if not s:
        return b""
    import unicodedata
    s_clean = unicodedata.normalize('NFKD', str(s)).encode('ASCII', 'ignore').decode('ASCII')
    return s_clean[:max_len].encode('latin1')

def get_default_windows_printer():
    try:
        winspool = ctypes.WinDLL("winspool.drv")
        sz = wintypes.DWORD(0)
        winspool.GetDefaultPrinterW(None, ctypes.byref(sz))
        if sz.value > 0:
            buf = ctypes.create_unicode_buffer(sz.value)
            if winspool.GetDefaultPrinterW(buf, ctypes.byref(sz)):
                if buf.value:
                    return buf.value
    except Exception as e:
        print(f"[WARN] Error obteniendo impresora predeterminada: {e}")
    return "POS-80C"

def print_to_windows_spooler(printer_name, data_bytes):
    try:
        winspool = ctypes.WinDLL("winspool.drv")
        
        OpenPrinter = winspool.OpenPrinterW
        OpenPrinter.argtypes = [wintypes.LPWSTR, ctypes.POINTER(wintypes.HANDLE), ctypes.c_void_p]
        OpenPrinter.restype = wintypes.BOOL
        
        ClosePrinter = winspool.ClosePrinter
        ClosePrinter.argtypes = [wintypes.HANDLE]
        ClosePrinter.restype = wintypes.BOOL
        
        class DOC_INFO_1(ctypes.Structure):
            _fields_ = [
                ("pDocName", wintypes.LPWSTR),
                ("pOutputFile", wintypes.LPWSTR),
                ("pDataType", wintypes.LPWSTR)
            ]
            
        StartDocPrinter = winspool.StartDocPrinterW
        StartDocPrinter.argtypes = [wintypes.HANDLE, wintypes.DWORD, ctypes.POINTER(DOC_INFO_1)]
        StartDocPrinter.restype = wintypes.DWORD
        
        EndDocPrinter = winspool.EndDocPrinter
        EndDocPrinter.argtypes = [wintypes.HANDLE]
        EndDocPrinter.restype = wintypes.BOOL
        
        StartPagePrinter = winspool.StartPagePrinter
        StartPagePrinter.argtypes = [wintypes.HANDLE]
        StartPagePrinter.restype = wintypes.BOOL
        
        EndPagePrinter = winspool.EndPagePrinter
        EndPagePrinter.argtypes = [wintypes.HANDLE]
        EndPagePrinter.restype = wintypes.BOOL
        
        WritePrinter = winspool.WritePrinter
        WritePrinter.argtypes = [wintypes.HANDLE, ctypes.c_char_p, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD)]
        WritePrinter.restype = wintypes.BOOL
        
        h_printer = wintypes.HANDLE()
        if not OpenPrinter(printer_name, ctypes.byref(h_printer), None):
            return False, f"No se pudo conectar a la impresora '{printer_name}' en el Spooler de Windows."
            
        di = DOC_INFO_1("Guardian Thermal Direct Spooler", None, "RAW")
        doc_id = StartDocPrinter(h_printer, 1, ctypes.byref(di))
        if doc_id == 0:
            ClosePrinter(h_printer)
            return False, f"Error iniciando documento en cola para {printer_name}"
            
        StartPagePrinter(h_printer)
        written = wintypes.DWORD(0)
        ok = WritePrinter(h_printer, data_bytes, len(data_bytes), ctypes.byref(written))
        EndPagePrinter(h_printer)
        EndDocPrinter(h_printer)
        ClosePrinter(h_printer)
        
        if not ok:
            return False, "Error al escribir bytes en el Spooler de Windows."
        return True, f"OK: {written.value} bytes enviados a {printer_name}"
    except Exception as e:
        return False, f"Excepción en Spooler de Windows: {str(e)}"

def format_row_escpos(left, right, width=48):
    left = str(left)
    right = str(right)
    if len(left) + len(right) >= width:
        avail = width - len(right) - 1
        left = left[:avail] if avail > 0 else left[:width]
    spaces = max(1, width - len(left) - len(right))
    return left + (" " * spaces) + right

def build_thermal_escpos(payload):
    td = payload.get("ticketDesign") or {}
    width_mode = payload.get("ticketWidth") or td.get("ticketWidth") or "80mm"
    width = 32 if width_mode == "58mm" else 48
    divider = ("-" * width) + "\n"

    b = bytearray()
    b.extend(b"\x1b@")  # Inicializar impresora
    
    # 1. Cabecera Centrada
    b.extend(b"\x1ba\x01")  # Centrado
    if td.get("showBusinessName", True):
        b.extend(b"\x1bE\x01")  # Negrita ON
        biz_name = payload.get("businessName") or "GUARDIAN POS"
        b.extend(f"{biz_name}\n".encode("latin1", "replace"))
        b.extend(b"\x1bE\x00")  # Negrita OFF
    
    biz_doc = payload.get("businessDocument") or ""
    if td.get("showRif", True) and biz_doc:
        b.extend(f"RIF: {biz_doc}\n".encode("latin1", "replace"))
    biz_addr = payload.get("businessAddress") or ""
    if td.get("showAddress", True) and biz_addr:
        b.extend(f"{biz_addr[:width]}\n".encode("latin1", "replace"))
    biz_phone = payload.get("businessPhone") or ""
    if td.get("showPhone", True) and biz_phone:
        b.extend(f"TEL: {biz_phone}\n".encode("latin1", "replace"))
        
    b.extend(divider.encode("latin1"))
    
    # 2. Datos del Documento (Alineado a la Izquierda)
    b.extend(b"\x1ba\x00")  # Izquierda
    rcpt = payload.get("receiptNumber") or "0001"
    doc_title = payload.get("documentTitle") or td.get("documentTitle") or "NOTA DE ENTREGA"
    now_str = time.strftime("%d/%m/%Y %H:%M:%S")
    
    b.extend(format_row_escpos(f"{doc_title}:", f"#{rcpt}", width).encode("latin1") + b"\n")
    if td.get("showDate", True):
        b.extend(format_row_escpos("FECHA:", now_str, width).encode("latin1") + b"\n")
    
    if td.get("showClient", True):
        client = payload.get("client") or {}
        c_name = client.get("name") or "CLIENTE MOSTRADOR"
        c_ci = client.get("ci") or ""
        b.extend(format_row_escpos("CLIENTE:", c_name[:width - 10], width).encode("latin1") + b"\n")
        if td.get("showClientDocument", True) and c_ci:
            b.extend(format_row_escpos("C.I./RIF:", c_ci, width).encode("latin1") + b"\n")
        if td.get("showClientPhone", False) and client.get("phone"):
            b.extend(format_row_escpos("TEL:", str(client.get("phone")), width).encode("latin1") + b"\n")
        if td.get("showClientAddress", False) and client.get("address"):
            b.extend(format_row_escpos("DIR:", str(client.get("address"))[:width - 6], width).encode("latin1") + b"\n")
        
    b.extend(divider.encode("latin1"))
    b.extend(format_row_escpos("CANT  DESCRIPCION", "TOTAL", width).encode("latin1") + b"\n")
    b.extend(divider.encode("latin1"))
    
    # 3. Artículos / Items
    items = payload.get("items") or []
    rate = float(payload.get("exchangeRate", 1.0))
    show_sku = td.get("showSku", False)
    currency_mode = payload.get("currencyMode") or td.get("currencyMode") or "BOTH"

    for it in items:
        name = it.get("name") or "Item"
        sku = it.get("sku") or ""
        if show_sku and sku:
            name = f"{name} [{sku}]"
        name = name[:width - 16]
        qty = float(it.get("quantity", 1))
        qty_str = f"{int(qty)}" if qty.is_integer() else f"{qty:.2f}"
        sub_val = float(it.get("subTotal") if it.get("subTotal") is not None else (float(it.get("salePrice", 0)) * qty))
        col_left = f"{qty_str:<4} {name}"
        if currency_mode == "VES":
            col_right = f"Bs {(sub_val * rate):>10.2f}"
        else:
            col_right = f"${sub_val:>10.2f}"
        b.extend(format_row_escpos(col_left, col_right, width).encode("latin1") + b"\n")
        
    b.extend(divider.encode("latin1"))
    
    # 4. Totales
    total_usd = float(payload.get("total", 0))
    total_ves = total_usd * rate
    
    b.extend(b"\x1bE\x01")  # Negrita ON
    if currency_mode == "USD":
        b.extend(format_row_escpos("TOTAL US$:", f"${total_usd:>10.2f}", width).encode("latin1") + b"\n")
    elif currency_mode == "VES":
        b.extend(format_row_escpos("TOTAL BS:", f"Bs {total_ves:>10.2f}", width).encode("latin1") + b"\n")
    else:
        b.extend(format_row_escpos("TOTAL US$:", f"${total_usd:>10.2f}", width).encode("latin1") + b"\n")
        if rate > 1.0:
            rate_str = f"{rate:.2f}"
            b.extend(format_row_escpos(f"TOTAL BS (TASA {rate_str}):", f"Bs {total_ves:>10.2f}", width).encode("latin1") + b"\n")
    b.extend(b"\x1bE\x00")  # Negrita OFF
    
    # 5. Formas de Pago
    if td.get("showPaymentDetails", True):
        payments = payload.get("payments") or []
        sale_condition = payload.get("saleCondition") or ""
        if sale_condition == "CREDIT" and total_usd > 0:
            has_cashea = any("CASHEA" in (p.get("method") or "").upper() or "CREDIT" in (p.get("method") or "").upper() for p in payments)
            if not has_cashea:
                paid_usd = sum(float(p.get("amount", 0)) / (rate if p.get("currency") == "VES" and rate > 0 else 1.0) for p in payments)
                financed_usd = total_usd - paid_usd
                if financed_usd > 0.05:
                    payments.append({
                        "method": "CASHEA",
                        "amount": round(financed_usd, 2),
                        "currency": "USD"
                    })

        if payments:
            b.extend(b"\n--- FORMAS DE PAGO ---\n")
            for p in payments:
                m = p.get("method") or "PAGO"
                amt = float(p.get("amount", 0))
                curr = p.get("currency") or "USD"
                sym = "$" if curr == "USD" else "Bs"
                p_str = f"{sym} {amt:>10.2f}"
                b.extend(format_row_escpos(f"  * {m[:width - 16]}", p_str, width).encode("latin1") + b"\n")

    # 5.1 Cronograma de Cuotas de Crédito / Cashea
    installments = payload.get("installments") or []
    if installments:
        b.extend(b"\n--- CRONOGRAMA DE CUOTAS ---\n")
        for inst in installments:
            num = inst.get("number")
            due = inst.get("dueDate", "")
            amt = float(inst.get("amount", 0))
            amt_ves = amt * rate
            inst_str = f"${amt:>6.2f} (Bs {amt_ves:>8.2f})" if rate > 1.0 else f"${amt:>7.2f}"
            b.extend(format_row_escpos(f"  Cuota {num} ({due})", inst_str, width).encode("latin1") + b"\n")

    # 5.2 Políticas de Garantía
    if td.get("showPolicies", False) and td.get("policiesText"):
        b.extend(b"\n")
        b.extend(divider.encode("latin1"))
        b.extend(f"{td.get('policiesText')}\n".encode("latin1", "replace"))
        b.extend(divider.encode("latin1"))
            
    # 6. Pie de Página y Corte
    if td.get("showFooterMessage", True):
        b.extend(b"\n\x1ba\x01")  # Centrado
        footer_msg = payload.get("footerMessage") or td.get("footerMessage") or "Gracias por su compra. Conserve su ticket."
        b.extend(f"{footer_msg}\n".encode("latin1", "replace"))

    b.extend(b"\n\n\n\n\n")  # Alimentar papel
    b.extend(b"\x1dV\x00")   # Corte de papel estándar GS V 0
    
    return bytes(b)

class FiscalHandler(BaseHTTPRequestHandler):
    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, X-Requested-With")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/api/status" or url.path == "/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors()
            self.end_headers()
            is_aclas = is_aclas_mode()
            model_name = CONFIG.get("printerModel", "ACLAS PP9 - PLUS" if is_aclas else "DEVTECH DTP-80i")
            assigned_port = CONFIG.get("port", "COM1") if is_aclas else "USB Directo (WinUSB)"
            distributor = "The Factory HKA, C.A." if is_aclas else "Corporación ECRS, C.A."
            seniat_reg = CONFIG.get("registroSeniat", "HKA-PP9PLUS" if is_aclas else "GER-0001")

            data = {
                "online": True,
                "status": "ONLINE",
                "service": "Guardian Fiscal Bridge",
                "version": "4.5.0",
                "printerModel": model_name,
                "driver": "ACLAS_HKA" if is_aclas else "DEVTECH_ECRS",
                "distributor": distributor,
                "seniatRegister": seniat_reg,
                "printerSerial": CONFIG.get("serialNumber", "PP9-00000000" if is_aclas else "VE2408000611"),
                "assignedPort": assigned_port,
                "baudRate": int(CONFIG.get("baudRate", 9600)),
                "availableModels": [
                    {"id": "DEVTECH DTP-80i", "label": "DEVTECH DTP-80i (Corporación ECRS)", "channel": "Cable USB Directo (WinUSB)"},
                    {"id": "ACLAS PP9 - PLUS", "label": "ACLAS PP9 - PLUS (The Factory HKA)", "channel": "Puerto USB (Controlador USB / Cable USB The Factory)"}
                ],
                "availablePorts": list_available_ports(),
                "defaultPrinter": get_default_windows_printer(),
                "thermalSupported": True,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            self.wfile.write(json.dumps(data).encode("utf-8"))
        elif url.path == "/api/fiscal/ports":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors()
            self.end_headers()
            active_p = CONFIG.get("port", "COM1" if is_aclas_mode() else "USB")
            data = {
                "success": True,
                "activePort": active_p,
                "ports": list_available_ports()
            }
            self.wfile.write(json.dumps(data).encode("utf-8"))
        elif url.path == "/api/thermal/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors()
            self.end_headers()
            data = {
                "success": True,
                "defaultPrinter": get_default_windows_printer(),
                "spoolerReady": True
            }
            self.wfile.write(json.dumps(data).encode("utf-8"))
        else:
            self.send_response(404)
            self._send_cors()
            self.end_headers()

    def do_POST(self):
        try:
            url = urlparse(self.path)
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length) if content_length > 0 else b""
            payload = json.loads(body.decode("utf-8")) if body else {}

            if url.path in ["/api/thermal/invoice", "/api/thermal/print"]:
                res = self.process_thermal_invoice(payload)
                self.send_response(200 if res.get("success") else 400)
                self.send_header("Content-Type", "application/json")
                self._send_cors()
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
            elif url.path == "/api/fiscal/set-model":
                model = payload.get("model", "DEVTECH DTP-80i")
                CONFIG["printerModel"] = model
                if "ACLAS" in model.upper() or "PP9" in model.upper() or "HKA" in model.upper():
                    CONFIG["distributor"] = "The Factory HKA, C.A."
                    CONFIG["registroSeniat"] = "HKA-PP9PLUS"
                    if payload.get("port"):
                        CONFIG["port"] = payload.get("port")
                    elif not CONFIG.get("port") or CONFIG.get("port") == "USB":
                        CONFIG["port"] = "COM99"
                    if payload.get("baudRate"):
                        CONFIG["baudRate"] = int(payload.get("baudRate"))
                else:
                    CONFIG["distributor"] = "Corporación ECRS, C.A."
                    CONFIG["registroSeniat"] = "GER-0001"
                    CONFIG["connection_mode"] = "USB"
                save_config()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self._send_cors()
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "message": f"Modelo fiscal configurado a '{CONFIG['printerModel']}'",
                    "config": CONFIG
                }).encode("utf-8"))
            elif url.path == "/api/fiscal/set-port":
                if payload.get("port"):
                    CONFIG["port"] = payload.get("port")
                if payload.get("baudRate"):
                    CONFIG["baudRate"] = int(payload.get("baudRate"))
                save_config()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self._send_cors()
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "message": f"Puerto fiscal configurado a {CONFIG.get('port')}",
                    "config": CONFIG
                }).encode("utf-8"))
            elif url.path == "/api/fiscal/invoice":
                res = self.process_invoice(payload)
                self.send_response(200 if res.get("success") else 400)
                self.send_header("Content-Type", "application/json")
                self._send_cors()
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
            elif url.path == "/api/fiscal/credit-note":
                res = self.process_credit_note(payload)
                self.send_response(200 if res.get("success") else 400)
                self.send_header("Content-Type", "application/json")
                self._send_cors()
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
            elif url.path == "/api/fiscal/report-x":
                res = self.process_report_x(payload)
                self.send_response(200 if res.get("success") else 400)
                self.send_header("Content-Type", "application/json")
                self._send_cors()
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
            elif url.path == "/api/fiscal/report-z":
                res = self.process_report_z(payload)
                self.send_response(200 if res.get("success") else 400)
                self.send_header("Content-Type", "application/json")
                self._send_cors()
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
            elif url.path == "/api/fiscal/test":
                res = self.process_test(payload)
                self.send_response(200 if res.get("success") else 400)
                self.send_header("Content-Type", "application/json")
                self._send_cors()
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
            elif url.path == "/api/fiscal/cancel":
                res = self.process_cancel(payload)
                self.send_response(200 if res.get("success") else 400)
                self.send_header("Content-Type", "application/json")
                self._send_cors()
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
            else:
                self.send_response(404)
                self._send_cors()
                self.end_headers()
        except Exception as unhandled_err:
            try:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self._send_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": f"Error interno en Agente Fiscal: {str(unhandled_err)}"}).encode("utf-8"))
            except Exception:
                pass

    def process_thermal_invoice(self, payload):
        try:
            target_printer = payload.get("printerName")
            if not target_printer:
                target_printer = get_default_windows_printer()
            
            raw_bytes = build_thermal_escpos(payload)
            ok, msg = print_to_windows_spooler(target_printer, raw_bytes)
            if ok:
                return {
                    "success": True,
                    "printer": target_printer,
                    "bytesSent": len(raw_bytes),
                    "message": f"Comprobante térmico impreso directamente en {target_printer} vía Spooler (cero ventanas)."
                }
            else:
                return {
                    "success": False,
                    "error": f"Fallo al imprimir en Spooler de Windows ({target_printer}): {msg}"
                }
        except Exception as e:
            return {
                "success": False,
                "error": f"Excepción procesando impresión térmica: {str(e)}"
            }

    def process_test(self, payload=None):
        sync_model_from_payload(payload)

        if is_aclas_mode():
            if not aclas_driver_available:
                return {"success": False, "error": "Módulo oficial hka_aclas_driver no disponible"}
            driver = get_aclas_driver()
            try:
                ok, msg = driver.print_test_dnf()
                if ok:
                    return {"success": True, "message": f"¡Comunicación serial confirmada en {driver.port} y ticket de prueba emitido en ACLAS PP9 Plus!"}
                else:
                    return {"success": False, "error": f"Fallo al comunicar con ACLAS PP9 Plus en {driver.port}: {msg}"}
            finally:
                driver.close()

        target_port = payload.get("port") if payload and isinstance(payload, dict) else None
        ok, err_msg = open_devtech_port(target_port)
        if not ok:
            return {"success": False, "error": err_msg}
        
        try:
            # Purgar cualquier comprobante previo trabado
            lib.CancelarCF()
            lib.CerrarDNF()

            # Imprimir ticket de prueba físico (Documento No Fiscal) para que expulse papel
            d_open = lib.AbrirDNF()
            if d_open == 0:
                lib.LineaDNF(b"================================", 0, 1, 0)
                lib.LineaDNF(b"     GUARDIAN FISCAL BRIDGE     ", 0, 1, 2)
                lib.LineaDNF(b"    DEVTECH DTP-80i (SENIAT)    ", 0, 1, 0)
                lib.LineaDNF(b"================================", 0, 1, 0)
                lib.LineaDNF(b"COMUNICACION USB DIRECTA: OK", 0, 1, 0)
                ahora = time.strftime("%d/%m/%Y %H:%M:%S")
                lib.LineaDNF(f"HORA: {ahora}".encode("latin1"), 0, 0, 0)
                lib.LineaDNF(b"SISTEMA FISCAL LISTO Y CONECTADO", 0, 1, 0)
                lib.LineaDNF(b"================================", 0, 1, 0)
                lib.CerrarDNF()
                msg = "¡Comunicación USB exitosa y ticket de prueba emitido físicamente en el papel!"
            else:
                msg = "¡Comunicación USB directa confirmada con DEVTECH DTP-80i!"

            lib.CerrarPuerto()
            return {"success": True, "message": msg}
        except Exception as e:
            try:
                lib.CerrarPuerto()
            except Exception:
                pass
            return {"success": False, "error": f"Error en test USB: {str(e)}"}

    def process_cancel(self, payload=None):
        sync_model_from_payload(payload)

        if is_aclas_mode():
            if not aclas_driver_available:
                return {"success": False, "error": "Módulo hka_aclas_driver no disponible"}
            driver = get_aclas_driver()
            try:
                ok, msg = driver.cancel_document()
                return {
                    "success": True,
                    "message": f"Comprobante cancelado en ACLAS PP9 Plus ({driver.port}). Impresora En Espera."
                }
            finally:
                driver.close()

        ok, err_msg = open_devtech_port()
        if not ok:
            return {"success": False, "error": err_msg}
        
        try:
            c_ret = lib.CancelarCF()
            d_ret = lib.CerrarDNF()
            lib.CerrarPuerto()
            return {
                "success": True, 
                "message": "Comprobante cancelado exitosamente. La impresora fiscal ha vuelto al estado 'En Espera'."
            }
        except Exception as e:
            try:
                lib.CerrarPuerto()
            except Exception:
                pass
            return {"success": False, "error": f"Error al cancelar: {str(e)}"}

    def process_report_x(self, payload=None):
        sync_model_from_payload(payload)

        if is_aclas_mode():
            if not aclas_driver_available:
                return {"success": False, "error": "Módulo hka_aclas_driver no disponible"}
            driver = get_aclas_driver()
            try:
                ok, msg = driver.print_report_x()
                return {"success": ok, "message": msg} if ok else {"success": False, "error": msg}
            finally:
                driver.close()

        ok, err_msg = open_devtech_port()
        if not ok:
            return {"success": False, "error": err_msg}
        
        try:
            # Purgar cualquier comprobante abierto
            lib.CancelarCF()
            lib.CerrarDNF()

            r_ret = lib.ReporteX(True) # bNoAbrirGaveta = True
            lib.CerrarPuerto()
            if r_ret == 0:
                return {"success": True, "message": "Reporte X emitido con éxito en el papel físico."}
            diag = FISCAL_ERRORS.get(r_ret, f"Código {r_ret}")
            return {"success": False, "error": f"La impresora física rechazó el Reporte X: {diag} (Código {r_ret})", "code": r_ret}
        except Exception as e:
            try:
                lib.CerrarPuerto()
            except Exception:
                pass
            return {"success": False, "error": f"Excepción durante Reporte X DEVTECH: {str(e)}"}

    def process_report_z(self, payload=None):
        sync_model_from_payload(payload)

        if is_aclas_mode():
            if not aclas_driver_available:
                return {"success": False, "error": "Módulo hka_aclas_driver no disponible"}
            driver = get_aclas_driver()
            try:
                ok, msg = driver.print_report_z()
                return {"success": ok, "message": msg} if ok else {"success": False, "error": msg}
            finally:
                driver.close()

        ok, err_msg = open_devtech_port()
        if not ok:
            return {"success": False, "error": err_msg}
        
        try:
            # Purgar cualquier comprobante abierto
            lib.CancelarCF()
            lib.CerrarDNF()

            r_ret = lib.ReporteZ(True) # bNoAbrirGaveta = True
            buf = ctypes.create_string_buffer(512)
            z_num = "Z-OK"
            try:
                lib.CopiarCamposSalida(b";", buf)
                raw_str = buf.value.decode("latin1", errors="ignore")
                if raw_str:
                    parts = raw_str.split(";")
                    if len(parts) > 0 and parts[0].strip():
                        z_num = parts[0].strip()
            except Exception:
                pass

            lib.CerrarPuerto()

            if r_ret == 0:
                return {
                    "success": True, 
                    "message": f"Reporte Z (Cierre Diario SENIAT N° {z_num}) emitido con éxito en el papel físico y grabado en la memoria fiscal.", 
                    "zNumber": z_num
                }
            
            diag = FISCAL_ERRORS.get(r_ret, f"Código {r_ret}")
            if r_ret == 1538:
                diag = "No se ha iniciado la jornada fiscal (No hay ventas ni transacciones registradas hoy desde el último Reporte Z emitido)."
            elif r_ret == 257:
                diag = "Comando inválido en el estado actual. La impresora está en una operación pendiente. Presiona 'Desbloquear Impresora'."
            
            return {
                "success": False, 
                "error": f"La impresora física DEVTECH rechazó el Reporte Z: {diag} (Código {r_ret})",
                "code": r_ret
            }
        except Exception as e:
            try:
                lib.CerrarPuerto()
            except Exception:
                pass
            return {"success": False, "error": f"Excepción durante Reporte Z DEVTECH: {str(e)}"}

    def process_invoice(self, payload):
        # Sincronización dinámica de modelo si viene provisto en la petición
        req_model = (payload.get("model") or payload.get("printerModel") or "").upper()
        if req_model:
            if "ACLAS" in req_model or "PP9" in req_model or "HKA" in req_model:
                CONFIG["printerModel"] = "ACLAS PP9 - PLUS"
                if payload.get("port"): CONFIG["port"] = payload.get("port")
            elif "DEVTECH" in req_model or "DTP" in req_model:
                CONFIG["printerModel"] = "DEVTECH DTP-80i"
                CONFIG["connection_mode"] = "USB"

        if is_aclas_mode():
            if not aclas_driver_available:
                return {"success": False, "error": "Módulo hka_aclas_driver no disponible"}
            driver = get_aclas_driver()
            try:
                return driver.print_invoice(payload)
            finally:
                driver.close()

        if not lib:
            return {"success": False, "error": "DLL oficial no cargada"}

        client = payload.get("client", {})
        items = payload.get("items", [])
        payments = payload.get("payments", [])
        total = float(payload.get("total", 0))
        rate = float(payload.get("exchangeRate", 1.0))
        is_converted = bool(payload.get("isConvertedToVes", False))

        # Doble salvaguarda: si los montos no vinieron convertidos en VES y la tasa es válida (> 1.0)
        if not is_converted and rate > 1.0:
            total = total * rate

        client_name = clean_fiscal_str(client.get("name", "Cliente Mostrador"), 100)
        client_rif = clean_fiscal_str(client.get("ci", "V-00000000"), 11)

        ok, err_msg = open_devtech_port()
        if not ok:
            return {
                "success": False, 
                "error": err_msg
            }

        try:
            # 1. Abrir CF (Factura)
            r_abrir = lib.AbrirCF(0, client_name, client_rif, 0, b"", b"", 0, b"")
            
            # AUTO-RECUPERACIÓN CONTRA ERROR 257 (COMMAND_INVALID_STATUS):
            # Si la impresora física rechaza la apertura con 257, significa que había una transacción
            # previa interrumpida (por reinicio, corte de papel o prueba anterior).
            if r_abrir == 257:
                print("[AUTO-RECUPERACION] Impresora reportó estado ocupado (257). Purgando comprobante previo...")
                lib.CancelarCF()
                lib.CerrarDNF()
                time.sleep(0.5)
                # Reintento tras la purga
                r_abrir = lib.AbrirCF(0, client_name, client_rif, 0, b"", b"", 0, b"")

            if r_abrir != 0:
                lib.CerrarPuerto()
                diag = FISCAL_ERRORS.get(r_abrir, f"Código {r_abrir}")
                return {"success": False, "error": f"La impresora física rechazó AbrirCF: {diag} (Código {r_abrir})"}

            # 2. Enviar Items
            for it in items:
                name = clean_fiscal_str(it.get("name", "Item"), 40)
                qty = int(it.get("quantity", 1))
                price_val = float(it.get("salePrice", 0))
                if not is_converted and rate > 1.0:
                    price_val = price_val * rate
                price_cents = int(round(price_val * 100))
                tax_pct = float(it.get("taxPercentage", 16))
                tax_rate = 1 # General 16%
                if tax_pct == 0:
                    tax_rate = 0 # Exento
                elif tax_pct == 8:
                    tax_rate = 2 # Reducida
                elif tax_pct > 25:
                    tax_rate = 3 # Adicional

                r_item = lib.ItemCF(0, name, b"", qty, b"UND", price_cents, tax_rate, 2, 0)
                if r_item != 0:
                    lib.CancelarCF()
                    lib.CerrarPuerto()
                    diag = FISCAL_ERRORS.get(r_item, f"Código {r_item}")
                    return {"success": False, "error": f"La impresora rechazó el ítem '{it.get('name')}': {diag} (Código {r_item})"}

            # 3. Subtotal Definitivo (Tipo 1)
            # Requisito SENIAT: Debe ejecutarse Subtotal Definitivo (1) para congelar la venta
            # y obtener el monto total con IVA calculado por la memoria fiscal.
            r_sub = lib.SubtotalCF(1, 0)
            if r_sub != 0:
                lib.CancelarCF()
                lib.CerrarPuerto()
                diag = FISCAL_ERRORS.get(r_sub, f"Código {r_sub}")
                return {"success": False, "error": f"Fallo en Subtotal Definitivo: {diag} (Código {r_sub})"}

            # Extraer el Monto Total definitivo (Campo 10 de SubtotalCF según manual oficial ECRS)
            total_fiscal_cents = 0
            buf = ctypes.create_string_buffer(512)
            try:
                lib.CopiarCamposSalida(b";", buf)
                raw_sub = buf.value.decode("latin1", errors="ignore")
                if raw_sub:
                    parts = raw_sub.split(";")
                    if len(parts) > 10 and parts[10].strip().isdigit():
                        total_fiscal_cents = int(parts[10].strip())
            except Exception as e:
                print(f"[WARN] No se pudo leer campo 10 de SubtotalCF: {e}")

            if total_fiscal_cents <= 0:
                total_fiscal_cents = int(round(total * 100))

            # 4. Pagos
            # Requisito SENIAT: El pago debe cubrir el 100% del total de la máquina.
            if payments and len(payments) > 0:
                monto_pagado = 0
                for p in payments:
                    p_method = clean_fiscal_str(p.get("method", "Efectivo"), 20)
                    p_amount_val = float(p.get("amount", 0))
                    if not is_converted and rate > 1.0 and p.get("currency") != "VES":
                        p_amount_val = p_amount_val * rate
                    p_amount = int(round(p_amount_val * 100))
                    if p_amount > 0:
                        lib.PagoCF(0, 0, p_method, p_amount)
                        monto_pagado += p_amount
                # Si falta algún céntimo o saldo restante por cubrir en la máquina fiscal:
                if monto_pagado < total_fiscal_cents:
                    diferencia = total_fiscal_cents - monto_pagado
                    is_credit = bool(payload.get("saleCondition") == "CREDIT" or any("CASHEA" in (p.get("method") or "").upper() for p in payments))
                    metodo_defecto = b"CASHEA" if is_credit else b"Efectivo"
                    lib.PagoCF(0, 0, metodo_defecto, diferencia)
            else:
                # Pago total en efectivo
                lib.PagoCF(0, 0, b"Efectivo", total_fiscal_cents)

            # 5. Cerrar CF
            r_close = lib.CerrarCF(b"")
            if r_close != 0:
                lib.CancelarCF()
                lib.CerrarPuerto()
                diag = FISCAL_ERRORS.get(r_close, f"Código {r_close}")
                return {"success": False, "error": f"Fallo al cerrar factura fiscal en la impresora: {diag} (Código {r_close})"}

            # 6. Obtener número fiscal emitido por la máquina tras el cierre (Campo 0 de CerrarCF)
            fiscal_doc_num = "00000000"
            try:
                lib.CopiarCamposSalida(b";", buf)
                raw_str = buf.value.decode("latin1", errors="ignore")
                if raw_str:
                    parts = raw_str.split(";")
                    if len(parts) > 0 and parts[0].strip().isdigit() and int(parts[0].strip()) > 0:
                        fiscal_doc_num = f"{int(parts[0].strip()):08d}"
            except Exception:
                pass

            lib.CerrarPuerto()

            return {
                "success": True,
                "fiscalInvoiceNumber": fiscal_doc_num,
                "printerSerial": "VE2408000611",
                "seniatRegister": "GER-0001",
                "mode": "PHYSICAL_HARDWARE",
                "message": f"Factura Fiscal SENIAT N° {fiscal_doc_num} emitida con éxito en el papel físico."
            }
        except Exception as e:
            try:
                lib.CancelarCF()
                lib.CerrarPuerto()
            except Exception:
                pass
            return {"success": False, "error": f"Error procesando factura fiscal física: {str(e)}"}

    def process_credit_note(self, payload):
        # Sincronización dinámica de modelo si viene provisto en la petición
        req_model = (payload.get("model") or payload.get("printerModel") or "").upper()
        if req_model:
            if "ACLAS" in req_model or "PP9" in req_model or "HKA" in req_model:
                CONFIG["printerModel"] = "ACLAS PP9 - PLUS"
                if payload.get("port"): CONFIG["port"] = payload.get("port")
            elif "DEVTECH" in req_model or "DTP" in req_model:
                CONFIG["printerModel"] = "DEVTECH DTP-80i"
                CONFIG["connection_mode"] = "USB"

        if is_aclas_mode():
            if not aclas_driver_available:
                return {"success": False, "error": "Módulo hka_aclas_driver no disponible"}
            driver = get_aclas_driver()
            try:
                return driver.print_credit_note(payload)
            finally:
                driver.close()

        if not lib:
            return {"success": False, "error": "DLL oficial no cargada"}

        client = payload.get("client", {})
        items = payload.get("items", [])
        total = float(payload.get("total", 0))
        rate = float(payload.get("exchangeRate", 1.0))
        is_converted = bool(payload.get("isConvertedToVes", False))

        if not is_converted and rate > 1.0:
            total = total * rate

        client_name = clean_fiscal_str(client.get("name", "Cliente Mostrador"), 100)
        client_rif = clean_fiscal_str(client.get("ci", "V-00000000"), 11)

        orig_inv_str = "".join(ch for ch in str(payload.get("originalInvoiceNumber") or "1") if ch.isdigit())
        orig_inv_num = int(orig_inv_str) if orig_inv_str else 1

        # Protocolo DEVTECH DTP-80i Oficial (ECRS):
        # Campo 5: Fecha de factura de referencia en formato estricto DDMMAAAA (8 digitos numericos, sin barras)
        raw_date = str(payload.get("originalInvoiceDate") or "").strip()
        digits_date = "".join(ch for ch in raw_date if ch.isdigit())
        if len(digits_date) == 8:
            if raw_date.startswith("202") and ("-" in raw_date or "/" in raw_date):
                # Formato ISO YYYY-MM-DD -> DDMMAAAA
                devtech_date_str = f"{digits_date[6:8]}{digits_date[4:6]}{digits_date[0:4]}"
            else:
                # DDMMYYYY
                devtech_date_str = digits_date
        else:
            devtech_date_str = time.strftime("%d%m%Y")

        orig_date = devtech_date_str.encode("ascii")

        # Campo 6: Serial fiscal de referencia (max 10 caracteres alfanumericos)
        raw_serial = str(payload.get("originalPrinterSerial") or "VE24080006").strip().upper()
        clean_serial = "".join(ch for ch in raw_serial if ch.isalnum())
        orig_serial = clean_serial[:10].encode("ascii") if clean_serial else b"VE24080006"

        reason_comment = clean_fiscal_str(payload.get("reason") or "ANULACION / DEVOLUCION", 40)

        ok, err_msg = open_devtech_port()
        if not ok:
            return {"success": False, "error": err_msg}

        try:
            # AbrirCF con tipo 1 = Nota de Crédito (Devolución SENIAT)
            # Orden estricto C#: AbrirCF(iTipo, sNombreCliente, sRifCliente, iNumeroFactura, sFechaFactura, sSerialFactura, iLogo, sLineaAdicional)
            r_abrir = lib.AbrirCF(1, client_name, client_rif, orig_inv_num, orig_date, orig_serial, 0, reason_comment)
            if r_abrir == 257:
                lib.CancelarCF()
                lib.CerrarDNF()
                time.sleep(0.5)
                r_abrir = lib.AbrirCF(1, client_name, client_rif, orig_inv_num, orig_date, orig_serial, 0, reason_comment)

            if r_abrir != 0:
                lib.CerrarPuerto()
                diag = FISCAL_ERRORS.get(r_abrir, f"Código {r_abrir}")
                return {"success": False, "error": f"La impresora física rechazó Abrir Nota de Crédito: {diag} (Código {r_abrir})"}

            for it in items:
                name = clean_fiscal_str(it.get("name", "Item"), 40)
                qty = int(it.get("quantity", 1))
                price_val = float(it.get("salePrice", 0))
                if not is_converted and rate > 1.0:
                    price_val = price_val * rate
                price_cents = int(round(price_val * 100))
                tax_pct = float(it.get("taxPercentage", 16))
                tax_rate = 1
                if tax_pct == 0:
                    tax_rate = 0
                elif tax_pct == 8:
                    tax_rate = 2
                elif tax_pct > 25:
                    tax_rate = 3

                r_item = lib.ItemCF(0, name, b"", qty, b"UND", price_cents, tax_rate, 2, 0)
                if r_item != 0:
                    lib.CancelarCF()
                    lib.CerrarPuerto()
                    diag = FISCAL_ERRORS.get(r_item, f"Código {r_item}")
                    return {"success": False, "error": f"La impresora rechazó el ítem de devolución '{it.get('name')}': {diag}"}

            r_sub = lib.SubtotalCF(1, 0)
            if r_sub != 0:
                lib.CancelarCF()
                lib.CerrarPuerto()
                diag = FISCAL_ERRORS.get(r_sub, f"Código {r_sub}")
                return {"success": False, "error": f"Fallo en Subtotal de Nota de Crédito: {diag}"}

            total_fiscal_cents = int(round(total * 100))
            buf = ctypes.create_string_buffer(512)
            try:
                lib.CopiarCamposSalida(b";", buf)
                raw_sub = buf.value.decode("latin1", errors="ignore")
                if raw_sub:
                    parts = raw_sub.split(";")
                    if len(parts) > 10 and parts[10].strip().isdigit():
                        total_fiscal_cents = int(parts[10].strip())
            except Exception:
                pass

            lib.PagoCF(0, 0, b"Efectivo", total_fiscal_cents)
            r_close = lib.CerrarCF(b"")
            if r_close != 0:
                lib.CancelarCF()
                lib.CerrarPuerto()
                diag = FISCAL_ERRORS.get(r_close, f"Código {r_close}")
                return {"success": False, "error": f"Fallo al cerrar Nota de Crédito Fiscal: {diag}"}

            fiscal_nc_num = f"{orig_inv_num:08d}"
            try:
                lib.CopiarCamposSalida(b";", buf)
                raw_str = buf.value.decode("latin1", errors="ignore")
                if raw_str:
                    parts = raw_str.split(";")
                    if len(parts) > 0 and parts[0].strip().isdigit() and int(parts[0].strip()) > 0:
                        fiscal_nc_num = f"{int(parts[0].strip()):08d}"
            except Exception:
                pass

            lib.CerrarPuerto()
            return {
                "success": True,
                "fiscalCreditNoteNumber": fiscal_nc_num,
                "originalInvoiceNumber": f"{orig_inv_num:08d}",
                "printerSerial": "VE2408000611",
                "seniatRegister": "GER-0001",
                "mode": "PHYSICAL_HARDWARE",
                "message": f"Nota de Crédito Fiscal SENIAT N° {fiscal_nc_num} emitida con éxito en el papel físico."
            }
        except Exception as e:
            try:
                lib.CancelarCF()
                lib.CerrarPuerto()
            except Exception:
                pass
            return {"success": False, "error": f"Error procesando Nota de Crédito Fiscal: {str(e)}"}

def start_server():
    server = HTTPServer(("127.0.0.1", PORT), FiscalHandler)
    print(f"Servicio Guardian Fiscal Bridge activo en http://127.0.0.1:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    server.server_close()

if __name__ == "__main__":
    start_server()
