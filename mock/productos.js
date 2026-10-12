// Mock de MS-productos con la semilla completa. Uso: node mock/productos.js (puerto 4002, o MOCK_PORT)
const { createMock, f } = require('./_base');

createMock({
  collection: 'productos',
  port: 4002,
  filters: {
    categoriaId: f.ref('categoriaId', 'CAT'),
    marca: f.text('marca'),
    precioMin: f.number('precio', 'gte', { min: 0 }),
    precioMax: f.number('precio', 'lte', { min: 0 }),
  },
});
