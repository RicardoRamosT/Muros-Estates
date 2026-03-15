import { useState, useMemo, useCallback } from "react";
import { PAGE_PERMISSIONS, type PermissionLevel, type RolePermission, type RoleSectionAccess, type CustomRole } from "@shared/schema";
import { Search, Loader2, Plus } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SHEET_COLOR_DARK, SHEET_COLOR_LIGHT } from "@/lib/spreadsheet-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
};

const SECTION_ORDER = [
  'desarrolladores', 'desarrollos', 'tipologias', 'prospectos', 'clientes',
  'documentos', 'catalogos', 'usuarios',
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

/** Role search popover — magnifying glass to jump to a role row */
function RoleSearchPopover({
  roles,
  roleLabels,
  onSelect,
}: {
  roles: string[];
  roleLabels: Record<string, string>;
  onSelect: (role: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? roles.filter(r => (roleLabels[r] || r).toLowerCase().includes(query.toLowerCase()))
    : roles;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="p-1 rounded hover:bg-white/20 text-white" style={{ backgroundColor: SHEET_COLOR_DARK }}>
          <Search className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        <input
          className="w-full text-xs border rounded px-2 py-1 mb-2 outline-none focus:ring-1"
          placeholder="Buscar rol..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {filtered.map(r => (
            <button
              key={r}
              className="w-full text-left text-xs px-2 py-1 rounded hover:bg-accent"
              onClick={() => { onSelect(r); setOpen(false); setQuery(""); }}
            >
              {roleLabels[r] || r}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
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
  highlightedRole,
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
  highlightedRole: string | null;
}) {
  const hasFields = fieldNames.length > 0;
  const totalWidth = ROLE_COL_W + (1 + fieldNames.length) * CELL_W;

  return (
    <div className="overflow-x-auto flex-1">
      <div style={{ minWidth: hasFields ? totalWidth : ROLE_COL_W + CELL_W }}>
        {/* Column header row */}
        <div className="flex sticky top-0 z-20" style={{ height: ROW_H }}>
          <div
            className="flex-shrink-0 sticky left-0 z-30 flex items-center font-semibold text-xs text-white px-3"
            style={{ width: ROLE_COL_W, minWidth: ROLE_COL_W, height: ROW_H, backgroundColor: SHEET_COLOR_LIGHT, borderRight: '1px solid rgba(255,255,255,0.15)' }}
          >
            Rol
          </div>
          {/* Activo column header */}
          <div
            className="flex-shrink-0 flex items-center justify-center font-medium text-[10px] text-white"
            style={{ width: CELL_W, minWidth: CELL_W, height: ROW_H, backgroundColor: SHEET_COLOR_DARK, borderRight: '1px solid rgba(255,255,255,0.15)' }}
          >
            Activo
          </div>
          {/* Field column headers */}
          {fieldNames.map((field, i) => (
            <div
              key={`hdr-${field}`}
              className="flex-shrink-0 flex items-center justify-center font-medium text-[10px] text-white"
              style={{ width: CELL_W, minWidth: CELL_W, height: ROW_H, backgroundColor: i % 2 === 0 ? SHEET_COLOR_LIGHT : SHEET_COLOR_DARK, borderRight: '1px solid rgba(255,255,255,0.15)' }}
            >
              <span className="truncate px-1">{fieldLabels[field] || field}</span>
            </div>
          ))}
        </div>

        {/* Data rows */}
        {roles.map((role, rowIdx) => {
          const active = isSectionActive(sectionKey, role);
          const isHighlighted = highlightedRole === role;
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
                className="flex-shrink-0 sticky left-0 z-10 flex items-center font-medium text-xs px-3 border-b border-r border-gray-200"
                style={{ width: ROLE_COL_W, minWidth: ROLE_COL_W, height: ROW_H, backgroundColor: isHighlighted ? '#dbeafe' : (rowIdx % 2 === 0 ? '#ffffff' : '#f9fafb') }}
              >
                {roleLabels[role] || role}
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
  const [highlightedRole, setHighlightedRole] = useState<string | null>(null);

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

  // All roles = built-in + custom
  const allRoles = useMemo(() => {
    const customKeys = customRolesData.filter(r => r.active).map(r => r.key);
    return [...BUILT_IN_ROLES, ...customKeys];
  }, [customRolesData]);

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

  const handleRoleSearch = useCallback((role: string) => {
    setHighlightedRole(role);
    setTimeout(() => {
      const el = document.getElementById(`perm-role-${activeTab}-${role}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    setTimeout(() => setHighlightedRole(null), 2000);
  }, [activeTab]);

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
          <RoleSearchPopover roles={allRoles} roleLabels={allRoleLabels} onSelect={handleRoleSearch} />
          <div className="flex items-center gap-3 text-xs ml-2">
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#dcfce7' }} />
              <span className="text-muted-foreground">Editar</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#fef3c7' }} />
              <span className="text-muted-foreground">Ver</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#fee2e2' }} />
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
                highlightedRole={highlightedRole}
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
