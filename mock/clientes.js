// Mock de MS-clientes con la semilla completa. Uso: node mock/clientes.js (puerto 4000, o MOCK_PORT)
const { createMock, f } = require('./_base');

createMock({
  collection: 'clientes',
  port: 4000,
  filters: {
    ciudad: f.text('ciudad'),
    provincia: f.text('provincia'),
  },
});
