const dns = require('dns').promises;
const net = require('net');

const TIMEOUT_MS = Number(process.env.CHECK_TIMEOUT_MS || 20000);
const MAX_BYTES = 1024 * 1024;
const ALLOW_PRIVATE = process.env.ALLOW_PRIVATE_URLS === '1';

class CheckError extends Error {}

function isPrivateIp(ip) {
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
  }
  const [a, b] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

// Devuelve la URL normalizada (sin barra final) o lanza CheckError.
async function validateBaseUrl(raw) {
  let u;
  try { u = new URL(String(raw).trim()); } catch { throw new CheckError('La URL no es válida.'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new CheckError('La URL debe ser http o https.');
  if (u.username || u.password) throw new CheckError('La URL no debe incluir credenciales.');
  if (u.search || u.hash) throw new CheckError('La URL no debe incluir query ni fragmento.');
  if (!ALLOW_PRIVATE) {
    const host = u.hostname.replace(/^\[|\]$/g, '');
    let addrs;
    try {
      addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
    } catch { throw new CheckError(`No se pudo resolver el host ${host}.`); }
    if (addrs.some((a) => isPrivateIp(a.address))) {
      throw new CheckError('La URL apunta a una dirección privada/local; debe ser pública (por ejemplo la de Render).');
    }
  }
  return u.origin + u.pathname.replace(/\/+$/, '');
}

async function get(base, p) {
  const t0 = Date.now();
  let res;
  let target = base + p;
  const origin = new URL(base).hostname;
  for (let hop = 0; ; hop++) {
    try {
      res = await fetch(target, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: 'application/json', 'user-agent': 'dashboard-microservicios/1.0' },
      });
    } catch (e) {
      const timeout = e.name === 'TimeoutError' || e.name === 'AbortError';
      throw new CheckError(`GET ${p}: ${timeout ? `sin respuesta tras ${TIMEOUT_MS / 1000}s` : 'no se pudo conectar'}.`);
    }
    if (!(res.status >= 300 && res.status < 400)) break;
    const loc = res.headers.get('location') || '(sin Location)';
    let next;
    try { next = new URL(loc, target); } catch { /* Location inválido */ }
    // Solo se siguen redirecciones al mismo host (p. ej. http→https), nunca hacia otros destinos.
    if (next && next.hostname === origin && ['http:', 'https:'].includes(next.protocol) && hop < 3) {
      target = next.href;
      continue;
    }
    await res.body?.cancel().catch(() => {});
    const dest = next ? `${next.origin}${next.pathname}` : loc;
    throw new CheckError(`GET ${p}: redirección (${res.status}) hacia ${dest}; registrá la URL final. Si es un túnel o puerto reenviado de VS Code, debe ser público (sin login).`);
  }  const chunks = [];
  let size = 0;
  try {
    for await (const c of res.body || []) {
      size += c.length;
      if (size > MAX_BYTES) throw new CheckError(`GET ${p}: respuesta demasiado grande.`);
      chunks.push(c);
    }
  } catch (e) {
    if (e instanceof CheckError) throw e;
    throw new CheckError(`GET ${p}: error leyendo la respuesta.`);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  let json;
  try { json = JSON.parse(text); } catch { json = undefined; }
  return { status: res.status, json, ms: Date.now() - t0 };
}

function expectSchema(label, validate, data) {
  if (data === undefined) throw new CheckError(`${label}: la respuesta no es JSON.`);
  if (!validate(data)) {
    const e = validate.errors[0];
    throw new CheckError(`${label}: formato inválido (${e.instancePath || '/'} ${e.message}).`);
  }
}

function expectStatus(label, r, status) {
  if (r.status !== status) throw new CheckError(`${label}: se esperaba ${status} y se recibió ${r.status}.`);
}

/**
 * Prueba un microservicio contra el contrato. strict=true agrega los casos
 * negativos (404 y 400) y se usa al registrar. etapa2=true solo verifica /health.
 * Devuelve { ok, error, ms, at }.
 */
async function check(entry, baseUrl, { strict = false, etapa2 = false } = {}) {
  const at = new Date().toISOString();
  const t0 = Date.now();
  
  try {
    // Para Etapa 2, solo verificar /health
    if (etapa2) {
      let r = await get(baseUrl, '/health');
      expectStatus('GET /health', r, 200);
      if (!r.json || typeof r.json !== 'object' || r.json.status !== 'ok') {
        throw new CheckError('GET /health: se esperaba { status: "ok", ... }');
      }
      return { ok: true, error: null, ms: Date.now() - t0, at };
    }
    
    // Para Etapa 1, validación completa
    const v = entry.validators;
    let r = await get(baseUrl, '/health');
    expectStatus('GET /health', r, 200);
    expectSchema('GET /health', v.Health, r.json);
    if (r.json.collection !== entry.coleccion) {
      throw new CheckError(`GET /health: collection es "${r.json.collection}" y debería ser "${entry.coleccion}".`);
    }

    r = await get(baseUrl, '/items?limit=1');
    expectStatus('GET /items', r, 200);
    expectSchema('GET /items', v.ItemList, r.json);
    if (r.json.items.length < 1) throw new CheckError('GET /items: no devolvió ningún dato (cargá la semilla).');
    if (r.json.items.length > 1) throw new CheckError('GET /items?limit=1: devolvió más de 1 elemento.');
    if (r.json.limit !== 1) throw new CheckError('GET /items?limit=1: el campo limit de la respuesta debe ser 1.');

    const item = r.json.items[0];
    r = await get(baseUrl, `/items/${encodeURIComponent(item.id)}`);
    expectStatus(`GET /items/${item.id}`, r, 200);
    expectSchema(`GET /items/${item.id}`, v.Item, r.json);
    if (r.json.id !== item.id) throw new CheckError(`GET /items/${item.id}: devolvió otro id (${r.json.id}).`);

    if (strict) {
      r = await get(baseUrl, `/items/${entry.prefijo}999999`);
      expectStatus('GET /items/<inexistente>', r, 404);
      expectSchema('GET /items/<inexistente>', v.Error, r.json);

      r = await get(baseUrl, '/items?limit=0');
      expectStatus('GET /items?limit=0', r, 400);
      expectSchema('GET /items?limit=0', v.Error, r.json);
    }
    return { ok: true, error: null, ms: Date.now() - t0, at };
  } catch (e) {
    if (!(e instanceof CheckError)) throw e;
    return { ok: false, error: e.message, ms: Date.now() - t0, at };
  }
}

module.exports = { check, validateBaseUrl, CheckError };
