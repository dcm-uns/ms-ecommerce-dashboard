# Guía de Registro - Etapa 2

## Archivos Disponibles

Este directorio contiene documentación para estudiantes sobre cómo registrar sus microservicios Etapa 2:

### 📄 GUIA_REGISTRO_ETAPA2.pdf
**Archivo principal - Disponible solo en modo admin**

Ubicación: `/public/GUIA_REGISTRO_ETAPA2.pdf`
Acceso: Botón "📖 Guía PDF" en el Dashboard (solo visible cuando está en modo admin)

Contiene:
- Paso a paso completo de desarrollo, deployment y registro
- Instrucciones para configurar en Render
- Cómo obtener URL del servicio upstream
- Formulario de registro en el Dashboard
- Solución de problemas común
- Checklist final de verificación

**Cómo usar:**
1. Ingresar en modo admin en el Dashboard
2. Hacer clic en botón "📖 Guía PDF" en la barra superior
3. Se descarga el archivo PDF
4. Distribuir a grupos de estudiantes (impreso o digital)

**Nota:** El PDF NO es visible en el home page inicial. Solo está disponible para administradores.

### 🔗 GUIA_REGISTRO_ETAPA2.html
**Versión HTML - Fuente para generar PDF**

- Misma contenido que el PDF pero en formato web
- Se puede visualizar directamente en navegador
- Se puede editar si necesita cambios

### 📖 Documentación complementaria en el repo:
- `CONTRATO_ETAPA_2.md` - Especificación formal de endpoints por servicio
- `ETAPA2_SETUP.md` - Guía técnica de setup
- `RESUMEN_ETAPA2.md` - Resumen ejecutivo
- `ARQUITECTURA_ETAPA2.md` - Documentación de arquitectura

## Regenerar el PDF

Si necesita actualizar el PDF después de cambios en el HTML:

```bash
npm install   # Si no tiene puppeteer instalado
npm run generate-pdf
```

Esto regenerará `public/GUIA_REGISTRO_ETAPA2.pdf` desde `GUIA_REGISTRO_ETAPA2.html`

## Distribución a Estudiantes

### Opción 1: Desde Dashboard (Recomendado)
```
1. Ingresar en modo admin
2. Hacer clic "📖 Guía PDF" 
3. Descargar el archivo
4. Imprimir y distribuir
```

### Opción 2: Enlace directo (si está en carpeta public)
```
GET /GUIA_REGISTRO_ETAPA2.pdf
```

**Nota:** Este endpoint es accesible públicamente. Si necesita restringir acceso solo a admin, debe agregar middleware de autenticación en server.js.

### Opción 3: En modo admin solo (actual)
El botón solo aparece cuando está logged como admin, pero el archivo es públicamente descargable si alguien conoce la URL.

## Contenido de la Guía

La guía está diseñada para ser auto-contenida y cubre:

1. **¿Qué es Etapa 2?** - Introducción al concepto
2. **Seleccionar Servicio** - Explicar cómo saben qué implementar
3. **Desarrollo Local** - Pasos técnicos para hacer el código
4. **Deploy en Render** - Cómo subir a producción
5. **Obtener URL Upstream** - Cómo encontrar el servicio a consumir
6. **Registro en Dashboard** - Paso a paso en el formulario
7. **Verificación en Monitor** - Cómo confirmar que funciona
8. **Troubleshooting** - Soluciones a errores comunes
9. **Checklist** - Verificación final antes de entregar

## Personalización

Si necesita modificar la guía:

1. Editar `GUIA_REGISTRO_ETAPA2.html`
2. Regenerar PDF: `npm run generate-pdf`
3. Commit cambios
4. El botón del Dashboard descargará automáticamente la versión nueva

Ejemplos de cambios comunes:
- Reemplazar URLs ejemplo con URLs reales
- Agregar nombres de profesor/materia
- Cambiar colores o branding institucional
- Agregar referencias a plataforma específica (Blackboard, Canvas, etc.)

## Tecnología

- **HTML**: Plantilla auto-contenida con estilos CSS
- **PDF**: Generado con Puppeteer en server.js
- **Almacenamiento**: public/GUIA_REGISTRO_ETAPA2.pdf (static file)
- **Servido por**: Express.static() desde carpeta public
- **Control de acceso**: Via UI (botón solo visible en admin), no en server

## Seguridad

**Nota importante:** El PDF es accesible públicamente en `/GUIA_REGISTRO_ETAPA2.pdf`. Si necesita restringir:

1. Agregar middleware de autenticación:
```javascript
app.get('/GUIA_REGISTRO_ETAPA2.pdf', (req, res, next) => {
  if (!req.headers.authorization) return res.status(401).send('Unauthorized');
  // validar token...
  next();
});
```

2. O servir desde endpoint protegido en lugar de static file

