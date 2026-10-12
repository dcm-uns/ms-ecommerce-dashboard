# Dashboard de microservicios

Muestra los 12 microservicios del kit (`kit/openapi`), su estado y la URL/integrantes de cada equipo.

## Estados
- **libre**: sin registraci�n.
- **registrado**: registrado, todav�a sin prueba posterior (p. ej. tras reiniciar).
- **online**: la �ltima prueba pas�.
- **offline**: la �ltima prueba fall� (404, 500, timeout, formato inv�lido...).

Una prueba consulta `GET /health`, `GET /items?limit=1` y `GET /items/{id}` y valida las respuestas contra los esquemas OpenAPI. El servidor re-prueba todos los registrados cada 2 min (`MONITOR_INTERVAL_MS`) y el bot�n **Ping** prueba al instante.

## Registraci�n (estudiantes)
Desde el bot�n "Registrar" o por API:

```bash
curl -X POST https://<dashboard>/api/register -H "content-type: application/json" -d '{
  "codigo": "MS-clientes",
  "url": "https://mi-servicio.onrender.com",
  "grupo": "Grupo 03",
  "estudiantes": ["Ana Perez", "Beto Gomez"]
}'
```
C�digos: `MS-<coleccion>` (MS-categorias, MS-clientes, MS-envios, MS-inventario, MS-lineas_orden, MS-ordenes, MS-pagos, MS-productos, MS-promociones, MS-resenas, MS-sucursales, MS-tickets_soporte).
Al registrar se hace una prueba estricta (tambi�n verifica 404 en id inexistente y 400 con `limit=0`). Si falla: `422` con el motivo y no se registra. Si ya est� registrado: `409`.

## API p�blica para la etapa siguiente
`GET /api/microservicios` ? lista con `codigo`, `estado`, `url`, `estudiantes`, `ultimoCheck`.

## Administraci�n
Definir `ADMIN_TOKEN`. En la UI, bot�n **Admin** ? ingresar el token ? aparece "Liberar" en cada tarjeta registrada
(o `POST /api/admin/microservicios/<codigo>/liberar` con `Authorization: Bearer <token>`).

## Despliegue en Render
El disco de Render es ef�mero (salvo Persistent Disk de pago), as� que la persistencia recomendada es **MongoDB Atlas**:
1. Crear Web Service desde este directorio (`render.yaml` incluido).
2. Variables: `ADMIN_TOKEN` (secreto largo) y `MONGODB_URI` (base `dashboard`, colecci�n `registros`; configurable con `MONGODB_DB`).
3. Sin `MONGODB_URI` se usa `DATA_DIR/registros.json` (por defecto `./data`); con un Persistent Disk montado, apuntar `DATA_DIR` ah�.

Otras variables: `CHECK_TIMEOUT_MS` (20000; los servicios gratuitos de Render tardan en despertar), `ALLOW_PRIVATE_URLS=1` (solo desarrollo; por defecto se rechazan URLs locales/privadas).

## Desarrollo
`npm install`, `npm start`, `npm test`. `npm start` carga las variables de `.env` (Node.js 20.6 o superior). Para iniciar el mock local de clientes: `npm run mock:clientes`.
