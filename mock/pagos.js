// Mock de MS-pagos con la semilla completa. Uso: node mock/pagos.js (puerto 4007, o MOCK_PORT)
const { createMock, f } = require('./_base');

createMock({
  collection: 'pagos',
  port: 4007,
  filters: {
    ordenId: f.ref('ordenId', 'ORD'),
    estado: f.enumOf('estado', ['pendiente', 'aprobado', 'rechazado', 'reembolsado']),
    medio: f.enumOf('medio', ['tarjeta_credito', 'tarjeta_debito', 'transferencia', 'billetera_virtual']),
  },
});
