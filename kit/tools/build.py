#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kit de microservicios - Escenario A (e-commerce).

Fuente de verdad: los datos y esquemas definidos en este archivo.
Uso:   python3 tools/build.py

Genera seed/*.json y openapi/*.yaml, y valida:
  - unicidad de ids y formato por prefijo
  - integridad referencial entre colecciones
  - coherencia de negocio (totales, estados, fechas, compras verificadas)
  - que cada seed cumple el esquema OpenAPI de su colección
  - que cada archivo OpenAPI es válido (openapi-spec-validator)

Para expandir los datos: agregá filas en las listas de abajo y volvé a correr.
Los campos derivados (total de órdenes, montos de pagos, subtotales,
destino de envíos) se calculan solos.
"""
import copy
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

import yaml
from jsonschema import Draft7Validator
from openapi_spec_validator import validate as validate_openapi

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
HOY = "2026-10-11"  # fecha de referencia de la semilla


# ----------------------------------------------------------------------------
# Utilidades
# ----------------------------------------------------------------------------
def T(s):
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def rows(keys, tuples):
    return [dict(zip(keys, t)) for t in tuples]


# ----------------------------------------------------------------------------
# DATOS BASE (editables)
# ----------------------------------------------------------------------------
CATEGORIAS = rows(
    ["id", "nombre", "padreId", "descripcion"],
    [
        ("CAT01", "Electrónica", None, "Dispositivos electrónicos y accesorios"),
        ("CAT02", "Celulares", "CAT01", "Teléfonos inteligentes"),
        ("CAT03", "Notebooks", "CAT01", "Computadoras portátiles"),
        ("CAT04", "Hogar", None, "Muebles y artículos para el hogar"),
        ("CAT05", "Cocina", "CAT04", "Electrodomésticos y utensilios de cocina"),
        ("CAT06", "Deportes", None, "Artículos deportivos"),
        ("CAT07", "Calzado deportivo", "CAT06", "Zapatillas para running, trail y más"),
        ("CAT08", "Libros", None, "Libros técnicos y de interés general"),
    ],
)

_PRODUCTOS = [
    ("PRD001", "Smartphone Nova X1 128GB", "Pantalla OLED de 6,5 pulgadas y cámara triple de 50 MP", "CAT02", "Nova", 450000),
    ("PRD002", "Smartphone Nova Lite 64GB", "Pantalla LCD de 6,1 pulgadas y batería de 5000 mAh", "CAT02", "Nova", 280000),
    ("PRD003", "Notebook Kora 14\"", "Procesador de 8 núcleos, 16 GB de RAM y SSD de 512 GB", "CAT03", "Kora", 890000),
    ("PRD004", "Notebook Kora Pro 16\"", "Procesador de 12 núcleos, 32 GB de RAM y SSD de 1 TB", "CAT03", "Kora", 1350000),
    ("PRD005", "Auriculares Bluetooth Sonar", "Cancelación de ruido y 30 horas de batería", "CAT01", "Sonar", 65000),
    ("PRD006", "Cafetera Express Brasa", "Presión de 15 bares y vaporizador de leche", "CAT05", "Brasa", 120000),
    ("PRD007", "Licuadora Vortex 1200W", "Jarra de vidrio de 1,5 litros y 5 velocidades", "CAT05", "Vortex", 54000),
    ("PRD008", "Zapatillas Running Pampa", "Amortiguación ligera para asfalto", "CAT07", "Pampa", 98000),
    ("PRD009", "Zapatillas Trail Cordillera", "Suela con tacos profundos e impermeables", "CAT07", "Pampa", 125000),
    ("PRD010", "Pelota de fútbol Estadio N5", "Tamaño 5, cosida a máquina", "CAT06", "Estadio", 32000),
    ("PRD011", "Algoritmos en la práctica", "Libro de programación y estructuras de datos", "CAT08", "Editorial Sur", 28000),
    ("PRD012", "Silla de escritorio Ergo", "Respaldo lumbar ajustable y base de nylon", "CAT04", "Ergo", 185000),
]
PRODUCTOS = [
    dict(id=i, nombre=n, descripcion=d, categoriaId=c, marca=m, precio=p, moneda="ARS", activo=True)
    for (i, n, d, c, m, p) in _PRODUCTOS
]

SUCURSALES = rows(
    ["id", "nombre", "ciudad", "provincia", "tipo"],
    [
        ("SUC01", "Tienda Bahía Blanca Centro", "Bahía Blanca", "Buenos Aires", "tienda"),
        ("SUC02", "Tienda Palermo", "Ciudad de Buenos Aires", "CABA", "tienda"),
        ("SUC03", "Tienda Nueva Córdoba", "Córdoba", "Córdoba", "tienda"),
        ("SUC04", "Depósito Central Rosario", "Rosario", "Santa Fe", "deposito"),
        ("SUC05", "Tienda Mendoza Centro", "Mendoza", "Mendoza", "tienda"),
        ("SUC06", "Depósito Norte Tucumán", "San Miguel de Tucumán", "Tucumán", "deposito"),
    ],
)

INVENTARIO = rows(
    ["id", "productoId", "sucursalId", "stock", "stockMinimo", "actualizado"],
    [
        ("INV001", "PRD001", "SUC01", 3, 5, "2026-10-10T06:00:00Z"),
        ("INV002", "PRD001", "SUC02", 25, 10, "2026-10-10T06:00:00Z"),
        ("INV003", "PRD002", "SUC02", 40, 10, "2026-10-10T06:00:00Z"),
        ("INV004", "PRD003", "SUC03", 8, 5, "2026-10-10T06:00:00Z"),
        ("INV005", "PRD004", "SUC02", 0, 3, "2026-10-10T06:00:00Z"),
        ("INV006", "PRD005", "SUC01", 60, 15, "2026-10-10T06:00:00Z"),
        ("INV007", "PRD005", "SUC04", 120, 30, "2026-10-10T06:00:00Z"),
        ("INV008", "PRD006", "SUC03", 12, 5, "2026-10-10T06:00:00Z"),
        ("INV009", "PRD007", "SUC05", 4, 8, "2026-10-10T06:00:00Z"),
        ("INV010", "PRD008", "SUC01", 22, 8, "2026-10-10T06:00:00Z"),
        ("INV011", "PRD009", "SUC05", 6, 8, "2026-10-10T06:00:00Z"),
        ("INV012", "PRD010", "SUC04", 90, 20, "2026-10-10T06:00:00Z"),
        ("INV013", "PRD011", "SUC02", 35, 10, "2026-10-10T06:00:00Z"),
        ("INV014", "PRD012", "SUC04", 14, 5, "2026-10-10T06:00:00Z"),
        ("INV015", "PRD003", "SUC04", 30, 8, "2026-10-10T06:00:00Z"),
        ("INV016", "PRD008", "SUC04", 55, 15, "2026-10-10T06:00:00Z"),
        ("INV017", "PRD005", "SUC06", 40, 10, "2026-10-10T06:00:00Z"),
    ],
)

CLIENTES = rows(
    ["id", "nombre", "email", "ciudad", "provincia", "fechaAlta"],
    [
        ("CLI001", "Lucía Fernández", "lucia.fernandez@example.com", "Bahía Blanca", "Buenos Aires", "2025-03-12"),
        ("CLI002", "Martín Gómez", "martin.gomez@example.com", "Ciudad de Buenos Aires", "CABA", "2025-04-30"),
        ("CLI003", "Sofía Romero", "sofia.romero@example.com", "Córdoba", "Córdoba", "2025-06-01"),
        ("CLI004", "Julián Acosta", "julian.acosta@example.com", "Rosario", "Santa Fe", "2025-08-19"),
        ("CLI005", "Valentina Díaz", "valentina.diaz@example.com", "Mendoza", "Mendoza", "2025-11-02"),
        ("CLI006", "Tomás Herrera", "tomas.herrera@example.com", "Bahía Blanca", "Buenos Aires", "2026-01-15"),
        ("CLI007", "Camila Suárez", "camila.suarez@example.com", "Mar del Plata", "Buenos Aires", "2026-03-27"),
        ("CLI008", "Nicolás Ortega", "nicolas.ortega@example.com", "San Miguel de Tucumán", "Tucumán", "2026-05-08"),
    ],
)

# (id, clienteId, fecha, estado)
_ORDENES = [
    ("ORD001", "CLI001", "2026-08-10T14:22:00Z", "entregada"),
    ("ORD002", "CLI002", "2026-08-18T10:05:00Z", "entregada"),
    ("ORD003", "CLI003", "2026-08-25T19:40:00Z", "entregada"),
    ("ORD004", "CLI004", "2026-09-02T09:15:00Z", "entregada"),
    ("ORD005", "CLI005", "2026-09-09T16:50:00Z", "entregada"),
    ("ORD006", "CLI001", "2026-09-14T21:10:00Z", "entregada"),
    ("ORD007", "CLI006", "2026-09-29T11:30:00Z", "enviada"),
    ("ORD008", "CLI004", "2026-10-06T13:45:00Z", "enviada"),
    ("ORD009", "CLI007", "2026-10-07T08:20:00Z", "pendiente"),
    ("ORD010", "CLI008", "2026-10-08T17:05:00Z", "cancelada"),
    ("ORD011", "CLI002", "2026-10-09T12:00:00Z", "pagada"),
    ("ORD012", "CLI005", "2026-10-10T15:35:00Z", "pagada"),
]

# (ordenId, productoId, cantidad)
_LINEAS = [
    ("ORD001", "PRD001", 1),
    ("ORD002", "PRD005", 2), ("ORD002", "PRD007", 1),
    ("ORD003", "PRD003", 1), ("ORD003", "PRD005", 1),
    ("ORD004", "PRD008", 1),
    ("ORD005", "PRD006", 1), ("ORD005", "PRD011", 1),
    ("ORD006", "PRD010", 1), ("ORD006", "PRD011", 1),
    ("ORD007", "PRD012", 1),
    ("ORD008", "PRD009", 1), ("ORD008", "PRD010", 1),
    ("ORD009", "PRD002", 1), ("ORD009", "PRD005", 1),
    ("ORD010", "PRD004", 1),
    ("ORD011", "PRD001", 1),
    ("ORD012", "PRD009", 1), ("ORD012", "PRD007", 1),
]

# ordenId -> medio de pago
_MEDIOS = {
    "ORD001": "tarjeta_credito", "ORD002": "billetera_virtual", "ORD003": "tarjeta_credito",
    "ORD004": "transferencia", "ORD005": "tarjeta_debito", "ORD006": "billetera_virtual",
    "ORD007": "tarjeta_credito", "ORD008": "transferencia", "ORD009": "transferencia",
    "ORD010": "tarjeta_credito", "ORD011": "billetera_virtual", "ORD012": "tarjeta_debito",
}

# Envíos no entregados (los entregados se calculan a partir de la fecha de la orden)
# ordenId -> (transportista, estado, despacho|None, estimada(date), entrega|None)
_ENVIOS_ABIERTOS = {
    "ORD007": ("Andes Logística", "demorado", "2026-10-01T09:00:00Z", "2026-10-06", None),
    "ORD008": ("Correo Pampa", "en_transito", "2026-10-08T08:30:00Z", "2026-10-13", None),
    "ORD011": ("Correo Pampa", "preparando", None, "2026-10-15", None),
    "ORD012": ("Andes Logística", "preparando", None, "2026-10-16", None),
}

RESENAS = rows(
    ["id", "productoId", "clienteId", "puntaje", "titulo", "texto", "fecha"],
    [
        ("RES001", "PRD001", "CLI001", 5, "Excelente equipo", "La cámara y la batería superaron mis expectativas.", "2026-08-20T18:00:00Z"),
        ("RES002", "PRD005", "CLI002", 4, "Buen sonido", "Cancelan bien el ruido, pero la batería rinde menos de lo anunciado.", "2026-08-28T20:10:00Z"),
        ("RES003", "PRD007", "CLI002", 2, "Se calienta y hace ruido", "A los pocos usos empezó a hacer ruido y a oler a quemado.", "2026-08-30T09:30:00Z"),
        ("RES004", "PRD003", "CLI003", 5, "Muy rápida", "Arranca en segundos y alcanza de sobra para programar.", "2026-09-03T21:00:00Z"),
        ("RES005", "PRD005", "CLI003", 4, "Cómodos", "Livianos y cómodos para usar todo el día.", "2026-09-04T10:45:00Z"),
        ("RES006", "PRD008", "CLI004", 3, "Cumplen, nada más", "Amortiguan bien, pero el talle viene algo chico.", "2026-09-12T17:20:00Z"),
        ("RES007", "PRD006", "CLI005", 5, "Café de bar en casa", "El vaporizador hace una espuma excelente.", "2026-09-18T08:30:00Z"),
        ("RES008", "PRD011", "CLI005", 4, "Claro y práctico", "Buenos ejemplos, aunque le faltan ejercicios resueltos.", "2026-09-19T19:00:00Z"),
        ("RES009", "PRD010", "CLI001", 4, "Buena pelota", "Mantiene bien la forma y el pique.", "2026-09-24T16:00:00Z"),
        ("RES010", "PRD011", "CLI001", 5, "Imprescindible", "Lo uso como material de consulta en el trabajo.", "2026-09-24T16:05:00Z"),
    ],
)

PROMOCIONES = rows(
    ["id", "nombre", "descuentoPct", "categoriaId", "productoId", "fechaInicio", "fechaFin"],
    [
        ("PRM001", "Semana del Celular", 15, "CAT02", None, "2026-10-05", "2026-10-18"),
        ("PRM002", "Hot Cocina", 20, "CAT05", None, "2026-10-01", "2026-10-31"),
        ("PRM003", "Liquidación de auriculares", 10, None, "PRD005", "2026-10-08", "2026-10-15"),
        ("PRM004", "Día del Libro", 25, "CAT08", None, "2026-09-01", "2026-09-30"),
        ("PRM005", "Black Notebook", 30, "CAT03", None, "2026-11-27", "2026-11-30"),
        ("PRM006", "Corré más", 12, "CAT07", None, "2026-10-10", "2026-12-31"),
    ],
)

TICKETS = rows(
    ["id", "clienteId", "ordenId", "categoria", "asunto", "descripcion", "estado", "fechaCreacion"],
    [
        ("TKT001", "CLI006", "ORD007", "envio", "Pedido demorado", "Mi silla debía llegar el 6 de octubre y todavía no tengo novedades.", "abierto", "2026-10-08T10:00:00Z"),
        ("TKT002", "CLI002", "ORD002", "producto", "Licuadora con ruido anormal", "La licuadora hace un ruido metálico a velocidad alta.", "en_proceso", "2026-09-02T18:20:00Z"),
        ("TKT003", "CLI007", "ORD009", "pago", "Transferencia no acreditada", "Hice la transferencia hace dos días y la orden sigue pendiente.", "abierto", "2026-10-09T09:40:00Z"),
        ("TKT004", "CLI008", "ORD010", "pago", "Reembolso no recibido", "Cancelé la compra y todavía no veo el reembolso.", "en_proceso", "2026-10-10T11:15:00Z"),
        ("TKT005", "CLI004", "ORD008", "envio", "Consulta de seguimiento", "¿Cómo puedo seguir el estado de mi envío?", "resuelto", "2026-10-09T20:05:00Z"),
        ("TKT006", "CLI001", "ORD006", "producto", "Libro con página dañada", "Llegó con varias páginas arrugadas.", "resuelto", "2026-09-21T14:30:00Z"),
        ("TKT007", "CLI005", "ORD012", "otro", "Cambio de dirección de entrega", "Necesito cambiar la dirección antes del despacho.", "abierto", "2026-10-10T18:00:00Z"),
        ("TKT008", "CLI003", "ORD003", "producto", "Falta cable en la caja", "Los auriculares vinieron sin el cable de carga.", "cerrado", "2026-09-01T12:10:00Z"),
    ],
)


# ----------------------------------------------------------------------------
# DERIVADOS (se calculan; no editar a mano)
# ----------------------------------------------------------------------------
_precio = {p["id"]: p["precio"] for p in PRODUCTOS}
_cli_ciudad = {c["id"]: c["ciudad"] for c in CLIENTES}

LINEAS = []
for n, (oid, pid, cant) in enumerate(_LINEAS, start=1):
    pu = _precio[pid]
    LINEAS.append(dict(id=f"LIN{n:03d}", ordenId=oid, productoId=pid, cantidad=cant,
                       precioUnit=pu, subtotal=pu * cant))

_total = {}
for l in LINEAS:
    _total[l["ordenId"]] = _total.get(l["ordenId"], 0) + l["subtotal"]

ORDENES = [dict(id=i, clienteId=c, fecha=f, estado=e, total=_total[i], moneda="ARS")
           for (i, c, f, e) in _ORDENES]
_orden = {o["id"]: o for o in ORDENES}

PAGOS = []
for n, o in enumerate(ORDENES, start=1):
    est = {"pendiente": "pendiente", "cancelada": "reembolsado"}.get(o["estado"], "aprobado")
    PAGOS.append(dict(id=f"PAG{n:03d}", ordenId=o["id"], medio=_MEDIOS[o["id"]], monto=o["total"],
                      estado=est, fecha=iso(T(o["fecha"]) + timedelta(minutes=3))))

ENVIOS = []
_transp = ["Correo Pampa", "Andes Logística"]
_k = 0
for o in ORDENES:
    oid = o["id"]
    if o["estado"] == "entregada":
        f = T(o["fecha"])
        tr = _transp[_k % 2]
        _k += 1
        row = (tr, "entregado", iso(f + timedelta(days=1)), (f + timedelta(days=6)).strftime("%Y-%m-%d"),
               iso(f + timedelta(days=5)))
    elif oid in _ENVIOS_ABIERTOS:
        row = _ENVIOS_ABIERTOS[oid]
    else:
        continue
    ENVIOS.append(dict(id=f"ENV{len(ENVIOS) + 1:03d}", ordenId=oid, transportista=row[0], estado=row[1],
                       fechaDespacho=row[2], fechaEstimadaEntrega=row[3], fechaEntrega=row[4],
                       destinoCiudad=_cli_ciudad[o["clienteId"]]))


# ----------------------------------------------------------------------------
# ESQUEMAS Y FILTROS (contrato)
# ----------------------------------------------------------------------------
def ID(prefix):
    return {"type": "string", "pattern": f"^{prefix}[0-9]+$", "description": "Identificador único del recurso.",
            "example": f"{prefix}001"}


def FK(prefix, desc):
    return {"type": "string", "pattern": f"^{prefix}[0-9]+$", "description": desc, "example": f"{prefix}001"}


def STR(desc, **kw):
    d = {"type": "string", "description": desc}
    d.update(kw)
    return d


def INT(desc, **kw):
    d = {"type": "integer", "description": desc}
    d.update(kw)
    return d


def NUM(desc, **kw):
    d = {"type": "number", "description": desc}
    d.update(kw)
    return d


def DT(desc, **kw):
    return STR(desc, format="date-time", **kw)


def DA(desc, **kw):
    return STR(desc, format="date", **kw)


def param(name, schema, desc):
    return {"name": name, "in": "query", "required": False, "description": desc, "schema": schema}


def q(schema_src):
    """Copia de un esquema de propiedad para usarlo como parámetro (sin example/description)."""
    s = copy.deepcopy(schema_src)
    s.pop("description", None)
    s.pop("example", None)
    return s


MONEDA = {"type": "string", "enum": ["ARS"], "description": "Moneda de los importes."}

COLECCIONES = {}


def col(name, title, prefix, desc, props, required, filters, data):
    COLECCIONES[name] = dict(name=name, title=title, prefix=prefix, desc=desc, props=props,
                             required=required, filters=filters, data=data)


col("categorias", "Categoria", "CAT", "Categorías de productos organizadas en dos niveles (raíz y subcategoría).",
    {"id": ID("CAT"), "nombre": STR("Nombre de la categoría.", example="Celulares"),
     "padreId": {**FK("CAT", "Categoría padre. Nulo en categorías raíz."), "nullable": True},
     "descripcion": STR("Descripción breve.")},
    ["id", "nombre", "padreId"],
    [param("padreId", q(FK("CAT", "")), "Devuelve solo las subcategorías de esa categoría."),
     param("raiz", {"type": "boolean"}, "Si es true, devuelve solo categorías raíz (padreId nulo).")],
    CATEGORIAS)

col("productos", "Producto", "PRD", "Catálogo de productos a la venta.",
    {"id": ID("PRD"), "nombre": STR("Nombre comercial.", example="Smartphone Nova X1 128GB"),
     "descripcion": STR("Descripción breve."),
     "categoriaId": FK("CAT", "Categoría del producto (puede ser raíz o subcategoría)."),
     "marca": STR("Marca.", example="Nova"),
     "precio": NUM("Precio de lista actual.", minimum=0, example=450000),
     "moneda": MONEDA, "activo": {"type": "boolean", "description": "Indica si el producto está a la venta."}},
    ["id", "nombre", "categoriaId", "marca", "precio", "moneda", "activo"],
    [param("categoriaId", q(FK("CAT", "")), "Filtra por categoría."),
     param("marca", {"type": "string"}, "Filtra por marca (coincidencia exacta, sin distinguir mayúsculas)."),
     param("precioMin", {"type": "number", "minimum": 0}, "Precio mayor o igual a este valor."),
     param("precioMax", {"type": "number", "minimum": 0}, "Precio menor o igual a este valor.")],
    PRODUCTOS)

col("sucursales", "Sucursal", "SUC", "Tiendas y depósitos de la empresa.",
    {"id": ID("SUC"), "nombre": STR("Nombre de la sucursal.", example="Tienda Bahía Blanca Centro"),
     "ciudad": STR("Ciudad.", example="Bahía Blanca"), "provincia": STR("Provincia.", example="Buenos Aires"),
     "tipo": {"type": "string", "enum": ["tienda", "deposito"], "description": "Tipo de sucursal."}},
    ["id", "nombre", "ciudad", "provincia", "tipo"],
    [param("ciudad", {"type": "string"}, "Filtra por ciudad (coincidencia exacta, sin distinguir mayúsculas)."),
     param("tipo", {"type": "string", "enum": ["tienda", "deposito"]}, "Filtra por tipo de sucursal.")],
    SUCURSALES)

col("inventario", "Inventario", "INV", "Stock de cada producto en cada sucursal (una fila por par producto-sucursal).",
    {"id": ID("INV"), "productoId": FK("PRD", "Producto."), "sucursalId": FK("SUC", "Sucursal."),
     "stock": INT("Unidades disponibles.", minimum=0, example=25),
     "stockMinimo": INT("Umbral de reposición definido para esa fila.", minimum=0, example=10),
     "actualizado": DT("Última actualización del stock.")},
    ["id", "productoId", "sucursalId", "stock", "stockMinimo", "actualizado"],
    [param("productoId", q(FK("PRD", "")), "Filtra por producto."),
     param("sucursalId", q(FK("SUC", "")), "Filtra por sucursal.")],
    INVENTARIO)

col("clientes", "Cliente", "CLI", "Clientes registrados. Los datos de la semilla son 100% sintéticos.",
    {"id": ID("CLI"), "nombre": STR("Nombre completo.", example="Lucía Fernández"),
     "email": STR("Correo electrónico (dominio example.com en la semilla).", format="email"),
     "ciudad": STR("Ciudad de residencia.", example="Bahía Blanca"), "provincia": STR("Provincia.", example="Buenos Aires"),
     "fechaAlta": DA("Fecha de alta del cliente.")},
    ["id", "nombre", "email", "ciudad", "provincia", "fechaAlta"],
    [param("ciudad", {"type": "string"}, "Filtra por ciudad (coincidencia exacta, sin distinguir mayúsculas)."),
     param("provincia", {"type": "string"}, "Filtra por provincia (coincidencia exacta, sin distinguir mayúsculas).")],
    CLIENTES)

col("ordenes", "Orden", "ORD", "Órdenes de compra. El total es la suma de los subtotales de sus líneas.",
    {"id": ID("ORD"), "clienteId": FK("CLI", "Cliente que realizó la compra."),
     "fecha": DT("Fecha y hora de creación de la orden."),
     "estado": {"type": "string", "enum": ["pendiente", "pagada", "enviada", "entregada", "cancelada"],
                "description": "Estado de la orden."},
     "total": NUM("Importe total de la orden.", minimum=0, example=450000), "moneda": MONEDA},
    ["id", "clienteId", "fecha", "estado", "total", "moneda"],
    [param("clienteId", q(FK("CLI", "")), "Filtra por cliente."),
     param("estado", {"type": "string", "enum": ["pendiente", "pagada", "enviada", "entregada", "cancelada"]},
           "Filtra por estado."),
     param("desde", {"type": "string", "format": "date"}, "Órdenes con fecha mayor o igual a este día (UTC)."),
     param("hasta", {"type": "string", "format": "date"}, "Órdenes con fecha menor o igual a este día (UTC, inclusive).")],
    ORDENES)

col("lineas_orden", "LineaOrden", "LIN", "Líneas (renglones) de cada orden.",
    {"id": ID("LIN"), "ordenId": FK("ORD", "Orden a la que pertenece."), "productoId": FK("PRD", "Producto comprado."),
     "cantidad": INT("Unidades compradas.", minimum=1, example=1),
     "precioUnit": NUM("Precio unitario al momento de la compra.", minimum=0, example=450000),
     "subtotal": NUM("cantidad × precioUnit.", minimum=0, example=450000)},
    ["id", "ordenId", "productoId", "cantidad", "precioUnit", "subtotal"],
    [param("ordenId", q(FK("ORD", "")), "Filtra por orden."),
     param("productoId", q(FK("PRD", "")), "Filtra por producto.")],
    LINEAS)

col("pagos", "Pago", "PAG", "Pagos asociados a las órdenes (uno por orden en la semilla).",
    {"id": ID("PAG"), "ordenId": FK("ORD", "Orden que se paga."),
     "medio": {"type": "string", "enum": ["tarjeta_credito", "tarjeta_debito", "transferencia", "billetera_virtual"],
               "description": "Medio de pago."},
     "monto": NUM("Importe del pago.", minimum=0, example=450000),
     "estado": {"type": "string", "enum": ["pendiente", "aprobado", "rechazado", "reembolsado"],
                "description": "Estado del pago."},
     "fecha": DT("Fecha y hora del pago.")},
    ["id", "ordenId", "medio", "monto", "estado", "fecha"],
    [param("ordenId", q(FK("ORD", "")), "Filtra por orden."),
     param("estado", {"type": "string", "enum": ["pendiente", "aprobado", "rechazado", "reembolsado"]},
           "Filtra por estado."),
     param("medio", {"type": "string", "enum": ["tarjeta_credito", "tarjeta_debito", "transferencia", "billetera_virtual"]},
           "Filtra por medio de pago.")],
    PAGOS)

col("envios", "Envio", "ENV", "Envíos de las órdenes pagadas (una vez despachadas, en tránsito o entregadas).",
    {"id": ID("ENV"), "ordenId": FK("ORD", "Orden que se envía."),
     "transportista": STR("Empresa de transporte.", example="Correo Pampa"),
     "estado": {"type": "string", "enum": ["preparando", "en_transito", "demorado", "entregado"],
                "description": "Estado del envío."},
     "fechaDespacho": {**DT("Fecha y hora de despacho. Nulo si aún no salió."), "nullable": True},
     "fechaEstimadaEntrega": DA("Fecha estimada de entrega."),
     "fechaEntrega": {**DT("Fecha y hora de entrega efectiva. Nulo si aún no se entregó."), "nullable": True},
     "destinoCiudad": STR("Ciudad de destino.", example="Rosario")},
    ["id", "ordenId", "transportista", "estado", "fechaDespacho", "fechaEstimadaEntrega", "fechaEntrega", "destinoCiudad"],
    [param("ordenId", q(FK("ORD", "")), "Filtra por orden."),
     param("estado", {"type": "string", "enum": ["preparando", "en_transito", "demorado", "entregado"]},
           "Filtra por estado."),
     param("transportista", {"type": "string"}, "Filtra por transportista (coincidencia exacta, sin distinguir mayúsculas).")],
    ENVIOS)

col("resenas", "Resena", "RES", "Reseñas de productos escritas por clientes que los compraron.",
    {"id": ID("RES"), "productoId": FK("PRD", "Producto reseñado."), "clienteId": FK("CLI", "Autor de la reseña."),
     "puntaje": INT("Puntaje de 1 a 5.", minimum=1, maximum=5, example=5),
     "titulo": STR("Título de la reseña.", example="Excelente equipo"),
     "texto": STR("Texto libre de la reseña."), "fecha": DT("Fecha y hora de publicación.")},
    ["id", "productoId", "clienteId", "puntaje", "titulo", "texto", "fecha"],
    [param("productoId", q(FK("PRD", "")), "Filtra por producto."),
     param("clienteId", q(FK("CLI", "")), "Filtra por cliente."),
     param("puntajeMin", {"type": "integer", "minimum": 1, "maximum": 5}, "Puntaje mayor o igual a este valor.")],
    RESENAS)

col("promociones", "Promocion", "PRM",
    "Promociones de descuento. Cada una aplica a una categoría o a un producto (exactamente uno de los dos).",
    {"id": ID("PRM"), "nombre": STR("Nombre de la promoción.", example="Semana del Celular"),
     "descuentoPct": INT("Porcentaje de descuento (1 a 90).", minimum=1, maximum=90, example=15),
     "categoriaId": {**FK("CAT", "Categoría alcanzada. Nulo si la promoción es por producto."), "nullable": True},
     "productoId": {**FK("PRD", "Producto alcanzado. Nulo si la promoción es por categoría."), "nullable": True},
     "fechaInicio": DA("Primer día de vigencia (inclusive)."), "fechaFin": DA("Último día de vigencia (inclusive).")},
    ["id", "nombre", "descuentoPct", "categoriaId", "productoId", "fechaInicio", "fechaFin"],
    [param("categoriaId", q(FK("CAT", "")), "Filtra por categoría."),
     param("productoId", q(FK("PRD", "")), "Filtra por producto."),
     param("vigente", {"type": "boolean"},
           "Si es true, devuelve las promociones con fechaInicio <= fecha <= fechaFin; si es false, las demás."),
     param("fecha", {"type": "string", "format": "date"},
           "Fecha con la que se evalúa `vigente`. Por defecto, el día actual. Útil para pruebas deterministas.")],
    PROMOCIONES)

col("tickets_soporte", "TicketSoporte", "TKT", "Tickets de atención al cliente, normalmente asociados a una orden.",
    {"id": ID("TKT"), "clienteId": FK("CLI", "Cliente que abrió el ticket."),
     "ordenId": FK("ORD", "Orden sobre la que trata el ticket."),
     "categoria": {"type": "string", "enum": ["envio", "pago", "producto", "otro"], "description": "Motivo del ticket."},
     "asunto": STR("Asunto breve."), "descripcion": STR("Detalle del problema."),
     "estado": {"type": "string", "enum": ["abierto", "en_proceso", "resuelto", "cerrado"], "description": "Estado del ticket."},
     "fechaCreacion": DT("Fecha y hora de creación.")},
    ["id", "clienteId", "ordenId", "categoria", "asunto", "descripcion", "estado", "fechaCreacion"],
    [param("clienteId", q(FK("CLI", "")), "Filtra por cliente."),
     param("ordenId", q(FK("ORD", "")), "Filtra por orden."),
     param("estado", {"type": "string", "enum": ["abierto", "en_proceso", "resuelto", "cerrado"]}, "Filtra por estado."),
     param("categoria", {"type": "string", "enum": ["envio", "pago", "producto", "otro"]}, "Filtra por categoría.")],
    TICKETS)


# ----------------------------------------------------------------------------
# GENERACIÓN DE OPENAPI
# ----------------------------------------------------------------------------
COMMON_DESC = """Contrato común a todos los microservicios del ejercicio.

**Reglas generales**
- El servicio es de **solo lectura** y expone siempre las mismas rutas: `GET /health`, `GET /items` y `GET /items/{id}`.
- `GET /items` devuelve los elementos **ordenados por `id` ascendente**, con paginación `limit`/`offset`.
  `total` es la cantidad de elementos que cumplen los filtros, sin considerar la paginación.
- Los filtros se combinan con AND. Los filtros de texto comparan por igualdad exacta sin distinguir mayúsculas.
- Un parámetro inválido (tipo, rango o valor fuera del enum) responde **400**. Un `id` inexistente responde **404**.
- Los errores usan siempre el formato `{ "error": "<codigo>", "message": "<detalle>" }`.
- Los nombres de campos del documento coinciden con los del JSON de la semilla (campo `id` como clave primaria).
- Fechas en ISO 8601 UTC (`date-time`) o `YYYY-MM-DD` (`date`).
"""


def build_openapi(c):
    name, prefix = c["name"], c["prefix"]
    item_schema = {"type": "object", "description": c["desc"], "required": c["required"], "properties": c["props"],
                   "example": c["data"][0]}
    spec = {
        "openapi": "3.0.3",
        "info": {
            "title": f"Microservicio de {name}",
            "version": "1.0.0",
            "description": f"**Colección:** `{name}` — {c['desc']}\n\n{COMMON_DESC}",
            "x-collection": name,
            "x-id-prefix": prefix,
        },
        "servers": [{"url": "http://localhost:3000", "description": "Local"},
                    {"url": "https://TU-SERVICIO.onrender.com", "description": "Render (reemplazar por tu URL)"}],
        "tags": [{"name": "Servicio", "description": "Estado del servicio"},
                 {"name": name, "description": c["desc"]}],
        "paths": {
            "/health": {"get": {
                "operationId": "getHealth", "summary": "Estado del servicio", "tags": ["Servicio"],
                "description": "Debe responder 200 si el servicio y su base de datos están operativos. "
                               "`collection` debe coincidir con la colección que sirve este microservicio.",
                "responses": {"200": {"description": "Servicio operativo.", "content": {"application/json": {
                    "schema": {"$ref": "#/components/schemas/Health"}}}}}}},
            "/items": {"get": {
                "operationId": "listItems", "summary": f"Lista de {name}", "tags": [name],
                "description": f"Devuelve una página de elementos de `{name}` ordenados por `id`.",
                "parameters": c["filters"] + [{"$ref": "#/components/parameters/Limit"},
                                              {"$ref": "#/components/parameters/Offset"}],
                "responses": {
                    "200": {"description": "Página de resultados.", "content": {"application/json": {
                        "schema": {"$ref": "#/components/schemas/ItemList"}}}},
                    "400": {"$ref": "#/components/responses/BadRequest"}}}},
            "/items/{id}": {"get": {
                "operationId": "getItem", "summary": f"Detalle de un elemento de {name}", "tags": [name],
                "parameters": [{"name": "id", "in": "path", "required": True,
                                "description": f"Identificador del elemento (por ejemplo `{prefix}001`).",
                                "schema": {"type": "string"}}],
                "responses": {
                    "200": {"description": "El elemento solicitado.", "content": {"application/json": {
                        "schema": {"$ref": "#/components/schemas/Item"}}}},
                    "404": {"$ref": "#/components/responses/NotFound"}}}},
        },
        "components": {
            "parameters": {
                "Limit": {"name": "limit", "in": "query", "required": False,
                          "description": "Cantidad máxima de elementos a devolver.",
                          "schema": {"type": "integer", "minimum": 1, "maximum": 100, "default": 20}},
                "Offset": {"name": "offset", "in": "query", "required": False,
                           "description": "Cantidad de elementos a saltear.",
                           "schema": {"type": "integer", "minimum": 0, "default": 0}},
            },
            "responses": {
                "BadRequest": {"description": "Parámetros inválidos.", "content": {"application/json": {
                    "schema": {"$ref": "#/components/schemas/Error"},
                    "example": {"error": "bad_request", "message": "El parámetro limit debe estar entre 1 y 100."}}}},
                "NotFound": {"description": "No existe un elemento con ese id.", "content": {"application/json": {
                    "schema": {"$ref": "#/components/schemas/Error"},
                    "example": {"error": "not_found", "message": f"No existe {prefix}999."}}}},
            },
            "schemas": {
                "Item": item_schema,
                "ItemList": {"type": "object", "required": ["items", "total", "limit", "offset"], "properties": {
                    "items": {"type": "array", "items": {"$ref": "#/components/schemas/Item"}},
                    "total": {"type": "integer", "minimum": 0,
                              "description": "Cantidad total de elementos que cumplen los filtros."},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 100},
                    "offset": {"type": "integer", "minimum": 0}}},
                "Health": {"type": "object", "required": ["status", "service", "collection"], "properties": {
                    "status": {"type": "string", "enum": ["ok"]},
                    "service": {"type": "string", "description": "Nombre del servicio (libre; por ejemplo el del grupo).",
                                "example": "grupo-03-" + name},
                    "collection": {"type": "string", "enum": [name]},
                    "version": {"type": "string", "example": "1.0.0"}}},
                "Error": {"type": "object", "required": ["error", "message"], "properties": {
                    "error": {"type": "string", "enum": ["bad_request", "not_found"]},
                    "message": {"type": "string"}}},
            },
        },
    }
    return spec


# ----------------------------------------------------------------------------
# VALIDACIÓN
# ----------------------------------------------------------------------------
def to_js(schema):
    """OpenAPI 3.0 -> JSON Schema (solo lo necesario: nullable)."""
    def conv(x):
        if isinstance(x, dict):
            x = {k: conv(v) for k, v in x.items()}
            if x.pop("nullable", False):
                t = x.get("type")
                if isinstance(t, str):
                    x["type"] = [t, "null"]
                if "enum" in x and None not in x["enum"]:
                    x["enum"] = x["enum"] + [None]
            return x
        if isinstance(x, list):
            return [conv(i) for i in x]
        return x
    return conv(copy.deepcopy(schema))


def parse_dt(v):
    return datetime.strptime(v, "%Y-%m-%dT%H:%M:%SZ")


def parse_d(v):
    return datetime.strptime(v, "%Y-%m-%d")


def validate_all():
    errs = []

    def err(m):
        errs.append(m)

    # 1) esquema + formato de cada fila
    for name, c in COLECCIONES.items():
        v = Draft7Validator(to_js({"type": "object", "required": c["required"], "properties": c["props"]}))
        ids = set()
        if len(c["data"]) < 5:
            err(f"{name}: menos de 5 filas")
        for r in c["data"]:
            if set(r) != set(c["props"]):
                err(f"{name}/{r.get('id')}: campos distintos al esquema ({set(r) ^ set(c['props'])})")
            for e in v.iter_errors(r):
                err(f"{name}/{r.get('id')}: {e.message}")
            if r["id"] in ids:
                err(f"{name}: id duplicado {r['id']}")
            ids.add(r["id"])
            for k, p in c["props"].items():
                val = r.get(k)
                if val is None:
                    continue
                if p.get("format") == "date-time":
                    try:
                        parse_dt(val)
                    except ValueError:
                        err(f"{name}/{r['id']}.{k}: date-time inválido {val}")
                if p.get("format") == "date":
                    try:
                        parse_d(val)
                    except ValueError:
                        err(f"{name}/{r['id']}.{k}: date inválido {val}")

    byid = {n: {r["id"]: r for r in c["data"]} for n, c in COLECCIONES.items()}

    # 2) integridad referencial
    fks = [("categorias", "padreId", "categorias"), ("productos", "categoriaId", "categorias"),
           ("inventario", "productoId", "productos"), ("inventario", "sucursalId", "sucursales"),
           ("ordenes", "clienteId", "clientes"), ("lineas_orden", "ordenId", "ordenes"),
           ("lineas_orden", "productoId", "productos"), ("pagos", "ordenId", "ordenes"),
           ("envios", "ordenId", "ordenes"), ("resenas", "productoId", "productos"),
           ("resenas", "clienteId", "clientes"), ("promociones", "categoriaId", "categorias"),
           ("promociones", "productoId", "productos"), ("tickets_soporte", "clienteId", "clientes"),
           ("tickets_soporte", "ordenId", "ordenes")]
    for src, field, dst in fks:
        for r in COLECCIONES[src]["data"]:
            if r[field] is not None and r[field] not in byid[dst]:
                err(f"FK rota: {src}/{r['id']}.{field} -> {r[field]} no existe en {dst}")

    # 3) coherencia de negocio
    inv_pairs = set()
    for r in INVENTARIO:
        k = (r["productoId"], r["sucursalId"])
        if k in inv_pairs:
            err(f"inventario: par duplicado {k}")
        inv_pairs.add(k)
    for pr in PROMOCIONES:
        if (pr["categoriaId"] is None) == (pr["productoId"] is None):
            err(f"{pr['id']}: debe tener exactamente uno de categoriaId/productoId")
        if pr["fechaInicio"] > pr["fechaFin"]:
            err(f"{pr['id']}: fechaInicio > fechaFin")
    for o in ORDENES:
        ls = [l for l in LINEAS if l["ordenId"] == o["id"]]
        if not ls:
            err(f"{o['id']}: sin líneas")
        if sum(l["subtotal"] for l in ls) != o["total"]:
            err(f"{o['id']}: total no coincide con líneas")
        if T(o["fecha"]) > T("2026-10-11T23:59:59Z"):
            err(f"{o['id']}: fecha futura")
    for l in LINEAS:
        if l["precioUnit"] != _precio[l["productoId"]] or l["subtotal"] != l["precioUnit"] * l["cantidad"]:
            err(f"{l['id']}: precio/subtotal inconsistente")
    pago_por_orden = {}
    for p in PAGOS:
        pago_por_orden[p["ordenId"]] = p
        if p["monto"] != byid["ordenes"][p["ordenId"]]["total"]:
            err(f"{p['id']}: monto != total de la orden")
    for o in ORDENES:
        p = pago_por_orden.get(o["id"])
        esp = {"pendiente": "pendiente", "cancelada": "reembolsado"}.get(o["estado"], "aprobado")
        if not p or p["estado"] != esp:
            err(f"{o['id']}: estado de pago incoherente con estado de orden")
    env_por_orden = {e["ordenId"]: e for e in ENVIOS}
    for o in ORDENES:
        e = env_por_orden.get(o["id"])
        esperado = {"entregada": {"entregado"}, "enviada": {"en_transito", "demorado"},
                    "pagada": {"preparando"}}.get(o["estado"])
        if esperado is None:
            if e:
                err(f"{o['id']}: no debería tener envío (estado {o['estado']})")
        elif not e or e["estado"] not in esperado:
            err(f"{o['id']}: envío incoherente con estado de orden")
    for e in ENVIOS:
        if e["estado"] == "entregado" and (e["fechaEntrega"] is None or e["fechaDespacho"] is None):
            err(f"{e['id']}: entregado sin fechas")
        if e["estado"] != "entregado" and e["fechaEntrega"] is not None:
            err(f"{e['id']}: fechaEntrega presente sin estar entregado")
        if e["estado"] == "preparando" and e["fechaDespacho"] is not None:
            err(f"{e['id']}: preparando con fechaDespacho")
        if e["estado"] in ("en_transito", "demorado") and e["fechaDespacho"] is None:
            err(f"{e['id']}: en camino sin fechaDespacho")
        cli = byid["ordenes"][e["ordenId"]]["clienteId"]
        if e["destinoCiudad"] != byid["clientes"][cli]["ciudad"]:
            err(f"{e['id']}: destino != ciudad del cliente")
        if e["estado"] == "demorado" and e["fechaEstimadaEntrega"] >= HOY:
            err(f"{e['id']}: demorado pero la fecha estimada no venció")
    # reseñas: compra verificada en una orden entregada, y posterior a la entrega
    for r in RESENAS:
        ok = False
        for o in ORDENES:
            if o["clienteId"] == r["clienteId"] and o["estado"] == "entregada":
                if any(l["ordenId"] == o["id"] and l["productoId"] == r["productoId"] for l in LINEAS):
                    ok = True
                    if T(r["fecha"]) <= T(env_por_orden[o["id"]]["fechaEntrega"]):
                        err(f"{r['id']}: reseña anterior a la entrega")
        if not ok:
            err(f"{r['id']}: el cliente no compró (y recibió) el producto")
    # tickets: la orden pertenece al cliente, y el ticket es posterior a la orden
    for t in TICKETS:
        o = byid["ordenes"][t["ordenId"]]
        if o["clienteId"] != t["clienteId"]:
            err(f"{t['id']}: la orden no pertenece al cliente")
        if T(t["fechaCreacion"]) <= T(o["fecha"]):
            err(f"{t['id']}: ticket anterior a la orden")
    # inventario con filas bajo mínimo (insumo para agentes)
    bajos = [r["id"] for r in INVENTARIO if r["stock"] < r["stockMinimo"]]
    if not bajos:
        err("inventario: no hay filas bajo el mínimo")
    return errs


def main():
    os.makedirs(os.path.join(ROOT, "seed"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "openapi"), exist_ok=True)

    errs = validate_all()
    if errs:
        print("ERRORES DE VALIDACIÓN:")
        for e in errs:
            print(" -", e)
        sys.exit(1)

    for name, c in COLECCIONES.items():
        with open(os.path.join(ROOT, "seed", f"{name}.json"), "w", encoding="utf-8") as f:
            json.dump(c["data"], f, ensure_ascii=False, indent=2)
            f.write("\n")
        spec = build_openapi(c)
        path = os.path.join(ROOT, "openapi", f"{name}.yaml")
        with open(path, "w", encoding="utf-8") as f:
            yaml.safe_dump(spec, f, sort_keys=False, allow_unicode=True, width=100)
        with open(path, encoding="utf-8") as f:
            validate_openapi(yaml.safe_load(f))

    print(f"{'colección':<18}{'filas':>6}   prefijo")
    for name, c in COLECCIONES.items():
        print(f"{name:<18}{len(c['data']):>6}   {c['prefix']}")
    print("\nOK: datos coherentes, seeds conformes a su esquema y 12 OpenAPI válidos.")


if __name__ == "__main__":
    main()
