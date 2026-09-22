import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

# ---------------------------------------------------------
# PALETA DE COLORES CORPORATIVOS (AMANDA B&V C.A.)
# ---------------------------------------------------------
PRIMARY_RED = colors.HexColor('#cf152b')      # Rojo carmesí corporativo
DARK_RED = colors.HexColor('#b30e20')         # Rojo profundo
PRIMARY_GREEN = colors.HexColor('#006837')    # Verde farmacia oficial
DEEP_GREEN = colors.HexColor('#012b18')       # Verde oscuro institucional / fondo
ACCENT_GREEN = colors.HexColor('#004725')     # Verde bosque
LIGHT_GREEN = colors.HexColor('#e8f5e9')      # Fondo verde suave para tablas
LIGHT_GRAY = colors.HexColor('#f8fafc')       # Fondo neutro claro
BORDER_GRAY = colors.HexColor('#cbd5e1')      # Borde sutil
TEXT_DARK = colors.HexColor('#0f172a')        # Texto principal
TEXT_MUTED = colors.HexColor('#475569')       # Texto secundario
WHITE = colors.HexColor('#ffffff')

# ---------------------------------------------------------
# CANVAS NUMERADO PARA ENCABEZADOS Y PIES DE PÁGINA
# ---------------------------------------------------------
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        # En la página de portada (página 1) no dibujamos encabezado ni pie estándar
        if self._pageNumber == 1:
            return

        page_width, page_height = letter
        margin = 36  # 0.5 pulgada

        # --- ENCABEZADO (Páginas 2 en adelante) ---
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(PRIMARY_GREEN)
        self.drawString(margin, page_height - 20, "EXPENDIO DE MEDICINAS AMANDA B&V C.A.  |  SICM: 50530")
        
        self.setFont("Helvetica", 8)
        self.setFillColor(TEXT_MUTED)
        self.drawRightString(page_width - margin, page_height - 20, "DOSSIER COMERCIAL & ESPECIFICACIONES ERP")

        # Línea divisoria superior doble (Verde y Rojo)
        self.setStrokeColor(PRIMARY_GREEN)
        self.setLineWidth(1.5)
        self.line(margin, page_height - 26, page_width - margin, page_height - 26)
        
        self.setStrokeColor(PRIMARY_RED)
        self.setLineWidth(1)
        self.line(margin, page_height - 28, page_width - margin, page_height - 28)

        # --- PIE DE PÁGINA ---
        self.setStrokeColor(BORDER_GRAY)
        self.setLineWidth(0.8)
        self.line(margin, 30, page_width - margin, 30)

        self.setFont("Helvetica", 7.5)
        self.setFillColor(TEXT_MUTED)
        self.drawString(margin, 20, "Documento Confidencial de Presentación Comercial | Software de Gestión Farmacéutica & E-Commerce")

        page_str = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(page_width - margin, 20, page_str)
        self.restoreState()


