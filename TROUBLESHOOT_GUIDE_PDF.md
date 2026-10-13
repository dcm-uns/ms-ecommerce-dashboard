# Problema: Botón Guía PDF Sigue Visible (Soluciones)

## 🔴 Síntoma
- `GUIDE_ETAPA2_ENABLED=0` en .env
- Pero el botón 📖 Guía PDF SIGUE VISIBLE en el Dashboard

## 🔍 Causas Posibles

### 1. Cache del Navegador (Muy Probable)
El navegador almacena en cache el HTML anterior.

**Solución:**
```
OPCIÓN A - Limpiar cache completo:
  1. Ctrl+Shift+Delete (Windows) o Cmd+Shift+Delete (Mac)
  2. Seleccionar "Todos los tiempos"
  3. Marcar "Cookies y datos de otros sitios almacenados"
  4. Click "Limpiar datos"
  5. Recargar página: F5 o Ctrl+R

OPCIÓN B - Hard refresh (más rápido):
  Ctrl+Shift+R (Windows) o Cmd+Shift+R (Mac)
  
OPCIÓN C - Modo incógnito:
  Ctrl+Shift+N (Windows) o Cmd+Shift+N (Mac)
  Ir a tu Dashboard en pestaña incógnito
  Si funciona ahí → es definitivament cache
```

### 2. Servidor No Actualizado
El cambio en .env no se aplicó.

**Solución:**
```bash
# 1. Verificar que .env tiene GUIDE_ETAPA2_ENABLED=0
grep GUIDE_ETAPA2_ENABLED .env

# 2. Detener servidor (Ctrl+C en terminal)

# 3. Reiniciar
npm start

# 4. Verificar endpoint
curl http://localhost:3000/api/guide-etapa2-enabled
# Debe mostrar: {"enabled":false}
```

### 3. Variables de Sesión
El navegador puede tener guardada una variable.

**Solución:**
```javascript
// Abrir DevTools (F12)
// Ir a pestaña "Console"
// Escribir:
sessionStorage.clear()
localStorage.clear()

// Luego recargar página: F5
```

## ✅ Verificación Completa

### Paso 1: Verificar servidor
```bash
# Terminal
node -e 'require("dotenv").config(); console.log({enabled: process.env.GUIDE_ETAPA2_ENABLED === "1"});'
# Debe mostrar: { enabled: false }
```

### Paso 2: Verificar endpoint
```bash
# Terminal
curl http://localhost:3000/api/guide-etapa2-enabled
# Debe mostrar: {"enabled":false}
```

### Paso 3: Verificar frontend
```javascript
// DevTools Console (F12)
guideEnabled  // Debe mostrar: false
```

### Paso 4: Verificar HTML
```javascript
// DevTools Console (F12)
document.getElementById('btnGuiaPDF').hidden  // Debe mostrar: true
```

## 🚀 Solución Recomendada (Paso a Paso)

```bash
# 1. Verificar .env
grep GUIDE_ETAPA2_ENABLED .env
# Output: GUIDE_ETAPA2_ENABLED=0

# 2. Si servidor está corriendo, detener con Ctrl+C

# 3. Reiniciar servidor
npm start

# 4. En navegador:
#   - Ctrl+Shift+R (hard refresh)
#   - O Ctrl+Shift+Delete (limpiar cache)

# 5. Verificar endpoint en otra pestaña
# http://localhost:3000/api/guide-etapa2-enabled
# Debe devolver: {"enabled":false}

# 6. Recargar Dashboard
```

## 📱 En Render (Hosting)

Si está deployado en Render:

```
1. Verificar que GUIDE_ETAPA2_ENABLED=0 en Environment
2. El servicio se redeploy automáticamente
3. En navegador del usuario:
   - Ctrl+Shift+R (hard refresh)
   - O Ctrl+Shift+Delete (limpiar cache)
4. Recargar página
```

## 🛠️ Debug Avanzado

**Ver logs en tiempo real:**
```bash
# Terminal
npm start 2>&1 | grep -i guide
# O en Windows PowerShell:
npm start | Select-String -Pattern "guide" -CaseSensitive
```

**Verificar desde consola del navegador:**
```javascript
// F12 → Console
// Esperar a que cargue la página
// Escribir:

console.log('guideEnabled:', guideEnabled);
console.log('Button element:', document.getElementById('btnGuiaPDF'));
console.log('Button hidden:', document.getElementById('btnGuiaPDF').hidden);
console.log('Button display:', getComputedStyle(document.getElementById('btnGuiaPDF')).display);
```

## ✨ Resultado Esperado

### GUIDE_ETAPA2_ENABLED=0 (Deshabilitada)
```
Dashboard Header:
    📊 Monitor    Registrar    Admin
    (Sin botón 📖 Guía PDF)
```

### GUIDE_ETAPA2_ENABLED=1 (Habilitada)
```
Dashboard Header:
    📖 Guía PDF    📊 Monitor    Registrar    Admin
    (Botón SÍ aparece)
```

---

**Si aún sigue sin funcionar después de estas pasos, revisar:**
- Si el `.env` se guardó correctamente (sin caracteres especiales)
- Si el servidor se reinició realmente
- Si el navegador hizo hard refresh (no solo refresh normal)
