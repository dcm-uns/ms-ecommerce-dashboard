# Comandos Rápidos - Control Guía PDF

## 🚀 Habilitar Guía (LOCAL)

```bash
# 1. Editar .env
nano .env
# Cambiar: GUIDE_ETAPA2_ENABLED=0
# A:       GUIDE_ETAPA2_ENABLED=1

# 2. Guardar (Ctrl+O, Enter, Ctrl+X)

# 3. Reiniciar servidor
npm start

# 4. Verificar
curl http://localhost:3000/api/guide-etapa2-enabled
# Output: {"enabled":true}
```

## 🚀 Deshabilitar Guía (LOCAL)

```bash
nano .env
# Cambiar: GUIDE_ETAPA2_ENABLED=1
# A:       GUIDE_ETAPA2_ENABLED=0

npm start

curl http://localhost:3000/api/guide-etapa2-enabled
# Output: {"enabled":false}
```

## ☁️ Habilitar Guía (RENDER)

1. Ir a: https://dashboard.render.com
2. Seleccionar tu servicio
3. Click en "Environment"
4. Buscar `GUIDE_ETAPA2_ENABLED`
5. Si no existe, click "Add Environment Variable"
   - Key: `GUIDE_ETAPA2_ENABLED`
   - Value: `1`
6. Click "Save"
7. Esperar a que se redeploy (automático)

## ☁️ Deshabilitar Guía (RENDER)

1. Dashboard → Environment
2. Buscar `GUIDE_ETAPA2_ENABLED`
3. Cambiar value: `1` → `0`
4. Click "Save"
5. Auto-redeploy

## ✅ Verificar Estado

### En Local
```bash
curl http://localhost:3000/api/guide-etapa2-enabled
```

### En Render
```bash
curl https://tu-dashboard.onrender.com/api/guide-etapa2-enabled
```

## 📊 Estado Visual

### HABILITADA (=1)
```
Header del Dashboard:
[📖 Guía PDF]  📊 Monitor  Registrar  Admin  ← BOTÓN VISIBLE
```

### DESHABILITADA (=0)
```
Header del Dashboard:
          📊 Monitor  Registrar  Admin  ← SIN BOTÓN
```

## 🎯 Timeline Típico

```
Inicio semana:      GUIDE_ETAPA2_ENABLED=0  (Guía oculta)
Comienza Etapa 2:   GUIDE_ETAPA2_ENABLED=1  (Guía visible)
Semana de entrega:  GUIDE_ETAPA2_ENABLED=0  (Guía oculta)
```

## 🔧 Archivo Clave: .env

```bash
# Ver contenido
cat .env | grep GUIDE_ETAPA2_ENABLED

# Cambiar rápidamente
sed -i 's/GUIDE_ETAPA2_ENABLED=0/GUIDE_ETAPA2_ENABLED=1/g' .env
# O
sed -i 's/GUIDE_ETAPA2_ENABLED=1/GUIDE_ETAPA2_ENABLED=0/g' .env
```

## 💡 Tips

- Los cambios en Render se aplican **automáticamente** sin reinicio manual
- En local necesitas reiniciar con `npm start`
- El botón se actualiza en tiempo real (sin recargar página en navegador)
- El archivo PDF siempre existe en `/public/GUIA_REGISTRO_ETAPA2.pdf`
- Solo cambias si está **visible en UI**, no la accesibilidad del archivo

---

**¡Así de simple!**
