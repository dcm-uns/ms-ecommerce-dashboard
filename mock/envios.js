// Mock de MS-envios con la semilla completa. Uso: node mock/envios.js (puerto 4008, o MOCK_PORT)
const { createMock, f } = require('./_base');

createMock({
  collection: 'envios',
  port: 4008,
  filters: {
    ordenId: f.ref('ordenId', 'ORD'),
    estado: f.enumOf('estado', ['preparando', 'en_transito', 'demorado', 'entregado']),
    transportista: f.text('transportista'),
  },
});
