// Mock de MS-categorias con la semilla completa. Uso: node mock/categorias.js (puerto 4001, o MOCK_PORT)
const { createMock, f } = require('./_base');

createMock({
  collection: 'categorias',
  port: 4001,
  filters: {
    padreId: f.ref('padreId', 'CAT'),
    raiz: f.bool((item, v) => (item.padreId == null || item.padreId === '') === v),
  },
});