def build_pdf(filename="Dossier_Comercial_Software_Farmacia.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    # Estilos tipográficos personalizados
    title_cover_style = ParagraphStyle(
        'CoverTitle',
        fontName='Helvetica-Bold',
        fontSize=21,
        leading=26,
        textColor=DEEP_GREEN,
        alignment=1, # Centrado
        spaceAfter=10
    )

    subtitle_cover_style = ParagraphStyle(
        'CoverSubtitle',
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        textColor=PRIMARY_RED,
        alignment=1,
        spaceAfter=15
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=DEEP_GREEN,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    subsection_heading = ParagraphStyle(
        'SubSectionHeading',
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=PRIMARY_RED,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=TEXT_DARK,
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=TEXT_DARK,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_DARK,
        leftIndent=14,
        firstLineIndent=-9,
        spaceAfter=3
    )

    subbullet_style = ParagraphStyle(
        'SubBullet',
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=TEXT_DARK,
        leftIndent=28,
        firstLineIndent=-8,
        spaceAfter=2
    )

    table_cell = ParagraphStyle(
        'TableCell',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=TEXT_DARK
    )

    table_header = ParagraphStyle(
        'TableHeader',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=WHITE
    )

    callout_style = ParagraphStyle(
        'Callout',
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=DEEP_GREEN
    )

    story = []

    # =========================================================
    # PÁGINA 1: PORTADA EJECUTIVA
    # =========================================================
    
    # Banner decorativo superior de la portada
    banner_bar = Table([[""]], colWidths=[540], rowHeights=[6])
    banner_bar.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), PRIMARY_GREEN),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(banner_bar)
    story.append(Spacer(1, 12))

    # Logotipo oficial de la empresa centrado
    logo_path = 'frontend/public/logo.jpg'
    if os.path.exists(logo_path):
        logo_img = Image(logo_path, width=420, height=136.5)
        logo_img.hAlign = 'CENTER'
        story.append(logo_img)
    story.append(Spacer(1, 14))

    # Título Principal
    story.append(Paragraph("SISTEMA INTEGRAL DE GESTIÓN FARMACÉUTICA", title_cover_style))
    story.append(Paragraph("ERP ADMINISTRATIVO &bull; FACTURACIÓN MULTIMONEDA &bull; TIENDA ONLINE EN TIEMPO REAL", subtitle_cover_style))
    story.append(Spacer(1, 6))

    # Caja de Resumen Destacado de Portada
    highlight_data = [
        [
            Paragraph("<b>PROPUESTA TECNOLÓGICA PARA FARMACIAS Y EXPENDIOS DE MEDICINAS</b>", ParagraphStyle('Hdr', fontName='Helvetica-Bold', fontSize=10, leading=13, textColor=WHITE)),
        ],
        [
            Paragraph(
                "Una solución de software integral, moderna y robusta concebida para transformar una farmacia tradicional en un <b>centro farmacéutico automatizado y omnicanal</b>. Combina la agilidad del mostrador físico con una <b>tienda en línea disponible 24/7</b>, control riguroso de inventarios y vencimientos por lote, soporte multimoneda nativo (Dólares y Bolívares con tasa BCV) y sincronización en vivo sin comisiones a plataformas externas.",
                ParagraphStyle('Txt', fontName='Helvetica', fontSize=8.5, leading=12.5, textColor=DEEP_GREEN)
            )
        ]
    ]
    t_highlight = Table(highlight_data, colWidths=[540])
    t_highlight.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_GREEN),
        ('BACKGROUND', (0,1), (-1,1), LIGHT_GREEN),
        ('BOX', (0,0), (-1,-1), 1.2, PRIMARY_GREEN),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(t_highlight)
    story.append(Spacer(1, 14))

    # Cuadrícula de 4 Pilares Comerciales
    pilares_data = [
        [
            Paragraph("<b>1. Facturación Rápida Multimoneda</b><br/>Cobro en $ USD, Bs. BCV, Efectivo, Pago Móvil, Zelle o Tarjeta. Vueltos automáticos en ambas monedas y ticket térmico de 80mm.", table_cell),
            Paragraph("<b>2. Tienda Online Directa</b><br/>Los clientes compran por internet desde su celular. Eligen Delivery express o Retiro en farmacia y adjuntan comprobante bancario.", table_cell),
        ],
        [
            Paragraph("<b>3. Trazabilidad de Lotes y FEFO</b><br/>Alertas semaforizadas de medicamentos por caducar. Algoritmo que despacha primero el lote más antiguo para evitar mermas.", table_cell),
            Paragraph("<b>4. Blindaje Financiero y Arqueos</b><br/>Cierres de caja ciegos por turno, control de gastos menores, cuentas por cobrar (créditos) y cuentas por pagar a droguerías.", table_cell),
        ]
    ]
    t_pilares = Table(pilares_data, colWidths=[265, 265])
    t_pilares.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_GRAY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_GRAY),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_pilares)
    story.append(Spacer(1, 16))

    # Ficha Técnica y Metadatos del Documento
    metadata_data = [
        [
            Paragraph("<b>Razón Social:</b>", table_cell),
            Paragraph("Expendio de Medicinas Amanda B&V C.A.", table_cell),
            Paragraph("<b>Código Sanitario:</b>", table_cell),
            Paragraph("SICM: 50530", table_cell),
        ],
        [
            Paragraph("<b>Tipo de Documento:</b>", table_cell),
            Paragraph("Dossier Comercial y Técnico", table_cell),
            Paragraph("<b>Versión del Software:</b>", table_cell),
            Paragraph("v2.5 Enterprise Edition", table_cell),
        ],
        [
            Paragraph("<b>Arquitectura:</b>", table_cell),
            Paragraph("Cliente-Servidor + WebSockets", table_cell),
            Paragraph("<b>Compatibilidad:</b>", table_cell),
            Paragraph("Windows 10/11, PC, Tablets, Móviles", table_cell),
        ],
        [
            Paragraph("<b>Propósito:</b>", table_cell),
            Paragraph("Evaluación para Venta e Implementación", table_cell),
            Paragraph("<b>Fecha de Emisión:</b>", table_cell),
            Paragraph("Septiembre 2026", table_cell),
        ]
    ]
    t_meta = Table(metadata_data, colWidths=[105, 175, 105, 155])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), WHITE),
        ('BOX', (0,0), (-1,-1), 1, PRIMARY_GREEN),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_meta)

    story.append(PageBreak())

    # =========================================================
    # PÁGINA 2: RESUMEN EJECUTIVO Y ARQUITECTURA TÉCNICA
    # =========================================================
    story.append(Paragraph("1. RESUMEN EJECUTIVO Y PROBLEMA QUE RESUELVE", section_heading))
    story.append(Paragraph(
        "En el contexto comercial actual, las farmacias y expendios de medicinas enfrentan cuatro grandes desafíos operativos diarios que generan fugas de dinero y pérdida de clientes: la <b>complejidad del cobro bimoneda</b> (tasa BCV versus dólar efectivo), el <b>vencimiento silencioso de medicamentos</b> en anaquel, la <b>falta de un canal de ventas digital propio</b> (dependiendo de aplicaciones de delivery que retienen entre un 15% y un 25% de comisión) y el <b>descontrol en los arqueos de caja</b> al final del turno.",
        body_style
    ))
    story.append(Paragraph(
        "Este software ha sido diseñado específicamente desde el terreno para resolver de raíz cada una de estas problemáticas, proporcionando una solución llave en mano que se instala directamente en la computadora de la farmacia y no requiere pagar mensualidades ni comisiones a terceros.",
        body_style
    ))

    # Tabla Comparativa: Antes vs. Con el Sistema
    comp_data = [
        [
            Paragraph("Desafío Tradicional en Farmacias", table_header),
            Paragraph("Solución Aportada por el Sistema ERP", table_header)
        ],
        [
            Paragraph("<b>Cálculo manual de vuelto y tasa:</b> Errores de cambio entre bolívares y dólares causan descuadres diarios de caja.", table_cell),
            Paragraph("<b>Motor Multimoneda Instantáneo:</b> Convierte en tiempo real con tasa BCV. Permite pagos divididos ($ + Bs.) y calcula vuelto exacto.", table_cell)
        ],
        [
            Paragraph("<b>Pérdida por vencimiento de medicinas:</b> Se descubren productos vencidos solo cuando el cliente los pide o en auditorías.", table_cell),
            Paragraph("<b>Gestión FEFO con Semáforo Preventivo:</b> El sistema despacha primero el lote próximo a expirar y emite alertas a 30, 60 y 90 días.", table_cell)
        ],
        [
            Paragraph("<b>Ventas limitadas al mostrador físico:</b> Fuera del horario o si el cliente no puede trasladarse, la farmacia pierde la venta.", table_cell),
            Paragraph("<b>Tienda Online Integrada 24/7:</b> Catálogo web en tiempo real con carrito, subida de capture de Pago Móvil y delivery a $1.00.", table_cell)
        ],
        [
            Paragraph("<b>Altas comisiones en apps externas:</b> Plataformas de pedidos cobran comisiones abusivas por cada despacho.", table_cell),
            Paragraph("<b>Cero Comisiones:</b> 100% de los ingresos por venta y delivery ingresan directamente a la cuenta bancaria de la farmacia.", table_cell)
        ],
        [
            Paragraph("<b>Incertidumbre en inventario:</b> No se conoce con certeza qué productos se agotan hasta que el cliente reclama.", table_cell),
            Paragraph("<b>Alerta de Stock Mínimo y Trazabilidad:</b> Notificación inmediata para solicitar reposición oportuna a las droguerías.", table_cell)
        ]
    ]
    t_comp = Table(comp_data, colWidths=[240, 300])
    t_comp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_GREEN),
        ('BOX', (0,0), (-1,-1), 1, BORDER_GRAY),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, LIGHT_GRAY])
    ]))
    story.append(t_comp)
    story.append(Spacer(1, 10))

    story.append(Paragraph("2. ARQUITECTURA TECNOLÓGICA Y EN QUÉ ESTÁ CONSTRUIDO", section_heading))
    story.append(Paragraph(
        "El software fue edificado sobre una arquitectura moderna, reactiva y ligera de clase industrial que garantiza una velocidad instantánea de respuesta y estabilidad absoluta, sin sobrecargar la memoria de las computadoras:",
        body_style
    ))

    # Grid de tecnologías
    tech_data = [
        [
            Paragraph("<b>Componente</b>", table_header),
            Paragraph("<b>Tecnología Utilizada</b>", table_header),
            Paragraph("<b>Beneficio Directo para la Farmacia</b>", table_header)
        ],
        [
            Paragraph("<b>Frontend (Interfaz)</b>", table_cell),
            Paragraph("React 18, TypeScript, TailwindCSS, Vite", table_cell),
            Paragraph("Interfaz ultrarrápida, navegación fluida sin recargas lentas, adaptable a monitores táctiles, laptops y teléfonos celulares.", table_cell)
        ],
        [
            Paragraph("<b>Backend (Servidor)</b>", table_cell),
            Paragraph("Node.js & Express RESTful API", table_cell),
            Paragraph("Motor ligero capaz de procesar miles de transacciones por segundo con consumo mínimo de procesador.", table_cell)
        ],
        [
            Paragraph("<b>Base de Datos</b>", table_cell),
            Paragraph("SQLite con modo WAL (Write-Ahead Logging)", table_cell),
            Paragraph("Lectura y escritura concurrentes sin bloqueos. Base de datos auto-contenida en un archivo seguro, sin necesidad de instalar motores pesados como SQL Server u Oracle.", table_cell)
        ],
        [
            Paragraph("<b>Comunicación en Vivo</b>", table_cell),
            Paragraph("Socket.io (WebSockets bidireccionales)", table_cell),
            Paragraph("Cuando un cliente compra en la tienda web, el cajero recibe la notificación acústica y visual en pantalla en menos de 0.2 segundos.", table_cell)
        ],
        [
            Paragraph("<b>Seguridad & Archivos</b>", table_cell),
            Paragraph("Almacenamiento Base64 & Hash de Claves", table_cell),
            Paragraph("Los captures de Pago Móvil se procesan y almacenan internamente para auditoría sin depender de servicios de almacenamiento externos de pago.", table_cell)
        ]
    ]
    t_tech = Table(tech_data, colWidths=[120, 150, 270])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DEEP_GREEN),
        ('BOX', (0,0), (-1,-1), 1, BORDER_GRAY),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, LIGHT_GRAY])
    ]))
    story.append(t_tech)

    story.append(PageBreak())

    # =========================================================
    # PÁGINA 3: DESGLOSE DETALLADO DE MÓDULOS (POS Y TIENDA ONLINE)
    # =========================================================
    story.append(Paragraph("3. DETALLE EXHAUSTIVO DE MÓDULOS FUNCIONALES", section_heading))
    story.append(Paragraph(
        "A continuación se describe el funcionamiento específico de cada módulo integrado en el sistema, explicando el flujo de trabajo tanto para el personal como para los clientes.",
        body_style
    ))

    # Módulo A: POS
    story.append(Paragraph("A. MÓDULO DE PUNTO DE VENTA (POS) Y FACTURACIÓN MULTIMONEDA", subsection_heading))
    story.append(Paragraph(
        "El Punto de Venta es el corazón operativo del mostrador de la farmacia. Está diseñado para que un cajero despache a un cliente en menos de 30 segundos, minimizando colas y tiempos de espera.",
        body_style
    ))
    
    pos_items = [
        "<b>Búsqueda Rápida Predictiva:</b> El cajero puede teclear el nombre comercial (ej. <i>Atamel</i>), el principio activo (ej. <i>Paracetamol 500mg</i>) o escanear el código de barras con cualquier lector estándar USB.",
        "<b>Control Estricto de Disponibilidad:</b> El sistema impide vender productos agotados o cantidades superiores a las existencias físicas en bodega.",
        "<b>Conversión Bimoneda en Tiempo Real:</b> Cada medicamento muestra su valor en Dólares ($ USD) y su equivalente exacto en Bolívares (Bs.) calculado al instante según la tasa oficial del día.",
        "<b>Cobros Mixtos / Divididos:</b> El cliente puede pagar una parte en dólares en efectivo, otra por Pago Móvil y el remanente con tarjeta de débito en punto de venta. El sistema valida el saldo pendiente hasta completar el monto exacto.",
        "<b>Cálculo Automático de Vuelto:</b> Permite al cajero seleccionar si entregará el vuelto en Dólares o en Bolívares, calculando la diferencia exacta con cero margen de error.",
        "<b>Venta de Contado o a Crédito:</b> Si el cliente cuenta con crédito aprobado, la venta puede cargarse directamente a su cuenta corriente con un solo clic.",
        "<b>Impresión de Ticket Térmico de 80mm:</b> Formato profesional que incluye el emblema de la farmacia, RIF, número de registro sanitario SICM: 50530, desglose de medicamentos por lote, tasa de cambio y formas de pago."
    ]
    for item in pos_items:
        story.append(Paragraph(f"&bull; {item}", bullet_style))
    story.append(Spacer(1, 8))

    # Módulo B: Tienda Online
    story.append(Paragraph("B. TIENDA ONLINE INTEGRADA (E-COMMERCE FARMACÉUTICO DIRECTO)", subsection_heading))
    story.append(Paragraph(
        "Una tienda virtual pública, ligera y atractiva, especialmente optimizada para smartphones, que permite a los clientes consultar el catálogo de medicamentos y hacer sus pedidos desde su casa u oficina.",
        body_style
    ))

    tienda_items = [
        "<b>Aislamiento Total de Seguridad:</b> La tienda es de acceso público para los clientes; por diseño estricto, no muestra botones de acceso al sistema administrativo ni a los datos contables del negocio.",
        "<b>Catálogo Sincronizado en Vivo:</b> Si un medicamento se agota en el mostrador físico, de inmediato se muestra como no disponible en la tienda web, evitando vender productos inexistentes.",
        "<b>Experiencia de Carrito No Invasivo:</b> Al pulsar 'Comprar', el artículo se añade con una confirmación sutil sin interrumpir la navegación, permitiendo al cliente continuar seleccionando otros productos cómodamente.",
        "<b>Opciones de Despacho:</b> El cliente selecciona entre <b>Delivery Express</b> (tarifa configurada en $1.00 fijo) o <b>Retiro en Farmacia</b> (completamente gratis).",
        "<b>Módulo de Pago Adaptado a Venezuela:</b> Muestra los datos de la farmacia para Pago Móvil (banco, teléfono, RIF), transferencias bancarias y Zelle con botones de copiado rápido con un solo toque.",
        "<b>Adjunto de Capture Bancario:</b> El comprador sube la foto del comprobante de transferencia o Pago Móvil directamente desde la cámara de su teléfono o galería, registrando el número de referencia para validación."
    ]
    for item in tienda_items:
        story.append(Paragraph(f"&bull; {item}", bullet_style))

    story.append(Spacer(1, 8))

    # Módulo C: Pedidos Online
    story.append(Paragraph("C. GESTIÓN Y DESPACHO DE PEDIDOS ONLINE EN EL ERP", subsection_heading))
    story.append(Paragraph(
        "En el panel administrativo, los cajeros y supervisores cuentan con una pantalla especializada para recibir y tramitar los pedidos que entran por la web en tiempo real.",
        body_style
    ))
    pedidos_items = [
        "<b>Alerta Sonora y Contador Flotante:</b> Una campana animada en la barra superior notifica de inmediato al cajero la llegada de una nueva orden web.",
        "<b>Inspección del Comprobante de Pago:</b> El cajero puede ver el capture de pago enviado por el cliente en tamaño completo para verificar el ingreso bancario antes de empaquetar.",
        "<b>Flujo de Estados de Pedido:</b> Ciclo claro de despacho: <i>Pendiente &rarr; En Preparación &rarr; Listo / En Camino &rarr; Entregado</i>.",
        "<b>Descargo Automático de Stock:</b> Al procesarse la orden, los productos son rebajados formalmente del inventario de la farmacia."
    ]
    for item in pedidos_items:
        story.append(Paragraph(f"&bull; {item}", bullet_style))

    story.append(PageBreak())

    # =========================================================
    # PÁGINA 4: INVENTARIO, LOTES, FEFO, CAJA Y CRÉDITOS
    # =========================================================
    
    # Módulo D: Inventario y Lotes
    story.append(Paragraph("D. CONTROL DE INVENTARIO, LOTES Y VENCIMIENTOS (ALGORITMO FEFO)", subsection_heading))
    story.append(Paragraph(
        "El control de vencimientos es la principal fuente de ahorro de este software. La gestión farmacéutica requiere trazabilidad por lote y fecha de expiración, no solo por código genérico.",
        body_style
    ))
    story.append(Paragraph("&bull; <b>Trazabilidad por Lote:</b> Cada producto puede tener múltiples lotes con diferentes fechas de caducidad, cantidades y costos de compra.", bullet_style))
    story.append(Paragraph("&bull; <b>Despacho FEFO (First Expired, First Out):</b> El sistema prioriza automáticamente en las ventas los lotes más próximos a vencer, garantizando la rotación adecuada del stock.", bullet_style))
    story.append(Paragraph("&bull; <b>Semáforo Visual de Alertas de Caducidad:</b> Módulo dedicado con códigos de color de vida útil:", bullet_style))
    
    semaforo_items = [
        "<b>Rojo:</b> Medicamentos ya vencidos (bloqueo preventivo de venta en mostrador).",
        "<b>Naranja:</b> Críticos a vencer en menos de 30 días (permite activar promociones o devolver a droguería).",
        "<b>Amarillo:</b> Alerta preventiva a vencer entre 30 y 90 días.",
        "<b>Verde:</b> Stock en rango seguro de vida útil (> 90 días)."
    ]
    for s_item in semaforo_items:
        story.append(Paragraph(f"&ndash; {s_item}", subbullet_style))

    story.append(Paragraph("&bull; <b>Gestión de Stock Mínimo:</b> Notificación automática cuando un medicamento alcanza el umbral de reserva para emitir orden de compra.", bullet_style))
    story.append(Spacer(1, 8))

    # Módulo E: Arqueo de Caja
    story.append(Paragraph("E. CONTROL DE CAJA, TURNOS Y PREVENCIÓN DE FALTANTES", subsection_heading))
    story.append(Paragraph(
        "Módulo diseñado para brindar tranquilidad al dueño de la farmacia respecto al manejo de dinero en efectivo y cuentas bancarias.",
        body_style
    ))
    caja_items = [
        "<b>Apertura Formal con Fondo de Caja:</b> Registro del monto inicial con el que el cajero inicia el turno.",
        "<b>Registro de Movimientos Menores:</b> Registro de egresos extraordinarios (fletes, compras de suministros, pagos de servicios) con motivo y responsable.",
        "<b>Cierre de Turno y Arqueo Ciego:</b> El cajero declara el monto físico en gaveta. El sistema compara contra las ventas registradas y emite un balance de sobrante o faltante con fecha, hora y usuario."
    ]
    for item in caja_items:
        story.append(Paragraph(f"&bull; {item}", bullet_style))
    story.append(Spacer(1, 8))

    # Módulo F: Créditos a Clientes
    story.append(Paragraph("F. GESTIÓN DE CRÉDITOS Y CUENTAS POR COBRAR", subsection_heading))
    story.append(Paragraph(
        "Ideal para clientes frecuentes, convenios con empresas o vecinos de confianza:",
        body_style
    ))
    cred_items = [
        "<b>Límites de Crédito Personalizados:</b> Cada cliente tiene asignado un tope máximo de endeudamiento en dólares y días límite de pago.",
        "<b>Validación Automática en Caja:</b> El sistema no permite ventas a crédito si el monto excede el saldo disponible del cliente.",
        "<b>Historial y Cobranza:</b> Registro de abonos parciales o totales con emisión de comprobante de pago de deuda."
    ]
    for item in cred_items:
        story.append(Paragraph(f"&bull; {item}", bullet_style))
    story.append(Spacer(1, 8))

    # Módulo G: Compras y Proveedores
    story.append(Paragraph("G. COMPRAS A DROGUERÍAS Y CUENTAS POR PAGAR", subsection_heading))
    story.append(Paragraph(
        "Permite registrar las facturas recibidas de droguerías y proveedores farmacéuticos. Al ingresar una compra, el inventario se incrementa automáticamente en el lote y fecha especificados, recalculando los costos promedio y manteniendo al día las cuentas pendientes por pagar a los distribuidores.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # Módulo H: Panel de Configuración
    story.append(Paragraph("H. PANEL DE CONFIGURACIÓN Y CONTROL MAESTRO (SOLO ADMINISTRADOR)", subsection_heading))
    story.append(Paragraph(
        "Un panel centralizado donde el propietario de la farmacia gestiona con total autonomía:",
        body_style
    ))
    conf_items = [
        "<b>Tasa de Cambio BCV:</b> Actualización en un clic que se replica de inmediato en el POS y en la Tienda Online.",
        "<b>Datos Bancarios:</b> Edición de cuentas bancarias de la empresa, teléfonos de Pago Móvil, RIF y correo de Zelle.",
        "<b>Parámetros de Delivery:</b> Configuración del costo de envío express ($1.00 por defecto) y monto de envío gratis.",
        "<b>Gestión de Usuarios y PINes:</b> Creación y modificación de contraseñas de cajeros y administradores sin requerir soporte técnico."
    ]
    for item in conf_items:
        story.append(Paragraph(f"&bull; {item}", bullet_style))

    story.append(PageBreak())

    # =========================================================
    # PÁGINA 5: BENEFICIOS COMERCIALES, ROI Y REQUISITOS TÉCNICOS
    # =========================================================
    story.append(Paragraph("4. IMPACTO FINANCIERO Y RETORNO DE INVERSIÓN (ROI)", section_heading))
    story.append(Paragraph(
        "Al ofrecer este sistema a un propietario de farmacia, el argumento comercial no es simplemente un gasto tecnológico, sino una <b>inversión que se paga sola en los primeros 60 días</b> gracias al ahorro directo y al incremento de ventas:",
        body_style
    ))

    # Tabla de Retorno de Inversión
    roi_data = [
        [
            Paragraph("<b>Área de Impacto</b>", table_header),
            Paragraph("<b>Pérdida Típica sin Software</b>", table_header),
            Paragraph("<b>Ahorro / Ganancia con el Software ERP</b>", table_header)
        ],
        [
            Paragraph("<b>Medicamentos Vencidos</b>", table_cell),
            Paragraph("De $150 a $500 mensuales en productos que caducan en los estantes sin rotación oportuna.", table_cell),
            Paragraph("<b>Reducción de hasta el 85% en mermas</b> gracias al sistema FEFO y alertas preventivas tempranas a 90 días.", table_cell)
        ],
        [
            Paragraph("<b>Comisiones de Delivery</b>", table_cell),
            Paragraph("Pagar entre 15% y 25% por venta a aplicaciones externas de despacho.", table_cell),
            Paragraph("<b>100% de la venta queda en la farmacia</b>. Canal de pedidos propio y directo a sus cuentas bancarias.", table_cell)
        ],
        [
            Paragraph("<b>Descuadres de Caja Multimoneda</b>", table_cell),
            Paragraph("Pérdidas diarias de $5 a $15 por redondeos inadecuados y errores en conversión Bs. a Dólar.", table_cell),
            Paragraph("<b>Cero discrepancias</b>. Conversión exacta y liquidación transparente por cada método de pago.", table_cell)
        ],
        [
            Paragraph("<b>Ventas Fuera de Horario</b>", table_cell),
            Paragraph("Clientes que buscan medicamentos de noche o fines de semana y compran en otra farmacia.", table_cell),
            Paragraph("<b>Incremento del 20% al 40% en facturación</b> gracias al catálogo web accesible las 24 horas del día.", table_cell)
        ]
    ]
    t_roi = Table(roi_data, colWidths=[130, 195, 215])
    t_roi.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_RED),
        ('BOX', (0,0), (-1,-1), 1, BORDER_GRAY),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, LIGHT_GRAY])
    ]))
    story.append(t_roi)
    story.append(Spacer(1, 12))

    story.append(Paragraph("5. REQUISITOS TÉCNICOS, INSTALACIÓN Y COMPATIBILIDAD", section_heading))
    story.append(Paragraph(
        "Una de las mayores fortalezas comerciales de este producto es su <b>facilidad de despliegue</b>. No requiere servidores costosos ni hardware especializado:",
        body_style
    ))

    req_data = [
        [
            Paragraph("<b>Elemento</b>", table_header),
            Paragraph("<b>Especificación Mínima Requerida</b>", table_header),
            Paragraph("<b>Compatibilidad & Ventaja</b>", table_header)
        ],
        [
            Paragraph("<b>Computadora Servidor / Caja</b>", table_cell),
            Paragraph("Cualquier PC o Laptop con Windows 10 u 11, Procesador Intel i3 o superior, 4 GB de memoria RAM.", table_cell),
            Paragraph("Funciona perfectamente en equipos comerciales estándar existentes en la farmacia sin inversión extra.", table_cell)
        ],
        [
            Paragraph("<b>Lectores de Código de Barras</b>", table_cell),
            Paragraph("Cualquier lector óptico USB o inalámbrico Plug & Play.", table_cell),
            Paragraph("Compatible con estándares EAN-13, UPC, Code 128 y códigos QR sin necesidad de drivers adicionales.", table_cell)
        ],
        [
            Paragraph("<b>Impresoras de Recibos</b>", table_cell),
            Paragraph("Impresora térmica de tickets de 80mm o 58mm (USB, Ethernet o Bluetooth).", table_cell),
            Paragraph("Genera recibos limpios con corte de papel automático, logotipo de la empresa y formato reglamentario.", table_cell)
        ],
        [
            Paragraph("<b>Operación Local vs. Online</b>", table_cell),
            Paragraph("Red local WiFi o cable Ethernet dentro del local.", table_cell),
            Paragraph("<b>Opera 100% offline para ventas de mostrador</b>. Si se interrumpe el internet, la caja física sigue facturando sin interrupción.", table_cell)
        ],
        [
            Paragraph("<b>Copias de Seguridad (Backup)</b>", table_cell),
            Paragraph("Copia de seguridad del archivo <code>farmacia.db</code>.", table_cell),
            Paragraph("Respaldo instantáneo con un solo clic en un pendrive USB o en la nube para resguardo de la información contable.", table_cell)
        ]
    ]
    t_req = Table(req_data, colWidths=[120, 200, 220])
    t_req.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DEEP_GREEN),
        ('BOX', (0,0), (-1,-1), 1, BORDER_GRAY),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, LIGHT_GRAY])
    ]))
    story.append(t_req)
    story.append(Spacer(1, 15))

    # Cuadro Final de Conclusión / Llamado a la Acción para Venta
    cierre_data = [
        [
            Paragraph("<b>GARANTÍA DE VALOR PARA EL CLIENTE FINAL</b>", ParagraphStyle('CierreHdr', fontName='Helvetica-Bold', fontSize=9.5, leading=12, textColor=WHITE)),
        ],
        [
            Paragraph(
                "Este sistema no es solo un software de facturación; es una <b>plataforma comercial completa</b> que moderniza la imagen de la farmacia frente a su comunidad, fideliza a los clientes a través del canal digital y entrega al propietario el control exacto y en tiempo real de su patrimonio comercial.",
                ParagraphStyle('CierreTxt', fontName='Helvetica', fontSize=8.5, leading=12, textColor=DEEP_GREEN)
            )
        ]
    ]
    t_cierre = Table(cierre_data, colWidths=[540])
    t_cierre.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_GREEN),
        ('BACKGROUND', (0,1), (-1,1), LIGHT_GREEN),
        ('BOX', (0,0), (-1,-1), 1, PRIMARY_GREEN),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_cierre)

    # Construir documento
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generado exitosamente en: {os.path.abspath(filename)}")

if __name__ == '__main__':
    target_file = sys.argv[1] if len(sys.argv) > 1 else 'Dossier_Comercial_Software_Farmacia.pdf'
    build_pdf(target_file)
