const fs = require('fs');
const path = require('path');

class ReservationConflictError extends Error {}

function copy(record) {
  return record ? { ...record, estudiantes: [...record.estudiantes] } : null;
}

function createFileReservationStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'reservas.json');
  let records = {};
  try { records = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* archivo nuevo */ }
  let writing = Promise.resolve();
  const save = () => {
    const snapshot = JSON.stringify(records, null, 2);
    writing = writing.then(async () => {
      const tmp = file + '.tmp';
      await fs.promises.writeFile(tmp, snapshot);
      await fs.promises.rename(tmp, file);
    });
    return writing;
  };

  return {
    kind: 'file',
    async all() { return Object.values(records).map(copy); },
    async get(codigo) { return copy(records[codigo]); },
    async create(record) {
      if (records[record.codigo]) throw new ReservationConflictError();
      records[record.codigo] = copy(record);
      await save();
      return copy(records[record.codigo]);
    },
    async remove(codigo) {
      if (!records[codigo]) return false;
      delete records[codigo];
      await save();
      return true;
    },
  };
}

async function createMongoReservationStore(uri, dbName) {
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(uri);
  await client.connect();
  const collection = client.db(dbName).collection('reservas');
  await collection.createIndex({ codigo: 1 }, { unique: true });

  return {
    kind: 'mongodb',
    async all() { return collection.find({}, { projection: { _id: 0 } }).toArray(); },
    async get(codigo) { return collection.findOne({ codigo }, { projection: { _id: 0 } }); },
    async create(record) {
      try {
        await collection.insertOne(record);
        return copy(record);
      } catch (error) {
        if (error.code === 11000) throw new ReservationConflictError();
        throw error;
      }
    },
    async remove(codigo) { return (await collection.deleteOne({ codigo })).deletedCount > 0; },
  };
}

async function createReservationStore({
  uri = process.env.MONGODB_URI,
  dbName = process.env.MONGODB_DB || 'dashboard',
  dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data'),
} = {}) {
  if (uri) return createMongoReservationStore(uri, dbName);
  return createFileReservationStore(dataDir);
}

module.exports = {
  createReservationStore,
  createFileReservationStore,
  ReservationConflictError,
};