const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const OPENAPI_DIR = process.env.OPENAPI_DIR || path.join(__dirname, '..', 'kit', 'openapi');

function load() {
  const ajv = new Ajv({ strict: false, allErrors: false });
  addFormats(ajv);
  const catalog = new Map();
  const files = fs.readdirSync(OPENAPI_DIR).filter((f) => f.endsWith('.yaml')).sort();
  for (const file of files) {
    const doc = YAML.parse(fs.readFileSync(path.join(OPENAPI_DIR, file), 'utf8'));
    const collection = doc.info['x-collection'];
    const id = `ms-${collection}`;
    const $id = `https://ms.local/${collection}.json`;
    ajv.addSchema({ $id, components: doc.components });
    const ref = (name) => ajv.getSchema(`${$id}#/components/schemas/${name}`);
    catalog.set(id, {
      codigo: `MS-${collection}`,
      coleccion: collection,
      prefijo: doc.info['x-id-prefix'],
      titulo: doc.info.title,
      descripcion: (doc.tags.find((t) => t.name === collection) || {}).description || '',
      validators: { Health: ref('Health'), ItemList: ref('ItemList'), Item: ref('Item'), Error: ref('Error') },
    });
  }
  return catalog;
}

const catalog = load();

// Los códigos se aceptan sin distinguir mayúsculas: "ms-Clientes" == "MS-clientes".
function find(codigo) {
  return catalog.get(String(codigo || '').trim().toLowerCase()) || null;
}

module.exports = { catalog, find };
