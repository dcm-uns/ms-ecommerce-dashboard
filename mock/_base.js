// Base común de los mocks. Sirve la semilla completa de kit/seed/<coleccion>.json
// con el contrato común (GET /health, GET /items, GET /items/{id}) y los filtros propios de cada colección.
const http = require('http');
const fs = require('fs');
const path = require('path');

const DEFAULT_TODAY = '2026-10-11'; // "hoy" de la semilla; se puede cambiar con MOCK_HOY

class BadRequest extends Error {}

const lower = (v) => String(v).toLowerCase();
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

const f = {
  text: (field) => ({ test: (item, v) => lower(item[field]) === lower(v) }),
  ref: (field, prefix) => ({
    parse: (v) => { if (!new RegExp(`^${prefix}[0-9]+$`).test(v)) throw new BadRequest(`El parámetro ${field} debe tener formato ${prefix}<número>.`); return v; },
    test: (item, v) => item[field] === v,
  }),
  enumOf: (field, values) => ({
    parse: (v) => { if (!values.includes(v)) throw new BadRequest(`Valor inválido para ${field}. Permitidos: ${values.join(', ')}.`); return v; },
    test: (item, v) => item[field] === v,
  }),
  number: (field, op, { integer = false, min, max } = {}) => ({
    parse: (v) => {
      const n = Number(v);
      if (v === '' || !Number.isFinite(n) || (integer && !Number.isInteger(n)) || (min !== undefined && n < min) || (max !== undefined && n > max)) {
        throw new BadRequest(`Valor inválido para el parámetro.`);
      }
      return n;
    },
    test: (item, v) => (op === 'gte' ? item[field] >= v : item[field] <= v),
  }),
  date: (field, op) => ({
    parse: (v) => { if (!isDate(v)) throw new BadRequest('La fecha debe tener formato YYYY-MM-DD.'); return v; },
    test: (item, v) => (op === 'gte' ? String(item[field]).slice(0, 10) >= v : String(item[field]).slice(0, 10) <= v),
  }),
  bool: (test) => ({
    parse: (v) => { if (v !== 'true' && v !== 'false') throw new BadRequest('El parámetro debe ser true o false.'); return v === 'true'; },
    test,
  }),
};

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function intParam(url, name, def, min, max) {
  if (!url.searchParams.has(name)) return def;
  const n = Number(url.searchParams.get(name));
  if (url.searchParams.get(name) === '' || !Number.isInteger(n) || n < min || (max !== undefined && n > max)) {
    throw new BadRequest(max === undefined ? `El parámetro ${name} debe ser >= ${min}.` : `El parámetro ${name} debe estar entre ${min} y ${max}.`);
  }
  return n;
}

function createMock({ collection, port, filters = {} }) {
  const file = path.join(__dirname, '..', 'kit', 'seed', `${collection}.json`);
  const ITEMS = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')).sort((a, b) => a.id.localeCompare(b.id));
  const today = process.env.MOCK_HOY || DEFAULT_TODAY;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method !== 'GET') return send(res, 404, { error: 'not_found', message: 'Ruta inexistente.' });

    if (url.pathname === '/health') {
      return send(res, 200, { status: 'ok', service: `mock-${collection}`, collection, version: '1.0.0' });
    }

    if (url.pathname === '/items') {
      try {
        const limit = intParam(url, 'limit', 20, 1, 100);
        const offset = intParam(url, 'offset', 0, 0);
        const ctx = { today, query: url.searchParams };
        const active = [];
        for (const [name, def] of Object.entries(filters)) {
          if (!url.searchParams.has(name)) continue;
          const raw = url.searchParams.get(name);
          active.push([def, def.parse ? def.parse(raw) : raw]);
        }
        const matches = ITEMS.filter((item) => active.every(([def, v]) => !def.test || def.test(item, v, ctx)));
        return send(res, 200, { items: matches.slice(offset, offset + limit), total: matches.length, limit, offset });
      } catch (e) {
        if (e instanceof BadRequest) return send(res, 400, { error: 'bad_request', message: e.message });
        throw e;
      }
    }

    const m = /^\/items\/([^/]+)$/.exec(url.pathname);
    if (m) {
      const id = decodeURIComponent(m[1]);
      const item = ITEMS.find((i) => i.id === id);
      return item ? send(res, 200, item) : send(res, 404, { error: 'not_found', message: `No existe ${id}.` });
    }

    send(res, 404, { error: 'not_found', message: 'Ruta inexistente.' });
  });

  server.listen(process.env.MOCK_PORT || port, () => {
    console.log(`Mock MS-${collection} en http://localhost:${server.address().port} (${ITEMS.length} registros)`);
  });
  return server;
}

module.exports = { createMock, f };
