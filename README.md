# FarmaSalud - Sistema Administrativo Farmacéutico ERP & Tienda Online Sincronizada

Solución integral de software para farmacias que combina un **Sistema Administrativo y Punto de Venta (POS)** con una **Tienda Online (E-commerce)** pública para clientes, conectadas a la **misma base de datos centralizada** con sincronización inmediata de inventario en tiempo real.

---

## 🚀 Inicio Rápido

Para iniciar el sistema completo (Backend + Frontend):

```bash
npm run dev
```

- **Sistema Administrativo y POS**: [http://localhost:3000](http://localhost:3000)
- **Tienda Online (Clientes)**: Pestaña *"Tienda Online (Clientes)"* en la barra superior o enrutada.
- **API Backend**: [http://localhost:5000](http://localhost:5000)

---

## 📦 Módulos Incluidos en el Sistema

### 1. Punto de Venta (POS) y Facturación
- Búsqueda veloz por código de barras, nombre comercial o principio activo.
- Soporte para venta en caja o fraccionada.
- Formas de pago: Efectivo (con cálculo de cambio/vuelto), Tarjeta, Transferencia/Pago Móvil y Crédito.
- Emisión e impresión de ticket térmico estándar de 80mm con desglose legal farmacéutico.

### 2. Medicamentos e Inventario
- Ficha técnica: principio activo, presentación, laboratorio, ubicación en estante, precio costo y venta.
- Control de stock mínimo y alertas automáticas de reabastecimiento.
- Registro de lotes y fechas de vencimiento.

### 3. Lotes y Vencimientos (Semáforo Preventivo)
- Control sanitario asistido:
  - 🔴 **Vencidos**: Retiro preventivo inmediato.
  - 🟠 **Críticos (< 30 días)**: Prioridad de despacho FEFO (First Expired, First Out).
  - 🟡 **Alerta (< 90 días)**: En observación preventiva.
- Opción para registrar mermas o retiro de estantería.

### 4. Clientes y Cuentas por Cobrar (Crédito)
- Directorio de clientes con cédula, teléfono y dirección.
- Asignación de línea de crédito y días de gracia.
- Control de saldos deudores, historial de compras a crédito y registro de abonos.

### 5. Proveedores y Laboratorios
- Directorio de droguerías y distribuidores farmacéuticos.
- RIF/NIT, contactos comerciales y cuentas por pagar.

### 6. Compras y Recepción de Mercancía
- Registro de facturas de compra de proveedores.
- Ingreso de lotes con fechas de vencimiento y costos unitarios.
- Actualización automática del stock en la farmacia y en la tienda web.

### 7. Depósito y Almacenes
- Estructura de ubicaciones físicas: Pasillos, Estantes y Niveles.
- Control de áreas (Mostrador, Depósito Principal, Cadena de Frío/Nevera).
- Ajustes manuales auditados por conteo físico o mermas.

### 8. Empleados y Turnos
- Registro del personal: Farmacéuticos/Regentes, Administradores, Cajeros y Bodegueros.
- Asignación de turnos (Mañana, Tarde, Noche, Completo) y PIN de acceso rápido en caja.

### 9. Control de Caja (Aperturas y Cierre Z)
- Apertura de turno con fondo inicial en efectivo.
- Registro de movimientos manuales de caja (ingresos y gastos justificados).
- Arqueo físico de gaveta y Cierre Z con cálculo automático de diferencias (sobrante/faltante).

### 10. Pedidos Web (E-commerce)
- Bandeja en vivo de pedidos recibidos desde la tienda online.
- Notificación sonora y visual automática con WebSockets al recibir un nuevo pedido.
- Pipeline de estados: `Pendiente` ➔ `En Preparación` ➔ `Listo para Entrega` ➔ `Entregado`.
- Botón *"Facturar y Despachar en POS"* con un solo clic.

### 11. Reportes y Analítica
- Ventas del día y acumuladas.
- Inventario valorizado a costo vs precio de venta con cálculo de ganancia proyectada.
- Desglose de ingresos por método de pago.
- Ranking de los medicamentos más vendidos.

### 12. Tienda Online Pública para Clientes
- Catálogo moderno interactivo con stock real en vivo.
- Filtros por categoría y buscador por síntoma o nombre.
- Carrito flotante con cálculo inmediato.
- Checkout con selección de Delivery (+$2.50) o Retiro en Mostrador (Gratis).
- Métodos de pago flexibles y generación de comprobante de pedido.

---

## ⚡ Sincronización Bidireccional de Inventario
El sistema utiliza una **misma base de datos SQLite con modo WAL (Write-Ahead Logging)** y WebSockets (`Socket.io`):
- Cuando vendes en el mostrador (POS), la tienda online disminuye el stock disponible en el acto sin necesidad de recargar la página.
- Cuando un cliente realiza un pedido en la tienda online, el inventario se descuenta/reserva y se activa la alerta en el módulo de pedidos del panel administrativo.
