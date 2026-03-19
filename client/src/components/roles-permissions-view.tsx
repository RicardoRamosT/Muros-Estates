import { useState, useMemo, useCallback, useRef } from "react";
import { PAGE_PERMISSIONS, type PermissionLevel, type RolePermission, type RoleSectionAccess, type CustomRole } from "@shared/schema";
import { Loader2, Plus, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SHEET_COLOR_DARK, SHEET_COLOR_LIGHT } from "@/lib/spreadsheet-utils";
import { SpreadsheetSectionSearch } from "@/components/ui/spreadsheet-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  actualizador: "Actualizador",
  perfilador: "Perfilador",
  finanzas: "Finanzas",
  asesor: "Asesor",
  desarrollador: "Desarrollador",
};

const SECTION_LABELS: Record<string, string> = {
  desarrolladores: "Desarrolladores",
  desarrollos: "Desarrollos",
  tipologias: "Tipologías",
  prospectos: "Prospectos",
  clientes: "Clientes",
  documentos: "Documentos",
  catalogos: "Catálogos",
  usuarios: "Usuarios",
  especial: "Especial",
};

const SECTION_ORDER = [
  'desarrolladores', 'desarrollos', 'tipologias', 'prospectos', 'clientes',
  'documentos', 'catalogos', 'usuarios', 'especial',
];

