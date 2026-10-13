# Contrato Formal - Microservicios Etapa 2

## Visión General

En la Etapa 2, cada grupo implementa un **servicio derivado** que consume datos de su propia colección y de un microservicio de otro grupo, produciendo información nueva que ninguno de los dos servicios entrega por separado.

## Requisitos de Infraestructura

### 1. Verificación de Salud

**Endpoint:** `GET /health`

**Respuesta (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-10-13T14:11:00.000Z",
  "service": "nombre-del-servicio"
}
```

**Notas:**
- Debe responder en menos de 1 segundo
- Usado por el panel de monitoreo para verificar disponibilidad

### 2. Manejo de Errores

**Upstream Unavailable (502 Bad Gateway):**

Cuando el servicio consumido (Z) no responde o falla, responder:

```json
{
  "error": "upstream_unavailable",
  "message": "No se pudo conectar a [nombre del servicio]. Por favor reintenta en unos segundos.",
  "upstream": {
    "service": "ms-ordenes",
    "url": "https://servicio-url.onrender.com",
    "status": 500  // si aplica: código HTTP recibido
  }
}
```

**Nunca:**
- Responder con 500 si el error es en un upstream
- Dejar colgando la conexión (timeout máximo 5 segundos)
- Exponer detalles técnicos internos en el mensaje

### 3. Estructura de Datos

Todos los endpoints deben validar y documentar:
- Tipos de datos (string, number, date, array, object)
- Campos obligatorios vs opcionales
- Rango de valores válidos (si aplica)

Ejemplo:
```json
{
  "clienteId": "CLI001",           // string, requerido
  "nombre": "Juan Pérez",           // string, requerido
  "totalGastado": 5000.50,          // number (decimal), requerido
  "cantidadOrdenes": 12,            // number (entero), requerido
  "ultimaCompra": "2026-10-11"      // string ISO date, nullable
}
```

---

## Asignaciones por Grupo

| Grupo | Servicio Derivado | Consume (Z) | Endpoints |
|-------|-------------------|-------------|-----------|
| **MS-clientes** | `clientes-resumen` | MS-ordenes | `GET /clientes/{id}/resumen` `GET /clientes/top?limit=5` |
| **MS-ordenes** | `ordenes-detalle` | MS-lineas_orden | `GET /ordenes/{id}/detalle` `GET /ordenes/{id}/verificacion` |
| **MS-productos** | `productos-ficha` | MS-resenas | `GET /productos/{id}/ficha` `GET /productos/mejor-puntuados?limit=5` |
| **MS-categorias** | `categorias-catalogo` | MS-productos | `GET /categorias/{id}/resumen` `GET /categorias/sin-productos` |
| **MS-inventario** | `inventario-alertas` | MS-productos | `GET /alertas/stock-bajo` `GET /alertas/sin-stock` |
| **MS-sucursales** | `sucursales-stock` | MS-inventario | `GET /sucursales/{id}/stock` `GET /sucursales/ranking` |
| **MS-lineas_orden** | `ranking-productos` | MS-productos | `GET /ranking/mas-vendidos?limit=5` `GET /ranking/ingresos-por-categoria` |
| **MS-pagos** | `pagos-conciliacion` | MS-ordenes | `GET /conciliacion/{ordenId}` `GET /conciliacion/inconsistencias` |
| **MS-envios** | `envios-demorados` | MS-ordenes | `GET /envios/demorados` `GET /envios/valor-en-riesgo` |
| **MS-resenas** | `resenas-criticas` | MS-productos | `GET /resenas/criticas` `GET /resenas/por-categoria` |
| **MS-promociones** | `promociones-precios` | MS-productos | `GET /promociones/vigentes/precios?fecha=` `GET /promociones/{id}/productos` |
| **MS-tickets_soporte** | `tickets-contexto` | MS-clientes | `GET /tickets/{id}/contexto` `GET /tickets/abiertos-por-ciudad` |

---

## Detalles por Servicio

### 1. clientes-resumen

Consume: **MS-ordenes**

#### `GET /clientes/{id}/resumen`

Resume el historial de compras de un cliente.

**Parámetros:**
- `id` (path, string, requerido): ID del cliente (ej: "CLI001")

**Respuesta (200 OK):**
```json
{
  "clienteId": "CLI001",
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "ciudad": "Buenos Aires",
  "cantidadOrdenes": 12,
  "totalGastado": 5000.50,
  "ultimaCompra": "2026-10-11"
}
```

**Errores:**
- 404: Cliente no existe
- 502: No se pudo conectar a MS-ordenes

---

#### `GET /clientes/top?limit=5`

Top N clientes que más gastaron.

**Parámetros:**
- `limit` (query, number, opcional, default=5): Cantidad de clientes. Máximo 100.

**Respuesta (200 OK):**
```json
[
  {
    "clienteId": "CLI002",
    "nombre": "María García",
    "totalGastado": 12500.75,
    "cantidadOrdenes": 25
  },
  {
    "clienteId": "CLI001",
    "nombre": "Juan Pérez",
    "totalGastado": 5000.50,
    "cantidadOrdenes": 12
  }
]
```

---

### 2. ordenes-detalle

Consume: **MS-lineas_orden**

#### `GET /ordenes/{id}/detalle`

Obtiene una orden con todas sus líneas y cantidad de unidades.

**Parámetros:**
- `id` (path, string, requerido): ID de la orden (ej: "ORD001")

**Respuesta (200 OK):**
```json
{
  "ordenId": "ORD001",
  "clienteId": "CLI001",
  "fecha": "2026-10-11",
  "estado": "completada",
  "total": 1500.00,
  "cantidadUnidades": 3,
  "lineas": [
    {
      "lineaId": "LIN001",
      "productoId": "PRD001",
      "cantidad": 1,
      "precioUnitario": 500.00,
      "subtotal": 500.00
    },
    {
      "lineaId": "LIN002",
      "productoId": "PRD002",
      "cantidad": 2,
      "precioUnitario": 500.00,
      "subtotal": 1000.00
    }
  ]
}
```

**Errores:**
- 404: Orden no existe
- 502: No se pudo conectar a MS-lineas_orden

---

#### `GET /ordenes/{id}/verificacion`

Verifica si la suma de subtotales coincide con el total de la orden.

**Parámetros:**
- `id` (path, string, requerido): ID de la orden

**Respuesta (200 OK):**
```json
{
  "ordenId": "ORD001",
  "verificado": true,
  "totalRegistrado": 1500.00,
  "sumaLineas": 1500.00,
  "diferencia": 0.00,
  "mensaje": "La orden está correcta"
}
```

O, si hay inconsistencia:

```json
{
  "ordenId": "ORD001",
  "verificado": false,
  "totalRegistrado": 1500.00,
  "sumaLineas": 1400.00,
  "diferencia": -100.00,
  "mensaje": "Inconsistencia: suma de líneas no coincide con el total"
}
```

**Errores:**
- 404: Orden no existe
- 502: No se pudo conectar a MS-lineas_orden

---

### 3. productos-ficha

Consume: **MS-resenas**

#### `GET /productos/{id}/ficha`

Obtiene un producto enriquecido con su puntaje promedio y cantidad de reseñas.

**Parámetros:**
- `id` (path, string, requerido): ID del producto (ej: "PRD001")

**Respuesta (200 OK):**
```json
{
  "productoId": "PRD001",
  "nombre": "Laptop Dell XPS 13",
  "marca": "Dell",
  "precio": 1200.00,
  "categoria": "electrónica",
  "descripcion": "Laptop ultraportátil",
  "puntajePromedio": 4.5,
  "cantidadResenas": 12,
  "resenas": [
    {
      "resenaId": "RES001",
      "puntaje": 5,
      "comentario": "Excelente producto"
    }
  ]
}
```

**Errores:**
- 404: Producto no existe
- 502: No se pudo conectar a MS-resenas

---

#### `GET /productos/mejor-puntuados?limit=5`

Top N productos con mejor puntaje promedio.

**Parámetros:**
- `limit` (query, number, opcional, default=5): Cantidad máximo 100.
- `minResenas` (query, number, opcional, default=1): Mínimo de reseñas para incluir.

**Respuesta (200 OK):**
```json
[
  {
    "productoId": "PRD001",
    "nombre": "Laptop Dell XPS 13",
    "marca": "Dell",
    "precio": 1200.00,
    "puntajePromedio": 4.8,
    "cantidadResenas": 25
  },
  {
    "productoId": "PRD002",
    "nombre": "Mouse Logitech MX",
    "marca": "Logitech",
    "precio": 80.00,
    "puntajePromedio": 4.6,
    "cantidadResenas": 18
  }
]
```

---

### 4. categorias-catalogo

Consume: **MS-productos**

#### `GET /categorias/{id}/resumen`

Resume estadísticas de productos en una categoría.

**Parámetros:**
- `id` (path, string, requerido): ID de la categoría (ej: "CAT001")

**Respuesta (200 OK):**
```json
{
  "categoriaId": "CAT001",
  "nombre": "Electrónica",
  "cantidadProductos": 45,
  "precioMinimo": 15.00,
  "precioMaximo": 2500.00,
  "precioPromedio": 650.30
}
```

**Errores:**
- 404: Categoría no existe
- 502: No se pudo conectar a MS-productos

---

#### `GET /categorias/sin-productos`

Lista categorías que no tienen productos asociados.

**Respuesta (200 OK):**
```json
[
  {
    "categoriaId": "CAT015",
    "nombre": "Accesorios de Oficina",
    "cantidadProductos": 0
  },
  {
    "categoriaId": "CAT020",
    "nombre": "Deportes",
    "cantidadProductos": 0
  }
]
```

---

### 5. inventario-alertas

Consume: **MS-productos**

#### `GET /alertas/stock-bajo`

Lista productos con stock bajo (stock < stockMinimo), enriquecida con nombre y marca.

**Parámetros:**
- Ninguno

**Respuesta (200 OK):**
```json
[
  {
    "inventarioId": "INV001",
    "productoId": "PRD001",
    "nombre": "Laptop Dell XPS 13",
    "marca": "Dell",
    "sucursalId": "SUC001",
    "stock": 2,
    "stockMinimo": 5,
    "diferencia": -3
  },
  {
    "inventarioId": "INV005",
    "productoId": "PRD005",
    "nombre": "Mouse Logitech MX",
    "marca": "Logitech",
    "sucursalId": "SUC001",
    "stock": 3,
    "stockMinimo": 10,
    "diferencia": -7
  }
]
```

---

#### `GET /alertas/sin-stock`

Lista productos sin stock (stock = 0) en todas las sucursales.

**Respuesta (200 OK):**
```json
[
  {
    "inventarioId": "INV010",
    "productoId": "PRD010",
    "nombre": "Teclado Mecánico RGB",
    "marca": "Corsair",
    "sucursalId": "SUC002",
    "stock": 0
  }
]
```

---

### 6. sucursales-stock

Consume: **MS-inventario**

#### `GET /sucursales/{id}/stock`

Resume el stock total de una sucursal con detalles.

**Parámetros:**
- `id` (path, string, requerido): ID de la sucursal (ej: "SUC001")

**Respuesta (200 OK):**
```json
{
  "sucursalId": "SUC001",
  "nombre": "Sucursal Centro",
  "ciudad": "Buenos Aires",
  "unidadesTotales": 1250,
  "cantidadProductos": 45,
  "productosAjoBajoMinimo": 8,
  "alertas": [
    {
      "productoId": "PRD001",
      "nombre": "Laptop Dell XPS 13",
      "stock": 2,
      "stockMinimo": 5
    }
  ]
}
```

---

#### `GET /sucursales/ranking`

Ranking de sucursales por stock total disponible.

**Respuesta (200 OK):**
```json
[
  {
    "sucursalId": "SUC001",
    "nombre": "Sucursal Centro",
    "unidadesTotales": 5000,
    "cantidadProductos": 150
  },
  {
    "sucursalId": "SUC002",
    "nombre": "Sucursal Zona Norte",
    "unidadesTotales": 3500,
    "cantidadProductos": 120
  }
]
```

---

### 7. ranking-productos

Consume: **MS-productos**

#### `GET /ranking/mas-vendidos?limit=5`

Top N productos más vendidos por cantidad de unidades.

**Parámetros:**
- `limit` (query, number, opcional, default=5): Máximo 100.

**Respuesta (200 OK):**
```json
[
  {
    "productoId": "PRD001",
    "nombre": "Laptop Dell XPS 13",
    "marca": "Dell",
    "unidadesVendidas": 250,
    "ingreso": 300000.00
  },
  {
    "productoId": "PRD002",
    "nombre": "Mouse Logitech MX",
    "marca": "Logitech",
    "unidadesVendidas": 1200,
    "ingreso": 96000.00
  }
]
```

---

#### `GET /ranking/ingresos-por-categoria`

Ingresos totales por categoría, ordenados descendentemente.

**Respuesta (200 OK):**
```json
[
  {
    "categoriaId": "CAT001",
    "nombre": "Electrónica",
    "ingresoTotal": 750000.00,
    "unidadesVendidas": 500
  },
  {
    "categoriaId": "CAT002",
    "nombre": "Accesorios",
    "ingresoTotal": 120000.00,
    "unidadesVendidas": 2000
  }
]
```

---

### 8. pagos-conciliacion

Consume: **MS-ordenes**

#### `GET /conciliacion/{ordenId}`

Compara el monto pagado con el total de la orden.

**Parámetros:**
- `ordenId` (path, string, requerido): ID de la orden

**Respuesta (200 OK):**
```json
{
  "ordenId": "ORD001",
  "pagadoTotal": 1500.00,
  "totalOrden": 1500.00,
  "estado": "conciliado",
  "diferencia": 0.00,
  "detalles": [
    {
      "pagoId": "PAG001",
      "monto": 1500.00,
      "estado": "completado",
      "fecha": "2026-10-11"
    }
  ]
}
```

O, con inconsistencia:

```json
{
  "ordenId": "ORD009",
  "pagadoTotal": 0.00,
  "totalOrden": 2000.00,
  "estado": "sin_conciliar",
  "diferencia": -2000.00,
  "detalles": []
}
```

**Errores:**
- 404: Orden o pago no existe
- 502: No se pudo conectar a MS-ordenes

---

#### `GET /conciliacion/inconsistencias`

Lista pagos pendientes, rechazados o con diferencia de monto.

**Respuesta (200 OK):**
```json
[
  {
    "ordenId": "ORD009",
    "estado": "pendiente",
    "monto": 2000.00,
    "pagado": 0.00,
    "diferencia": -2000.00,
    "tipo": "sin_pagar"
  },
  {
    "ordenId": "ORD015",
    "estado": "parcial",
    "monto": 1500.00,
    "pagado": 1000.00,
    "diferencia": -500.00,
    "tipo": "pago_incompleto"
  }
]
```

---

### 9. envios-demorados

Consume: **MS-ordenes**

#### `GET /envios/demorados`

Lista envíos demorados (fecha esperada < hoy) con estado y total de su orden.

**Respuesta (200 OK):**
```json
[
  {
    "envioId": "ENV007",
    "ordenId": "ORD007",
    "estado": "en_transito",
    "fechaEsperada": "2026-10-05",
    "diasDemorado": 6,
    "totalOrden": 3000.00,
    "cliente": "Juan Pérez"
  }
]
```

---

#### `GET /envios/valor-en-riesgo`

Suma del total de órdenes con envío demorado.

**Respuesta (200 OK):**
```json
{
  "valorEnRiesgo": 5000.50,
  "cantidadEnviosDemorados": 2,
  "envioDemoradoMayorValor": {
    "envioId": "ENV007",
    "totalOrden": 3000.00,
    "diasDemorado": 6
  }
}
```

---

### 10. resenas-criticas

Consume: **MS-productos**

#### `GET /resenas/criticas`

Reseñas con puntaje bajo (puntaje <= 2) con nombre del producto.

**Respuesta (200 OK):**
```json
[
  {
    "resenaId": "RES003",
    "productoId": "PRD001",
    "nombreProducto": "Laptop Dell XPS 13",
    "puntaje": 1,
    "comentario": "No funciona correctamente",
    "fecha": "2026-09-15"
  },
  {
    "resenaId": "RES008",
    "productoId": "PRD002",
    "nombreProducto": "Mouse Logitech MX",
    "puntaje": 2,
    "comentario": "Muy caro para la calidad",
    "fecha": "2026-10-01"
  }
]
```

---

#### `GET /resenas/por-categoria`

Puntaje promedio de reseñas agrupadas por categoría.

**Respuesta (200 OK):**
```json
[
  {
    "categoriaId": "CAT001",
    "nombreCategoria": "Electrónica",
    "puntajePromedio": 4.2,
    "cantidadResenas": 50
  },
  {
    "categoriaId": "CAT002",
    "nombreCategoria": "Accesorios",
    "puntajePromedio": 3.8,
    "cantidadResenas": 30
  }
]
```

---

### 11. promociones-precios

Consume: **MS-productos**

#### `GET /promociones/vigentes/precios?fecha=`

Productos alcanzados por promociones vigentes en una fecha con precio original y precio con descuento.

**Parámetros:**
- `fecha` (query, string ISO, opcional, default=hoy): Fecha para evaluar vigencia (ej: "2026-10-11")

**Respuesta (200 OK):**
```json
[
  {
    "promocionId": "PRM001",
    "nombrePromocion": "Black Friday",
    "productoId": "PRD001",
    "nombreProducto": "Laptop Dell XPS 13",
    "precioOriginal": 1200.00,
    "porcentajeDescuento": 20,
    "precioConDescuento": 960.00,
    "ahorros": 240.00,
    "vigencia": "2026-10-11 al 2026-10-15"
  }
]
```

---

#### `GET /promociones/{id}/productos`

Productos asociados a una promoción con cálculo de descuento.

**Parámetros:**
- `id` (path, string, requerido): ID de la promoción

**Respuesta (200 OK):**
```json
{
  "promocionId": "PRM001",
  "nombrePromocion": "Black Friday",
  "fechaInicio": "2026-10-11",
  "fechaFin": "2026-10-15",
  "porcentajeDescuento": 20,
  "productos": [
    {
      "productoId": "PRD001",
      "nombre": "Laptop Dell XPS 13",
      "precioOriginal": 1200.00,
      "precioConDescuento": 960.00
    }
  ]
}
```

**Errores:**
- 404: Promoción no existe
- 502: No se pudo conectar a MS-productos

---

### 12. tickets-contexto

Consume: **MS-clientes**

#### `GET /tickets/{id}/contexto`

Obtiene un ticket enriquecido con información del cliente.

**Parámetros:**
- `id` (path, string, requerido): ID del ticket (ej: "TKT001")

**Respuesta (200 OK):**
```json
{
  "ticketId": "TKT001",
  "clienteId": "CLI001",
  "nombreCliente": "Juan Pérez",
  "email": "juan@example.com",
  "ciudad": "Buenos Aires",
  "telefono": "+54 9 11 1234-5678",
  "asunto": "Problema con compra",
  "descripcion": "El producto no llegó",
  "estado": "abierto",
  "fechaApertura": "2026-10-10",
  "prioridad": "alta"
}
```

**Errores:**
- 404: Ticket o cliente no existe
- 502: No se pudo conectar a MS-clientes

---

#### `GET /tickets/abiertos-por-ciudad`

Conteo de tickets abiertos agrupados por ciudad del cliente.

**Respuesta (200 OK):**
```json
[
  {
    "ciudad": "Buenos Aires",
    "cantidadTicketsAbiertos": 15
  },
  {
    "ciudad": "Córdoba",
    "cantidadTicketsAbiertos": 8
  },
  {
    "ciudad": "Rosario",
    "cantidadTicketsAbiertos": 5
  }
]
```

---

## Validación y Testing

### Test de Verificación Mínima

Todos deben responder correctamente a estas verificaciones:

1. **GET /health** → 200 con `{ status: "ok" }`
2. **GET /endpoint1/{id}** con ID válido → 200
3. **GET /endpoint1/NOEXISTE** → 404
4. **GET /endpoint2** → 200 con datos

### Pruebas Conocidas

Usa estos datos del `kit/seed` para verificar tus implementaciones:

**Stock Bajo (Etapa 2 para inventario):**
- INV001, INV009, INV011

**Envío Demorado:**
- ORD007

**Ticket de Soporte:**
- TKT001

**Reseña Negativa:**
- RES003

**Pago Pendiente:**
- ORD009

**Promoción Vencida:**
- PRM004

---

## Entrega

1. **Repositorio GitHub** con código del servicio derivado
2. **README** con:
   - Descripción del servicio
   - Tabla de endpoints
   - Ejemplo de uso (curl)
   - Variable de entorno `Z_URL` documentada
3. **Servicio desplegado en Render** con `GET /health` funcionando
4. **Registro en el Dashboard** con URL pública
5. **Pruebas automatizadas** (opcional pero recomendado)

