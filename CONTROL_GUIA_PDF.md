# Control de Disponibilidad - Guía PDF Etapa 2

## 🎛️ ¿Cómo Habilitar/Deshabilitar la Guía?

La guía PDF **está deshabilitada por defecto**. Solo tú puedes habilitarla cuando lo consideres necesario.

### Opción 1: Variable de Entorno (Recomendado)

**En Local:**

```bash
# Editar .env
GUIDE_ETAPA2_ENABLED=1    # Habilitar guía
GUIDE_ETAPA2_ENABLED=0    # Deshabilitar guía

# Reiniciar servidor
npm start
```

**En Render (Dashboard):**

1. Ir a tu servicio en https://dashboard.render.com
2. Ir a **Environment**
3. Agregar/Editar variable:
   ```
   GUIDE_ETAPA2_ENABLED = 1
   ```
4. Click en "Save"
5. El servicio se reinicia automáticamente

## 📊 Estado de la Guía

### ✓ HABILITADA (GUIDE_ETAPA2_ENABLED=1)

```
┌─────────────────────────────────────┐
│ Dashboard de microservicios         │
├─────────────────────────────────────┤
│ [📖 Guía PDF]  📊 Monitor  Registrar│  ← Botón VISIBLE
└─────────────────────────────────────┘
```

- Botón "📖 Guía PDF" está **visible** en la barra superior
- Usuarios pueden descargar el PDF
- URL también accesible: `GET /GUIA_REGISTRO_ETAPA2.pdf`

### ✗ DESHABILITADA (GUIDE_ETAPA2_ENABLED=0)

```
┌─────────────────────────────────────┐
│ Dashboard de microservicios         │
├─────────────────────────────────────┤
│          📊 Monitor  Registrar      │  ← Botón OCULTO
└─────────────────────────────────────┘
```

- Botón "📖 Guía PDF" está **oculto**
- Usuarios NO ven forma de descargar
- URL técnicamente aún es accesible (pero no publicizada)

## 🔄 Flujo Recomendado

### Semana 1-2: Preparación (Deshabilitada)

```
GUIDE_ETAPA2_ENABLED=0
```
- Estudiantes están en Etapa 1
- Guía no visible en UI
- Profesor prepara materiales

### Semana 3: Inicio de Etapa 2 (Habilitada)

```
# Cambiar en .env o Render
GUIDE_ETAPA2_ENABLED=1
```
- Botón aparece en Dashboard
- Estudiantes ven "📖 Guía PDF"
- Pueden descargar e implementar

### Semana 6+: Entrega (Deshabilitada)

```
GUIDE_ETAPA2_ENABLED=0
```
- Semana de evaluación
- Ocultar guía para evitar consultas tardías
- Estudiantes ya deberían tener implementado

## 🛠️ Verificación

### Ver Estado Actual

```bash
# Consultar endpoint
curl http://localhost:3000/api/guide-etapa2-enabled

# Respuesta:
# { "enabled": true }   o   { "enabled": false }
```

### En Render

Revisar en https://dashboard.render.com → Environment → GUIDE_ETAPA2_ENABLED

## 📝 Archivo de Configuración

Dejar `.env.example` documentado en Git para referencia:

```bash
# .env.example (ya committeado)
GUIDE_ETAPA2_ENABLED=0
```

El archivo real `.env` está en .gitignore (no se commitea).

## 💡 Casos de Uso

| Caso | Habilitado | Razón |
|------|-----------|-------|
| Desarrollo inicial | 0 | Aún no se usa Etapa 2 |
| Pruebas de guía | 1 | Verificar que funciona |
| Etapa 2 activa | 1 | Estudiantes la necesitan |
| Después del deadline | 0 | Evitar consultas tardías |
| Demo/Presentación | 1 | Mostrar flujo completo |

## 🚀 Cambios sin Reinicio (Render)

En Render puedes cambiar la variable directamente sin commitear:

1. Dashboard → Environment
2. GUIDE_ETAPA2_ENABLED = 1
3. Save → Auto-redeploy (5-10 segundos)

En local necesitas reiniciar: `npm start`

## 📞 API

**Endpoint Público:**
```http
GET /api/guide-etapa2-enabled
```

**Respuesta:**
```json
{ "enabled": true }
```

**Uso:** El frontend lo consulta cada vez que carga para decidir si mostrar el botón.

## ✅ Checklist

- [ ] `.env` tiene `GUIDE_ETAPA2_ENABLED=0` (deshabilitada por defecto)
- [ ] `.env.example` documentado con instrucciones
- [ ] Endpoint `/api/guide-etapa2-enabled` funciona
- [ ] Botón no aparece cuando deshabilitada
- [ ] Botón aparece cuando habilitada
- [ ] Funciona en local y en Render
- [ ] Cambios en Render se reflejan sin reinicio manual

---

**Sistema completamente configurable y bajo tu control.**
