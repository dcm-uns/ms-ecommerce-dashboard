const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const OPENAPI_DIR = process.env.OPENAPI_DIR || path.join(__dirname, '..', 'kit', 'openapi');
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace']);

function load() {
  const ajv = new Ajv({ strict: false, allErrors: false });
  addFormats(ajv);
  const catalog = new Map();
  const files = fs.readdirSync(OPENAPI_DIR).filter((f) => f.endsWith('.yaml')).sort();
  for (const file of files) {
    const openapiPath = path.join(OPENAPI_DIR, file);
    const doc = YAML.parse(fs.readFileSync(openapiPath, 'utf8'));
    const collection = doc.info['x-collection'];
    const endpoints = Object.entries(doc.paths || {}).flatMap(([route, operations]) =>
      Object.keys(operations)
        .filter((method) => HTTP_METHODS.has(method))
        .map((method) => ({
          metodo: method.toUpperCase(),
          ruta: route,
          resumen: operations[method].summary || '',
        })),
    );
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
      descripcionReserva: (doc.tags.find((t) => t.name === collection) || {}).description || doc.info.description || '',
      endpoints,
      openapiPath,
      seedPath: path.join(__dirname, '..', 'kit', 'seed', `${collection}.json`),
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
