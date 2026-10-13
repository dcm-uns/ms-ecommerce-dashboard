# Setup - Etapa 2: Servicios Derivados

## ¿Qué es la Etapa 2?

En la Etapa 2, cada grupo implementa un **servicio derivado** que consume datos de su propia colección (Etapa 1) y de un microservicio de otro grupo, produciendo información nueva.

**Servicios disponibles para registrar:**

| Código | Descripción | Consume |
|--------|-------------|---------|
| `clientes-resumen` | Resumen de clientes y sus órdenes | MS-ordenes |
| `ordenes-detalle` | Órdenes con sus líneas de detalle | MS-lineas_orden |
| `productos-ficha` | Productos con reseñas y puntaje | MS-resenas |
| `categorias-catalogo` | Categorías con estadísticas de productos | MS-productos |
| `inventario-alertas` | Alertas de stock bajo | MS-productos |
| `sucursales-stock` | Stock por sucursal | MS-inventario |
| `ranking-productos` | Ranking de productos más vendidos | MS-productos |
| `pagos-conciliacion` | Conciliación de pagos vs órdenes | MS-ordenes |
| `envios-demorados` | Envíos demorados y valor en riesgo | MS-ordenes |
| `resenas-criticas` | Reseñas críticas y análisis | MS-productos |
| `promociones-precios` | Precios con promociones aplicadas | MS-productos |
| `tickets-contexto` | Tickets con contexto del cliente | MS-clientes |

---

## Flujo de Registro

### 1. Desarrollar el servicio localmente

Crear un nuevo repositorio con:

```
mi-servicio-etapa2/
├── server.js
├── package.json
├── .env (local, NO commitear)
├── .env.example
├── README.md
└── test/
    └── service.test.js
```

### 2. Endpoints requeridos

**Minimales:**
```javascript
GET /health
// Respuesta:
{
  "status": "ok",
  "timestamp": "2026-10-13T14:11:00.000Z",
  "service": "nombre-del-servicio"
}
```

**Dos endpoints derivados:** según tu servicio (ver `CONTRATO_ETAPA_2.md`)

### 3. Variables de entorno

```env
PORT=3000
# URL del servicio que consumes (ejemplo)
MS_ORDENES_URL=https://mi-companero.onrender.com
# O si consumes otro:
# MS_PRODUCTOS_URL=https://...
```

### 4. Manejo de errores

Cuando el servicio upstream no responda:

```javascript
res.status(502).json({
  "error": "upstream_unavailable",
  "message": "No se pudo conectar a MS-ordenes. Por favor reintenta en unos segundos.",
  "upstream": {
    "service": "ms-ordenes",
    "url": process.env.MS_ORDENES_URL,
    "status": 500  // si aplica
  }
});
```

---

## Desplegar en Render

### 1. Crear nuevo servicio

- Ir a [Render Dashboard](https://dashboard.render.com)
- **New +** → **Web Service**
- Conectar tu repositorio
- Nombre: `nombre-servicio-etapa2`
- Runtime: Node
- Build: `npm ci`
- Start: `npm start`

### 2. Configurar variables

En Render, ir a **Environment**:

```
PORT = 3000
MS_ORDENES_URL = https://servicio-companero.onrender.com
# (Usar la URL que obtengas del Dashboard)
```

### 3. Verificar /health

Esperar a que se depliegue, luego ir a:
```
https://tu-servicio.onrender.com/health
```

Debe responder con `{ "status": "ok", ... }`

---

## Registrar en el Dashboard

### 1. Obtener URL de otro servicio

Ir a la página de **Monitor** en el dashboard:
```
http://localhost:3000/monitor.html
```

Seleccionar un servicio **online** de Etapa 1 que quieras consumir. Copiar su URL.

### 2. Registrar tu servicio

Volver al **Home** y hacer clic en **Registrar microservicio**:

- **Microservicio:** Seleccionar tu servicio derivado (ej: `clientes-resumen`)
- **URL base pública:** Tu servicio en Render (ej: `https://mi-clientes-resumen.onrender.com`)
- **Nombre del grupo:** Opcional
- **Estudiantes:** Uno por línea

El dashboard verificará:
- ✓ GET /health responde correctamente
- ✓ El servicio es alcanzable públicamente

### 3. Usar el Monitor

Ir a `/monitor.html` para ver:
- ✓ Estado en tiempo real (online/offline)
- ✓ Endpoints del servicio
- ✓ Información del grupo
- ✓ Última verificación

---

## Contrato Formal

Consultar [CONTRATO_ETAPA_2.md](./kit/CONTRATO_ETAPA_2.md) para:

- Especificación detallada de cada endpoint
- Formatos de respuesta
- Manejo de errores
- Casos de prueba

---

## Testing

### Test local con mock

```javascript
// Usar datos del kit/seed
const ordenes = require('../kit/seed/ordenes.json');
const clientes = require('../kit/seed/clientes.json');

test('GET /clientes/{id}/resumen', async () => {
  const res = await fetch(`http://localhost:3000/clientes/${clientes[0].id}/resumen`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.clienteId);
  assert.ok(typeof data.cantidadOrdenes === 'number');
});
```

### Test contra servicio real

Usar la URL obtenida del dashboard:

```bash
curl https://tu-servicio.onrender.com/health
curl https://tu-servicio.onrender.com/clientes/CLI001/resumen
```

---

## Troubleshooting

### "No se pudo conectar a..."

- ✓ Verificar que la URL del upstream esté correcta en `.env`
- ✓ Verificar que el servicio upstream está online (`/monitor.html`)
- ✓ Timeout: Render toma tiempo para responder, agregar espera exponencial

### "502 Bad Gateway"

- ✓ El upstream devolvió un error (check en `/monitor.html`)
- ✓ Tu servicio está intentando hacer algo que el upstream no soporta
- ✓ Revisar logs en Render: **Logs** tab

### "Registración rechazada"

- ✓ GET /health no responde correctamente
- ✓ La URL no es pública o tiene login
- ✓ Usar `curl https://tu-url/health` para verificar

---

## Checklist Final

- [ ] Repositorio creado con código del servicio derivado
- [ ] README actualizado con endpoints y ejemplos
- [ ] `.env.example` documenta todas las variables
- [ ] Servicio desplegado en Render
- [ ] `/health` responde correctamente
- [ ] URL es pública (sin login)
- [ ] Servicio registrado en el Dashboard
- [ ] Aparece en `/monitor.html`
- [ ] Ambos endpoints funcionan con datos reales
- [ ] Maneja errores upstream (502)

