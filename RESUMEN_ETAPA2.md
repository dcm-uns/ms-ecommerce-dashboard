# Resumen: Sistema de Monitoreo Etapa 2

He implementado un sistema completo para **Etapa 2** que permite que cada grupo registre y monitoree sus **servicios derivados**.

## Lo que conseguiste ✅

### 1. **Página de Monitoreo** (`/monitor.html`)

Una interfaz en **tiempo real** que muestra:

- ✓ **Estado actual** de todos los microservicios (Etapa 1 + Etapa 2)
- ✓ **Filtros** por: todos, online, offline, Etapa 1, Etapa 2
- ✓ **Estadísticas** en vivo: servicios en línea vs offline
- ✓ **Auto-actualización** configurable (por defecto cada 10 segundos)
- ✓ **Información detallada** por servicio:
  - URL y estado
  - Grupo y estudiantes
  - Endpoints disponibles
  - Último check y latencia

**Acceso:** http://localhost:3000/monitor.html

---

### 2. **Registro de Servicios Etapa 2**

Los grupos **NO NECESITAN CREAR NADA NUEVO**.

El dashboard detecta automáticamente:
- 12 servicios Etapa 2 disponibles (clientes-resumen, ordenes-detalle, etc.)
- Se pueden registrar como cualquier otro servicio en el home