const FIELD_LABELS: Record<string, Record<string, string>> = {
  desarrolladores: {
    id: "ID",
    tipo: "Tipo",
    active: "Activo",
    name: "Nombre",
    razonSocial: "Razón Social",
    rfc: "RFC",
    domicilio: "Domicilio",
    fechaAntiguedad: "Fecha Antigüedad",
    antiguedadDeclarada: "Antigüedad Decl.",
    antiguedad: "Antigüedad",
    tipos: "Tipos",
    contratos: "Contratos",
    representante: "Representante",
    contactName: "Contacto Nombre",
    contactPhone: "Contacto Teléfono",
    contactEmail: "Contacto Email",
    legales: "Legales",
  },
  desarrollos: {
    id: "ID",
    active: "Activo",
    empresaTipo: "Tipo Empresa",
    developerId: "Desarrollador",
    name: "Nombre",
    city: "Ciudad",
    zone: "Zona",
    zone2: "Zona 2",
    zone3: "Zona 3",
    tipos: "Tipos",
    type: "Tipo",
    nivel: "Nivel",
    torres: "Torres",
    niveles: "Niveles",
    vistas: "Vistas",
    amenities: "Amenidades",
    efficiency: "Eficiencia",
    otherFeatures: "Otros",
    tamanoDesde: "Tamaño Desde",
    tamanoHasta: "Tamaño Hasta",
    lockOff: "Lock-Off",
    recDesde: "Rec Desde",
    recHasta: "Rec Hasta",
    recamaras: "Recámaras",
    banos: "Baños",
    tipologiasList: "Tipologías",
    redaccionValor: "Redacción Valor",
    acabados: "Acabados",
    depasM2: "Depas M²",
    localesM2: "Locales M²",
    oficinasM2: "Oficinas M²",
    saludM2: "Salud M²",
    inicioPreventa: "Inicio Preventa",
    tiempoTransc: "Tiempo Transc.",
    finPreventa: "Fin Preventa",
    depasUnidades: "Depas Unidades",
    depasVendidas: "Depas Vendidas",
    depasPorcentaje: "Depas %",
    localesUnidades: "Locales Uds.",
    localesVendidas: "Locales Vendidas",
    localesPorcentaje: "Locales %",
    oficinasUnidades: "Oficinas Uds.",
    oficinasVendidas: "Oficinas Vendidas",
    oficinasPorcentaje: "Oficinas %",
    saludUnidades: "Salud Uds.",
    saludVendidas: "Salud Vendidas",
    saludPorcentaje: "Salud %",
    inicioProyectado: "Inicio Proyectado",
    inicioReal: "Inicio Real",
    entregaProyectada: "Entrega Proyectada",
    entregaActualizada: "Entrega Actualizada",
    tipoContrato: "Tipo Contrato",
    cesionDerechos: "Cesión Derechos",
    ventasNombre: "Ventas Nombre",
    ventasTelefono: "Ventas Tel.",
    ventasCorreo: "Ventas Correo",
    pagosNombre: "Pagos Nombre",
    pagosTelefono: "Pagos Tel.",
    pagosCorreo: "Pagos Correo",
    comercializacion: "Comercialización",
    arquitectura: "Arquitectura",
    location: "Ubicación",
    presentacion: "Presentación",
    legalesFolder: "Legales",
    ventaFolder: "Venta",
  },
  tipologias: {
    id: "ID",
    active: "Activo",
    city: "Ciudad",
    zone: "Zona",
    developer: "Desarrollador",
    development: "Desarrollo",
    type: "Tipo",
    level: "Nivel",
    view: "Vista",
    size: "Tamaño",
    sizeFinal: "Tamaño Final",
    price: "Precio",
    hasDiscount: "Bono",
    discountPercent: "Bono %",
    discountPercentValue: "Bono % Val.",
    discountAmount: "Bono Monto",
    finalPrice: "Precio Final",
    pricePerM2: "Precio/M²",
    hasSeedCapital: "Capital Semilla",
    hasPromo: "Promo",
    promoDescription: "Desc. Promo",
    lockOff: "Lock-Off",
    bedrooms: "Recámaras",
    bathrooms: "Baños",
    areas: "Áreas",
    hasBalcony: "Balcón",
    balconySize: "Balcón Tam.",
    hasTerrace: "Terraza",
    terraceSize: "Terraza Tam.",
    bedrooms2: "Rec. 2",
    bathrooms2: "Baños 2",
    areas2: "Áreas 2",
    hasBalcony2: "Balcón 2",
    balconySize2: "Balcón 2 Tam.",
    hasTerrace2: "Terraza 2",
    terraceSize2: "Terraza 2 Tam.",
    parkingIncluded: "Cajones Incl.",
    hasParkingOptional: "Cajón Opc.",
    parkingOptionalPrice: "Cajón Precio",
    hasStorage: "Bodega",
    storageSize: "Bodega Tam.",
    hasStorageOptional: "Bodega Opc.",
    storageSize2: "Bodega 2 Tam.",
    storagePrice: "Bodega Precio",
    queIncluye: "Qué Incluye",
    initialPercent: "Inicial %",
    initialAmount: "Inicial Monto",
    duringConstructionPercent: "Const. %",
    duringConstructionAmount: "Const. Monto",
    paymentMonths: "Meses Pago",
    monthlyPayment: "Pago Mensual",
    totalEnganche: "Total Enganche",
    remainingPercent: "Restante %",
    deliveryDate: "Entrega",
    isaPercent: "ISA %",
    notaryPercent: "Notario %",
    equipmentCost: "Equipamiento",
    furnitureCost: "Mobiliario",
    totalPostDeliveryCosts: "Total Post-Entrega",
    mortgageAmount: "Hipoteca Monto",
    mortgageStartDate: "Hipoteca Inicio",
    mortgageInterestPercent: "Hipoteca Interés %",
    mortgageYears: "Hipoteca Años",
    mortgageMonthlyPayment: "Hipoteca Mensual",
    mortgageEndDate: "Hipoteca Fin",
    mortgageTotal: "Hipoteca Total",
    maintenanceM2: "Mant. M²",
    maintenanceInitial: "Mant. Inicial",
    maintenanceStartDate: "Mant. Inicio",
    maintenanceFinal: "Mant. Final",
    maintenanceEndDate: "Mant. Fin",
    maintenanceTotal: "Mant. Total",
    rentInitial: "Renta Inicial",
    rentStartDate: "Renta Inicio",
    rentRatePercent: "Tasa Renta %",
    rentFinal: "Renta Final",
    rentEndDate: "Renta Fin",
    rentMonths: "Renta Meses",
    rentTotal: "Renta Total",
    investmentTotal: "Inversión Total",
    investmentNet: "Inversión Neta",
    investmentMonthly: "Inversión Mensual",
    investmentRate: "Tasa Inversión",
    appreciationRate: "Tasa Plusvalía",
    appreciationDays: "Plusvalía Días",
    appreciationMonths: "Plusvalía Meses",
    appreciationYears: "Plusvalía Años",
    appreciationTotal: "Plusvalía Total",
    finalValue: "Valor Final",
  },
  prospectos: {
    active: "Activo",
    fecha: "Fecha",
    hora: "Hora",
    asesorId: "Asesor",
    ciudad: "Ciudad",
    zona: "Zona",
    desarrollador: "Desarrollador",
    desarrollo: "Desarrollo",
    tipologia: "Tipología",
    nombre: "Nombre",
    apellido: "Apellido",
    telefono: "Teléfono",
    correo: "Correo",
    tipofil: "Tipo",
    perfil: "Perfil",
    comoLlega: "Cómo Llega",
    brokerExterno: "Broker Externo",
    estatus: "Estatus",
    embudo: "Embudo",
    comoPaga: "Cómo Paga",
    positivos: "Positivos",
    negativos: "Negativos",
    comentarios: "Comentarios",
    precioFinal: "Precio Final",
    fechaSeparacion: "Fecha Separación",
    separacion: "Separación",
    fechaEnganche: "Fecha Enganche",
    enganche: "Enganche",
    plazoNumero: "Plazo Número",
    plazoMetro: "Plazo Metro",
    plazoMensualidades: "Mensualidades",
    plazoMonto: "Plazo Monto",
  },
  clientes: {
    active: "Activo",
    fecha: "Fecha",
    hora: "Hora",
    asesorId: "Asesor",
    nombre: "Nombre",
    apellido: "Apellido",
    telefono: "Teléfono",
    correo: "Correo",
    embudo: "Embudo",
    desarrollador: "Desarrollador",
    desarrollo: "Desarrollo",
    tipologia: "Tipología",
    precioFinal: "Precio Final",
    separacion: "Separación",
    fechaSeparacion: "Fecha Separación",
    enganche: "Enganche",
    fechaEnganche: "Fecha Enganche",
    tipofil: "Tipo",
    perfil: "Perfil",
    comoLlega: "Cómo Llega",
    brokerExterno: "Broker Externo",
    ciudad: "Ciudad",
    zona: "Zona",
    plazoNumero: "Plazo Número",
    plazoMetro: "Plazo Metro",
    plazoMensualidades: "Mensualidades",
    plazoMonto: "Plazo Monto",
    plazoFechaFinal: "Plazo Fecha Final",
    cajon: "Cajón",
    precioCajon: "Precio Cajón",
    bodega: "Bodega",
    precioBodega: "Precio Bodega",
    precioTotal: "Precio Total",
    porcentajeSeparacion: "% Separación",
    porcentajeEnganche: "% Enganche",
    cajones: "Cajones",
    bodegas: "Bodegas",
    papeleriaSeparacion: "Papelería Sep.",
    porcentajePlazo: "% Plazo",
    plazoTotal: "Plazo Total",
    plazoFechaInicio: "Plazo Fecha Inicio",
    escrituracion: "Escrituración",
    fechaLiquidacion: "Fecha Liquidación",
    papeleria: "Papelería",
    comentarios: "Comentarios",
  },
  documentos: {
    devIdentidad: "Dev. Identidad",
    devCorporativo: "Dev. Corporativo",
    devConvenios: "Dev. Convenios",
    desIdentidad: "Des. Identidad",
    desCorporativo: "Des. Corporativo",
    desConvenios: "Des. Convenios",
  },
  catalogos: {
    tiposDesarrollos: "Tipos Desarrollos",
    tipoContrato: "Tipo Contrato",
    presentacion: "Presentación",
    tipoProveedor: "Tipo Proveedor",
    tasasGlobales: "Tasas Globales",
    ciudades: "Ciudades",
    zonas: "Zonas",
    avisos: "Avisos",
    recamaras: "Recámaras",
    banos: "Baños",
    areas: "Áreas",
    cajones: "Cajones",
    incluye: "Incluye",
    amenidades: "Amenidades",
    acabados: "Acabados",
    eficiencia: "Eficiencia",
    seguridad: "Seguridad",
    nivel: "Nivel",
    tipoCliente: "Tipo Cliente",
    perfil: "Perfil",
    fuente: "Fuente",
    brokerExterno: "Broker Externo",
    statusProspecto: "Estatus Prospecto",
    etapaEmbudo: "Etapa Embudo",
    comoPaga: "Cómo Paga",
    positivos: "Positivos",
    negativos: "Negativos",
    etapaClientes: "Etapa Clientes",
  },
  usuarios: {
    name: "Nombre",
    username: "Usuario",
    email: "Email",
    password: "Contraseña",
    role: "Rol",
    active: "Activo",
    permissions: "Permisos",
  },
  especial: {
    notificaciones: "Notificaciones",
  },
};

