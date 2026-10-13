require('dotenv').config();

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { promisify } = require('util');
const express = require('express');
const { catalog, find } = require('./lib/catalog');
const { check, validateBaseUrl } = require('./lib/checker');
const { createStore } = require('./lib/store');
const {
  createReservationStore,
  createFileReservationStore,
  ReservationConflictError,
} = require('./lib/reservations');

const scrypt = promisify(crypto.scrypt);

// Mapeo de servicios Etapa 2 con sus endpoints
const ETAPA2_ENDPOINTS = {
  'clientes-resumen': ['GET /clientes/{id}/resumen', 'GET /clientes/top'],
  'ordenes-detalle': ['GET /ordenes/{id}/detalle', 'GET /ordenes/{id}/verificacion'],
  'productos-ficha': ['GET /productos/{id}/ficha', 'GET /productos/mejor-puntuados'],
  'categorias-catalogo': ['GET /categorias/{id}/resumen', 'GET /categorias/sin-productos'],
  'inventario-alertas': ['GET /alertas/stock-bajo', 'GET /alertas/sin-stock'],
  'sucursales-stock': ['GET /sucursales/{id}/stock', 'GET /sucursales/ranking'],
  'ranking-productos': ['GET /ranking/mas-vendidos', 'GET /ranking/ingresos-por-categoria'],
  'pagos-conciliacion': ['GET /conciliacion/{ordenId}', 'GET /conciliacion/inconsistencias'],
  'envios-demorados': ['GET /envios/demorados', 'GET /envios/valor-en-riesgo'],
  'resenas-criticas': ['GET /resenas/criticas', 'GET /resenas/por-categoria'],
  'promociones-precios': ['GET /promociones/vigentes/precios', 'GET /promociones/{id}/productos'],
  'tickets-contexto': ['GET /tickets/{id}/contexto', 'GET /tickets/abiertos-por-ciudad'],
};

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

async function hashReleaseKey(key, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = await scrypt(key, salt, 64);
  return { salt, hash: hash.toString('hex') };
}

