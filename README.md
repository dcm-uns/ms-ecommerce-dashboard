# Dashboard de microservicios

Muestra los 12 microservicios del kit (`kit/openapi`), su estado y la URL/integrantes de cada equipo.

## Estados
- **libre**: sin registración.
- **registrado**: registrado, todavía sin prueba posterior (p. ej. tras reiniciar).
- **online**: la última prueba pasó.
- **offline**: la última prueba falló (404, 500, timeout, formato inválido...).

Una prueba consulta `GET /health`, `GET /items?limit=1` y `GET /items/{id}` y valida las respuestas contra los esquemas OpenAPI. El servidor re-prueba todos los registrados cada 2 min (`MONITOR_INTERVAL_MS`) y el botón **Ping** prueba al instante.

## Registración (estudiantes)
Desde el botón "Registrar" o por API:

```bash
curl -X POST https://<dashboard>/api/register -H "content-type: application/json" -d '{
  "codigo": "MS-clientes",
  "url": "https://mi-servicio.onrender.com",
  "grupo": "Grupo 03",
  "estudiantes": ["Ana Pérez", "Beto Gómez"]
}'
```
Códigos: `MS-<coleccion>` (MS-categorias, MS-clientes, MS-envios, MS-inventario, MS-lineas_orden, MS-ordenes, MS-pagos, MS-productos, MS-promociones, MS-resenas, MS-sucursales, MS-tickets_soporte).
Al registrar se hace una prueba estricta (también verifica 404 en id inexistente y 400 con `limit=0`). Si falla: `422` con el motivo y no se registra. Si ya está registrado: `409`.

## API pública para la etapa siguiente
`GET /api/microservicios` ? lista con `codigo`, `estado`, `url`, `estudiantes`, `ultimoCheck`.

## Administración
Definir `ADMIN_TOKEN`. En la UI, botón **Admin** ? ingresar el token ? aparece "Liberar" en cada tarjeta registrada
(o `POST /api/admin/microservicios/<codigo>/liberar` con `Authorization: Bearer <token>`).

## Despliegue en Render
El disco de Render es efímero (salvo Persistent Disk de pago), así que la persistencia recomendada es **MongoDB Atlas**:
1. Crear Web Service desde este directorio (`render.yaml` incluido).
2. Variables: `ADMIN_TOKEN` (secreto largo) y `MONGODB_URI` (base `dashboard`, colección `registros`; configurable con `MONGODB_DB`).
3. Sin `MONGODB_URI` se usa `DATA_DIR/registros.json` (por defecto `./data`); con un Persistent Disk montado, apuntar `DATA_DIR` ahí.

Otras variables: `CHECK_TIMEOUT_MS` (20000; los servicios gratuitos de Render tardan en despertar), `ALLOW_PRIVATE_URLS=1` (solo desarrollo; por defecto se rechazan URLs locales/privadas).

## Desarrollo
`npm install`, `ADMIN_TOKEN=x npm start`, `npm test`.
