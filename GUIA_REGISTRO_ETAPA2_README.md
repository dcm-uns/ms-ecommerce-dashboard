# Guía de Registro - Etapa 2

## Archivos Disponibles

Este directorio contiene documentación para estudiantes sobre cómo registrar sus microservicios Etapa 2:

### 📄 GUIA_REGISTRO_ETAPA2.pdf
**Archivo principal - Usar este para distribución a estudiantes**

Contiene:
- Paso a paso completo de desarrollo, deployment y registro
- Instrucciones para configurar en Render
- Cómo obtener URL del servicio upstream
- Formulario de registro en el Dashboard
- Solución de problemas común
- Checklist final de verificación

**Cómo usar:**
1. Descargar o imprimir GUIA_REGISTRO_ETAPA2.pdf
2. Distribuir a grupos de estudiantes
3. Seguir pasos en orden

### 🔗 GUIA_REGISTRO_ETAPA2.html
**Versión HTML - Para visualización en navegador**

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

Esto regenerará `GUIA_REGISTRO_ETAPA2.pdf` desde `GUIA_REGISTRO_ETAPA2.html`

## Distribución a Estudiantes

### Opción 1: PDF impreso
```
Descargar GUIA_REGISTRO_ETAPA2.pdf → Imprimir → Distribuir físicamente
```

### Opción 2: Enlace en línea
```
Incluir link en la syllabus o LMS:
/GUIA_REGISTRO_ETAPA2.pdf
```

### Opción 3: Dashboard integrado
Considerar agregar botón en `public/index.html` para descargar el PDF:
```html
<a href="/GUIA_REGISTRO_ETAPA2.pdf" download class="btn btn-secondary">
  Descargar Guía PDF
</a>
```

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

Ejemplos de cambios comunes:
- Reemplazar URLs ejemplo con URLs reales
- Agregar nombres de profesor/materia
- Cambiar colores o branding institucional
- Agregar referencias a plataforma específica (Blackboard, Canvas, etc.)
