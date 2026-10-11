process.env.ALLOW_PRIVATE_URLS = '1';
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../server');
const { createFileStore } = require('../lib/store');

const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'kit', 'seed', 'clientes.json'), 'utf8'));

function fakeService({ broken = false, collection = 'clientes' } = {}) {
  return http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const send = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (broken) return send(500, { error: 'x' });
    if (u.pathname === '/health') return send(200, { status: 'ok', service: 'fake', collection });
    if (u.pathname === '/items') {
      const limit = Number(u.searchParams.get('limit') ?? 20);
      if (!(limit >= 1 && limit <= 100)) return send(400, { error: 'bad_request', message: 'limit' });
      return send(200, { items: seed.slice(0, limit), total: seed.length, limit, offset: 0 });
    }
    const m = /^\/items\/(.+)$/.exec(u.pathname);
    const it = m && seed.find((s) => s.id === m[1]);
    return it ? send(200, it) : send(404, { error: 'not_found', message: 'no' });
  });
}
const listen = (s) => new Promise((r) => s.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${s.address().port}`)));

test('flujo completo', async () => {
  const good = fakeService(); const bad = fakeService({ broken: true }); const wrong = fakeService({ collection: 'otra' });
  const [gu, bu, wu] = await Promise.all([listen(good), listen(bad), listen(wrong)]);
  const store = createFileStore(fs.mkdtempSync(path.join(os.tmpdir(), 'dash-')));
  const app = createApp(store, { adminToken: 'secreto' });
  const srv = http.createServer(app); const base = await listen(srv);
  const j = async (method, p, body, headers = {}) => {
    const r = await fetch(base + p, { method, headers: { 'content-type': 'application/json', ...headers }, body: body && JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  };
  const reg = (url, extra = {}) => j('POST', '/api/register', { codigo: 'MS-clientes', url, estudiantes: ['Ana', 'Beto'], ...extra });

  let list = await j('GET', '/api/microservicios');
  assert.equal(list.body.length, 12);
  assert.ok(list.body.every((m) => m.estado === 'libre'));

  assert.equal((await reg(bu)).status, 422);
  assert.equal((await reg(wu)).status, 422);
  assert.equal((await reg(gu, { estudiantes: [] })).status, 400);
  assert.equal((await j('POST', '/api/register', { codigo: 'MS-nada', url: gu, estudiantes: ['A'] })).status, 400);

  const ok = await reg(gu + '/');
  assert.equal(ok.status, 201); assert.equal(ok.body.estado, 'online'); assert.equal(ok.body.url, gu);
  assert.equal((await reg(gu)).status, 409);

  good.close(); good.closeAllConnections();
  let p = await j('POST', '/api/microservicios/MS-clientes/ping');
  assert.equal(p.body.estado, 'offline');
  assert.equal((await j('POST', '/api/microservicios/MS-pagos/ping')).status, 409);

  assert.equal((await j('POST', '/api/admin/microservicios/MS-clientes/liberar')).status, 401);
  assert.equal((await j('POST', '/api/admin/microservicios/MS-clientes/liberar', null, { authorization: 'Bearer mal' })).status, 401);
  assert.equal((await j('POST', '/api/admin/microservicios/MS-clientes/liberar', null, { authorization: 'Bearer secreto' })).body.liberado, true);
  list = await j('GET', '/api/microservicios');
  assert.equal(list.body.find((m) => m.codigo === 'MS-clientes').estado, 'libre');
  [bad, wrong, srv].forEach((s) => { s.close(); s.closeAllConnections(); });
});
