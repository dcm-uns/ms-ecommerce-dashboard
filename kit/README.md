# Kit de microservicios — Escenario A (e-commerce)

12 colecciones con semilla coherente y un contrato OpenAPI por colección. Cada grupo elige **una** colección,
implementa su API, la despliega y la registra en el dashboard.

## Contenido

- `seed/<coleccion>.json`: datos de arranque (array JSON; campo `id` como clave primaria).
- `openapi/<coleccion>.yaml`: contrato OpenAPI 3.0.3 del microservicio.
- `tools/build.py`: fuente de verdad. Regenera todo y valida la coherencia (ver "Expandir los datos").

## Colecciones

| Colección | Prefijo | Filas | Referencias | Filtros propios |
|---|---|---:|---|---|
| categorias | CAT | 8 | padreId → categorias | padreId, raiz |
| productos | PRD | 12 | categoriaId → categorias | categoriaId, marca, precioMin, precioMax |
| sucursales | SUC | 6 | — | ciudad, tipo |
| inventario | INV | 17 | productoId → productos, sucursalId → sucursales | productoId, sucursalId |
| clientes | CLI | 8 | — | ciudad, provincia |
| ordenes | ORD | 12 | clienteId → clientes | clienteId, estado, desde, hasta |
| lineas_orden | LIN | 19 | ordenId → ordenes, productoId → productos | ordenId, productoId |
| pagos | PAG | 12 | ordenId → ordenes | ordenId, estado, medio |
| envios | ENV | 10 | ordenId → ordenes | ordenId, estado, transportista |
| resenas | RES | 10 | productoId → productos, clienteId → clientes | productoId, clienteId, puntajeMin |
| promociones | PRM | 6 | categoriaId → categorias o productoId → productos | categoriaId, productoId, vigente, fecha |
| tickets_soporte | TKT | 8 | clienteId → clientes, ordenId → ordenes | clienteId, ordenId, estado, categoria |

Todas las colecciones comparten además `limit` (1–100, por defecto 20) y `offset`.

## Contrato común

Todos los servicios exponen las mismas tres rutas, de solo lectura:

- `GET /health` → `{ "status": "ok", "service": "...", "collection": "<coleccion>" }`
- `GET /items` → `{ "items": [...], "total": N, "limit": L, "offset": O }`, ordenado por `id`, con filtros AND.
- `GET /items/{id}` → el elemento, o 404.

Errores: `{ "error": "bad_request" | "not_found", "message": "..." }`. Parámetros inválidos → 400.

## Datos de la semilla que conviene conocer (casos para los agentes)

- Inventario con filas por debajo del mínimo (INV001, INV009, INV011) y un producto sin stock (INV005).
- Envío demorado (ENV con estado `demorado`, orden ORD007) y su ticket de soporte asociado.
- Reseña negativa de PRD007 (RES003) con ticket de producto relacionado (TKT002).
- Promociones vigentes, vencida (PRM004) y futura (PRM005). La semilla toma como "hoy" el 2026-10-11;
  usá `?fecha=` para pruebas deterministas.
- Pago pendiente (orden ORD009) y orden cancelada con reembolso (ORD010).
- Las promociones son informativas: los precios históricos de las líneas no las aplican.

## Importar a Atlas

```bash
mongoimport --uri "<tu-connection-string>" --db ecommerce --collection productos \
  --file seed/productos.json --jsonArray
```

(También sirve MongoDB Compass → Import JSON.) La clave primaria de negocio es el campo `id` (string),
no el `_id` de Mongo; el servicio debe devolver `id` y ocultar `_id`.

## Probar un servicio contra el contrato

- Servidor simulado a partir del contrato: `npx @stoplight/prism-cli mock openapi/productos.yaml`
- Pruebas de conformidad contra un servicio en marcha: `schemathesis run openapi/productos.yaml --url http://localhost:3000`
  (o Dredd). Sirven como base para los tests de "activo" del dashboard.

## Expandir los datos

1. Agregá filas en las listas de `tools/build.py` (categorias, productos, clientes, órdenes, líneas, etc.).
   Total de órdenes, subtotales, montos de pago y destino de envíos se calculan solos.
2. `pip install pyyaml jsonschema openapi-spec-validator` y `python3 tools/build.py`.
3. El script rechaza la expansión si rompe integridad referencial o coherencia (totales, estados de pago/envío
   según el estado de la orden, reseñas solo de compras entregadas, tickets de órdenes del mismo cliente, etc.).