async function matchesReleaseKey(key, salt, expectedHash) {
  const actual = await scrypt(key, salt, 64);
  const expected = Buffer.from(expectedHash || '', 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

function reservationView(entry, record) {
  return {
    codigo: entry.codigo,
    coleccion: entry.coleccion,
    titulo: entry.titulo,
    descripcion: entry.descripcionReserva || entry.descripcion,
    endpoints: entry.endpoints,
    reservado: Boolean(record),
    estudiantes: record ? record.estudiantes : [],
    reservadoEn: record ? record.reservadoEn : null,
  };
}

function createApp(store, {
  adminToken = process.env.ADMIN_TOKEN,
  reservationStore = createFileReservationStore(process.env.DATA_DIR || path.join(__dirname, 'data')),
} = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10kb' }));
  app.get('/reserva', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'reserva.html')));
  app.use(express.static(path.join(__dirname, 'public')));

  const inFlight = new Set();
  const hits = new Map(); // límite simple por clave (ip+acción)
  const limited = (key, max, windowMs) => {
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    arr.push(now);
    hits.set(key, arr);
    if (hits.size > 5000) hits.clear();
    return arr.length > max;
  };

  const view = (entry, rec) => {
    let estado = 'libre';
    if (rec) estado = !rec.ultimoCheck ? 'registrado' : rec.ultimoCheck.ok ? 'online' : 'offline';
    const endpoints = entry.endpoints || ETAPA2_ENDPOINTS[entry.codigo.toLowerCase().replace('ms-', '')] || [];
    return {
      codigo: entry.codigo,
      coleccion: entry.coleccion,
      titulo: entry.titulo,
      descripcion: entry.descripcion,
      estado,
      url: rec ? rec.url : null,
      grupo: rec ? rec.grupo : null,
      estudiantes: rec ? rec.estudiantes : [],
      registradoEn: rec ? rec.registradoEn : null,
      ultimoCheck: rec ? rec.ultimoCheck || null : null,
      endpoints: endpoints.map(ep => typeof ep === 'string' ? ep : `${ep.metodo} ${ep.ruta}`),
    };
  };

  app.get('/api/microservicios', async (_req, res, next) => {
    try {
      const recs = new Map((await store.all()).map((r) => [r.codigo, r]));
      
      // Servicios Etapa 1 (del catálogo)
      const etapa1 = [...catalog.values()].map((e) => view(e, recs.get(e.codigo)));
      
      // Servicios Etapa 2 (virtuales, si no están en la tienda)
      const etapa2 = Object.entries(ETAPA2_ENDPOINTS).map(([codigo, endpoints]) => {
        const etapa2Code = codigo.split('-')[0]; // obtiene el prefijo
        const consumes = {
          'clientes-resumen': 'MS-ordenes',
          'ordenes-detalle': 'MS-lineas_orden',
          'productos-ficha': 'MS-resenas',
          'categorias-catalogo': 'MS-productos',
          'inventario-alertas': 'MS-productos',
          'sucursales-stock': 'MS-inventario',
          'ranking-productos': 'MS-productos',
          'pagos-conciliacion': 'MS-ordenes',
          'envios-demorados': 'MS-ordenes',
          'resenas-criticas': 'MS-productos',
          'promociones-precios': 'MS-productos',
          'tickets-contexto': 'MS-clientes',
        };
        const rec = recs.get(codigo) || null;
        let estado = 'libre';
        if (rec) estado = !rec.ultimoCheck ? 'registrado' : rec.ultimoCheck.ok ? 'online' : 'offline';
        
        return {
          codigo: codigo,
          coleccion: codigo,
          titulo: `${codigo.toUpperCase()} (Etapa 2)`,
          descripcion: `Servicio derivado que consume ${consumes[codigo] || 'otro servicio'}`,
          estado,
          url: rec ? rec.url : null,
          grupo: rec ? rec.grupo : null,
          estudiantes: rec ? rec.estudiantes : [],
          registradoEn: rec ? rec.registradoEn : null,
          ultimoCheck: rec ? rec.ultimoCheck || null : null,
          endpoints: endpoints,
        };
      });
      
      res.json([...etapa1, ...etapa2]);
    } catch (e) { next(e); }
  });

  app.get('/api/reservas', async (_req, res, next) => {
    try {
      const records = new Map((await reservationStore.all()).map((record) => [record.codigo, record]));
      res.json([...catalog.values()].map((entry) => reservationView(entry, records.get(entry.codigo))));
    } catch (e) { next(e); }
  });

  app.get('/api/reservas/:codigo/openapi', (req, res) => {
    const entry = find(req.params.codigo);
    if (!entry) return res.status(404).json({ error: 'not_found', message: 'Microservicio inexistente.' });
    const yaml = fs.readFileSync(entry.openapiPath, 'utf8');
    res.type('application/yaml');
    res.set('content-disposition', `attachment; filename="${entry.coleccion}.yaml"`);
    res.send(yaml);
  });

  app.get('/api/reservas/:codigo/dataset', (req, res) => {
    const entry = find(req.params.codigo);
    if (!entry) return res.status(404).json({ error: 'not_found', message: 'Microservicio inexistente.' });
    const dataset = fs.readFileSync(entry.seedPath, 'utf8');
    res.type('application/json');
    res.set('content-disposition', `attachment; filename="${entry.coleccion}.json"`);
    res.send(dataset);
  });

  app.post('/api/reservas', async (req, res, next) => {
    try {
      if (limited(`reserve:${req.ip}`, 10, 60000)) {
        return res.status(429).json({ error: 'too_many_requests', message: 'Demasiados intentos, esperá un minuto.' });
      }
      const { codigo, estudiantes, claveLiberacion } = req.body || {};
      const entry = find(codigo);
      if (!entry) return res.status(400).json({ error: 'bad_request', message: 'Código de microservicio desconocido.' });
      if (!Array.isArray(estudiantes) || estudiantes.length < 1 || estudiantes.length > 8 ||
          !estudiantes.every((name) => typeof name === 'string' && name.trim() && name.trim().length <= 80)) {
        return res.status(400).json({ error: 'bad_request', message: 'Ingresá entre 1 y 8 nombres de integrantes, de hasta 80 caracteres cada uno.' });
      }
      if (typeof claveLiberacion !== 'string' || claveLiberacion.trim().length < 8 || claveLiberacion.length > 128) {
        return res.status(400).json({ error: 'bad_request', message: 'La clave de liberación debe tener entre 8 y 128 caracteres.' });
      }

      const { salt, hash } = await hashReleaseKey(claveLiberacion);
      const record = {
        codigo: entry.codigo,
        estudiantes: estudiantes.map((name) => name.trim()),
        reservadoEn: new Date().toISOString(),
        claveSalt: salt,
        claveHash: hash,
      };
      try {
        await reservationStore.create(record);
      } catch (error) {
        if (error instanceof ReservationConflictError) {
          return res.status(409).json({ error: 'conflict', message: 'Ese microservicio ya fue reservado por otro equipo.' });
        }
        throw error;
      }
      res.status(201).json(reservationView(entry, record));
    } catch (e) { next(e); }
  });

  app.delete('/api/reservas/:codigo', async (req, res, next) => {
    try {
      if (limited(`release:${req.ip}`, 10, 60000)) {
        return res.status(429).json({ error: 'too_many_requests', message: 'Demasiados intentos, esperá un minuto.' });
      }
      const entry = find(req.params.codigo);
      if (!entry) return res.status(404).json({ error: 'not_found', message: 'Microservicio inexistente.' });
      const record = await reservationStore.get(entry.codigo);
      if (!record) return res.status(404).json({ error: 'not_found', message: 'No hay una reserva para liberar.' });
      const { claveLiberacion } = req.body || {};
      const valid = typeof claveLiberacion === 'string' &&
        await matchesReleaseKey(claveLiberacion, record.claveSalt, record.claveHash);
      if (!valid) return res.status(403).json({ error: 'forbidden', message: 'La clave de liberación no es correcta.' });
      await reservationStore.remove(entry.codigo);
      res.json({ codigo: entry.codigo, liberada: true });
    } catch (e) { next(e); }
  });

  app.post('/api/register', async (req, res, next) => {
    let lockKey;
    try {
      if (limited(`reg:${req.ip}`, 10, 60000)) {
        return res.status(429).json({ error: 'too_many_requests', message: 'Demasiados intentos, esperá un minuto.' });
      }
      const { codigo, url, estudiantes, grupo } = req.body || {};
      
      // Buscar en Etapa 1 o Etapa 2
      let entry = find(codigo);
      let isEtapa2 = false;
      if (!entry && Object.keys(ETAPA2_ENDPOINTS).includes(codigo)) {
        isEtapa2 = true;
        entry = {
          codigo: codigo,
          coleccion: codigo,
          titulo: codigo,
          descripcion: `Servicio derivado ${codigo}`,
          endpoints: ETAPA2_ENDPOINTS[codigo],
        };
      }
      
      if (!entry) {
        const allCodes = [...catalog.values()].map((e) => e.codigo).concat(Object.keys(ETAPA2_ENDPOINTS));
        return res.status(400).json({ error: 'bad_request', message: `Código desconocido. Opciones: ${allCodes.join(', ')}.` });
      }
      if (!Array.isArray(estudiantes) || estudiantes.length < 1 || estudiantes.length > 8 ||
          !estudiantes.every((s) => typeof s === 'string' && s.trim() && s.length <= 80)) {
        return res.status(400).json({ error: 'bad_request', message: 'estudiantes debe ser una lista de 1 a 8 nombres (texto no vacío).' });
      }
      if (grupo !== undefined && (typeof grupo !== 'string' || grupo.length > 80)) {
        return res.status(400).json({ error: 'bad_request', message: 'grupo debe ser texto de hasta 80 caracteres.' });
      }
      let base;
      try { base = await validateBaseUrl(url); } catch (e) {
        return res.status(400).json({ error: 'bad_request', message: e.message });
      }

      lockKey = codigo;
      if (inFlight.has(lockKey)) {
        lockKey = undefined;
        return res.status(409).json({ error: 'conflict', message: 'Hay otra registración en curso para este microservicio.' });
      }
      inFlight.add(lockKey);

      if (await store.get(codigo)) {
        return res.status(409).json({ error: 'conflict', message: `${codigo} ya está registrado. Pedí al administrador que lo libere.` });
      }
      
      // Para Etapa 2, validar solo /health; para Etapa 1, validar completo
      let result;
      if (isEtapa2) {
        result = await check(entry, base, { etapa2: true });
      } else {
        result = await check(entry, base, { strict: true });
      }
      
      if (!result.ok) {
        return res.status(422).json({ error: 'registration_rejected', message: `Registración rechazada: ${result.error}` });
      }
      const rec = {
        codigo: codigo,
        url: base,
        grupo: grupo ? grupo.trim() : null,
        estudiantes: estudiantes.map((s) => s.trim()),
        registradoEn: new Date().toISOString(),
        ultimoCheck: result,
      };
      await store.put(rec);
      
      // Preparar respuesta
      const response = {
        codigo: codigo,
        coleccion: entry.coleccion,
        titulo: entry.titulo,
        descripcion: entry.descripcion,
        estado: 'online',
        url: rec.url,
        grupo: rec.grupo,
        estudiantes: rec.estudiantes,
        registradoEn: rec.registradoEn,
        ultimoCheck: rec.ultimoCheck,
        endpoints: (entry.endpoints || ETAPA2_ENDPOINTS[codigo] || []).map(ep => typeof ep === 'string' ? ep : `${ep.metodo} ${ep.ruta}`),
      };
      res.status(201).json(response);
    } catch (e) { next(e); } finally {
      if (lockKey) inFlight.delete(lockKey);
    }
  });

  app.post('/api/microservicios/:codigo/ping', async (req, res, next) => {
    try {
      const entry = find(req.params.codigo);
      if (!entry) return res.status(404).json({ error: 'not_found', message: 'Microservicio inexistente.' });
      if (limited(`ping:${req.ip}`, 30, 60000)) {
        return res.status(429).json({ error: 'too_many_requests', message: 'Demasiados pings, esperá un minuto.' });
      }
      const rec = await store.get(entry.codigo);
      if (!rec) return res.status(409).json({ error: 'conflict', message: 'El microservicio está libre; no hay nada para probar.' });
      const result = await check(entry, rec.url);
      await store.patch(entry.codigo, { ultimoCheck: result });
      res.json(view(entry, { ...rec, ultimoCheck: result }));
    } catch (e) { next(e); }
  });

  const requireAdmin = (req, res, next) => {
    const m = /^Bearer (.+)$/.exec(req.get('authorization') || '');
    if (!adminToken || !m || !safeEqual(m[1], adminToken)) {
      if (limited(`adm:${req.ip}`, 20, 60000)) return res.status(429).json({ error: 'too_many_requests', message: 'Demasiados intentos.' });
      return res.status(401).json({ error: 'unauthorized', message: 'Token de administrador inválido.' });
    }
    next();
  };

  app.get('/api/admin/check', requireAdmin, (_req, res) => res.json({ ok: true }));

  app.delete('/api/admin/reservas/:codigo', requireAdmin, async (req, res, next) => {
    try {
      const entry = find(req.params.codigo);
      if (!entry) return res.status(404).json({ error: 'not_found', message: 'Microservicio inexistente.' });
      const removed = await reservationStore.remove(entry.codigo);
      res.json({ codigo: entry.codigo, liberada: removed });
    } catch (e) { next(e); }
  });

  app.post('/api/admin/microservicios/:codigo/liberar', requireAdmin, async (req, res, next) => {
    try {
      const entry = find(req.params.codigo);
      if (!entry) return res.status(404).json({ error: 'not_found', message: 'Microservicio inexistente.' });
      const removed = await store.remove(entry.codigo);
      res.json({ codigo: entry.codigo, liberado: removed });
    } catch (e) { next(e); }
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found', message: 'Ruta inexistente.' }));
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
      return res.status(400).json({ error: 'bad_request', message: 'JSON inválido.' });
    }
    console.error(err);
    res.status(500).json({ error: 'internal', message: 'Error interno.' });
  });
  return app;
}

