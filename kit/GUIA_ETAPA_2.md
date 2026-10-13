# Guía de la etapa 2: servicios que consumen servicios

En la etapa 1 cada grupo implementó **un microservicio de datos** (su colección) y lo registró en el dashboard.
En la etapa 2 cada grupo implementa un **servicio derivado**: además de usar los datos de su propia colección,
**consume el microservicio de otro grupo** para producir un dato nuevo que ninguno de los dos servicios entrega por separado.

> Si implementaste el servicio **X**, ahora debes implementar el servicio derivado **Y**, que usa los datos de tu colección
> y también los obtenidos del servicio **Z** (hecho por otro grupo).

## Reglas

1. **Tu colección sigue siendo tuya.** El servicio derivado usa tu microservicio  y consulta a Z **solo por HTTP**, usando su contrato (`GET /items`, `GET /items/{id}`).
2. **Z lo hace otro grupo.** Obtén su URL en `GET /api/microservicios` del dashboard y elige un servicio con estado `online`. La URL va en una variable de entorno (`Z_URL`), nunca fija en el código.
3. **Contrato mínimo del derivado**: `GET /health` y los dos endpoints que se indican abajo (solo lectura, JSON).
4. **Tolerancia a fallos**: timeout de 5 s al llamar a Z. Si Z falla, responde `502` con `{ "error": "upstream_unavailable", "message": "..." }`; nunca un 500 ni un cuelgue.
. **
6. **Pruebas**: una prueba con Z simulado (mock con datos de `kit/seed`) y una contra el servicio real de otro grupo.
7. **Alcance**: dos endpoints por servicio. Si sobra tiempo, agrega filtros o más datos, pero no antes.

## Tabla de asignación

| Si implementaste... | Ahora implementa... | Consumiendo (Z) | Endpoints |
|---|---|---|---|
| **MS-clientes** | `clientes-resumen` | MS-ordenes | `GET /clientes/{id}/resumen`: cantidad de órdenes, total gastado y fecha de la última compra. `GET /clientes/top?limit=5`: clientes que más gastaron. |
| **MS-ordenes** | `ordenes-detalle` | MS-lineas_orden | `GET /ordenes/{id}/detalle`: la orden con sus líneas y la cantidad de unidades. `GET /ordenes/{id}/verificacion`: indica si la suma de `subtotal` coincide con `total`. |
| **MS-productos** | `productos-ficha` | MS-resenas | `GET /productos/{id}/ficha`: el producto con puntaje promedio y cantidad de reseñas. `GET /productos/mejor-puntuados?limit=5`. |
| **MS-categorias** | `categorias-catalogo` | MS-productos | `GET /categorias/{id}/resumen`: cantidad de productos, precio mínimo, máximo y promedio. `GET /categorias/sin-productos`. |
| **MS-inventario** | `inventario-alertas` | MS-productos | `GET /alertas/stock-bajo`: filas con `stock < stockMinimo` enriquecidas con nombre y marca del producto. `GET /alertas/sin-stock`. |
| **MS-sucursales** | `sucursales-stock` | MS-inventario | `GET /sucursales/{id}/stock`: unidades totales, cantidad de productos y filas bajo el mínimo. `GET /sucursales/ranking`: sucursales por stock total. |
| **MS-lineas_orden** | `ranking-productos` | MS-productos | `GET /ranking/mas-vendidos?limit=5`: unidades vendidas por producto con nombre y marca. `GET /ranking/ingresos-por-categoria`. |
| **MS-pagos** | `pagos-conciliacion` | MS-ordenes | `GET /conciliacion/{ordenId}`: compara el monto pagado con el `total` de la orden. `GET /conciliacion/inconsistencias`: pagos pendientes, rechazados o con diferencia de monto. |
| **MS-envios** | `envios-demorados` | MS-ordenes | `GET /envios/demorados`: envíos demorados con estado y total de su orden. `GET /envios/valor-en-riesgo`: suma de totales de órdenes con envío demorado. |
| **MS-resenas** | `resenas-criticas` | MS-productos | `GET /resenas/criticas`: reseñas con `puntaje <= 2` con nombre del producto. `GET /resenas/por-categoria`: puntaje promedio por `categoriaId`. |
| **MS-promociones** | `promociones-precios` | MS-productos | `GET /promociones/vigentes/precios?fecha=`: productos alcanzados por promociones vigentes con precio original y precio con descuento. `GET /promociones/{id}/productos`. |
| **MS-tickets_soporte** | `tickets-contexto` | MS-clientes | `GET /tickets/{id}/contexto`: el ticket con nombre, email y ciudad del cliente. `GET /tickets/abiertos-por-ciudad`: conteo de tickets abiertos por ciudad. |

Notas:
- Las promociones son informativas: calcula el precio con descuento solo en la respuesta, sin modificar datos.
- La semilla toma como “hoy” el `2026-10-11`; admite un parámetro `fecha` para pruebas deterministas.

## Sugerencias para hacerlo simple

- Si necesitas muchos `GET /items/{id}`, junta los ids y pídelos una sola vez; no hagas una llamada por fila en un bucle largo.
- Valida lo que recibes de Z: un campo ausente o con otro tipo debe generar `502`, no un error interno.
- Verifica los resultados con las filas conocidas de la semilla: INV001/INV009/INV011 bajo el mínimo, el envío demorado de ORD007, el ticket TKT001, la reseña negativa RES003, el pago pendiente de ORD009 y la promoción vencida PRM004.

## Entrega

1. Nuevo Repositorio con el servicio derivado, README con `Z_URL` y ejemplos de `curl`.
2. Nuevo Servicio desplegado en Render, con `GET /health` respondiendo.

