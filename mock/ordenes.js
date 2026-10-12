// Mock de MS-ordenes con la semilla completa. Uso: node mock/ordenes.js (puerto 4005, o MOCK_PORT)
const { createMock, f } = require('./_base');

createMock({
  collection: 'ordenes',
  port: 4005,
  filters: {
    clienteId: f.ref('clienteId', 'CLI'),
    estado: f.enumOf('estado', ['pendiente', 'pagada', 'enviada', 'entregada', 'cancelada']),
    desde: f.date('fecha', 'gte'),
    hasta: f.date('fecha', 'lte'),
  },
});