// Re-prueba periódicamente todos los registrados para mantener el estado online/offline.
function startMonitor(store, intervalMs) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const recs = await store.all();
      const queue = [...recs];
      const worker = async () => {
        for (let rec; (rec = queue.shift());) {
          const entry = find(rec.codigo);
          if (!entry) continue;
          try { await store.patch(rec.codigo, { ultimoCheck: await check(entry, rec.url) }); } catch (e) { console.error(e); }
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
    } catch (e) { console.error(e); } finally { running = false; }
  };
  const t = setInterval(tick, intervalMs);
  t.unref();
  setTimeout(tick, 2000).unref();
}

module.exports = { createApp };

if (require.main === module) {
  (async () => {
    if (!process.env.ADMIN_TOKEN) console.warn('ADMIN_TOKEN no definido: las funciones de administrador están deshabilitadas.');
    const store = await createStore();
    console.log(`Persistencia: ${store.kind}`);
    const reservationStore = await createReservationStore();
    console.log(`Reservas: ${reservationStore.kind}`);
    startMonitor(store, Number(process.env.MONITOR_INTERVAL_MS || 120000));
    const port = process.env.PORT || 3000;
    createApp(store, { reservationStore }).listen(port, () => console.log(`Dashboard en http://localhost:${port}`));
  })().catch((e) => { console.error(e); process.exit(1); });
}