/** Column group definitions per section (for ROW1 header) */
const SECTION_COLUMN_GROUPS: Record<string, { key: string; label: string; color: string }[]> = {
  desarrolladores: [
    { key: 'registro', label: 'REGISTRO', color: SHEET_COLOR_DARK },
    { key: 'generales', label: 'GENERALES', color: SHEET_COLOR_LIGHT },
    { key: 'antiguedad', label: 'ANTIGÜEDAD', color: SHEET_COLOR_DARK },
    { key: 'tipos', label: 'TIPOS', color: SHEET_COLOR_LIGHT },
    { key: 'contratos', label: 'CONTRATOS', color: SHEET_COLOR_DARK },
    { key: 'contacto', label: 'CONTACTO', color: SHEET_COLOR_LIGHT },
    { key: 'legales', label: 'LEGALES', color: SHEET_COLOR_DARK },
  ],
  desarrollos: [
    { key: 'registro', label: 'REGISTRO', color: SHEET_COLOR_DARK },
    { key: 'empresa', label: 'EMPRESA', color: SHEET_COLOR_LIGHT },
    { key: 'ubicacion', label: 'UBICACIÓN', color: SHEET_COLOR_DARK },
    { key: 'estructura', label: 'ESTRUCTURA', color: SHEET_COLOR_LIGHT },
    { key: 'amenidades', label: 'AMENIDADES', color: SHEET_COLOR_DARK },
    { key: 'tamano', label: 'TAMAÑO', color: SHEET_COLOR_LIGHT },
    { key: 'distribucion', label: 'DISTRIBUCIÓN', color: SHEET_COLOR_DARK },
    { key: 'descripcion', label: 'DESCRIPCIÓN', color: SHEET_COLOR_LIGHT },
    { key: 'metros', label: 'M²', color: SHEET_COLOR_DARK },
    { key: 'preventa', label: 'PREVENTA', color: SHEET_COLOR_LIGHT },
    { key: 'vendido', label: 'VENDIDO', color: SHEET_COLOR_DARK },
    { key: 'obra', label: 'OBRA', color: SHEET_COLOR_LIGHT },
    { key: 'contrato', label: 'CONTRATO', color: SHEET_COLOR_DARK },
    { key: 'ventas', label: 'VENTAS', color: SHEET_COLOR_LIGHT },
    { key: 'pagos', label: 'PAGOS', color: SHEET_COLOR_DARK },
    { key: 'archivos', label: 'ARCHIVOS', color: SHEET_COLOR_LIGHT },
  ],
  tipologias: [
    { key: 'registro', label: 'REGISTRO', color: SHEET_COLOR_DARK },
    { key: 'general', label: 'GENERAL', color: SHEET_COLOR_LIGHT },
    { key: 'departamento', label: 'DEPARTAMENTO', color: SHEET_COLOR_DARK },
    { key: 'tamano', label: 'TAMAÑO', color: SHEET_COLOR_LIGHT },
    { key: 'precio', label: 'PRECIO', color: SHEET_COLOR_DARK },
    { key: 'distribucion', label: 'DISTRIBUCIÓN', color: SHEET_COLOR_LIGHT },
    { key: 'lockoff', label: 'LOCK-OFF', color: SHEET_COLOR_DARK },
    { key: 'estacionamiento', label: 'ESTACIONAMIENTO', color: SHEET_COLOR_LIGHT },
    { key: 'bodega', label: 'BODEGA', color: SHEET_COLOR_DARK },
    { key: 'incluye', label: 'INCLUYE', color: SHEET_COLOR_LIGHT },
    { key: 'enganche', label: 'ENGANCHE', color: SHEET_COLOR_DARK },
    { key: 'entrega', label: 'ENTREGA', color: SHEET_COLOR_LIGHT },
    { key: 'hipoteca', label: 'HIPOTECA', color: SHEET_COLOR_DARK },
    { key: 'mantenimiento', label: 'MANTENIMIENTO', color: SHEET_COLOR_LIGHT },
    { key: 'renta', label: 'RENTA', color: SHEET_COLOR_DARK },
    { key: 'inversion', label: 'INVERSIÓN', color: SHEET_COLOR_LIGHT },
    { key: 'plusvalia', label: 'PLUSVALÍA', color: SHEET_COLOR_DARK },
  ],
  prospectos: [
    { key: 'registro', label: 'REGISTRO', color: SHEET_COLOR_DARK },
    { key: 'asesor', label: 'ASESOR', color: SHEET_COLOR_LIGHT },
    { key: 'ubicacion', label: 'UBICACIÓN', color: SHEET_COLOR_DARK },
    { key: 'unidad', label: 'UNIDAD', color: SHEET_COLOR_LIGHT },
    { key: 'prospecto', label: 'PROSPECTO', color: SHEET_COLOR_DARK },
    { key: 'general', label: 'GENERAL', color: SHEET_COLOR_LIGHT },
    { key: 'estatus', label: 'ESTATUS', color: SHEET_COLOR_DARK },
    { key: 'pago', label: 'CÓMO PAGA', color: SHEET_COLOR_LIGHT },
    { key: 'comentarios', label: 'COMENTARIOS', color: SHEET_COLOR_DARK },
    { key: 'precio', label: 'PRECIO', color: SHEET_COLOR_LIGHT },
    { key: 'separacion', label: 'SEPARACIÓN', color: SHEET_COLOR_DARK },
    { key: 'enganche', label: 'ENGANCHE', color: SHEET_COLOR_LIGHT },
    { key: 'plazo', label: 'A PLAZO', color: SHEET_COLOR_DARK },
  ],
  clientes: [
    { key: 'registro', label: 'REGISTRO', color: SHEET_COLOR_DARK },
    { key: 'asesor', label: 'ASESOR', color: SHEET_COLOR_LIGHT },
    { key: 'cliente', label: 'CLIENTE', color: SHEET_COLOR_DARK },
    { key: 'general', label: 'GENERAL', color: SHEET_COLOR_LIGHT },
    { key: 'unidad', label: 'UNIDAD', color: SHEET_COLOR_DARK },
    { key: 'separacion', label: 'SEPARACIÓN', color: SHEET_COLOR_LIGHT },
    { key: 'enganche', label: 'ENGANCHE', color: SHEET_COLOR_DARK },
    { key: 'perfil', label: 'PERFIL', color: SHEET_COLOR_LIGHT },
    { key: 'ubicacion2', label: 'UBICACIÓN', color: SHEET_COLOR_DARK },
    { key: 'plazo', label: 'A PLAZO', color: SHEET_COLOR_LIGHT },
    { key: 'extras', label: 'EXTRAS', color: SHEET_COLOR_DARK },
    { key: 'total', label: 'TOTAL', color: SHEET_COLOR_LIGHT },
    { key: 'liquidacion', label: 'LIQUIDACIÓN', color: SHEET_COLOR_DARK },
    { key: 'comentarios', label: 'COMENTARIOS', color: SHEET_COLOR_LIGHT },
  ],
  documentos: [
    { key: 'desarrollador', label: 'DESARROLLADOR', color: SHEET_COLOR_DARK },
    { key: 'desarrollo', label: 'DESARROLLO', color: SHEET_COLOR_LIGHT },
  ],
  catalogos: [
    { key: 'desarrollos', label: 'DESARROLLOS', color: SHEET_COLOR_DARK },
    { key: 'ubicacion', label: 'UBICACIÓN', color: SHEET_COLOR_LIGHT },
    { key: 'estructura', label: 'ESTRUCTURA', color: SHEET_COLOR_DARK },
    { key: 'prospectos', label: 'PROSPECTOS', color: SHEET_COLOR_LIGHT },
    { key: 'clientes', label: 'CLIENTES', color: SHEET_COLOR_DARK },
  ],
  usuarios: [
    { key: 'informacion', label: 'INFORMACIÓN', color: SHEET_COLOR_DARK },
    { key: 'acceso', label: 'ACCESO', color: SHEET_COLOR_LIGHT },
  ],
  especial: [
    { key: 'funciones', label: 'FUNCIONES', color: SHEET_COLOR_DARK },
  ],
};

