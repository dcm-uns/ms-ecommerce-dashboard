// Mock de MS-promociones con la semilla completa. Uso: node mock/promociones.js (puerto 4010, o MOCK_PORT)
// "Hoy" es 2026-10-11 (el de la semilla); se cambia con MOCK_HOY o con ?fecha=YYYY-MM-DD.
const { createMock, f } = require('./_base');

createMock({
  collection: 'promociones',
  port: 4010,
  filters: {
    categoriaId: f.ref('categoriaId', 'CAT'),
    productoId: f.ref('productoId', 'PRD'),
    vigente: f.bool((item, v, { today, query }) => {
      const fecha = query.get('fecha') || today;
      return (item.fechaInicio <= fecha && fecha <= item.fechaFin) === v;
    }),
    fecha: { parse: f.date('fecha', 'gte').parse },
  },
});
