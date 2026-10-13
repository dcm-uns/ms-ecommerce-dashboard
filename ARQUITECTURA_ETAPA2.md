# Arquitectura: Sistema de Monitoreo Etapa 2

## Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────────┐
│                      DASHBOARD (Este servidor)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Frontend (HTML/JavaScript)                   │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                            │   │
│  │  home (index.html)          monitor.html                 │   │
│  │  ┌──────────────────────┐   ┌──────────────────────────┐ │   │
│  │  │ Registrar servicio   │   │ Panel de Monitoreo       │ │   │
│  │  ├──────────────────────┤   ├──────────────────────────┤ │   │
│  │  │ • Etapa 1 (12)       │   │ • Estado en vivo        │ │   │
│  │  │ • Etapa 2 (12)       │   │ • Filtros               │ │   │
│  │  │ • Admin              │   │ • Auto-refresh 10s      │ │   │
│  │  │                      │   │ • Endpoints por servicio │ │   │
│  │  │ [Registrar]          │   │ • Último check/latencia │ │   │
│  │  └──────────────────────┘   └──────────────────────────┘ │   │
│  │              ↓                        ↓                    │   │
│  └──────┬──────────────────────────────────────────────┬──────┘   │
│         │                                              │           │
│         │ POST /api/register                    GET /api/microservicios
│         │ POST /api/microservicios/ping         GET /monitor.html
│         │                                               │           │
│  ┌──────▼──────────────────────────────────────────────▼──────┐   │
│  │                  Backend (Node.js/Express)                  │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                            │   │
│  │  API Endpoints                                           │   │
│  │  CATÁLOGO (Etapa 1 + Etapa 2)                            │   │
│  │  VALIDACIÓN (checker.js)                                 │   │
│  │  PERSISTENCIA (store.js)                                 │   │
│  │                                                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                    Consulta GET /health
                                │
                ┌───────────────▼─────────────────┐
                │    MICROSERVICIOS DE GRUPOS     │
                └───────────────────────────────┬─┘
```

## Validación

### Etapa 1 (Estricto)
```
GET /health    + GET /items    + GET /items/{id}    + errores (404, 400)
```

### Etapa 2 (Flexible)
```
GET /health  (solo)
```

