// Mock de MS-lineas_orden con la semilla completa. Uso: node mock/lineas_orden.js (puerto 4006, o MOCK_PORT)
const { createMock, f } = require('./_base');

createMock({
  collection: 'lineas_orden',
  port: 4006,
  filters: {
    ordenId: f.ref('ordenId', 'ORD'),
    productoId: f.ref('productoId', 'PRD'),
  },
});
