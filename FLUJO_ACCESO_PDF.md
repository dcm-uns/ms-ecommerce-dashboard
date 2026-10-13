# Flujo de Acceso - Guía PDF

## 📊 Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│ SERVIDOR EXPRESS                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  express.static('public')                                   │
│  ├─ /index.html (Home)                                      │
│  ├─ /monitor.html (Monitor)                                 │
│  ├─ /GUIA_REGISTRO_ETAPA2.pdf ← Archivo estático           │
│  └─ ...                                                      │
│                                                              │
│  POST /admin/check (validar token)                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ NAVEGADOR - HOME PAGE (index.html)                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Estado: SIN TOKEN (usuario normal)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Dashboard de microservicios                         │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ 📊 Monitor    Registrar microservicio   Admin  │  │  │
│  │  │ (NO aparece "📖 Guía PDF" aquí)               │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                      │  │
│  │  [Catálogo de servicios]                           │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ NAVEGADOR - HOME PAGE (index.html) - MODO ADMIN              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Estado: CON TOKEN VÁLIDO (admin logged in)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Dashboard de microservicios    [Modo admin]         │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ 📖 Guía PDF  📊 Monitor  Registrar  Admin     │  │  │
│  │  │ ↑↑↑ VISIBLE ACA ↑↑↑                           │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │        ↓                                              │  │
│  │   [Click aquí]                                       │  │
│  │        ↓                                              │  │
│  │   GET /GUIA_REGISTRO_ETAPA2.pdf                     │  │
│  │        ↓                                              │  │
│  │   [Descarga archivo]                                │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PDF DESCARGADO                                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  GUIA_REGISTRO_ETAPA2.pdf (398 KB)                          │
│  ├─ Paso 1: ¿Qué es Etapa 2?                              │
│  ├─ Paso 2: Seleccionar Servicio                          │
│  ├─ Paso 3: Desarrollo Local                             │
│  ├─ Paso 4: Deploy en Render                             │
│  ├─ Paso 5: Obtener URL Upstream                         │
│  ├─ Paso 6: Registrar en Dashboard                       │
│  ├─ Paso 7: Verificar en Monitor                         │
│  ├─ Troubleshooting                                       │
│  └─ Checklist                                             │
│                                                              │
│  ↓ [Imprimir o compartir con estudiantes]                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Flujo de Trabajo Completo

### 1️⃣ PROFESOR/ADMIN

```
Acceder Dashboard
    ↓
Ingresar Token Admin
    ↓
Ver "📖 Guía PDF" (botón aparece)
    ↓
Hacer clic → Descargar GUIA_REGISTRO_ETAPA2.pdf
    ↓
Imprimir / Compartir con estudiantes
    ↓
Comunicar: "Usar esta guía para Etapa 2"
```

### 2️⃣ ESTUDIANTES

```
Reciben PDF de profesor
    ↓
Siguen pasos 1-7
    ↓
Implementan su servicio en Render
    ↓
Registran en Dashboard
    ↓
Verifican en Monitor (/monitor.html)
    ↓
Estado: ✓ ONLINE
```

### 3️⃣ PROFESOR MONITOREA

```
Acceder /monitor.html
    ↓
Ver estado de todos los servicios
    ↓
Filtrar por "Etapa 2"
    ↓
Verificar que aparezcan todos online
    ↓
Panel de control durante la materia
```

## 🔐 Control de Acceso

### Lado del Cliente (UI)
- Botón "📖 Guía PDF" **oculto por defecto** (`hidden`)
- Se muestra solo cuando `token` tiene valor válido
- Controlado por JavaScript en `render()` función:
  ```javascript
  $('btnGuiaPDF').hidden = !token;
  ```

### Lado del Servidor
- Archivo se sirve desde `/public/GUIA_REGISTRO_ETAPA2.pdf`
- No tiene autenticación en el endpoint (es `express.static()`)
- **Nota:** Si alguien conoce la URL, puede descargarla sin token
- Para proteger: agregar middleware de auth si es necesario

## 📝 Cambios Realizados

### En HTML (`public/index.html`)
```html
<!-- Antes -->
<a href="/GUIA_REGISTRO_ETAPA2.pdf" download class="btn secondary">
  📖 Guía PDF
</a>

<!-- Después -->
<a id="btnGuiaPDF" href="/GUIA_REGISTRO_ETAPA2.pdf" download 
   class="btn secondary" hidden>
  📖 Guía PDF
</a>
```

### En JavaScript (`public/index.html` - función `render()`)
```javascript
function render() {
  $('adminTag').hidden = !token;
  $('btnGuiaPDF').hidden = !token;  // ← NUEVA LÍNEA
  // ... resto del código
}
```

### Ubicación del Archivo
```
Antes: /GUIA_REGISTRO_ETAPA2.pdf (raíz)
Ahora: /public/GUIA_REGISTRO_ETAPA2.pdf
URL:   GET /GUIA_REGISTRO_ETAPA2.pdf ✓
```

## 🚀 Regenerar PDF

Si necesita actualizar el contenido:

```bash
# 1. Editar HTML fuente
nano GUIA_REGISTRO_ETAPA2.html

# 2. Regenerar PDF
npm run generate-pdf

# 3. Verificar en public/
ls -lh public/GUIA_REGISTRO_ETAPA2.pdf

# 4. Commit cambios
git add GUIA_REGISTRO_ETAPA2.html public/GUIA_REGISTRO_ETAPA2.pdf
git commit -m "Actualizar guía PDF"
```

## ✅ Verificación

```bash
# Verificar archivo existe
ls -lh public/GUIA_REGISTRO_ETAPA2.pdf
# Output: 398 KB ✓

# Verificar botón en HTML
grep "btnGuiaPDF" public/index.html
# Output: <a id="btnGuiaPDF" ... hidden> ✓

# Verificar control en JS
grep "\$('btnGuiaPDF').hidden" public/index.html
# Output: $('btnGuiaPDF').hidden = !token; ✓

# Verificar se puede descargar
curl -O http://localhost:3000/GUIA_REGISTRO_ETAPA2.pdf
# Output: GUIA_REGISTRO_ETAPA2.pdf [ 398KB ] ✓
```

## 📌 Notas Importantes

1. **Visibilidad UI**: Solo admin puede ver/descargar desde botón en interfaz
2. **Acceso URL**: Técnicamente público si alguien conoce la URL
3. **Seguridad**: Si necesita proteger completamente, agregar auth en server
4. **Distribución**: Admin descarga y comparte PDF con estudiantes
5. **No es** parte del home page inicial (Etapa 1) - es contenido Etapa 2

---

Sistema completamente funcional y listo para usar.
