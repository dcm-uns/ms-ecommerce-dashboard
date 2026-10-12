// Mock de MS-resenas con la semilla completa. Uso: node mock/resenas.js (puerto 4009, o MOCK_PORT)
const { createMock, f } = require('./_base');

createMock({
  collection: 'resenas',
  port: 4009,
  filters: {
    productoId: f.ref('productoId', 'PRD'),
    clienteId: f.ref('clienteId', 'CLI'),
    puntajeMin: f.number('puntaje', 'gte', { integer: true, min: 1, max: 5 }),
  },
});
