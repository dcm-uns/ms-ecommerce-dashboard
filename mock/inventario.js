// Mock de MS-inventario con la semilla completa. Uso: node mock/inventario.js (puerto 4004, o MOCK_PORT)
const { createMock, f } = require('./_base');

createMock({
  collection: 'inventario',
  port: 4004,
  filters: {
    productoId: f.ref('productoId', 'PRD'),
    sucursalId: f.ref('sucursalId', 'SUC'),
  },
});
