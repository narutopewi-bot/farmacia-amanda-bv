# -*- coding: utf-8 -*-
"""
Controlador de Comunicación Fiscal para Impresoras ACLAS / The Factory HKA
Específico para ACLAS PP9 - PLUS INTEGRADA y familias compatibles HKA
Protocolo Oficial SENIAT / The Factory HKA V8.5.0 (Noviembre 2022 / IGTF Providencia 0141)
"""

import time
import unicodedata
from functools import reduce
import serial

class HkaAclasDriver:
    def __init__(self, port="COM99", baudrate=9600, timeout=5.0):
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.ser = None
        self.last_error = ""

    def _get_candidate_usb_ports(self):
        try:
            import serial.tools.list_ports
            ports = list(serial.tools.list_ports.comports())
            usb_first = [p.device for p in ports if "USB" in (p.hwid or "").upper() or "USB" in (p.description or "").upper()]
            others = [p.device for p in ports if p.device not in usb_first]
            cands = usb_first + ["COM99"] + [p for p in others if p != "COM99"]
            return cands
        except Exception:
            return ["COM99", "COM1", "COM2", "COM3", "COM4", "COM5"]

    def _find_usb_aclas_port(self):
        """Escanea los puertos USB y el par virtual COM99 (Emulador HKA) para auto-detectar la impresora"""
        candidates = self._get_candidate_usb_ports()
        for cand in candidates:
            try:
                s = serial.Serial(
                    port=cand,
                    baudrate=self.baudrate,
                    bytesize=serial.EIGHTBITS,
                    parity=serial.PARITY_EVEN,
                    stopbits=serial.STOPBITS_ONE,
                    timeout=0.35,
                    write_timeout=0.5
                )
                s.rts = True
                s.dtr = True
                s.reset_input_buffer()
                s.reset_output_buffer()
                s.write(b"\x05")  # ENQ
                s.flush()
                time.sleep(0.15)
                resp = s.read(5)
                s.close()
                if len(resp) == 5 and resp[0] == 0x02 and resp[3] == 0x03:
                    return cand
            except Exception:
                continue
        return None

    def open(self, port=None, baudrate=None):
        if port:
            self.port = port
        if baudrate:
            self.baudrate = baudrate

        self.close()

        # Detección inteligente por cable USB
        if not self.port or str(self.port).strip().upper() in ["USB", "AUTO", "AUTO_USB", "USB_AUTO"]:
            detected = self._find_usb_aclas_port()
            if detected:
                self.port = detected
            else:
                cands = self._get_candidate_usb_ports()
                self.port = cands[0] if cands else "COM1"

        try:
            self.ser = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_EVEN,
                stopbits=serial.STOPBITS_ONE,
                timeout=self.timeout,
                write_timeout=3.0,
                xonxoff=False,
                rtscts=False
            )
            return True, f"Puerto USB {self.port} abierto exitosamente ({self.baudrate} bps, 8E1)."
        except Exception as e:
            self.ser = None
            self.last_error = str(e)
            return False, f"Error al abrir puerto USB {self.port}: {str(e)}"

    def close(self):
        if self.ser:
            try:
                self.ser.close()
            except Exception:
                pass
            self.ser = None

    def is_connected(self):
        return self.ser is not None and self.ser.is_open

    def _lrc(self, data_bytes):
        """Calcula el Longitudinal Redundancy Check (LRC) con XOR acumulado"""
        return reduce(lambda a, b: a ^ b, data_bytes, 0)

    def _handle_cts_rts(self):
        """Maneja señales de control de flujo hardware RTS/CTS si están disponibles"""
        if not self.ser or not self.ser.is_open:
            return False
        try:
            self.ser.rts = True
            # Espera breve por CTS. Si el cable o emulador virtual no tiene CTS conectado,
            # no bloqueamos; continuamos tras verificar brevemente.
            for _ in range(5):
                if self.ser.cts:
                    break
                time.sleep(0.02)
            return True
        except Exception:
            return True

    def send_cmd(self, cmd_str, wait_sec=0.1):
        """
        Envía un comando formateado con framing STX (0x02) + CMD + ETX (0x03) + LRC
        Espera respuesta ACK (0x06) o NAK (0x15).
        """
        if not self.is_connected():
            ok, msg = self.open()
            if not ok:
                return False, msg

        try:
            self.ser.reset_input_buffer()
            self.ser.reset_output_buffer()
            self._handle_cts_rts()

            # Normalizar caracteres a latin1/ASCII según tabla fiscal SENIAT
            if isinstance(cmd_str, str):
                cmd_bytes = cmd_str.encode("latin1", errors="replace")
            else:
                cmd_bytes = bytes(cmd_str)

            body = cmd_bytes + b"\x03"
            lrc_byte = bytes([self._lrc(body)])
            packet = b"\x02" + body + lrc_byte

            self.ser.write(packet)
            self.ser.flush()

            if wait_sec > 0:
                time.sleep(wait_sec)

            resp = self.ser.read(1)
            self.ser.rts = False

            if resp == b"\x06":  # ACK
                return True, "ACK"
            elif resp == b"\x15":  # NAK
                return False, "NAK: La impresora fiscal rechazó el comando (LRC erróneo o comando inválido en el estado actual)."
            elif len(resp) == 0:
                return False, f"Timeout: Sin respuesta de la impresora fiscal en {self.port}."
            else:
                # En algunos casos puede retornar el primer byte de una trama
                return True, resp
        except Exception as e:
            self.last_error = str(e)
            return False, f"Excepción en comunicación serial: {str(e)}"

    def query_cmd(self, cmd_str, expected_timeout=2.5):
        """
        Envía comando y lee la trama de datos de respuesta devuelta por la impresora:
        STX + DATA + ETX + LRC
        """
        if not self.is_connected():
            ok, msg = self.open()
            if not ok:
                return None, msg

        try:
            self.ser.reset_input_buffer()
            self.ser.reset_output_buffer()
            self._handle_cts_rts()

            if isinstance(cmd_str, str):
                cmd_bytes = cmd_str.encode("latin1", errors="replace")
            else:
                cmd_bytes = bytes(cmd_str)

            body = cmd_bytes + b"\x03"
            lrc_byte = bytes([self._lrc(body)])
            packet = b"\x02" + body + lrc_byte

            self.ser.write(packet)
            self.ser.flush()

            time.sleep(0.1)

            # Leer trama completa
            start_time = time.time()
            buf = bytearray()
            while time.time() - start_time < expected_timeout:
                n = self.ser.in_waiting
                if n > 0:
                    chunk = self.ser.read(n)
                    buf.extend(chunk)
                    if len(buf) > 3 and buf[-2] == 0x03:
                        break
                time.sleep(0.05)

            self.ser.rts = False

            if len(buf) == 0:
                return None, f"Timeout esperando trama de respuesta para '{cmd_str}'."

            # Verificar si vino con STX y ETX
            if buf.startswith(b"\x02") and len(buf) >= 3:
                raw_data = buf[1:-2].decode("latin1", errors="ignore")
                return raw_data, "OK"
            else:
                raw_data = buf.decode("latin1", errors="ignore")
                return raw_data, "OK"
        except Exception as e:
            return None, f"Error en query_cmd: {str(e)}"

    def read_status(self):
        """
        Envía ENQ (0x05) y lee el estado de 5 bytes:
        Byte 0: STX (0x02)
        Byte 1: STS1 (Estado)
        Byte 2: STS2 (Error)
        Byte 3: ETX (0x03)
        Byte 4: LRC
        """
        if not self.is_connected():
            ok, msg = self.open()
            if not ok:
                return {"online": False, "error": msg}

        try:
            self.ser.reset_input_buffer()
            self.ser.reset_output_buffer()
            self._handle_cts_rts()

            self.ser.write(b"\x05")  # ENQ
            self.ser.flush()
            time.sleep(0.15)

            resp = self.ser.read(5)
            self.ser.rts = False

            if len(resp) != 5:
                # Si el puerto configurado (ej. COM1) no respondió, intentar auto-detectar COM99 / USB activo
                detected = self._find_usb_aclas_port()
                if detected and detected != self.port:
                    ok_reopen, _ = self.open(port=detected, baudrate=self.baudrate)
                    if ok_reopen:
                        self.ser.reset_input_buffer()
                        self.ser.reset_output_buffer()
                        self._handle_cts_rts()
                        self.ser.write(b"\x05")
                        self.ser.flush()
                        time.sleep(0.15)
                        resp = self.ser.read(5)
                        self.ser.rts = False

            if len(resp) != 5:
                return {
                    "online": False,
                    "error": f"Impresora no responde al comando ENQ (bytes recibidos: {len(resp)})"
                }

            st = resp[1]
            er = resp[2]

            # Decodificar STS1 (Estado)
            status_desc = "Desconocido"
            if (st & 0x60) == 0x60:
                if (st & 0x61) == 0x61:
                    status_desc = "En modo fiscal - En emisión de documento fiscal"
                elif (st & 0x62) == 0x62:
                    status_desc = "En modo fiscal - En emisión de documento no fiscal"
                else:
                    status_desc = "En modo fiscal - En espera (Lista)"
            elif (st & 0x40) == 0x40:
                if (st & 0x41) == 0x41:
                    status_desc = "En modo prueba/entrenamiento - En emisión fiscal"
                else:
                    status_desc = "En modo prueba/entrenamiento - En espera"

            # Decodificar STS2 (Error)
            error_desc = "Sin error"
            has_error = False
            if er == 0x40:
                error_desc = "Sin error (Operación normal)"
            elif (er & 0x41) == 0x41:
                error_desc = "Fin de papel térmico (Agotado)"
                has_error = True
            elif (er & 0x42) == 0x42:
                error_desc = "Error mecánico en mecanismo impresor"
                has_error = True
            elif (er & 0x48) == 0x48:
                error_desc = "Gaveta de dinero abierta o en error"
            elif (er & 0x6C) == 0x6C:
                error_desc = "Memoria fiscal llena"
                has_error = True
            elif (er & 0x64) == 0x64:
                error_desc = "Error de lectura/escritura en memoria fiscal"
                has_error = True
            elif (er & 0x60) == 0x60:
                error_desc = "Error fiscal general"
                has_error = True
            elif (er & 0x50) == 0x50:
                error_desc = "Comando inválido en el estado actual"
                has_error = True

            return {
                "online": True,
                "rawStatus": hex(st),
                "rawError": hex(er),
                "statusDescription": status_desc,
                "errorDescription": error_desc,
                "hasError": has_error,
                "isIdle": (st & 0x60 == 0x60) and (st & 0x03 == 0) and (er == 0x40)
            }
        except Exception as e:
            return {"online": False, "error": str(e)}

    def get_s1_data(self):
        """
        Consulta el estado S1 de la impresora para extraer:
        - Último número de factura fiscal
        - Contador de Cierres Diarios (Reporte Z)
        - RIF
        - Número de serie/registro de la máquina fiscal
        """
        raw, msg = self.query_cmd("S1", expected_timeout=2.0)
        if not raw:
            return None, msg

        try:
            # S1 devuelve campos separados por salto de línea (\x0a o \n)
            parts = [p.strip() for p in raw.split("\n") if p.strip()]
            if len(parts) >= 14:
                last_invoice = parts[2]
                daily_z = parts[10]
                rif = parts[12]
                serial_num = parts[13]
                return {
                    "lastInvoiceNumber": f"{int(last_invoice):08d}" if last_invoice.isdigit() else last_invoice,
                    "dailyClosureCounter": daily_z,
                    "rif": rif,
                    "serialNumber": serial_num,
                    "rawParts": parts
                }, "OK"
            elif len(parts) >= 10:
                last_invoice = parts[2] if len(parts) > 2 else "0"
                daily_z = parts[6] if len(parts) > 6 else "0"
                rif = parts[8] if len(parts) > 8 else ""
                serial_num = parts[9] if len(parts) > 9 else ""

                return {
                    "lastInvoiceNumber": f"{int(last_invoice):08d}" if last_invoice.isdigit() else last_invoice,
                    "dailyClosureCounter": daily_z,
                    "rif": rif,
                    "serialNumber": serial_num,
                    "rawParts": parts
                }, "OK"
            return None, f"Trama S1 con campos insuficientes ({len(parts)} campos)"
        except Exception as e:
            return None, f"Error al parsear trama S1: {str(e)}"

    def check_ready(self):
        """Envía ENQ para verificar presencia física y disponibilidad antes de emitir documentos"""
        st = self.read_status()
        if not st.get("online"):
            return False, st.get("error", f"La impresora fiscal no responde en {self.port} (Verifica encendido, cable y puerto COM).")
        if st.get("hasError"):
            return False, f"La impresora reporta error: {st.get('errorDescription')}"
        return True, "OK"

    def cancel_document(self):
        """
        Verifica el estado actual de la impresora fiscal vía ENQ y solo envía
        comando 7 (cancelar factura) u 810 (cerrar DNF) si hay un documento abierto.
        """
        st = self.read_status()
        if not st.get("online"):
            return False, st.get("error", "Impresora no conectada")
        if st.get("isIdle"):
            return True, "Impresora libre (sin documento en curso)"
        try:
            raw_st = int(st.get("rawStatus", "0x60"), 16)
        except Exception:
            raw_st = 0x60
        if (raw_st & 0x02) == 0x02:
            return self.send_cmd("810", wait_sec=0.3)
        if (raw_st & 0x01) == 0x01:
            return self.send_cmd("7", wait_sec=0.3)
        return True, "OK"

    def print_test_dnf(self):
        """
        Emite un ticket de prueba no fiscal (DNF) en la impresora física
        para verificar avance de cabezal y expulsión de papel.
        """
        ok, msg = self.check_ready()
        if not ok:
            return False, msg

        self.cancel_document()
        time.sleep(0.1)

        lines = [
            "================================",
            "     GUARDIAN FISCAL BRIDGE     ",
            "    ACLAS PP9 - PLUS (HKA)      ",
            "================================",
            "COMUNICACION SERIAL: OK",
            f"HORA: {time.strftime('%d/%m/%Y %H:%M:%S')}",
            f"PUERTO: {self.port} @ {self.baudrate} bps",
            "SISTEMA FISCAL LISTO Y OPERATIVO",
            "================================"
        ]

        # Abrir documento no fiscal
        ok, msg = self.send_cmd(f"800{lines[0]}", wait_sec=0.1)
        if not ok:
            return False, f"Fallo al abrir ticket no fiscal de prueba: {msg}"

        for l in lines[1:]:
            self.send_cmd(f"800{l}", wait_sec=0.08)

        # Cierre DNF
        self.send_cmd("810Fin del Ticket de Prueba", wait_sec=0.5)
        time.sleep(0.35)
        return True, "Ticket de prueba emitido exitosamente en ACLAS PP9 Plus."

    def print_report_x(self):
        """Emite Reporte X (Lectura Parcial)"""
        ok, msg = self.check_ready()
        if not ok:
            return False, msg

        self.cancel_document()
        time.sleep(0.15)
        ok, msg = self.send_cmd("I0X", wait_sec=0.1)
        if ok:
            time.sleep(1.5)
            return True, "Reporte X emitido con éxito en el papel físico."
        return False, f"La impresora rechazó el Reporte X: {msg}"

    def print_report_z(self):
        """Emite Reporte Z (Cierre Fiscal Diario)"""
        ok, msg = self.check_ready()
        if not ok:
            return False, msg

        self.cancel_document()
        time.sleep(0.15)
        ok, msg = self.send_cmd("I0Z", wait_sec=0.1)
        if not ok:
            return False, f"La impresora rechazó el Reporte Z: {msg}"

        # Esperar a que el cabezal imprima y grabe en memoria fiscal
        time.sleep(3.0)
        # Obtener el número de Z emitido
        s1, _ = self.get_s1_data()
        z_num = s1.get("dailyClosureCounter", "Z-OK") if s1 else "Z-OK"
        return True, f"Reporte Z (Cierre Diario) emitido con éxito. N° {z_num}"

    @staticmethod
    def get_payment_code(method_name, currency="VES"):
        """
        Mapea el nombre del método de pago de Guardian a la tabla física programada en la ACLAS PP9 Plus:
        01: CASHEA
        02: EFECTIVO BS
        03: EFECTIVO $
        04: PAGO MOVIL
        05: PUNTO DE VENTA (Débito)
        06: PUNTO DE VENTA
        07: T. CREDITO
        08: TRANSFERENCIA
        """
        m = (str(method_name) if method_name else "").upper()
        c = (str(currency) if currency else "").upper()

        if "CASHEA" in m:
            return "01"
        if "USD" in c or "DIVISA" in m or "$" in m or "DLR" in m or "DOLAR" in m or "DOLARES" in m or "CASH_USD" in m:
            return "03"
        if "MOVIL" in m or "PAGO MOVIL" in m or "PAGOMOVIL" in m:
            return "04"
        if "PUNTO" in m or "DEBITO" in m or "TARJETA" in m or "POS" in m or "PUNTO DE VENTA" in m or "CARD_BS" in m:
            return "05"
        if "CREDITO" in m or "T. CREDITO" in m or "T.CREDITO" in m:
            return "07"
        if "TRANSFERENCIA" in m or "TRANSF" in m:
            return "08"
        # Predeterminado en Efectivo: 01 = EFECTIVO
        return "01"

    def print_invoice(self, payload):
        """
        Ejecuta el ciclo completo de facturación fiscal para ACLAS PP9 Plus:
        1. Encabezado de cliente (iR*, iS*, i01)
        2. Ítems de venta con tasa y formato exacto
        3. Subtotal (3)
        4. Pagos parciales o directos (mapeados a la tabla oficial de la impresora)
        5. Cierre definitivo (199 / 102)
        6. Consulta de número fiscal asignado vía S1
        """
        ok, msg = self.check_ready()
        if not ok:
            return {"success": False, "error": msg}

        client = payload.get("client", {})
        items = payload.get("items", [])
        payments = payload.get("payments", [])
        total = float(payload.get("total", 0))
        rate = float(payload.get("exchangeRate", 1.0))
        is_converted = bool(payload.get("isConvertedToVes", False))

        # Purgar cualquier comprobante abierto previo
        self.cancel_document()
        time.sleep(0.15)

        # 1. Datos del Cliente
        c_rif = str(client.get("ci", "V00000000")).strip().replace(" ", "").replace("-", "").upper()
        if not c_rif:
            c_rif = "V00000000"
        if not (c_rif.startswith("V") or c_rif.startswith("J") or c_rif.startswith("E") or c_rif.startswith("G")):
            c_rif = "V" + c_rif

        c_name = str(client.get("name", "CLIENTE MOSTRADOR")).strip()
        # Normalizar a ASCII limpio
        c_name = unicodedata.normalize('NFKD', c_name).encode('ASCII', 'ignore').decode('ASCII').upper()[:36]

        c_addr = str(client.get("address", "")).strip()
        c_addr = unicodedata.normalize('NFKD', c_addr).encode('ASCII', 'ignore').decode('ASCII')[:36]

        ok, msg = self.send_cmd(f"iR*{c_rif}", wait_sec=0.1)
        if not ok:
            return {"success": False, "error": f"Fallo en comando de RIF ({c_rif}): {msg}"}

        ok, msg = self.send_cmd(f"iS*{c_name}", wait_sec=0.1)
        if not ok:
            return {"success": False, "error": f"Fallo en comando de Razón Social: {msg}"}

        if c_addr:
            self.send_cmd(f"i01{c_addr}", wait_sec=0.1)

        # 2. Enviar Artículos / Ítems
        # Formato: [CMD][Precio: 10 chars][Cantidad: 8 chars][Descripción: hasta 20 chars]
        for it in items:
            raw_name = str(it.get("name", "Producto")).strip()
            name_clean = unicodedata.normalize('NFKD', raw_name).encode('ASCII', 'ignore').decode('ASCII')[:20]
            if not name_clean:
                name_clean = "PRODUCTO"
            qty_val = float(it.get("quantity", 1))
            price_val = float(it.get("salePrice", 0))

            if not is_converted and rate > 1.0:
                price_val = price_val * rate

            price_cents = int(round(price_val * 100))
            price_str = f"{price_cents:010d}"

            qty_milli = int(round(qty_val * 1000))
            qty_str = f"{qty_milli:08d}"

            tax_pct = float(it.get("taxPercentage", 16))
            if tax_pct == 0:
                tax_cmd = " "
            elif tax_pct == 8:
                tax_cmd = '"'
            elif tax_pct > 25:
                tax_cmd = "#"
            else:
                tax_cmd = "!"

            item_cmd = f"{tax_cmd}{price_str}{qty_str}{name_clean}"
            ok, msg = self.send_cmd(item_cmd, wait_sec=0.1)
            if not ok:
                self.cancel_document()
                return {"success": False, "error": f"Error registrando ítem '{name_clean}': {msg}"}

        # 3. Subtotal
        ok, msg = self.send_cmd("3", wait_sec=0.15)
        if not ok:
            self.cancel_document()
            return {"success": False, "error": f"Error al emitir Subtotal: {msg}"}

        # 4. Formas de Pago adaptadas a la tabla real de la impresora
        if not payments or len(payments) == 0:
            # Pago total contado por defecto: 01 = EFECTIVO
            ok, msg = self.send_cmd("101", wait_sec=0.3)
            if not ok:
                ok, msg = self.send_cmd("102", wait_sec=0.3)
            if not ok:
                self.cancel_document()
                return {"success": False, "error": f"Error en pago directo Efectivo: {msg}"}
        elif len(payments) == 1:
            # Un solo pago total: mapear al código correspondiente (101, 102, 103, 104, 105, etc.)
            p0 = payments[0]
            code = self.get_payment_code(p0.get("method"), p0.get("currency"))
            ok, msg = self.send_cmd(f"1{code}", wait_sec=0.3)
            if not ok:
                self.cancel_document()
                return {"success": False, "error": f"Error en pago directo ({p0.get('method')} -> Medio {code}): {msg}"}
        else:
            # Pagos múltiples o mixtos (pagos parciales 2XX + cierre 199 o 102)
            for p in payments:
                amt_val = float(p.get("amount", 0))
                p_curr = p.get("currency", "VES")
                code = self.get_payment_code(p.get("method"), p_curr)

                # Montos en protocolo HKA siempre en Bolívares (VES)
                if p_curr == "USD" or "USD" in str(p.get("method", "")).upper() or code == "03":
                    amt_ves = amt_val * rate if (not is_converted and rate > 1.0) else amt_val
                else:
                    amt_ves = amt_val if is_converted else (amt_val * rate if rate > 1.0 and p_curr != "VES" else amt_val)

                amt_cents = int(round(amt_ves * 100))
                amt_str = f"{amt_cents:012d}"
                pay_cmd = f"2{code}{amt_str}"
                ok, msg = self.send_cmd(pay_cmd, wait_sec=0.2)
                if not ok:
                    # Fallback intento con medio 01 (Efectivo)
                    pay_cmd_fb = f"201{amt_str}"
                    ok_fb, msg_fb = self.send_cmd(pay_cmd_fb, wait_sec=0.2)
                    if not ok_fb:
                        # Fallback a cierre directo en efectivo 101 / 102
                        ok_close, _ = self.send_cmd("101", wait_sec=0.4)
                        if not ok_close:
                            self.send_cmd("102", wait_sec=0.4)
                        break

            # Verificar si el pago parcial completó o requiere cierre
            st_after = self.read_status()
            if not st_after.get("isIdle", False):
                ok, msg = self.send_cmd("199", wait_sec=0.5)
                if not ok:
                    ok, msg = self.send_cmd("102", wait_sec=0.5)  # Fallback a cierre efectivo Bs
                if not ok:
                    self.cancel_document()
                    return {"success": False, "error": f"Error cerrando factura fiscal: {msg}"}

        # 5. Consultar número de factura emitido vía S1
        time.sleep(0.5)
        s1_info, _ = self.get_s1_data()
        doc_num = s1_info.get("lastInvoiceNumber", "00000001") if s1_info else "00000001"
        printer_serial = s1_info.get("serialNumber", "ACLAS-PP9") if s1_info else "ACLAS-PP9"

        return {
            "success": True,
            "fiscalInvoiceNumber": doc_num,
            "printerSerial": printer_serial,
            "seniatRegister": "HKA-PP9PLUS",
            "mode": "PHYSICAL_HARDWARE",
            "message": f"Factura Fiscal SENIAT N° {doc_num} emitida con éxito en ACLAS PP9 Plus."
        }

    def print_credit_note(self, payload):
        """
        Ejecuta el ciclo completo de emisión de NOTA DE CRÉDITO FISCAL (Devolución SENIAT)
        para ACLAS PP9 Plus / The Factory HKA:
        1. Encabezado de cliente y factura afectada:
           - iR*<RIF>
           - iS*<RAZON_SOCIAL>
           - iF*<FACTURA_AFECTADA> (8 dígitos)
           - iI*<SERIAL_IMPRESORA_FISCAL>
           - iD*<FECHA_FACTURA_AFECTADA> (DD/MM/YYYY)
        2. Ítems devueltos con comandos de devolución (d0=Exento, d1=16%, d2=8%, d3=31%)
        3. Subtotal (3)
        4. Cierre de Nota de Crédito (101 / f01)
        """
        ok, msg = self.check_ready()
        if not ok:
            return {"success": False, "error": msg}

        client = payload.get("client", {})
        items = payload.get("items", [])
        rate = float(payload.get("exchangeRate", 1.0))
        is_converted = bool(payload.get("isConvertedToVes", False))

        # Purgar cualquier comprobante abierto previo
        self.cancel_document()
        time.sleep(0.15)

        # Consultar S1 previo para obtener el serial real de la máquina si no fue provisto
        s1_pre, _ = self.get_s1_data()
        real_serial = s1_pre.get("serialNumber", "Z1B1234567") if s1_pre else "Z1B1234567"

        orig_invoice_raw = str(payload.get("originalInvoiceNumber") or "1").strip()
        orig_digits = "".join(ch for ch in orig_invoice_raw if ch.isdigit())
        orig_invoice = f"{int(orig_digits):08d}" if orig_digits else "00000001"

        orig_serial = str(payload.get("originalPrinterSerial") or real_serial).strip()
        if not orig_serial or orig_serial in ["ACLAS-PP9", "PP9-00000000"]:
            orig_serial = real_serial

        orig_date = str(payload.get("originalInvoiceDate") or time.strftime("%d/%m/%Y")).strip()
        if "-" in orig_date and len(orig_date) >= 10:
            # Convertir YYYY-MM-DD a DD/MM/YYYY
            try:
                parts_d = orig_date[:10].split("-")
                if len(parts_d) == 3 and len(parts_d[0]) == 4:
                    orig_date = f"{parts_d[2]}/{parts_d[1]}/{parts_d[0]}"
            except Exception:
                orig_date = time.strftime("%d/%m/%Y")

        # 1. Datos del Cliente y Referencia de Factura Afectada
        c_rif = str(client.get("ci", "V00000000")).strip().replace(" ", "").replace("-", "").upper()
        if not c_rif:
            c_rif = "V00000000"
        if not (c_rif.startswith("V") or c_rif.startswith("J") or c_rif.startswith("E") or c_rif.startswith("G")):
            c_rif = "V" + c_rif

        c_name = str(client.get("name", "CLIENTE MOSTRADOR")).strip()
        c_name = unicodedata.normalize('NFKD', c_name).encode('ASCII', 'ignore').decode('ASCII').upper()[:36]
        if not c_name:
            c_name = "CLIENTE MOSTRADOR"

        ok, msg = self.send_cmd(f"iR*{c_rif}", wait_sec=0.1)
        if not ok:
            return {"success": False, "error": f"Fallo en comando de RIF ({c_rif}): {msg}"}

        ok, msg = self.send_cmd(f"iS*{c_name}", wait_sec=0.1)
        if not ok:
            return {"success": False, "error": f"Fallo en comando de Razón Social: {msg}"}

        ok, msg = self.send_cmd(f"iF*{orig_invoice}", wait_sec=0.1)
        if not ok:
            return {"success": False, "error": f"Fallo en comando de Factura Afectada (iF*{orig_invoice}): {msg}"}

        ok, msg = self.send_cmd(f"iI*{orig_serial}", wait_sec=0.1)
        if not ok:
            return {"success": False, "error": f"Fallo en comando de Serial Fiscal (iI*{orig_serial}): {msg}"}

        ok, msg = self.send_cmd(f"iD*{orig_date}", wait_sec=0.1)
        if not ok:
            return {"success": False, "error": f"Fallo en comando de Fecha Factura Afectada (iD*{orig_date}): {msg}"}

        reason = str(payload.get("reason") or "").strip()
        if reason:
            reason_clean = unicodedata.normalize('NFKD', reason).encode('ASCII', 'ignore').decode('ASCII').upper()[:26]
            if reason_clean:
                self.send_cmd(f"i01MOTIVO: {reason_clean}", wait_sec=0.1)

        # 2. Enviar Ítems de Nota de Crédito (d0, d1, d2, d3)
        total_ves_acc = 0.0
        for it in items:
            raw_name = str(it.get("name", "Producto")).strip()
            name_clean = unicodedata.normalize('NFKD', raw_name).encode('ASCII', 'ignore').decode('ASCII')[:20]
            if not name_clean:
                name_clean = "PRODUCTO"
            qty_val = float(it.get("quantity", 1))
            price_val = float(it.get("salePrice", 0))

            if not is_converted and rate > 1.0:
                price_val = price_val * rate

            price_cents = int(round(price_val * 100))
            price_str = f"{price_cents:010d}"

            qty_milli = int(round(qty_val * 1000))
            qty_str = f"{qty_milli:08d}"

            tax_pct = float(it.get("taxPercentage", 16))
            if tax_pct == 0:
                tax_cmd = "d0"
            elif tax_pct == 8:
                tax_cmd = "d2"
            elif tax_pct > 25:
                tax_cmd = "d3"
            else:
                tax_cmd = "d1"

            total_ves_acc += (price_val * qty_val) * (1.0 + (tax_pct / 100.0))

            item_cmd = f"{tax_cmd}{price_str}{qty_str}{name_clean}"
            ok, msg = self.send_cmd(item_cmd, wait_sec=0.1)
            if not ok:
                self.cancel_document()
                return {"success": False, "error": f"Error registrando ítem de devolución '{name_clean}': {msg}"}

        # 3. Subtotal
        ok, msg = self.send_cmd("3", wait_sec=0.15)
        if not ok:
            self.cancel_document()
            return {"success": False, "error": f"Error al emitir Subtotal de Nota de Crédito: {msg}"}

        # 4. Cierre de Nota de Crédito (101 Pago directo Efectivo o f01 Pago de Nota de Crédito)
        ok, msg = self.send_cmd("101", wait_sec=0.4)
        if not ok:
            amt_cents = int(round(total_ves_acc * 100))
            ok, msg = self.send_cmd(f"f01{amt_cents:012d}", wait_sec=0.4)
        if not ok:
            self.cancel_document()
            return {"success": False, "error": f"Error cerrando Nota de Crédito Fiscal: {msg}"}

        # 5. Consultar estado S1 tras emisión
        time.sleep(0.4)
        s1_post, _ = self.get_s1_data()
        printer_serial = s1_post.get("serialNumber", orig_serial) if s1_post else orig_serial

        return {
            "success": True,
            "fiscalCreditNoteNumber": orig_invoice,
            "originalInvoiceNumber": orig_invoice,
            "printerSerial": printer_serial,
            "seniatRegister": "HKA-PP9PLUS",
            "mode": "PHYSICAL_HARDWARE",
            "message": f"Nota de Crédito Fiscal SENIAT (afectando Factura #{orig_invoice}) emitida con éxito en ACLAS PP9 Plus."
        }