/** Maps each field to its group key per section */
const FIELD_TO_GROUP: Record<string, Record<string, string>> = {
  desarrolladores: {
    id: 'registro', tipo: 'registro', active: 'registro',
    name: 'generales', razonSocial: 'generales', rfc: 'generales', domicilio: 'generales',
    fechaAntiguedad: 'antiguedad', antiguedadDeclarada: 'antiguedad', antiguedad: 'antiguedad',
    tipos: 'tipos',
    contratos: 'contratos',
    representante: 'contacto', contactName: 'contacto', contactPhone: 'contacto', contactEmail: 'contacto',
    legales: 'legales',
  },
  desarrollos: {
    id: 'registro', active: 'registro',
    empresaTipo: 'empresa', developerId: 'empresa', name: 'empresa',
    city: 'ubicacion', zone: 'ubicacion', zone2: 'ubicacion', zone3: 'ubicacion',
    tipos: 'estructura', type: 'estructura', nivel: 'estructura', torres: 'estructura', niveles: 'estructura', vistas: 'estructura',
    amenities: 'amenidades', efficiency: 'amenidades', otherFeatures: 'amenidades',
    tamanoDesde: 'tamano', tamanoHasta: 'tamano', lockOff: 'tamano',
    recDesde: 'distribucion', recHasta: 'distribucion', recamaras: 'distribucion', banos: 'distribucion', tipologiasList: 'distribucion',
    redaccionValor: 'descripcion', acabados: 'descripcion',
    depasM2: 'metros', localesM2: 'metros', oficinasM2: 'metros', saludM2: 'metros',
    inicioPreventa: 'preventa', tiempoTransc: 'preventa', finPreventa: 'preventa',
    depasUnidades: 'vendido', depasVendidas: 'vendido', depasPorcentaje: 'vendido',
    localesUnidades: 'vendido', localesVendidas: 'vendido', localesPorcentaje: 'vendido',
    oficinasUnidades: 'vendido', oficinasVendidas: 'vendido', oficinasPorcentaje: 'vendido',
    saludUnidades: 'vendido', saludVendidas: 'vendido', saludPorcentaje: 'vendido',
    inicioProyectado: 'obra', inicioReal: 'obra', entregaProyectada: 'obra', entregaActualizada: 'obra',
    tipoContrato: 'contrato', cesionDerechos: 'contrato',
    ventasNombre: 'ventas', ventasTelefono: 'ventas', ventasCorreo: 'ventas',
    pagosNombre: 'pagos', pagosTelefono: 'pagos', pagosCorreo: 'pagos',
    comercializacion: 'archivos', arquitectura: 'archivos', location: 'archivos', presentacion: 'archivos', legalesFolder: 'archivos', ventaFolder: 'archivos',
  },
  tipologias: {
    id: 'registro', active: 'registro',
    city: 'general', zone: 'general', developer: 'general', development: 'general',
    type: 'departamento', level: 'departamento', view: 'departamento',
    size: 'tamano', sizeFinal: 'tamano',
    price: 'precio', hasDiscount: 'precio', discountPercent: 'precio', discountPercentValue: 'precio', discountAmount: 'precio', finalPrice: 'precio', pricePerM2: 'precio', hasSeedCapital: 'precio', hasPromo: 'precio', promoDescription: 'precio',
    lockOff: 'distribucion', bedrooms: 'distribucion', bathrooms: 'distribucion', areas: 'distribucion', hasBalcony: 'distribucion', balconySize: 'distribucion', hasTerrace: 'distribucion', terraceSize: 'distribucion',
    bedrooms2: 'lockoff', bathrooms2: 'lockoff', areas2: 'lockoff', hasBalcony2: 'lockoff', balconySize2: 'lockoff', hasTerrace2: 'lockoff', terraceSize2: 'lockoff',
    parkingIncluded: 'estacionamiento', hasParkingOptional: 'estacionamiento', parkingOptionalPrice: 'estacionamiento',
    hasStorage: 'bodega', storageSize: 'bodega', hasStorageOptional: 'bodega', storageSize2: 'bodega', storagePrice: 'bodega',
    queIncluye: 'incluye',
    initialPercent: 'enganche', initialAmount: 'enganche', duringConstructionPercent: 'enganche', duringConstructionAmount: 'enganche', paymentMonths: 'enganche', monthlyPayment: 'enganche', totalEnganche: 'enganche',
    remainingPercent: 'entrega', deliveryDate: 'entrega', isaPercent: 'entrega', notaryPercent: 'entrega', equipmentCost: 'entrega', furnitureCost: 'entrega', totalPostDeliveryCosts: 'entrega',
    mortgageAmount: 'hipoteca', mortgageStartDate: 'hipoteca', mortgageInterestPercent: 'hipoteca', mortgageYears: 'hipoteca', mortgageMonthlyPayment: 'hipoteca', mortgageEndDate: 'hipoteca', mortgageTotal: 'hipoteca',
    maintenanceM2: 'mantenimiento', maintenanceInitial: 'mantenimiento', maintenanceStartDate: 'mantenimiento', maintenanceFinal: 'mantenimiento', maintenanceEndDate: 'mantenimiento', maintenanceTotal: 'mantenimiento',
    rentInitial: 'renta', rentStartDate: 'renta', rentRatePercent: 'renta', rentFinal: 'renta', rentEndDate: 'renta', rentMonths: 'renta', rentTotal: 'renta',
    investmentTotal: 'inversion', investmentNet: 'inversion', investmentMonthly: 'inversion', investmentRate: 'inversion',
    appreciationRate: 'plusvalia', appreciationDays: 'plusvalia', appreciationMonths: 'plusvalia', appreciationYears: 'plusvalia', appreciationTotal: 'plusvalia', finalValue: 'plusvalia',
  },
  prospectos: {
    active: 'registro', fecha: 'registro', hora: 'registro',
    asesorId: 'asesor',
    ciudad: 'ubicacion', zona: 'ubicacion',
    desarrollador: 'unidad', desarrollo: 'unidad', tipologia: 'unidad',
    nombre: 'prospecto', apellido: 'prospecto', telefono: 'prospecto', correo: 'prospecto',
    tipofil: 'general', perfil: 'general', comoLlega: 'general', brokerExterno: 'general',
    estatus: 'estatus', embudo: 'estatus',
    comoPaga: 'pago',
    positivos: 'comentarios', negativos: 'comentarios', comentarios: 'comentarios',
    precioFinal: 'precio',
    fechaSeparacion: 'separacion', separacion: 'separacion',
    fechaEnganche: 'enganche', enganche: 'enganche',
    plazoNumero: 'plazo', plazoMetro: 'plazo', plazoMensualidades: 'plazo', plazoMonto: 'plazo',
  },
  clientes: {
    active: 'registro', fecha: 'registro', hora: 'registro',
    asesorId: 'asesor',
    nombre: 'cliente', apellido: 'cliente', telefono: 'cliente', correo: 'cliente',
    embudo: 'general',
    desarrollador: 'unidad', desarrollo: 'unidad', tipologia: 'unidad', precioFinal: 'unidad',
    separacion: 'separacion', fechaSeparacion: 'separacion',
    enganche: 'enganche', fechaEnganche: 'enganche',
    tipofil: 'perfil', perfil: 'perfil', comoLlega: 'perfil', brokerExterno: 'perfil',
    ciudad: 'ubicacion2', zona: 'ubicacion2',
    plazoNumero: 'plazo', plazoMetro: 'plazo', plazoMensualidades: 'plazo', plazoMonto: 'plazo', plazoFechaFinal: 'plazo',
    cajon: 'extras', precioCajon: 'extras', bodega: 'extras', precioBodega: 'extras',
    precioTotal: 'total', porcentajeSeparacion: 'total', porcentajeEnganche: 'total', cajones: 'total', bodegas: 'total', papeleriaSeparacion: 'total', porcentajePlazo: 'total', plazoTotal: 'total', plazoFechaInicio: 'total',
    escrituracion: 'liquidacion', fechaLiquidacion: 'liquidacion', papeleria: 'liquidacion',
    comentarios: 'comentarios',
  },
  documentos: {
    devIdentidad: 'desarrollador', devCorporativo: 'desarrollador', devConvenios: 'desarrollador',
    desIdentidad: 'desarrollo', desCorporativo: 'desarrollo', desConvenios: 'desarrollo',
  },
  catalogos: {
    tiposDesarrollos: 'desarrollos', tipoContrato: 'desarrollos', presentacion: 'desarrollos', tipoProveedor: 'desarrollos', tasasGlobales: 'desarrollos',
    ciudades: 'ubicacion', zonas: 'ubicacion', avisos: 'ubicacion',
    recamaras: 'estructura', banos: 'estructura', areas: 'estructura', cajones: 'estructura', incluye: 'estructura', amenidades: 'estructura', acabados: 'estructura', eficiencia: 'estructura', seguridad: 'estructura', nivel: 'estructura',
    tipoCliente: 'prospectos', perfil: 'prospectos', fuente: 'prospectos', brokerExterno: 'prospectos', statusProspecto: 'prospectos', etapaEmbudo: 'prospectos', comoPaga: 'prospectos', positivos: 'prospectos', negativos: 'prospectos',
    etapaClientes: 'clientes',
  },
  usuarios: {
    name: 'informacion', username: 'informacion', email: 'informacion', password: 'informacion',
    role: 'acceso', active: 'acceso', permissions: 'acceso',
  },
  especial: {
    notificaciones: 'funciones',
  },
};