**Flujo:**
1. Ir a **Home** → **Registrar microservicio**
2. Seleccionar el servicio derivado (ej: `clientes-resumen`)
3. Ingresar URL pública (ej: https://mi-clientes-resumen.onrender.com)
4. El dashboard verifica automáticamente `/health`
5. ✓ Registrado y aparece en tiempo real en `/monitor.html`

---

### 3. **Contrato Formal** (`CONTRATO_ETAPA_2.md`)

Documento exhaustivo que especifica:

- **Requisitos mínimos:**
  - GET `/health` con respuesta `{ "status": "ok", ... }`
  - Timeout máximo 5 segundos
  - Manejo de errores upstream (502 Bad Gateway)

- **Especificación por servicio:**
  - Clientes-resumen (resumen de órdenes por cliente)
  - Órdenes-detalle (órdenes con líneas)
  - Productos-ficha (con reseñas)
  - Y 9 servicios más...

- **Ejemplo de respuestas JSON** para cada endpoint
- **Casos de prueba** con datos del seed

---

### 4. **Guía de Setup** (`ETAPA2_SETUP.md`)

Instrucciones paso a paso para grupos:

1. **Desarrollo local**
   - Estructura de carpetas
   - Variables de entorno
   - Endpoints requeridos

2. **Deploy en Render**
   - Crear nuevo servicio web
   - Configurar variables (Z_URL del upstream)
   - Verificar /health

3. **Registrar en Dashboard**
   - Cómo obtener URL del upstream
   - Cómo registrar el servicio
   - Cómo monitorear

4. **Testing y troubleshooting**

---

## Técnicamente ¿Qué cambió?

### Backend (server.js)

```javascript
// Nuevo mapeo de endpoints para Etapa 2
const ETAPA2_ENDPOINTS = {
  'clientes-resumen': ['GET /clientes/{id}/resumen', 'GET /clientes/top'],
  'ordenes-detalle': ['GET /ordenes/{id}/detalle', 'GET /ordenes/{id}/verificacion'],
  // ... 10 más
};

// GET /api/microservicios ahora retorna:
[
  ...servicios Etapa 1 (12),
  ...servicios Etapa 2 virtuales (12)
]
// Total: 24 servicios
```

### Registro flexible

```javascript
// El endpoint POST /api/register ahora:
1. Busca en Etapa 1 (catálogo + catalog.js)
2. Si no encuentra, busca en Etapa 2 (ETAPA2_ENDPOINTS)
3. Valida con diferentes reglas:
   - Etapa 1: validación completa (health + items + errores)
   - Etapa 2: solo /health (más flexible)
```

### Validación (checker.js)

```javascript
check(entry, baseUrl, { etapa2: true })
// Para Etapa 2: solo verifica que GET /health responda
// con { status: "ok", ... }
// Más permisivo que Etapa 1, que requiere estructura OpenAPI completa
```

---

## Cómo lo ves en acción

### 1. **Dashboard Home** (index.html)

```
[📊 Monitor] [Registrar] [Admin]
```

Nuevo botón que lleva a `/monitor.html`

### 2. **Monitor en vivo** (/monitor.html)

```
⚡ Monitor de Microservicios
────────────────────────────────────────
En línea: 3     Sin conexión: 9
[Auto-actualizar cada 10 s]

Filtros: [Todos] [Online] [Offline] [Etapa 1] [Etapa 2]

┌─ MS-clientes (Etapa 1)           ✓ ONLINE
│  Grupo: Equipo A
│  URL: https://...onrender.com
│  Endpoints:
│  - GET /items
│  - GET /items/{id}
└─ Última prueba: OK (145ms)

┌─ clientes-resumen (Etapa 2)      ✗ OFFLINE
│  Grupo: (sin registrar)
│  URL: No registrada
│  Endpoints:
│  - GET /clientes/{id}/resumen
│  - GET /clientes/top
└─ Estado: libre
```

### 3. **Registrar Etapa 2**

```
Diálogo: Registrar microservicio
────────────────────────────────
Microservicio: [clientes-resumen ▼]
URL: https://mi-clientes-resumen.onrender.com
Grupo: Equipo A (opcional)
Estudiantes:
  Juan Pérez
  María García
  
[Probando el microservicio...]
✓ ¡clientes-resumen registrado!
```

---

## Flujo Completo Etapa 2

```
GRUPO implementa servicio derivado
  ↓
Grupo deploya en Render
  ↓
Grupo va a Dashboard → Monitor
  ↓
Elige un servicio Etapa 1 online como upstream
  ↓
Copia su URL: https://servicio-upstream.onrender.com
  ↓
Grupo vuelve a Home → Registrar
  ↓
Selecciona su servicio (ej: clientes-resumen)
  ↓
Ingresa URL pública de su Etapa 2
  ↓
Dashboard verifica GET /health
  ↓
✓ Registrado y visible en Monitor
  ↓
Monitor muestra en tiempo real:
  - Estado (online/offline)
  - Grupo y estudiantes
  - Endpoints disponibles
  - Última verificación
```

---

## Valores Por Defecto

| Aspecto | Valor |
|---------|-------|
| Auto-refresh | Cada 10 segundos |
| Timeout | 20 segundos |
| Validación Etapa 2 | Solo `/health` |
| Intentos por minuto (ping) | 30 |
| Intentos por minuto (registro) | 10 |
| Filtro por defecto | Todos |

---

## Para Render

Cuando los grupos deplieguen en Render:

1. ✓ El dashboard **BUSCA automáticamente** `/health`
2. ✓ Si responde con `{ "status": "ok" }` → ✓ APROBADO
3. ✓ Si falla → ✗ RECHAZADO (mostrar motivo)
4. ✓ Monitor actualiza estado cada vez que alguien hace ping
5. ✓ Panel de control listo para que supervises despliegues

---

## Checklist para Usar

- ✅ Página `/monitor.html` funciona y se actualiza
- ✅ Botón "Monitor" en home lleva a `/monitor.html`
- ✅ API retorna 24 servicios (12 Etapa 1 + 12 Etapa 2)
- ✅ Registro acepta servicios Etapa 2
- ✅ Validación funciona correctamente
- ✅ Documentación completa en archivos Markdown
- ✅ Sistema listo para que grupos comiencen a deployar

---

## Próximos Pasos para los Grupos

1. Leer [CONTRATO_ETAPA_2.md](./kit/CONTRATO_ETAPA_2.md)
2. Leer [ETAPA2_SETUP.md](./ETAPA2_SETUP.md)
3. Implementar su servicio derivado localmente
4. Deployar en Render
5. Registrar en el Dashboard
6. Verificar en `/monitor.html` que aparezca online

---

## Archivos Nuevos/Modificados

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `public/monitor.html` | **NUEVO** | Página de monitoreo |
| `kit/CONTRATO_ETAPA_2.md` | **NUEVO** | Especificación formal |
| `ETAPA2_SETUP.md` | **NUEVO** | Guía de setup |
| `server.js` | Modificado | +68 líneas para Etapa 2 |
| `lib/checker.js` | Modificado | +10 líneas para etapa2 flag |
| `public/index.html` | Modificado | +1 línea (botón Monitor) |
| `.env` | Modificado | Comentar MONGODB_URI local |

