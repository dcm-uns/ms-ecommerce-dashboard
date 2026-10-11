const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { catalog, find } = require('./lib/catalog');
const { check, validateBaseUrl } = require('./lib/checker');
const { createStore } = require('./lib/store');

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function createApp(store, { adminToken = process.env.ADMIN_TOKEN } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10kb' }));
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
    };
  };

  app.get('/api/microservicios', async (_req, res, next) => {
    try {
      const recs = new Map((await store.all()).map((r) => [r.codigo, r]));
      res.json([...catalog.values()].map((e) => view(e, recs.get(e.codigo))));
    } catch (e) { next(e); }
  });

  app.post('/api/register', async (req, res, next) => {
    let lockKey;
    try {
      if (limited(`reg:${req.ip}`, 10, 60000)) {
        return res.status(429).json({ error: 'too_many_requests', message: 'Demasiados intentos, esperá un minuto.' });
      }
      const { codigo, url, estudiantes, grupo } = req.body || {};
      const entry = find(codigo);
      if (!entry) {
        return res.status(400).json({ error: 'bad_request', message: `Código desconocido. Opciones: ${[...catalog.values()].map((e) => e.codigo).join(', ')}.` });
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

      lockKey = entry.codigo;
      if (inFlight.has(lockKey)) {
        lockKey = undefined;
        return res.status(409).json({ error: 'conflict', message: 'Hay otra registración en curso para este microservicio.' });
      }
      inFlight.add(lockKey);

      if (await store.get(entry.codigo)) {
        return res.status(409).json({ error: 'conflict', message: `${entry.codigo} ya está registrado. Pedí al administrador que lo libere.` });
      }
      const result = await check(entry, base, { strict: true });
      if (!result.ok) {
        return res.status(422).json({ error: 'registration_rejected', message: `Registración rechazada: ${result.error}` });
      }
      const rec = {
        codigo: entry.codigo,
        url: base,
        grupo: grupo ? grupo.trim() : null,
        estudiantes: estudiantes.map((s) => s.trim()),
        registradoEn: new Date().toISOString(),
        ultimoCheck: result,
      };
      await store.put(rec);
      res.status(201).json(view(entry, rec));
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
    startMonitor(store, Number(process.env.MONITOR_INTERVAL_MS || 120000));
    const port = process.env.PORT || 3000;
    createApp(store).listen(port, () => console.log(`Dashboard en http://localhost:${port}`));
  })().catch((e) => { console.error(e); process.exit(1); });
}