// Mapping from documentos virtual fields to their real schema entries
const DOCUMENTOS_FIELD_MAP: Record<string, { section: string; field: string }> = {
  devIdentidad: { section: 'documentosLegalesDesarrollador', field: 'identidad' },
  devCorporativo: { section: 'documentosLegalesDesarrollador', field: 'corporativo' },
  devConvenios: { section: 'documentosLegalesDesarrollador', field: 'convenios' },
  desIdentidad: { section: 'documentosLegalesDesarrollo', field: 'identidad' },
  desCorporativo: { section: 'documentosLegalesDesarrollo', field: 'corporativo' },
  desConvenios: { section: 'documentosLegalesDesarrollo', field: 'convenios' },
};

const BUILT_IN_ROLES = ["admin", "actualizador", "perfilador", "finanzas", "asesor", "desarrollador"];

function getNextPermissionLevel(current: PermissionLevel): PermissionLevel {
  if (current === "none") return "view";
  if (current === "view") return "edit";
  return "none";
}

function getPermissionCellBg(level: PermissionLevel): string {
  if (level === "edit") return "#dcfce7";
  if (level === "view") return "#fef3c7";
  return "#fee2e2";
}

function getPermissionLabel(level: PermissionLevel): string {
  if (level === "edit") return "Editar";
  if (level === "view") return "Ver";
  return "Sin Acceso";
}

