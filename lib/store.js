const fs = require('fs');
const path = require('path');

// Persistencia: MongoDB (MONGODB_URI) o, si no está definida, un archivo JSON en DATA_DIR.
// En Render el disco es efímero salvo que se use un Persistent Disk, por eso se recomienda Mongo.

async function createMongoStore(uri) {
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db(process.env.MONGODB_DB || 'dashboard').collection('registros');
  return {
    kind: 'mongodb',
    async all() { return (await col.find({}, { projection: { _id: 0 } }).toArray()); },
    async get(codigo) { return col.findOne({ codigo }, { projection: { _id: 0 } }); },
    async put(rec) { await col.replaceOne({ codigo: rec.codigo }, rec, { upsert: true }); },
    async patch(codigo, fields) { await col.updateOne({ codigo }, { $set: fields }); },
    async remove(codigo) { return (await col.deleteOne({ codigo })).deletedCount > 0; },
  };
}

function createFileStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'registros.json');
  let data = {};
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* archivo nuevo */ }
  let writing = Promise.resolve();
  const save = () => {
    writing = writing.then(async () => {
      const tmp = file + '.tmp';
      await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2));
      await fs.promises.rename(tmp, file);
    });
    return writing;
  };
  return {
    kind: 'file',
    async all() { return Object.values(data).map((r) => ({ ...r })); },
    async get(codigo) { return data[codigo] ? { ...data[codigo] } : null; },
    async put(rec) { data[rec.codigo] = { ...rec }; await save(); },
    async patch(codigo, fields) { if (data[codigo]) { Object.assign(data[codigo], fields); await save(); } },
    async remove(codigo) { const had = !!data[codigo]; delete data[codigo]; await save(); return had; },
  };
}

async function createStore() {
  if (process.env.MONGODB_URI) return createMongoStore(process.env.MONGODB_URI);
  return createFileStore(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
}

module.exports = { createStore, createFileStore };
