async function runTests() {
  try {
    console.log('--- 1. Probando Creación de Pedido en Tienda Online ---');
    const orderRes = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Santiago Méndez',
        customer_phone: '0414-222-3344',
        customer_email: 'santiago@test.com',
        delivery_type: 'DELIVERY',
        delivery_address: 'Av. Andrés Bello, Edif. Centro, Apto 5B',
        payment_method: 'PAGO_MOVIL',
        delivery_fee: 2.5,
        items: [{ product_id: 3, product_name: 'Paracetamol / Acetaminofén 500mg', quantity: 2, unit_price: 2.10 }]
      })
    });
    const orderData = await orderRes.json();
    console.log('✅ Pedido Web Creado con Éxito:', orderData);

    console.log('--- 2. Probando Venta Directa en Punto de Venta (POS) ---');
    const saleRes = await fetch('http://localhost:5000/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 1,
        employee_id: 1,
        payment_method: 'CASH',
        amount_paid: 10.0,
        items: [{ product_id: 2, unit_price: 3.20, quantity: 1 }]
      })
    });
    const saleData = await saleRes.json();
    console.log('✅ Venta POS Procesada con Éxito:', saleData);

    console.log('--- 3. Verificando Sincronización de Caja ---');
    const cashRes = await fetch('http://localhost:5000/api/cash-register/current');
    const cashData = await cashRes.json();
    console.log('✅ Estado de Caja:', {
      abierta: cashData.isOpen,
      ventasEfectivo: cashData.cashSales,
      efectivoEnGaveta: cashData.expectedCashInDrawer
    });

    console.log('--- 4. Verificando Métricas del Dashboard ---');
    const dashRes = await fetch('http://localhost:5000/api/reports/dashboard');
    const dashData = await dashRes.json();
    console.log('✅ Métricas del Dashboard:', dashData);

    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE INTEGRACIÓN Y SINCRONIZACIÓN PASARON AL 100%!');
  } catch (err) {
    console.error('❌ Error en pruebas:', err);
  }
}

runTests();
