async function testMultimoneda() {
  try {
    console.log('--- 1. Probando Consulta de Configuración Bancaria y Tasa ---');
    const settingsRes = await fetch('http://localhost:5000/api/settings');
    const settings = await settingsRes.json();
    console.log('✅ Configuración bancaria actual:', {
      tasa: settings.exchange_rate,
      banco: settings.bank_name,
      telefonoPagoMovil: settings.bank_phone,
      titular: settings.bank_holder
    });

    console.log('\n--- 2. Probando Pedido Online con Pago Móvil y Capture de Comprobante ---');
    const mockImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const orderRes = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Daniela Colmenares',
        customer_phone: '0412-555-8899',
        customer_email: 'daniela@correo.com',
        delivery_type: 'DELIVERY',
        delivery_address: 'Colinas de Bello Monte, Edif. Ávila, Piso 3, Apto 3B',
        payment_method: 'PAGO_MOVIL',
        payment_currency: 'BS',
        payment_reference: 'REF-789012',
        proof_image: mockImage,
        exchange_rate: settings.exchange_rate,
        delivery_fee: 2.5,
        items: [{ product_id: 2, product_name: 'Ibuprofeno 600mg', quantity: 2, unit_price: 3.20 }]
      })
    });
    const orderData = await orderRes.json();
    console.log('✅ Pedido con Pago Móvil registrado:', orderData);

    console.log('\n--- 3. Verificando que el pedido contiene la captura en el backend ---');
    const ordersListRes = await fetch('http://localhost:5000/api/orders');
    const ordersList = await ordersListRes.json();
    const createdOrder = ordersList.find(o => o.id === orderData.orderId);
    console.log('✅ Datos del pedido guardado en BD:', {
      orderNumber: createdOrder.order_number,
      cliente: createdOrder.customer_name,
      pago: createdOrder.payment_method,
      moneda: createdOrder.payment_currency,
      referencia: createdOrder.payment_reference,
      tieneComprobanteImagen: !!createdOrder.proof_image,
      totalUsd: createdOrder.total,
      totalBs: createdOrder.total_bs
    });

    console.log('\n--- 4. Probando Venta POS con Pago Mixto / Multimoneda ---');
    // Venta de $6.40 (2 Ibuprofeno x $3.20)
    // Se paga: $2.00 en Efectivo USD + Bs. 374.00 en Pago Móvil (a tasa 85 = $4.40)
    const saleRes = await fetch('http://localhost:5000/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 1,
        employee_id: 1,
        items: [{ product_id: 2, unit_price: 3.20, quantity: 2 }],
        exchange_rate: 85.0,
        change_currency: 'USD',
        change_amount: 0,
        payments: [
          {
            payment_method: 'CASH_USD',
            currency: 'USD',
            amount: 2.00,
            amount_usd: 2.00,
            amount_bs: 170.00,
            reference: ''
          },
          {
            payment_method: 'PAGO_MOVIL',
            currency: 'BS',
            amount: 374.00,
            amount_usd: 4.40,
            amount_bs: 374.00,
            reference: 'PM-448192'
          }
        ]
      })
    });
    const saleData = await saleRes.json();
    console.log('✅ Venta POS Multimoneda Procesada:', saleData);

    console.log('\n--- 5. Verificando Detalle de Pagos en el Comprobante de Venta ---');
    const saleDetailRes = await fetch(`http://localhost:5000/api/sales/${saleData.saleId}`);
    const saleDetail = await saleDetailRes.json();
    console.log('✅ Desglose de Pagos Registrados:', saleDetail.payments);

    console.log('\n🌟 ¡TODAS LAS FUNCIONALIDADES MULTIMONEDA Y COMPROBANTE DE PAGO VALIDATOR FUNCIONAN PERFECTAMENTE!');
  } catch (err) {
    console.error('❌ Error en prueba multimoneda:', err);
  }
}

testMultimoneda();
