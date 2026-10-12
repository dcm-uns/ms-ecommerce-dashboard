const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server');
const { createFileStore } = require('../lib/store');
const { createFileReservationStore } = require('../lib/reservations');

const listen = (server) => new Promise((resolve) => {
  server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
});

test('reservas, contratos OpenAPI y liberación son independientes del dashboard', async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reservas-api-'));
  const reservationStore = createFileReservationStore(path.join(dataDir, 'reservas'));
  const app = createApp(
    createFileStore(path.join(dataDir, 'dashboard')),
    { adminToken: 'admin-secreto', reservationStore },
  );
  const server = http.createServer(app);
  const base = await listen(server);
  t.after(() => {
    server.close();
    server.closeAllConnections();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const json = async (url, options = {}) => {
    const response = await fetch(base + url, {
      ...options,
      headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    });
    return { status: response.status, headers: response.headers, body: await response.json().catch(() => null) };
  };

  const list = await json('/api/reservas');
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 12);
  assert.ok(list.body.every((item) => !item.reservado));
  assert.equal(list.body[0].coleccion, 'categorias');
  assert.doesNotMatch(list.body[0].descripcion, /\*\*|`/);
  assert.deepEqual(list.body[0].endpoints.map(({ metodo, ruta }) => `${metodo} ${ruta}`), [
    'GET /health', 'GET /items', 'GET /items/{id}',
  ]);

  const yaml = await fetch(`${base}/api/reservas/MS-clientes/openapi`);
  assert.equal(yaml.status, 200);
  assert.match(yaml.headers.get('content-type'), /^application\/yaml/);
  assert.match(yaml.headers.get('content-disposition'), /attachment; filename="clientes\.yaml"/);
  assert.match(await yaml.text(), /openapi: 3\.0\.3/);
  const download = await fetch(`${base}/api/reservas/MS-clientes/openapi?download=1`);
  assert.match(download.headers.get('content-disposition'), /clientes\.yaml/);
  assert.equal((await fetch(`${base}/api/reservas/../../server/openapi`)).status, 404);

  const datasets = await Promise.all(list.body.map(async (item) => {
    const response = await fetch(`${base}/api/reservas/${encodeURIComponent(item.codigo)}/dataset`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^application\/json/);
    assert.match(response.headers.get('content-disposition'), new RegExp(`attachment; filename="${item.coleccion}\\.json"`));
    return response.json();
  }));
  assert.equal(datasets.length, 12);
  assert.ok(datasets.every((dataset) => Array.isArray(dataset) && dataset.length > 0));
  assert.equal((await fetch(`${base}/api/reservas/MS-inexistente/dataset`)).status, 404);

  const beforeDashboard = await json('/api/microservicios');
  const invalidTeam = await json('/api/reservas', {
    method: 'POST', body: JSON.stringify({ codigo: 'MS-clientes', estudiantes: [], claveLiberacion: 'clave-larga' }),
  });
  assert.equal(invalidTeam.status, 400);
  const invalidKey = await json('/api/reservas', {
    method: 'POST', body: JSON.stringify({ codigo: 'MS-clientes', estudiantes: ['Ana'], claveLiberacion: 'corta' }),
  });
  assert.equal(invalidKey.status, 400);

  const payload = { codigo: 'MS-clientes', estudiantes: ['Ana', 'Beto'], claveLiberacion: 'clave-segura-123' };
  const concurrent = await Promise.all([
    json('/api/reservas', { method: 'POST', body: JSON.stringify(payload) }),
    json('/api/reservas', { method: 'POST', body: JSON.stringify(payload) }),
  ]);
  assert.deepEqual(concurrent.map((result) => result.status).sort(), [201, 409]);
  const created = concurrent.find((result) => result.status === 201);
  assert.deepEqual(created.body.estudiantes, payload.estudiantes);
  assert.equal(JSON.stringify(created.body).includes(payload.claveLiberacion), false);
  const stored = await reservationStore.get('MS-clientes');
  assert.notEqual(stored.claveHash, payload.claveLiberacion);
  assert.notEqual(stored.claveSalt, payload.claveLiberacion);

  const afterDashboard = await json('/api/microservicios');
  assert.deepEqual(afterDashboard.body, beforeDashboard.body);
  const wrongKey = await json('/api/reservas/MS-clientes', {
    method: 'DELETE', body: JSON.stringify({ claveLiberacion: 'clave-incorrecta' }),
  });
  assert.equal(wrongKey.status, 403);
  const released = await json('/api/reservas/MS-clientes', {
    method: 'DELETE', body: JSON.stringify({ claveLiberacion: payload.claveLiberacion }),
  });
  assert.equal(released.status, 200);
  assert.equal((await json('/api/reservas')).body.find((item) => item.codigo === 'MS-clientes').reservado, false);

  const adminReservation = await json('/api/reservas', {
    method: 'POST', body: JSON.stringify({ ...payload, codigo: 'MS-productos' }),
  });
  assert.equal(adminReservation.status, 201);
  assert.equal((await json('/api/admin/reservas/MS-productos', { method: 'DELETE' })).status, 401);
  const adminRelease = await json('/api/admin/reservas/MS-productos', {
    method: 'DELETE', headers: { authorization: 'Bearer admin-secreto' },
  });
  assert.equal(adminRelease.status, 200);
  assert.equal((await json('/api/microservicios')).body.find((item) => item.codigo === 'MS-productos').estado, 'libre');
});