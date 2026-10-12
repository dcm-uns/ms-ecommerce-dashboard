// Mock de MS-sucursales con la semilla completa. Uso: node mock/sucursales.js (puerto 4003, o MOCK_PORT)
const { createMock, f } = require('./_base');

createMock({
  collection: 'sucursales',
  port: 4003,
  filters: {
    ciudad: f.text('ciudad'),
    tipo: f.enumOf('tipo', ['tienda', 'deposito']),
  },
});
