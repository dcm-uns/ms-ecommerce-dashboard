// Mock del microservicio MS-clientes con datos fijos. Solo para probar una registración.
// Uso: node mock/clientes.js   (puerto 4000 por defecto, para no chocar con el dashboard)
const http = require('http');

const ITEMS = [
  { id: 'CLI001', nombre: 'Lucía Fernández', email: 'lucia.fernandez@example.com', ciudad: 'Bahía Blanca', provincia: 'Buenos Aires', fechaAlta: '2025-03-12' },
  { id: 'CLI002', nombre: 'Martín Gómez', email: 'martin.gomez@example.com', ciudad: 'Ciudad de Buenos Aires', provincia: 'CABA', fechaAlta: '2025-04-30' },
  { id: 'CLI003', nombre: 'Sofía Romero', email: 'sofia.romero@example.com', ciudad: 'Córdoba', provincia: 'Córdoba', fechaAlta: '2025-06-01' },
];

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method !== 'GET') return send(res, 404, { error: 'not_found', message: 'Ruta inexistente.' });

  if (url.pathname === '/health') {
    return send(res, 200, { status: 'ok', service: 'mock-clientes', collection: 'clientes', version: '1.0.0' });
  }

  if (url.pathname === '/items') {
    const limit = url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : 20;
    const offset = url.searchParams.has('offset') ? Number(url.searchParams.get('offset')) : 0;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return send(res, 400, { error: 'bad_request', message: 'El parámetro limit debe estar entre 1 y 100.' });
    }
    if (!Number.isInteger(offset) || offset < 0) {
      return send(res, 400, { error: 'bad_request', message: 'El parámetro offset debe ser >= 0.' });
    }
    return send(res, 200, { items: ITEMS.slice(offset, offset + limit), total: ITEMS.length, limit, offset });
  }

  const m = /^\/items\/([^/]+)$/.exec(url.pathname);
  if (m) {
    const id = decodeURIComponent(m[1]);
    const item = ITEMS.find((i) => i.id === id);
    return item ? send(res, 200, item) : send(res, 404, { error: 'not_found', message: `No existe ${id}.` });
  }

  send(res, 404, { error: 'not_found', message: 'Ruta inexistente.' });
});

server.listen(process.env.MOCK_PORT || 4000, () => console.log(`Mock MS-clientes en http://localhost:${server.address().port}`));