function getPermissionTextColor(level: PermissionLevel): string {
  if (level === "edit") return "#15803d";
  if (level === "view") return "#92400e";
  return "#dc2626";
}

const CELL_W = 90;
const ROLE_COL_W = 130;
const ROW_H = 32;

/** Get the field names for a section key */
function getSectionFieldNames(sectionKey: string): string[] {
  const sectionData = (PAGE_PERMISSIONS as Record<string, any>)[sectionKey];
  if (!sectionData) return [];
  if (sectionData.fields) return Object.keys(sectionData.fields);
  if (sectionData.sections) return Object.keys(sectionData.sections);
  return [];
}

/** A single section's permission spreadsheet */
function PermissionSectionGrid({
  sectionKey,
  fieldNames,
  fieldLabels,
  roles,
  roleLabels,
  isSectionActive,
  getEffectivePermission,
  handlePermClick,
  handleActivoToggle,
  pendingUpdate,
  customRoleKeys,
  onDeleteRole,
}: {
  sectionKey: string;
  fieldNames: string[];
  fieldLabels: Record<string, string>;
  roles: string[];
  roleLabels: Record<string, string>;
  isSectionActive: (section: string, role: string) => boolean;
  getEffectivePermission: (section: string, field: string, role: string) => PermissionLevel;
  handlePermClick: (section: string, field: string, role: string) => void;
  handleActivoToggle: (section: string, role: string) => void;
  pendingUpdate: string | null;
  customRoleKeys: Set<string>;
  onDeleteRole: (roleKey: string) => void;
}) {
  const hasFields = fieldNames.length > 0;
  const totalWidth = ROLE_COL_W + (1 + fieldNames.length) * CELL_W;

  // Compute group runs for ROW1 and per-field colors for ROW2
  const columnGroups = SECTION_COLUMN_GROUPS[sectionKey] || [];
  const fieldToGroup = FIELD_TO_GROUP[sectionKey] || {};

  const { groupRuns, fieldGroupColors, soloFields } = useMemo(() => {
    const groupLookup = Object.fromEntries(columnGroups.map(g => [g.key, g]));
    const runs: { key: string; label: string; color: string; colspan: number }[] = [];
    const colors: string[] = [];
    // Track which field index each run starts at
    const runStarts: number[] = [];
    let currentGroup: string | null = null;

    for (let i = 0; i < fieldNames.length; i++) {
      const gKey = fieldToGroup[fieldNames[i]] || '';
      const groupDef = groupLookup[gKey];
      const color = groupDef?.color || SHEET_COLOR_DARK;

      if (gKey === currentGroup && runs.length > 0) {
        runs[runs.length - 1].colspan++;
      } else {
        runs.push({ key: gKey, label: groupDef?.label || '', color, colspan: 1 });
        runStarts.push(i);
        currentGroup = gKey;
      }
      colors.push(color);
    }
    // Build set of field indices that are alone in their group (colspan===1)
    const solo = new Set<number>();
    for (let r = 0; r < runs.length; r++) {
      if (runs[r].colspan === 1) solo.add(runStarts[r]);
    }
    return { groupRuns: runs, fieldGroupColors: colors, soloFields: solo };
  }, [fieldNames, columnGroups, fieldToGroup]);

  const hasGroups = groupRuns.length > 0;
  const headerTop = hasGroups ? ROW_H : 0;

  const scrollRef = useRef<HTMLDivElement>(null);

  // Section groups for the search popover (label + pixel offset)
  const sectionGroups = useMemo(() => {
    const result: { label: string; offset: number; width: number }[] = [];
    let offset = ROLE_COL_W + CELL_W; // after Rol + Activo
    for (const run of groupRuns) {
      const width = run.colspan * CELL_W;
      if (run.label) {
        result.push({ label: run.label, offset, width });
      }
      offset += width;
    }
    return result;
  }, [groupRuns]);

  return (
    <div className="overflow-x-auto flex-1" ref={scrollRef}>
      <div style={{ minWidth: hasFields ? totalWidth : ROLE_COL_W + CELL_W, width: 'fit-content' }}>
        {/* ROW1: Group headers */}
        {hasGroups && (
          <div className="flex sticky top-0 z-20" style={{ height: ROW_H }}>
            {/* Rol corner with section search */}
            <div
              data-sticky-corner
              className="flex-shrink-0 sticky left-0 z-30 flex items-center justify-center"
              style={{ width: ROLE_COL_W, minWidth: ROLE_COL_W, height: ROW_H, backgroundColor: SHEET_COLOR_LIGHT, borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.25)' }}
            >
              <SpreadsheetSectionSearch groups={sectionGroups} scrollRef={scrollRef} />
            </div>
            {/* Activo spacer */}
            <div
              className="flex-shrink-0"
              style={{ width: CELL_W, minWidth: CELL_W, height: ROW_H, backgroundColor: SHEET_COLOR_DARK, borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.25)' }}
            />
            {/* Group spans */}
            {groupRuns.map((group, i) => (
              <div
                key={`group-${i}-${group.key}`}
                data-section-group={group.label || undefined}
                className="flex-shrink-0 flex items-center justify-center font-semibold text-[10px] text-white uppercase tracking-wide"
                style={{
                  width: group.colspan * CELL_W,
                  minWidth: group.colspan * CELL_W,
                  height: ROW_H,
                  backgroundColor: group.color,
                  borderRight: '1px solid rgba(255,255,255,0.15)',
                  borderBottom: '1px solid rgba(255,255,255,0.25)',
                }}
              >
                {group.label}
              </div>
            ))}
          </div>
        )}
        {/* ROW2: Column header row */}
        <div className="flex sticky z-20" style={{ height: ROW_H, top: headerTop }}>
          <div
            className="flex-shrink-0 sticky left-0 z-30 flex items-center font-semibold text-xs text-white px-3"
            style={{ width: ROLE_COL_W, minWidth: ROLE_COL_W, height: ROW_H, backgroundColor: SHEET_COLOR_LIGHT, borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.25)' }}
          >
            Rol
          </div>
          {/* Activo column header */}
          <div
            className="flex-shrink-0 flex items-center justify-center font-medium text-[10px] text-white"
            style={{ width: CELL_W, minWidth: CELL_W, height: ROW_H, backgroundColor: SHEET_COLOR_DARK, borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.25)' }}
          >
            Activo
          </div>
          {/* Field column headers — hide label when group has only 1 column (shown in ROW1) */}
          {fieldNames.map((field, i) => (
            <div
              key={`hdr-${field}`}
              className="flex-shrink-0 flex items-center justify-center font-medium text-[10px] text-white"
              style={{ width: CELL_W, minWidth: CELL_W, height: ROW_H, backgroundColor: fieldGroupColors[i] || SHEET_COLOR_DARK, borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.25)' }}
            >
              {!soloFields.has(i) && (
                <span className="truncate px-1">{fieldLabels[field] || field}</span>
              )}
            </div>
          ))}
        </div>

        {/* Data rows */}
        {roles.map((role, rowIdx) => {
          const active = isSectionActive(sectionKey, role);
          const isHighlighted = false;
          return (
            <div
              key={role}
              id={`perm-role-${sectionKey}-${role}`}
              className="flex"
              style={{
                minWidth: 'max-content',
                backgroundColor: isHighlighted ? '#dbeafe' : (rowIdx % 2 === 0 ? '#ffffff' : '#f9fafb'),
                transition: 'background-color 0.3s',
              }}
            >
              {/* Role name (sticky) */}
              <div
                className="flex-shrink-0 sticky left-0 z-10 flex items-center font-medium text-xs px-3 border-b border-r border-gray-200 group/role"
                style={{ width: ROLE_COL_W, minWidth: ROLE_COL_W, height: ROW_H, backgroundColor: isHighlighted ? '#dbeafe' : (rowIdx % 2 === 0 ? '#ffffff' : '#f9fafb') }}
              >
                <span className="truncate flex-1">{roleLabels[role] || role}</span>
                {customRoleKeys.has(role) && (
                  <button
                    className="hidden group-hover/role:flex items-center justify-center w-4 h-4 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 flex-shrink-0"
                    onClick={() => onDeleteRole(role)}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Activo cell */}
              <div
                className="flex-shrink-0 flex items-center justify-center text-[10px] font-medium cursor-pointer select-none border-b border-r border-gray-200 transition-colors hover:brightness-95"
                style={{
                  width: CELL_W, minWidth: CELL_W, height: ROW_H,
                  backgroundColor: active ? '#dcfce7' : '#e5e7eb',
                  color: active ? '#15803d' : '#6b7280',
                  borderLeft: '2px solid rgba(0,0,0,0.08)',
                }}
                onClick={() => handleActivoToggle(sectionKey, role)}
              >
                {active ? "Sí" : "Inhabilitado"}
              </div>

              {/* Field cells */}
              {fieldNames.map(field => {
                const level = active ? getEffectivePermission(sectionKey, field, role) : 'none' as PermissionLevel;
                const isPending = pendingUpdate === `${sectionKey}:${field}:${role}`;
                const isDisabled = !active;
                return (
                  <div
                    key={`cell-${role}-${field}`}
                    className={`flex-shrink-0 flex items-center justify-center text-[10px] font-medium select-none border-b border-r border-gray-200 transition-colors ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-95'}`}
                    style={{
                      width: CELL_W, minWidth: CELL_W, height: ROW_H,
                      backgroundColor: isDisabled ? '#e5e7eb' : getPermissionCellBg(level),
                      color: isDisabled ? '#9ca3af' : getPermissionTextColor(level),
                    }}
                    onClick={() => !isDisabled && handlePermClick(sectionKey, field, role)}
                  >
                    {isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    ) : (
                      isDisabled ? "Sin Acceso" : getPermissionLabel(level)
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RolesPermissionsView() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(SECTION_ORDER[0]);
  const [pendingUpdate, setPendingUpdate] = useState<string | null>(null);
  const [newRoleDialogOpen, setNewRoleDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  // Fetch data
  const { data: customPermissions = [] } = useQuery<RolePermission[]>({
    queryKey: ['/api/role-permissions'],
  });

  const { data: sectionAccess = [] } = useQuery<RoleSectionAccess[]>({
    queryKey: ['/api/role-section-access'],
  });

  const { data: customRolesData = [] } = useQuery<CustomRole[]>({
    queryKey: ['/api/custom-roles'],
  });

  const updatePermMutation = useMutation({
    mutationFn: async (data: { section: string; field: string; role: string; permissionLevel: PermissionLevel }) => {
      return apiRequest('POST', '/api/role-permissions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/role-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-permissions'] });
      toast({ title: "Permiso actualizado" });
    },
    onError: () => {
      toast({ title: "Error al actualizar permiso", variant: "destructive" });
    },
    onSettled: () => setPendingUpdate(null),
  });

  const updateAccessMutation = useMutation({
    mutationFn: async (data: { section: string; role: string; active: boolean }) => {
      return apiRequest('POST', '/api/role-section-access', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/role-section-access'] });
      toast({ title: "Acceso de sección actualizado" });
    },
    onError: () => {
      toast({ title: "Error al actualizar acceso", variant: "destructive" });
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest('POST', '/api/custom-roles', { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-roles'] });
      setNewRoleDialogOpen(false);
      setNewRoleName("");
      toast({ title: "Rol creado" });
    },
    onError: () => {
      toast({ title: "Error al crear rol", variant: "destructive" });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/custom-roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-roles'] });
      toast({ title: "Rol eliminado" });
    },
    onError: () => {
      toast({ title: "Error al eliminar rol", variant: "destructive" });
    },
  });

  // All roles = built-in + custom
  const allRoles = useMemo(() => {
    const customKeys = customRolesData.filter(r => r.active).map(r => r.key);
    return [...BUILT_IN_ROLES, ...customKeys];
  }, [customRolesData]);

  const customRoleKeys = useMemo(() => new Set(customRolesData.filter(r => r.active).map(r => r.key)), [customRolesData]);

  const allRoleLabels = useMemo(() => {
    const labels = { ...ROLE_LABELS };
    customRolesData.forEach(r => { labels[r.key] = r.name; });
    return labels;
  }, [customRolesData]);

  // Build section access map
  const sectionAccessMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const sa of sectionAccess) {
      map.set(`${sa.section}:${sa.role}`, sa.active);
    }
    return map;
  }, [sectionAccess]);

  const isSectionActive = useCallback((section: string, role: string): boolean => {
    const key = `${section}:${role}`;
    return sectionAccessMap.get(key) ?? true;
  }, [sectionAccessMap]);

  // Permission overrides map
  const overrideMap = useMemo(() => {
    const map = new Map<string, PermissionLevel>();
    for (const p of customPermissions) {
      map.set(`${p.section}:${p.field}:${p.role}`, p.permissionLevel as PermissionLevel);
    }
    return map;
  }, [customPermissions]);

  const getEffectivePermission = useCallback((section: string, field: string, role: string): PermissionLevel => {
    if (section === 'documentos' && DOCUMENTOS_FIELD_MAP[field]) {
      const { section: realSection, field: realField } = DOCUMENTOS_FIELD_MAP[field];
      const customReal = overrideMap.get(`${realSection}:${realField}:${role}`);
      if (customReal) return customReal;
      const customVirtual = overrideMap.get(`documentos:${field}:${role}`);
      if (customVirtual) return customVirtual;
      const sectionData = (PAGE_PERMISSIONS as Record<string, any>)[realSection];
      return sectionData?.sections?.[realField]?.[role] || "none";
    }

    const custom = overrideMap.get(`${section}:${field}:${role}`);
    if (custom) return custom;
    const sectionData = (PAGE_PERMISSIONS as Record<string, any>)[section];
    return sectionData?.fields?.[field]?.[role] || sectionData?.sections?.[field]?.[role] || "none";
  }, [overrideMap]);

  const handlePermClick = useCallback((section: string, field: string, role: string) => {
    if (!isSectionActive(section, role)) return;
    const current = getEffectivePermission(section, field, role);
    const next = getNextPermissionLevel(current);

    if (section === 'documentos' && DOCUMENTOS_FIELD_MAP[field]) {
      const { section: realSection, field: realField } = DOCUMENTOS_FIELD_MAP[field];
      setPendingUpdate(`${section}:${field}:${role}`);
      updatePermMutation.mutate({ section: realSection, field: realField, role, permissionLevel: next });
      return;
    }

    setPendingUpdate(`${section}:${field}:${role}`);
    updatePermMutation.mutate({ section, field, role, permissionLevel: next });
  }, [isSectionActive, getEffectivePermission, updatePermMutation]);

  const handleActivoToggle = useCallback((section: string, role: string) => {
    const currentlyActive = isSectionActive(section, role);
    updateAccessMutation.mutate({ section, role, active: !currentlyActive });
  }, [isSectionActive, updateAccessMutation]);

  const handleDeleteRole = useCallback((roleKey: string) => {
    const role = customRolesData.find(r => r.key === roleKey);
    if (role) deleteRoleMutation.mutate(role.id);
  }, [customRolesData, deleteRoleMutation]);

  // Available sections
  const availableSections = useMemo(() => {
    const hiddenSections = new Set(['documentosLegalesDesarrollador', 'documentosLegalesDesarrollo']);
    return SECTION_ORDER.filter(key => !hiddenSections.has(key));
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#4ade80' }} />
              <span className="text-muted-foreground">Editar</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#fbbf24' }} />
              <span className="text-muted-foreground">Ver</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#f87171' }} />
              <span className="text-muted-foreground">Sin Acceso</span>
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setNewRoleDialogOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Nuevo Rol
        </Button>
      </div>

      {/* Section tabs + content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-3 overflow-x-auto">
          <TabsList className="h-9 bg-transparent p-0 gap-0 w-max">
            {availableSections.map(key => (
              <TabsTrigger
                key={key}
                value={key}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-xs font-medium"
              >
                {SECTION_LABELS[key] || key}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {availableSections.map(sectionKey => {
          const fieldNames = getSectionFieldNames(sectionKey);
          // For sections without fields in PAGE_PERMISSIONS, use FIELD_LABELS keys
          const effectiveFieldNames = fieldNames.length > 0 ? fieldNames : Object.keys(FIELD_LABELS[sectionKey] || {});

          return (
            <TabsContent key={sectionKey} value={sectionKey} className="flex-1 overflow-auto mt-0 p-2">
              <PermissionSectionGrid
                sectionKey={sectionKey}
                fieldNames={effectiveFieldNames}
                fieldLabels={FIELD_LABELS[sectionKey] || {}}
                roles={allRoles}
                roleLabels={allRoleLabels}
                isSectionActive={isSectionActive}
                getEffectivePermission={getEffectivePermission}
                handlePermClick={handlePermClick}
                handleActivoToggle={handleActivoToggle}
                pendingUpdate={pendingUpdate}
                customRoleKeys={customRoleKeys}
                onDeleteRole={handleDeleteRole}
              />
            </TabsContent>
          );
        })}
      </Tabs>

      {/* New Role Dialog */}
      <Dialog open={newRoleDialogOpen} onOpenChange={setNewRoleDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo Rol</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nombre del rol"
            value={newRoleName}
            onChange={e => setNewRoleName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newRoleName.trim().length >= 2) {
                createRoleMutation.mutate(newRoleName.trim());
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRoleDialogOpen(false)}>Cancelar</Button>
            <Button
              disabled={newRoleName.trim().length < 2 || createRoleMutation.isPending}
              onClick={() => createRoleMutation.mutate(newRoleName.trim())}
            >
              {createRoleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
