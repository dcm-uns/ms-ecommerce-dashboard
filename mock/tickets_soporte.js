// Mock de MS-tickets_soporte con la semilla completa. Uso: node mock/tickets_soporte.js (puerto 4011, o MOCK_PORT)
const { createMock, f } = require('./_base');

createMock({
  collection: 'tickets_soporte',
  port: 4011,
  filters: {
    clienteId: f.ref('clienteId', 'CLI'),
    ordenId: f.ref('ordenId', 'ORD'),
    estado: f.enumOf('estado', ['abierto', 'en_proceso', 'resuelto', 'cerrado']),
    categoria: f.enumOf('categoria', ['envio', 'pago', 'producto', 'otro']),
  },
});
