import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { TextDetailModal } from "@/components/ui/text-detail-modal";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFieldPermissions } from "@/hooks/use-field-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ColumnFilter, useColumnFilters } from "@/components/ui/column-filter";
import { Plus, Minus, Trash2, Building, Loader2, Lock, AlertCircle, FolderOpen, X, Save, Check, ChevronDown, Search, Maximize2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";
import type { Development, Developer, CatalogCity, CatalogZone, CatalogAmenity, CatalogEfficiencyFeature, CatalogOtherFeature, CatalogAcabado, CatalogTipoContrato, CatalogCesionDerechos, CatalogPresentacion } from "@shared/schema";
import { DEVELOPMENT_TYPES } from "@shared/constants";
import { getCellStyle, formatDate, formatTime, type CellType, SHEET_COLOR_DARK, SHEET_COLOR_LIGHT, getColumnFilterType, createInputFilter, createPasteFilter, type InputFilterType } from "@/lib/spreadsheet-utils";
import { SpreadsheetHeader } from "@/components/ui/spreadsheet-shared";
import { cn } from "@/lib/utils";

const ActiveDropdownRef = { current: null as (() => void) | null };

function ExclusiveSelect({ children, ...props }: React.ComponentProps<typeof Select>) {
  const [open, setOpen] = useState(false);
  const closeMe = useCallback(() => setOpen(false), []);
  useEffect(() => {
    return () => { if (ActiveDropdownRef.current === closeMe) ActiveDropdownRef.current = null; };
  }, [closeMe]);
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      if (ActiveDropdownRef.current && ActiveDropdownRef.current !== closeMe) {
        ActiveDropdownRef.current();
      }
      ActiveDropdownRef.current = closeMe;
    } else {
      if (ActiveDropdownRef.current === closeMe) ActiveDropdownRef.current = null;
    }
    setOpen(isOpen);
  }, [closeMe]);
  return <Select {...props} open={open} onOpenChange={handleOpenChange}>{children}</Select>;
}

const TORRES_OPTIONS = Array.from({ length: 9 }, (_, i) => i + 1);
const NIVELES_OPTIONS = Array.from({ length: 110 }, (_, i) => i + 1);
const EMPRESA_TIPO_OPTIONS = ['Desarrollador', 'Comercializadora'] as const;
const RECAMARAS_OPTIONS = ['Loft', '1 + flex', '2 + flex', '3 + flex'] as const;


interface ColumnDef {
  key: string;
  label: string;
  group: string;
  type?: 'text' | 'number' | 'boolean' | 'select' | 'city-select' | 'zone-select' | 'type-select' | 'developer-select' | 'empresa-tipo-select' | 'nivel-select' | 'torres-select' | 'niveles-select' | 'multiselect-amenities' | 'multiselect-efficiency' | 'multiselect-other' | 'multiselect-acabados' | 'multiselect-tipos' | 'multiselect-vistas' | 'multiselect-creatable' | 'multiselect-tipologias' | 'recamaras-select' | 'banos-select' | 'tipo-contrato-select' | 'cesion-derechos-select' | 'presentacion-select' | 'calculated-percent' | 'folder-link' | 'actions' | 'index' | 'date-display' | 'time-display' | 'tipologias-count' | 'redaccion-text';
  width: string;
  folderSection?: string;
  cellType?: CellType;
  suffix?: string;
  hasInmediato?: boolean;
  calcFrom?: { unidades: string; vendidas: string };
}

interface ColumnGroup {
  key: string;
  label: string;
  color?: string;
}

const columnGroups: ColumnGroup[] = [
  { key: 'corner', label: '' },
  { key: 'registro', label: 'REGISTRO', color: SHEET_COLOR_DARK },
  { key: 'empresa', label: 'EMPRESA', color: SHEET_COLOR_LIGHT },
  { key: 'ubicacion', label: 'UBICACIÓN', color: SHEET_COLOR_DARK },
  { key: 'estructura', label: 'ESTRUCTURA', color: SHEET_COLOR_LIGHT },
  { key: 'tamano', label: 'TAMAÑO', color: SHEET_COLOR_DARK },
  { key: 'noheader_lockoff', label: 'LOCK OFF', color: SHEET_COLOR_DARK },
  { key: 'distribucion', label: 'DISTRIBUCIÓN', color: SHEET_COLOR_LIGHT },
  { key: 'depas', label: 'CANTIDAD', color: SHEET_COLOR_DARK },
  { key: 'avance', label: 'VENDIDO', color: SHEET_COLOR_LIGHT },
  { key: 'noheader_acabados', label: 'ACABADOS', color: SHEET_COLOR_DARK },
  { key: 'noheader_redaccion', label: 'REDACCIÓN', color: SHEET_COLOR_LIGHT },
  { key: 'noheader_amenidades', label: 'AMENIDADES', color: SHEET_COLOR_DARK },
  { key: 'noheader_preventa', label: 'PREVENTA', color: SHEET_COLOR_LIGHT },
  { key: 'obra', label: 'OBRA', color: SHEET_COLOR_DARK },
  { key: 'noheader_contrato', label: 'CONTRATO', color: SHEET_COLOR_DARK },
  { key: 'ventas', label: 'VENTAS', color: SHEET_COLOR_LIGHT },
  { key: 'pagos', label: 'PAGOS', color: SHEET_COLOR_DARK },
  { key: 'noheader_ubicacion', label: 'UBICACIÓN', color: SHEET_COLOR_DARK },
  { key: 'noheader_presentacion', label: 'PRESENTACIÓN', color: SHEET_COLOR_LIGHT },
  { key: 'noheader_legales', label: 'LEGALES', color: SHEET_COLOR_DARK },
  { key: 'noheader_venta', label: 'VENTA', color: SHEET_COLOR_LIGHT },
  { key: 'actions', label: '' },
];

interface NivelRango { desde: number; hasta: number; }

function parseNivelRangos(nivel: string | null | undefined): NivelRango[] {
  if (!nivel) return [];
  try {
    const parsed = JSON.parse(nivel);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch { return []; }
}

function formatNivelDisplay(rangos: NivelRango[]): string {
  if (rangos.length === 0) return '';
  return rangos.map(r => r.desde === r.hasta ? `Piso ${r.desde}` : `${r.desde}-${r.hasta}`).join(', ');
}

function NivelRangeCell({ dev, onSave, fieldCanEdit }: { dev: Development; onSave: (data: Partial<Development>) => void; fieldCanEdit: boolean; }) {
  const [open, setOpen] = useState(false);
  const rangos = parseNivelRangos(dev.nivel);
  const [localRangos, setLocalRangos] = useState<NivelRango[]>(rangos);
  const [localMax, setLocalMax] = useState<string>(dev.nivelMaximo != null ? String(dev.nivelMaximo) : '');

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setLocalRangos(parseNivelRangos(dev.nivel));
      setLocalMax(dev.nivelMaximo != null ? String(dev.nivelMaximo) : '');
    }
    setOpen(isOpen);
  };

  const addRango = () => {
    setLocalRangos(prev => [...prev, { desde: 1, hasta: 1 }]);
  };

  const removeRango = (idx: number) => {
    setLocalRangos(prev => prev.filter((_, i) => i !== idx));
  };

  const updateRango = (idx: number, field: 'desde' | 'hasta', val: string) => {
    const num = parseInt(val) || 0;
    setLocalRangos(prev => prev.map((r, i) => i === idx ? { ...r, [field]: num } : r));
  };

  const handleSave = () => {
    const nivelMaximo = localMax !== '' ? parseInt(localMax) || null : null;
    const nivelJson = localRangos.length > 0 ? JSON.stringify(localRangos) : null;
    onSave({ nivel: nivelJson, nivelMaximo });
    setOpen(false);
  };

  const display = formatNivelDisplay(rangos);

  return (
    <Popover open={open} onOpenChange={handleOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-6 w-full justify-between px-1.5 text-left font-normal text-xs"
          disabled={!fieldCanEdit}
        >
          <span className="truncate text-xs">{display || (fieldCanEdit ? '—' : '')}</span>
          {fieldCanEdit && <ChevronDown className="h-3 w-3 ml-1 shrink-0 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold">Rangos de pisos</span>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={addRango}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          {localRangos.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Sin rangos definidos</p>
          )}
          {localRangos.map((r, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground w-9 shrink-0">Desde</span>
              <Input
                type="number"
                className="h-6 text-xs px-1 w-14"
                value={r.desde}
                onChange={(e) => updateRango(idx, 'desde', e.target.value)}
              />
              <span className="text-xs text-muted-foreground shrink-0">Hasta</span>
              <Input
                type="number"
                className="h-6 text-xs px-1 w-14"
                value={r.hasta}
                onChange={(e) => updateRango(idx, 'hasta', e.target.value)}
              />
              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 shrink-0" onClick={() => removeRango(idx)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <div className="border-t pt-2 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex-1">Nivel máx. edificio</span>
              <Input
                type="number"
                className="h-6 text-xs px-1 w-14"
                value={localMax}
                onChange={(e) => setLocalMax(e.target.value)}
                placeholder="—"
              />
            </div>
          </div>
          <Button size="sm" className="w-full h-6 text-xs mt-1" onClick={handleSave}>
            Guardar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function isDevelopmentComplete(dev: Development, parentDeveloper?: Developer | null): boolean {
  if (parentDeveloper && (parentDeveloper.active !== true || !isDeveloperComplete(parentDeveloper))) {
    return false;
  }
  return !!(
    dev.developerId && dev.name && dev.city &&
    dev.tipos?.length && dev.vistas?.length && dev.niveles &&
    dev.entregaProyectada
  );
}

function isDeveloperComplete(dev: Developer): boolean {
  return !!(
    dev.tipo?.trim() && dev.name?.trim() && dev.tipos?.length && dev.contratos?.length
  );
}

function getMissingFieldsDevelopment(dev: Development, parentDeveloper?: Developer | null): string[] {
  const missing: string[] = [];
  if (parentDeveloper && (parentDeveloper.active !== true || !isDeveloperComplete(parentDeveloper))) {
    missing.push("Desarrollador padre (inactivo o incompleto)");
  }
  if (!dev.developerId) missing.push("Desarrollador");
  if (!dev.name) missing.push("Nombre");
  if (!dev.city) missing.push("Ciudad");
  if (!dev.tipos?.length) missing.push("Tipos");
  if (!dev.vistas?.length) missing.push("Vistas");
  if (!dev.niveles) missing.push("Niveles");
  if (!dev.entregaProyectada) missing.push("Entrega proyectada");
  return missing;
}

const DEV_ALWAYS_UNLOCKED = new Set(["active", "id", "createdDate", "createdTime", "developerId"]);

const columns: ColumnDef[] = [
  { key: 'id', label: 'ID', group: 'corner', type: 'index', width: '60px', cellType: 'index' },
  { key: 'active', label: 'Act.', group: 'registro', type: 'boolean', width: '70px', cellType: 'checkbox' },
  { key: 'createdDate', label: 'Fecha', group: 'registro', type: 'date-display', width: '80px', cellType: 'readonly' },
  { key: 'createdTime', label: 'Hora', group: 'registro', type: 'time-display', width: '66px', cellType: 'readonly' },
  { key: 'empresaTipo', label: 'Tipo', group: 'empresa', type: 'empresa-tipo-select', width: '110px', cellType: 'dropdown' },
  { key: 'developerId', label: 'Desarrollador', group: 'empresa', type: 'developer-select', width: '120px', cellType: 'dropdown' },
  { key: 'name', label: 'Desarrollo', group: 'empresa', width: '130px', cellType: 'input' },
  { key: 'city', label: 'Ciudad', group: 'ubicacion', type: 'city-select', width: '95px', cellType: 'dropdown' },
  { key: 'zone', label: 'Zona 1', group: 'ubicacion', type: 'zone-select', width: '95px', cellType: 'dropdown' },
  { key: 'zone2', label: 'Zona 2', group: 'ubicacion', type: 'zone-select', width: '95px', cellType: 'dropdown' },
  { key: 'zone3', label: 'Zona 3', group: 'ubicacion', type: 'zone-select', width: '95px', cellType: 'dropdown' },
  { key: 'tipos', label: 'Tipos', group: 'estructura', type: 'multiselect-tipos', width: '110px', cellType: 'dropdown' },
  { key: 'nivel', label: 'Nivel', group: 'estructura', type: 'nivel-select', width: '110px', cellType: 'dropdown' },
  { key: 'torres', label: 'Torres', group: 'estructura', type: 'torres-select', width: '78px', cellType: 'dropdown' },
  { key: 'niveles', label: 'Niveles', group: 'estructura', type: 'niveles-select', width: '78px', cellType: 'dropdown' },
  { key: 'vistas', label: 'Vistas', group: 'estructura', type: 'multiselect-creatable', width: '95px', cellType: 'dropdown' },
  { key: 'tamanoDesde', label: 'Desde', group: 'tamano', type: 'number', width: '75px', cellType: 'input', suffix: 'm²' },
  { key: 'tamanoHasta', label: 'Hasta', group: 'tamano', type: 'number', width: '75px', cellType: 'input', suffix: 'm²' },
  { key: 'lockOff', label: '', group: 'noheader_lockoff', type: 'boolean', width: '110px', cellType: 'checkbox' },
  { key: 'recamaras', label: 'Recámaras', group: 'distribucion', type: 'recamaras-select', width: '110px', cellType: 'dropdown' },
  { key: 'banos', label: 'Baños', group: 'distribucion', type: 'banos-select', width: '80px', cellType: 'dropdown' },
  { key: 'depasUnidades', label: 'Uds', group: 'depas', type: 'number', width: '55px', cellType: 'input' },
  { key: 'depasM2', label: 'm²', group: 'depas', type: 'number', width: '60px', cellType: 'input', suffix: 'm²' },
  { key: 'depasVendidas', label: '', group: 'avance', type: 'number', width: '95px', cellType: 'input' },
  { key: 'depasPorcentajeCalc', label: '%', group: 'avance', type: 'calculated-percent', width: '55px', cellType: 'readonly', calcFrom: { unidades: 'depasUnidades', vendidas: 'depasVendidas' } },
  { key: 'acabados', label: '', group: 'noheader_acabados', type: 'multiselect-acabados', width: '95px', cellType: 'dropdown' },
  { key: 'redaccionValor', label: '', group: 'noheader_redaccion', type: 'redaccion-text', width: '120px', cellType: 'input' },
  { key: 'amenities', label: 'Amenidades', group: 'noheader_amenidades', type: 'multiselect-amenities', width: '95px', cellType: 'dropdown' },
  { key: 'efficiency', label: 'Eficiencia', group: 'noheader_amenidades', type: 'multiselect-efficiency', width: '100px', cellType: 'dropdown' },
  { key: 'otherFeatures', label: 'Otros', group: 'noheader_amenidades', type: 'multiselect-other', width: '85px', cellType: 'dropdown' },
  { key: 'inicioPreventa', label: 'Inicio Prev.', group: 'noheader_preventa', width: '90px', cellType: 'input' },
  { key: 'tiempoTransc', label: 'Tiempo Transc.', group: 'noheader_preventa', width: '85px', cellType: 'input' },
  { key: 'inicioProyectado', label: 'Inicio', group: 'obra', width: '85px', cellType: 'input', hasInmediato: true },
  { key: 'entregaProyectada', label: 'Entrega', group: 'obra', width: '85px', cellType: 'input', hasInmediato: true },
  { key: 'tipoContrato', label: 'Contratos', group: 'noheader_contrato', type: 'tipo-contrato-select', width: '110px', cellType: 'dropdown' },
  { key: 'cesionDerechos', label: 'Cesión', group: 'noheader_contrato', type: 'cesion-derechos-select', width: '90px', cellType: 'dropdown' },
  { key: 'ventasNombre', label: 'Nombre', group: 'ventas', width: '100px', cellType: 'input' },
  { key: 'ventasTelefono', label: 'Teléfono', group: 'ventas', width: '90px', cellType: 'input' },
  { key: 'ventasCorreo', label: 'Correo', group: 'ventas', width: '120px', cellType: 'input' },
  { key: 'pagosNombre', label: 'Nombre', group: 'pagos', width: '100px', cellType: 'input' },
  { key: 'pagosTelefono', label: 'Teléfono', group: 'pagos', width: '90px', cellType: 'input' },
  { key: 'pagosCorreo', label: 'Correo', group: 'pagos', width: '120px', cellType: 'input' },
  { key: 'location', label: '', group: 'noheader_ubicacion', width: '100px', cellType: 'input' },
  { key: 'presentacion', label: '', group: 'noheader_presentacion', type: 'presentacion-select', width: '120px', cellType: 'dropdown' },
  { key: 'legalesFolder', label: '', group: 'noheader_legales', type: 'folder-link', folderSection: 'legales', width: '85px' },
  { key: 'ventaFolder', label: '', group: 'noheader_venta', type: 'folder-link', folderSection: 'venta', width: '80px' },
  { key: 'actions', label: '', group: 'actions', type: 'actions', width: '50px' },
];

export function DevelopmentsSpreadsheet() {
  const { toast } = useToast();
  const { canView, canEdit, hasFullAccess, role, canAccess, isLoading: authLoading } = useFieldPermissions('desarrollos');
  const [editingCell, setEditingCell_] = useState<{id: string, field: string} | null>(null);
  const editingCellRef = useRef<{id: string, field: string} | null>(null);
  const setEditingCell = useCallback((v: {id: string, field: string} | null) => { editingCellRef.current = v; setEditingCell_(v); }, []);
  const [textDetail, setTextDetail] = useState<{title: string, value: string, editable: boolean, onSave?: (v: string) => void, inputFilterType?: InputFilterType} | null>(null);
  const [editValue, setEditValue_] = useState("");
  const editValueRef = useRef("");
  const setEditValue = useCallback((v: string) => { editValueRef.current = v; setEditValue_(v); }, []);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [openDatePopover, setOpenDatePopover] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroupCollapse = (key: string) => {
    if (activeEditingRowId) {
      saveRowByIdRef.current(activeEditingRowId);
    }
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const COLLAPSED_COL_WIDTH = 20;
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const toggleColumn = (key: string) => {
    if (activeEditingRowId) {
      saveRowByIdRef.current(activeEditingRowId);
    }
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const pendingChangesRef = useRef<Map<string, Partial<Development>>>(new Map());
  const [localEdits, setLocalEdits] = useState<Record<string, Partial<Development>>>({});
  const [activeEditingRowId, setActiveEditingRowId] = useState<string | null>(null);
  const saveRowByIdRef = useRef<(id: string) => Promise<void>>(async () => {});
  const [pendingChangesVersion, setPendingChangesVersion] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  const { data: developments = [], isLoading: developmentsLoading } = useQuery<Development[]>({
    queryKey: ["/api/developments-entity"],
  });

  const { data: developers = [] } = useQuery<Developer[]>({
    queryKey: ["/api/developers"],
  });

  const { data: catalogCities = [] } = useQuery<CatalogCity[]>({
    queryKey: ["/api/catalog/cities"],
  });

  const { data: catalogZones = [] } = useQuery<CatalogZone[]>({
    queryKey: ["/api/catalog/zones"],
  });

  const cityNames = useMemo(() =>
    catalogCities
      .filter(c => c.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(c => c.name),
    [catalogCities]
  );

  const { data: amenities = [] } = useQuery<CatalogAmenity[]>({
    queryKey: ["/api/catalog/amenities"],
  });

  const { data: efficiencyFeatures = [] } = useQuery<CatalogEfficiencyFeature[]>({
    queryKey: ["/api/catalog/efficiency-features"],
  });

  const { data: otherFeatures = [] } = useQuery<CatalogOtherFeature[]>({
    queryKey: ["/api/catalog/other-features"],
  });

  const { data: acabados = [] } = useQuery<CatalogAcabado[]>({
    queryKey: ["/api/catalog/acabados"],
  });


  const { data: tiposContrato = [] } = useQuery<CatalogTipoContrato[]>({
    queryKey: ["/api/catalog/tipo-contrato"],
  });

  const { data: cesionDerechosList = [] } = useQuery<CatalogCesionDerechos[]>({
    queryKey: ["/api/catalog/cesion-derechos"],
  });

  const { data: presentaciones = [] } = useQuery<CatalogPresentacion[]>({
    queryKey: ["/api/catalog/presentacion"],
  });


  const { data: catalogBanos = [] } = useQuery<any[]>({
    queryKey: ["/api/catalog/banos"],
  });


  const isLoading = authLoading || developmentsLoading;
  const shouldCheckAccess = !authLoading;

  const createMutation = useMutation({
    mutationFn: (data: Partial<Development>) =>
      apiRequest("POST", "/api/developments-entity", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developments-entity"] });
      toast({ title: "Desarrollo creado" });
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Development> }) =>
      apiRequest("PUT", `/api/developments-entity/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developments-entity"] });
    },
    onError: () => toast({ title: "Error al actualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/developments-entity/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developments-entity"] });
      toast({ title: "Desarrollo eliminado" });
      setDeleteId(null);
    },
    onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
  });

  const handleCellClick = useCallback((id: string, field: string, currentValue: string | number | boolean | null) => {
    setEditingCell({ id, field });
    setEditValue(String(currentValue ?? ""));
  }, []);

  const handleFieldChange = useCallback((id: string, data: Partial<Development>) => {
    const current = pendingChangesRef.current.get(id) || {};
    pendingChangesRef.current.set(id, { ...current, ...data });
    setPendingChangesVersion(v => v + 1);
    setLocalEdits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...data } }));
    if (activeEditingRowId && activeEditingRowId !== id) {
      saveRowByIdRef.current(activeEditingRowId);
    }
    setActiveEditingRowId(id);
  }, [activeEditingRowId]);

  const saveRowById = useCallback(async (id: string) => {
    const changes = pendingChangesRef.current.get(id);
    if (!changes || Object.keys(changes).length === 0) return;
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({ id, data: changes });
      pendingChangesRef.current.delete(id);
      setPendingChangesVersion(v => v + 1);
      setLocalEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1200);
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [updateMutation, toast]);

  saveRowByIdRef.current = saveRowById;

  const saveAllPending = useCallback(async () => {
    const ids = Array.from(pendingChangesRef.current.keys());
    for (const id of ids) {
      await saveRowById(id);
    }
  }, [saveRowById]);

  const handleRowClick = useCallback((id: string) => {
    if (activeEditingRowId && activeEditingRowId !== id) {
      saveRowById(activeEditingRowId);
    }
    setActiveEditingRowId(id);
  }, [activeEditingRowId, saveRowById]);

  const pendingRowCount = useMemo(
    () => Array.from(pendingChangesRef.current.values()).filter(c => c && Object.keys(c).length > 0).length,
    [pendingChangesVersion]
  );

  const handleCellBlur = useCallback((id: string, field: string, col: ColumnDef, inputValue?: string) => {
    if (!editingCell || editingCell.id !== id || editingCell.field !== field) return;

    const dev = developments.find(d => d.id === id);
    if (!dev) return;

    const editVal = inputValue !== undefined ? inputValue : editValue;
    const currentValue = String((dev as any)[field] ?? "");
    if (editVal !== currentValue) {
      let valueToSave: string | number | null = editVal || null;
      if (col.type === 'number' && editVal) {
        valueToSave = parseFloat(editVal);
        if (isNaN(valueToSave)) valueToSave = null;
      }
      const dataToSave: Record<string, any> = { [field]: valueToSave };
      if (field === 'name' && editVal && !dev.inicioPreventa) {
        const match = developments.find(d => d.id !== id && d.name === editVal && d.inicioPreventa);
        if (match) dataToSave.inicioPreventa = match.inicioPreventa;
      }
      handleFieldChange(id, dataToSave);
    }
    setEditingCell(null);
  }, [editingCell, editValue, developments, handleFieldChange]);

  const handleSelectChange = useCallback((id: string, field: string, value: string) => {
    const actualValue = value === '__unassigned__' ? null : (value || null);
    handleFieldChange(id, { [field]: actualValue });
    setEditingCell(null);
  }, [handleFieldChange]);

  const handleCheckboxChange = useCallback((id: string, field: string, checked: boolean) => {
    handleFieldChange(id, { [field]: checked });
  }, [handleFieldChange]);

  const handleMultiSelectChange = useCallback((id: string, field: string, currentValues: string[], toggleValue: string) => {
    const newValues = currentValues.includes(toggleValue)
      ? currentValues.filter(v => v !== toggleValue)
      : [...currentValues, toggleValue];
    handleFieldChange(id, { [field]: newValues });
  }, [handleFieldChange]);

  const getTypeFromDeveloper = useCallback((developerId: string | null) => {
    if (!developerId) return null;
    const dev = developers.find(d => d.id === developerId);
    return dev?.tipos || null;
  }, [developers]);

  const handleCreateNew = () => {
    createMutation.mutate({
      name: "Nuevo Desarrollo",
      active: false,
    });
  };

  const getDeveloperName = useCallback((developerId: string | null) => {
    if (!developerId) return "-";
    const dev = developers.find(d => d.id === developerId);
    return dev?.name || "Desconocido";
  }, [developers]);

  const getZonesForCity = useCallback((city: string | null): string[] => {
    if (!city) return [];
    const cityObj = catalogCities.find(c => c.name === city);
    if (!cityObj) return [];
    return catalogZones
      .filter(z => z.cityId === cityObj.id && z.active !== false)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      .map(z => z.name);
  }, [catalogCities, catalogZones]);

  const visibleColumns = useMemo(() => {
    let cols = columns.filter(col => {
      if (col.type === 'actions') return hasFullAccess;
      if (col.key === 'id' || col.group === 'corner' || col.group === 'registro' || col.autoField) return true;
      const perm = canView(col.key);
      return perm;
    });

    if (collapsedGroups.size > 0) {
      const processed: ColumnDef[] = [];
      let i = 0;
      while (i < cols.length) {
        const col = cols[i];
        const gk = col.group || '';
        const isCollapsibleGroup = collapsedGroups.has(gk) && gk !== 'corner';
        if (isCollapsibleGroup) {
          // Emit any autoField columns in the group first (they are always visible)
          while (i < cols.length && cols[i].group === gk && cols[i].autoField) {
            processed.push(cols[i]);
            i++;
          }
          // Then emit the collapse placeholder for non-autoField columns
          if (i < cols.length && cols[i].group === gk) {
            processed.push({ key: `${gk}_collapsed`, label: '', group: gk, type: 'group-collapsed' as any, width: '30px', cellType: 'readonly' });
            while (i < cols.length && cols[i].group === gk) i++;
          }
        } else {
          processed.push(col);
          i++;
        }
      }
      cols = processed;
    }

    if (collapsedColumns.size > 0) {
      cols = cols.map(col =>
        collapsedColumns.has(col.key) ? { ...col, width: `${COLLAPSED_COL_WIDTH}px` } : col
      );
    }

    return cols;
  }, [canView, hasFullAccess, collapsedGroups, collapsedColumns]);

  const developerOrderMap = useMemo(() => {
    const sorted = [...developers].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return Object.fromEntries(sorted.map((d, i) => [String(d.id), i]));
  }, [developers]);

  const effectiveDevelopments = useMemo(() =>
    developments.map(d => ({ ...d, ...(localEdits[d.id] || {}) })),
    [developments, localEdits]
  );

  const flushPendingChanges = useCallback(() => {
    const ec = editingCellRef.current;
    if (ec) {
      const current = pendingChangesRef.current.get(ec.id) || {};
      pendingChangesRef.current.set(ec.id, { ...current, [ec.field]: editValueRef.current || null });
    }
    const pending = pendingChangesRef.current;
    if (pending.size === 0) return;
    const sessionId = localStorage.getItem("muros_session");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (sessionId) headers["Authorization"] = `Bearer ${sessionId}`;
    const promises: Promise<any>[] = [];
    pending.forEach((changes, id) => {
      if (!changes || Object.keys(changes).length === 0) return;
      promises.push(fetch(`/api/developments-entity/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(changes),
        keepalive: true,
      }));
    });
    pending.clear();
    Promise.all(promises).then(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/developments-entity"] });
    });
  }, []);

  useEffect(() => {
    window.addEventListener('beforeunload', flushPendingChanges);
    return () => {
      window.removeEventListener('beforeunload', flushPendingChanges);
      flushPendingChanges();
    };
  }, [flushPendingChanges]);

  const developmentsForFilter = useMemo(() => {
    return effectiveDevelopments.map(dev => {
      const developerTipos = getTypeFromDeveloper(dev.developerId) || [];
      const selectedTipos = (dev.tipos as string[] | null) || [];
      return {
        ...dev,
        tipos: selectedTipos.filter(t => developerTipos.includes(t)),
      };
    });
  }, [effectiveDevelopments, getTypeFromDeveloper]);

  const {
    sortConfig,
    filterConfigs,
    uniqueValuesMap,
    availableValuesMap,
    filteredAndSortedData,
    handleSort,
    handleFilter,
    handleClearFilter,
    clearAllFilters,
  } = useColumnFilters(developmentsForFilter, visibleColumns, { developerId: developerOrderMap }, { defaultSortKey: "createdAt" });

  const INITIAL_ROWS = 50;
  const LOAD_MORE = 30;
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scrollContainer = contentScrollRef.current;
    if (!sentinel || !scrollContainer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + LOAD_MORE, filteredAndSortedData.length));
        }
      },
      { root: scrollContainer, rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredAndSortedData.length]);

  // WebSocket real-time sync
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let mounted = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (!mounted) return;
      wsRef.current = new WebSocket(wsUrl);
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "development") {
            queryClient.invalidateQueries({ queryKey: ["/api/developments-entity"] });
          }
        } catch (e) {
          console.error("WebSocket message error:", e);
        }
      };
      wsRef.current.onclose = () => {
        if (!mounted) return;
        reconnectTimer = setTimeout(connect, 3000);
      };
      wsRef.current.onerror = () => {};
    };
    connect();
    return () => {
      mounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, []);

  const visibleData = useMemo(
    () => filteredAndSortedData.slice(0, visibleCount),
    [filteredAndSortedData, visibleCount]
  );

  // Stable row numbering (creation-order)
  const stableRowNumberMap = useMemo(() => {
    const sorted = [...developments].sort((a, b) =>
      new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
    const map = new Map<string, number>();
    sorted.forEach((t, i) => map.set(t.id, i + 1));
    return map;
  }, [developments]);

  // Zoom controls
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showZoomPopup, setShowZoomPopup] = useState(false);
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(50, Math.min(150, newZoom));
    setZoomLevel(clampedZoom);
    setShowZoomPopup(true);
    if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
    zoomTimeoutRef.current = setTimeout(() => setShowZoomPopup(false), 2000);
  };
  const zoomIn = () => handleZoomChange(zoomLevel + 5);
  const zoomOut = () => handleZoomChange(zoomLevel - 5);

  // Auto-scroll to bottom on load and creation
  const scrollToBottomPhaseRef = useRef<'idle' | 'loading_all' | 'done'>('idle');

  useEffect(() => {
    if (isLoading || developments.length === 0 || scrollToBottomPhaseRef.current !== 'idle') return;
    scrollToBottomPhaseRef.current = 'loading_all';
    setVisibleCount(filteredAndSortedData.length);
  }, [isLoading, developments]);

  useEffect(() => {
    if (scrollToBottomPhaseRef.current !== 'loading_all') return;
    if (visibleCount < filteredAndSortedData.length) return;
    scrollToBottomPhaseRef.current = 'done';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (contentScrollRef.current) {
          contentScrollRef.current.scrollTop = contentScrollRef.current.scrollHeight;
        }
      });
    });
  }, [visibleCount, filteredAndSortedData.length]);

  useEffect(() => {
    if (scrollToBottomPhaseRef.current !== 'done') return;
    scrollToBottomPhaseRef.current = 'idle';
  }, [filteredAndSortedData.length]);

  const hasActiveFilters = Object.keys(filterConfigs).length > 0 || sortConfig.direction !== null;

  const visibleColumnGroups = useMemo(() => {
    const runs: { key: string; label: string; color?: string; colspan: number }[] = [];
    let currentGroup: string | null = null;
    const groupLookup = Object.fromEntries(columnGroups.map(g => [g.key, g]));

    visibleColumns.forEach(col => {
      const g = col.group || '';
      if (g !== currentGroup) {
        const groupDef = groupLookup[g] || { key: g, label: '' };
        runs.push({ key: groupDef.key, label: groupDef.label, color: (groupDef as any).color, colspan: 1 });
        currentGroup = g;
      } else {
        runs[runs.length - 1].colspan++;
      }
    });
    return runs;
  }, [visibleColumns]);

  const groupLookupMap = useMemo(() => Object.fromEntries(columnGroups.map(g => [g.key, g])), []);

  const sectionGroupsForSearch = useMemo(() => {
    const result: { label: string; offset: number; width: number }[] = [];
    let offset = 0;
    let currentGroupKey = '';
    for (const col of visibleColumns) {
      const w = parseInt(col.width);
      const gKey = col.group || '';
      if (gKey === 'corner') { offset += w; continue; }
      const groupDef = groupLookupMap[gKey];
      if (!groupDef?.label) { offset += w; continue; }
      if (gKey !== currentGroupKey) {
        result.push({ label: groupDef.label, offset, width: w });
        currentGroupKey = gKey;
      } else if (result.length > 0) {
        result[result.length - 1].width += w;
      }
      offset += w;
    }
    return result;
  }, [visibleColumns, groupLookupMap]);


  const filterLabelMaps = useMemo<Record<string, Record<string, string>>>(() => ({
    active: { "true": "Sí", "false": "No" },
    lockOff: { "true": "Sí", "false": "No" },
    developerId: Object.fromEntries(developers.map(d => [d.id, d.name])),
    id: Object.fromEntries(developmentsForFilter.map((d, i) => [d.id, String(i + 1)])),
  }), [developers, developmentsForFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (shouldCheckAccess && !canAccess) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
        <AlertCircle className="w-12 h-12 mb-4" />
        <p>No tienes acceso a esta sección</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="developments-spreadsheet">
      <div className="flex items-center justify-between px-3 py-1.5 border-b">
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-bold" data-testid="text-page-title">Desarrollos</h1>

          {(collapsedGroups.size > 0 || collapsedColumns.size > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCollapsedGroups(new Set());
                setCollapsedColumns(new Set());
              }}
              title="Descolapsar todo"
              data-testid="button-expand-all"
            >
              <Maximize2 className="w-3 h-3 mr-1" />
              Descolapsar
            </Button>
          )}
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllFilters}
            >
              <X className="w-3 h-3 mr-1" />
              Limpiar filtros
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{filteredAndSortedData.length} desarrollos</span>
          <Button
            onClick={saveAllPending}
            size="sm"
            disabled={pendingRowCount === 0 || isSaving}
            className={cn(
              "transition-all duration-300",
              pendingRowCount > 0 && !isSaving && "save-electric-btn",
              saveFlash ? "text-white shadow-lg scale-105" : "text-white"
            )}
            style={saveFlash ? { backgroundColor: "rgb(255, 181, 73)", borderColor: "rgb(255, 181, 73)" } : undefined}
            data-testid="button-save-pending-developments"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Guardar{pendingRowCount > 1 ? ` (${pendingRowCount})` : ""}
          </Button>
          {hasFullAccess && (
            <Button onClick={handleCreateNew} size="sm" disabled={createMutation.isPending} data-testid="button-add-development">
              <Plus className="w-4 h-4 mr-1" />
              Nuevo
            </Button>
          )}
        </div>
      </div>

      <div ref={contentScrollRef} className="flex-1 overflow-auto spreadsheet-scroll">
        <div className="min-w-max text-xs" style={zoomLevel !== 100 ? { zoom: zoomLevel / 100 } : undefined}>
          <SpreadsheetHeader
            visibleColumns={visibleColumns}
            visibleColumnGroups={visibleColumnGroups}
            groupLookupMap={groupLookupMap}
            filterConfigs={filterConfigs}
            sortConfig={sortConfig}
            uniqueValuesMap={uniqueValuesMap}
            availableValuesMap={availableValuesMap}
            onSort={handleSort}
            onFilter={handleFilter}
            onClear={handleClearFilter}
            sectionGroups={sectionGroupsForSearch}
            scrollRef={contentScrollRef}
            labelMaps={filterLabelMaps}
            collapsedGroups={collapsedGroups}
            onToggleGroupCollapse={toggleGroupCollapse}
            collapsedColumns={collapsedColumns}
            onToggleColumnCollapse={toggleColumn}
          />

          {visibleData.map((dev, rowIndex) => {
            const parentDeveloper = developers.find(d => d.id === dev.developerId);
            const isParentDeveloperInactive = parentDeveloper?.active === false;
            const isRowInactive = dev.active === null;
            const isDeveloperBlocked = !!(parentDeveloper && (parentDeveloper.active !== true || !isDeveloperComplete(parentDeveloper)));
            const isActiveRow = activeEditingRowId === dev.id;
            const inactiveCellStyle: React.CSSProperties = isRowInactive
              ? { backgroundColor: '#9ca3af', pointerEvents: 'none' as const, cursor: 'default', color: 'black' }
              : {};
            const cellTextClass = isRowInactive ? "text-gray-700" : "text-muted-foreground";
            return (
            <div
              key={dev.id}
              className={cn(
                "flex border-b group",
                isRowInactive
                  ? ""
                  : isActiveRow
                    ? "ring-1 ring-blue-400/50 bg-blue-50/30 dark:bg-blue-950/20"
                    : rowIndex % 2 === 0 ? "bg-background" : "bg-muted/10"
              )}
              style={{ height: '32px', maxHeight: '32px', ...(isRowInactive ? { backgroundColor: '#9ca3af' } : {}) }}
              data-testid={`row-development-${dev.id}`}
              onClick={() => handleRowClick(dev.id)}
            >
              {visibleColumns.map((col) => {
                const fieldCanEdit = canEdit(col.key) && (!isDeveloperBlocked || DEV_ALWAYS_UNLOCKED.has(col.key));
                const value = (dev as any)[col.key];
                const isEditing = editingCell?.id === dev.id && editingCell?.field === col.key;

                if (col.key === 'id') {
                  const isCompleteForDot = isDevelopmentComplete(dev, parentDeveloper);
                  const dotColor = dev.active === null
                    ? '#6b7280'
                    : isCompleteForDot
                      ? (dev.active === true ? '#15803d' : '#F16100')
                      : '#ef4444';
                  const missingForDot = !isCompleteForDot ? getMissingFieldsDevelopment(dev, parentDeveloper) : [];
                  const dotTooltip = missingForDot.length > 0
                    ? `Campos vacíos (${missingForDot.length}):\n${missingForDot.map(f => `• ${f}`).join('\n')}`
                    : null;
                  return (
                    <div
                      key={col.key}
                      className="spreadsheet-cell flex-shrink-0 justify-center sticky left-0 z-10 relative border-r border-b"
                      style={{ width: col.width, minWidth: col.width, backgroundColor: SHEET_COLOR_LIGHT, color: 'white', height: 32 }}
                      title={dev.id}
                    >
                      <span className="text-xs font-medium">{stableRowNumberMap.get(dev.id) ?? rowIndex + 1}</span>
                      {dotTooltip ? (
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full cursor-help"
                                  style={{ backgroundColor: dotColor }} />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-[10px] leading-tight whitespace-pre-line max-w-[300px] max-h-[280px] overflow-y-auto z-[400]">
                            {dotTooltip}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                              style={{ backgroundColor: dotColor }} />
                      )}
                    </div>
                  );
                }

                if (col.type === 'date-display') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "readonly" }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }} data-testid={`cell-${col.key}-${dev.id}`}>
                      <span className={cn("text-xs px-1", cellTextClass)}>{formatDate(dev.createdAt)}</span>
                    </div>
                  );
                }

                if (col.type === 'time-display') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "readonly" }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }} data-testid={`cell-${col.key}-${dev.id}`}>
                      <span className={cn("text-xs px-1", cellTextClass)}>{formatTime(dev.createdAt)}</span>
                    </div>
                  );
                }

                if (col.type === 'group-collapsed') {
                  const groupDef = groupLookupMap[col.group || ''];
                  return (
                    <div key={col.key} className="spreadsheet-cell flex-shrink-0 border-r border-b" style={{ width: '30px', minWidth: '30px', backgroundColor: isRowInactive ? '#9ca3af' : (groupDef?.color ? `${groupDef.color}22` : '#f3f4f6') }} />
                  );
                }

                if (collapsedColumns.has(col.key)) {
                  return (
                    <div
                      key={col.key}
                      className="spreadsheet-cell flex-shrink-0"
                      style={{ width: COLLAPSED_COL_WIDTH, minWidth: COLLAPSED_COL_WIDTH, ...(isRowInactive ? { backgroundColor: '#9ca3af' } : {}) }}
                    />
                  );
                }

                if (col.type === 'boolean') {
                  if (col.key === 'active') {
                    const isComplete = isDevelopmentComplete(dev, parentDeveloper);
                    const isDisabled = value === null || value === undefined;
                    const activeState = isDisabled ? "disabled" : (value === true && isComplete) ? "active" : (isComplete ? "ready" : "incomplete");
                    const bgColor = isRowInactive ? '#9ca3af' : activeState === "active" ? "#dcfce7" : activeState === "ready" ? "#FDCDB0" : activeState === "disabled" ? "#9ca3af" : "#fee2e2";
                    const dotColor = activeState === "active" ? "#15803d" : activeState === "ready" ? "#F16100" : activeState === "disabled" ? "#1f2937" : "#dc2626";
                    const textStyle: React.CSSProperties = activeState === "active" ? { color: "#15803d", fontWeight: 600 } : activeState === "ready" ? { color: "#C04D00", fontWeight: 600 } : activeState === "disabled" ? { color: "#1f2937", fontWeight: 500 } : { color: "#dc2626", fontWeight: 500 };
                    const activeLabel = activeState === "active" ? "Sí" : activeState === "disabled" ? "Deshabilitado" : "No";
                    const missingFields = activeState === "incomplete" ? getMissingFieldsDevelopment(dev, parentDeveloper) : [];
                    const tooltipContent = missingFields.length > 0
                      ? `Campos vacíos (${missingFields.length}):\n${missingFields.map(f => `• ${f}`).join('\n')}`
                      : undefined;
                    const activeCellContent = (
                      <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0 px-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, backgroundColor: bgColor }}>
                        {fieldCanEdit ? (
                          <ExclusiveSelect
                            value={activeState === "active" ? "active" : activeState === "disabled" ? "disabled" : "no"}
                            onValueChange={(val) => {
                              if (val === "disabled") {
                                handleFieldChange(dev.id, { active: null });
                                saveRowByIdRef.current(dev.id);
                              } else if (val === "active") {
                                if (isComplete) {
                                  handleFieldChange(dev.id, { active: true });
                                  saveRowByIdRef.current(dev.id);
                                }
                              } else {
                                handleFieldChange(dev.id, { active: false });
                                saveRowByIdRef.current(dev.id);
                              }
                            }}
                          >
                            <SelectTrigger className="h-6 w-full text-xs border-0 bg-transparent px-1 !justify-center gap-1 [&_svg]:h-3 [&_svg]:w-3 focus:ring-0 focus:ring-offset-0" style={textStyle} data-testid={`boolean-${col.key}-${dev.id}`}>
                              <span style={{ color: dotColor }} className="text-[8px] leading-none">●</span>
                              <span className="truncate">{activeLabel}</span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active" disabled={!isComplete} className="text-xs">
                                <span className="flex items-center gap-1.5">
                                  <span style={{ color: "#15803d" }} className="text-[8px] leading-none">●</span>
                                  <span style={{ color: "#15803d", fontWeight: 500 }}>Sí</span>
                                </span>
                              </SelectItem>
                              <SelectItem value="no" className="text-xs">
                                <span className="flex items-center gap-1.5">
                                  <span style={{ color: isComplete ? "#f97316" : "#dc2626" }} className="text-[8px] leading-none">●</span>
                                  <span style={{ color: isComplete ? "#f97316" : "#dc2626", fontWeight: 500 }}>No</span>
                                </span>
                              </SelectItem>
                              <SelectItem value="disabled" className="text-xs">
                                <span className="flex items-center gap-1.5">
                                  <span style={{ color: "#1f2937" }} className="text-[8px] leading-none">●</span>
                                  <span style={{ color: "#1f2937", fontWeight: 500 }}>Deshabilitado</span>
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </ExclusiveSelect>
                        ) : (
                          <div className="flex items-center justify-center gap-1 px-1" style={textStyle}>
                            <span style={{ color: dotColor }} className="text-[8px] leading-none">●</span>
                            <span>{activeLabel}</span>
                          </div>
                        )}
                      </div>
                    );
                    if (tooltipContent) {
                      return (
                        <Tooltip key={col.key}>
                          <TooltipTrigger asChild>{activeCellContent}</TooltipTrigger>
                          <TooltipContent side="right" className="whitespace-pre-line text-xs max-w-[300px]">{tooltipContent}</TooltipContent>
                        </Tooltip>
                      );
                    }
                    return activeCellContent;
                  }
                  const devTipos = (dev.tipos as string[] | null) || [];
                  const isDepa = devTipos.some(t => t.toLowerCase().includes('departamento') || t.toLowerCase().includes('depa'));
                  const isLockOffDisabledByTipo = col.key === 'lockOff' && !isDepa;
                  const cellBgColor = value === true 
                    ? isLockOffDisabledByTipo ? '#e5e7eb' : '#dcfce7'
                    : value === false 
                      ? isLockOffDisabledByTipo ? '#e5e7eb' : '#fee2e2'
                      : undefined;
                  const textColorClass = value === true 
                    ? isLockOffDisabledByTipo ? (isRowInactive ? 'text-gray-600' : 'text-gray-400') : 'text-green-700 font-medium' 
                    : value === false 
                      ? isLockOffDisabledByTipo ? (isRowInactive ? 'text-gray-600' : 'text-gray-400') : 'text-red-600 font-medium' 
                      : cellTextClass;
                  const effectiveCanEdit = fieldCanEdit && !isLockOffDisabledByTipo;
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !effectiveCanEdit }))} style={{ width: col.width, minWidth: col.width, backgroundColor: isRowInactive ? '#9ca3af' : cellBgColor }}>
                      {effectiveCanEdit ? (
                        <ExclusiveSelect
                          value={value === true ? "si" : value === false ? "no" : ""}
                          onValueChange={(val) => handleCheckboxChange(dev.id, col.key, val === "si")}
                        >
                          <SelectTrigger className={`h-6 text-xs border-0 bg-transparent px-1 ${textColorClass}`} data-testid={`boolean-${col.key}-${dev.id}`}>
                            <SelectValue>
                              {value === true ? (
                                <span>Sí</span>
                              ) : value === false ? (
                                <span>No</span>
                              ) : (
                                <span>-</span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="si" className="text-green-700 font-medium">Sí</SelectItem>
                            <SelectItem value="no" className="text-red-600 font-medium">No</SelectItem>
                          </SelectContent>
                        </ExclusiveSelect>
                      ) : (
                        <div className={`flex items-center justify-center ${textColorClass}`}>
                          {value === true ? (
                            <span>Sí</span>
                          ) : value === false ? (
                            <span>No</span>
                          ) : (
                            <span>-</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'empresa-tipo-select') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      {fieldCanEdit ? (
                        <ExclusiveSelect
                          value={value || "__unassigned__"}
                          onValueChange={(v) => {
                            handleSelectChange(dev.id, col.key, v);
                            if (dev.developerId) {
                              const selectedDev = developers.find(d => d.id === dev.developerId);
                              if (selectedDev && selectedDev.tipo !== (v === '__unassigned__' ? null : v)) {
                                handleFieldChange(dev.id, { developerId: null });
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__" style={{ color: '#000' }}>—</SelectItem>
                            {EMPRESA_TIPO_OPTIONS.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </ExclusiveSelect>
                      ) : (
                        <div className="flex items-center gap-1 px-3">
                          <span>{value || ""}</span>

                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'developer-select') {
                  const filteredDevs = developers.filter(d => {
                    if (!d.active) return false;
                    if (dev.empresaTipo) {
                      return d.tipo === dev.empresaTipo;
                    }
                    return d.tipo === 'Desarrollador' || d.tipo === 'Comercializadora';
                  });
                  const developerWarningText = (() => {
                    if (!parentDeveloper) return "";
                    if (parentDeveloper.active === null) return "Desarrollador deshabilitado";
                    if (parentDeveloper.active === false) return "Desarrollador inactivo";
                    const missing: string[] = [];
                    if (!parentDeveloper.tipo) missing.push("Tipo");
                    if (!parentDeveloper.name) missing.push("Nombre");
                    if (!parentDeveloper.razonSocial) missing.push("Razón Social");
                    if (!parentDeveloper.rfc) missing.push("RFC");
                    if (!parentDeveloper.domicilio) missing.push("Domicilio");
                    if (!parentDeveloper.tipos?.length) missing.push("Tipos");
                    if (!parentDeveloper.contratos?.length) missing.push("Contratos");
                    if (!parentDeveloper.representante) missing.push("Representante");
                    if (!parentDeveloper.contactName) missing.push("Ventas");
                    if (!parentDeveloper.contactPhone) missing.push("Teléfono");
                    if (!parentDeveloper.contactEmail) missing.push("Correo");
                    return missing.length > 0 ? `Faltan datos del desarrollador:\n${missing.join('\n')}` : "";
                  })();
                  return (
                    <div
                      key={col.key}
                      className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))}
                      style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}
                      title={developerWarningText || undefined}
                    >
                      {canEdit(col.key) ? (
                        <div className="flex items-center w-full overflow-hidden">
                          {developerWarningText && (
                            <AlertCircle className="w-3 h-3 text-amber-500 shrink-0 ml-1" />
                          )}
                          <ExclusiveSelect
                            value={value || "__unassigned__"}
                            onValueChange={(v) => handleSelectChange(dev.id, col.key, v)}
                          >
                            <SelectTrigger className="h-6 text-xs border-0 bg-transparent flex-1 min-w-0">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__unassigned__" style={{ color: '#000' }}>—</SelectItem>
                              {filteredDevs.map(d => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </ExclusiveSelect>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-3">
                          {developerWarningText && (
                            <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                          )}
                          <span>{getDeveloperName(value)}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'city-select') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      {fieldCanEdit ? (
                        <ExclusiveSelect
                          value={value || "__unassigned__"}
                          onValueChange={(v) => handleSelectChange(dev.id, col.key, v)}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                            <SelectValue placeholder="Ciudad" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__" style={{ color: '#000' }}>—</SelectItem>
                            {cityNames.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </ExclusiveSelect>
                      ) : (
                        <div className="flex items-center gap-1 px-3">
                          <span>{value || ""}</span>

                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'zone-select') {
                  let zones = getZonesForCity(dev.city);
                  if (col.key === 'zone2') zones = zones.filter(z => z !== dev.zone);
                  if (col.key === 'zone3') zones = zones.filter(z => z !== dev.zone && z !== dev.zone2);
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      {fieldCanEdit ? (
                        <ExclusiveSelect
                          value={value || "__unassigned__"}
                          onValueChange={(v) => handleSelectChange(dev.id, col.key, v)}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                            <SelectValue placeholder="Zona" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__" style={{ color: '#000' }}>—</SelectItem>
                            {zones.map(z => (
                              <SelectItem key={z} value={z}>{z}</SelectItem>
                            ))}
                          </SelectContent>
                        </ExclusiveSelect>
                      ) : (
                        <div className="flex items-center gap-1 px-3">
                          <span>{value || ""}</span>

                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'multiselect-tipos') {
                  const developerTipos = getTypeFromDeveloper(dev.developerId) || [];
                  const selectedTipos = (dev.tipos as string[] | null) || [];
                  const selectedTipo = selectedTipos.find(t => developerTipos.includes(t)) || '';

                  if (developerTipos.length === 1 && selectedTipos.length === 0) {
                    setTimeout(() => {
                      handleFieldChange(dev.id, { tipos: developerTipos });
                    }, 0);
                  }

                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit || developerTipos.length === 0 }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      {fieldCanEdit && developerTipos.length > 0 ? (
                        <ExclusiveSelect
                          value={selectedTipo || '__unassigned__'}
                          onValueChange={(v) => {
                            const newTipos = v === '__unassigned__' ? [] : [v];
                            handleFieldChange(dev.id, { tipos: newTipos });
                          }}
                        >
                          <SelectTrigger className={`h-6 text-xs border-0 bg-transparent ${!selectedTipo ? 'text-red-500 font-medium' : ''}`} data-testid={`select-tipos-${dev.id}`}>
                            <SelectValue>
                              <span>{selectedTipo || 'SIN ASIGNAR'}</span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__">—</SelectItem>
                            {developerTipos.map((tipo: string) => (
                              <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                            ))}
                          </SelectContent>
                        </ExclusiveSelect>
                      ) : (
                        <div className="flex items-center gap-1 px-1">
                          <span className={!selectedTipo && developerTipos.length > 0 ? 'text-red-500 font-medium text-xs' : cn('text-xs', cellTextClass)}>
                            {!selectedTipo && developerTipos.length > 0 ? 'SIN ASIGNAR' : (selectedTipo || 'Sin tipos')}
                          </span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'nivel-select') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      <NivelRangeCell
                        dev={dev}
                        onSave={(data) => handleFieldChange(dev.id, data)}
                        fieldCanEdit={fieldCanEdit}
                      />
                    </div>
                  );
                }

                if (col.type === 'torres-select') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      {fieldCanEdit ? (
                        <ExclusiveSelect
                          value={value?.toString() || "__unassigned__"}
                          onValueChange={(v) => handleSelectChange(dev.id, col.key, v === "__unassigned__" ? "" : v)}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                            <SelectValue placeholder="#" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__">-</SelectItem>
                            {TORRES_OPTIONS.map(n => (
                              <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </ExclusiveSelect>
                      ) : (
                        <div className="flex items-center gap-1 px-3">
                          <span>{value || ""}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'niveles-select') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      {fieldCanEdit ? (
                        <ExclusiveSelect
                          value={value?.toString() || "__unassigned__"}
                          onValueChange={(v) => handleSelectChange(dev.id, col.key, v === "__unassigned__" ? "" : v)}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                            <SelectValue placeholder="#" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="__unassigned__">-</SelectItem>
                            {NIVELES_OPTIONS.map(n => (
                              <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </ExclusiveSelect>
                      ) : (
                        <div className="flex items-center gap-1 px-3">
                          <span>{value || ""}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'multiselect-amenities') {
                  const arrValue: string[] = Array.isArray(value) ? value : [];
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      {fieldCanEdit ? (
                        <Popover modal>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full justify-between text-xs font-normal">
                              <span className="truncate">{arrValue.length > 0 ? `${arrValue.length} seleccionados` : "Seleccionar"}</span>
                              <ChevronDown className="w-3 h-3 ml-1 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-2 max-h-60 overflow-y-auto">
                            {amenities.map(item => (
                              <div key={item.id} className="flex items-center gap-2 py-1">
                                <Checkbox
                                  checked={arrValue.includes(item.name)}
                                  onCheckedChange={() => handleMultiSelectChange(dev.id, col.key, arrValue, item.name)}
                                />
                                <span className="text-xs">{item.name}</span>
                              </div>
                            ))}
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div className="flex items-center gap-1 px-2">
                          <span className={cn("text-xs truncate", cellTextClass)}>{arrValue.length > 0 ? `${arrValue.length} seleccionados` : ""}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'multiselect-creatable') {
                  const arrValue: string[] = Array.isArray(value) ? value : [];
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      {fieldCanEdit ? (
                        <Popover modal>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full justify-between text-xs font-normal">
                              <span className="truncate">{arrValue.length > 0 ? arrValue.join(', ') : ""}</span>
                              <ChevronDown className="w-3 h-3 ml-1 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-2">
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-1">
                                <Input
                                  placeholder="Agregar..."
                                  className="h-7 text-xs"
                                  data-testid={`creatable-input-${col.key}-${dev.id}`}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const val = (e.target as HTMLInputElement).value.trim();
                                      if (val && !arrValue.includes(val)) {
                                        const newArr = [...arrValue, val];
                                        handleFieldChange(dev.id, { [col.key]: newArr });
                                      }
                                      (e.target as HTMLInputElement).value = '';
                                    }
                                  }}
                                />
                              </div>
                              {arrValue.length > 0 && (
                                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                                  {arrValue.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between gap-1 px-1 py-0.5 rounded bg-muted/50">
                                      <span className="text-xs truncate">{item}</span>
                                      <button
                                        onClick={() => {
                                          const newArr = arrValue.filter((_, i) => i !== idx);
                                          handleFieldChange(dev.id, { [col.key]: newArr });
                                        }}
                                        className="flex-shrink-0 cursor-pointer"
                                        data-testid={`creatable-remove-${col.key}-${dev.id}-${idx}`}
                                      >
                                        <X className="w-3 h-3 text-muted-foreground" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div className="flex items-center gap-1 px-2">
                          <span className={cn("text-xs truncate", cellTextClass)}>{arrValue.length > 0 ? arrValue.join(', ') : ""}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'multiselect-efficiency') {
                  const arrValue: string[] = Array.isArray(value) ? value : [];
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      {fieldCanEdit ? (
                        <Popover modal>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full justify-between text-xs font-normal">
                              <span className="truncate">{arrValue.length > 0 ? `${arrValue.length} seleccionados` : "Seleccionar"}</span>
                              <ChevronDown className="w-3 h-3 ml-1 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-2 max-h-60 overflow-y-auto">
                            {efficiencyFeatures.map(item => (
                              <div key={item.id} className="flex items-center gap-2 py-1">
                                <Checkbox
                                  checked={arrValue.includes(item.name)}
                                  onCheckedChange={() => handleMultiSelectChange(dev.id, col.key, arrValue, item.name)}
                                />
                                <span className="text-xs">{item.name}</span>
                              </div>
                            ))}
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div className="flex items-center gap-1 px-2">
                          <span className={cn("text-xs truncate", cellTextClass)}>{arrValue.length > 0 ? `${arrValue.length} seleccionados` : ""}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'multiselect-other') {
                  const arrValue: string[] = Array.isArray(value) ? value : [];
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      {fieldCanEdit ? (
                        <Popover modal>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full justify-between text-xs font-normal">
                              <span className="truncate">{arrValue.length > 0 ? `${arrValue.length} seleccionados` : "Seleccionar"}</span>
                              <ChevronDown className="w-3 h-3 ml-1 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-2 max-h-60 overflow-y-auto">
                            {otherFeatures.map(item => (
                              <div key={item.id} className="flex items-center gap-2 py-1">
                                <Checkbox
                                  checked={arrValue.includes(item.name)}
                                  onCheckedChange={() => handleMultiSelectChange(dev.id, col.key, arrValue, item.name)}
                                />
                                <span className="text-xs">{item.name}</span>
                              </div>
                            ))}
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div className="flex items-center gap-1 px-2">
                          <span className={cn("text-xs truncate", cellTextClass)}>{arrValue.length > 0 ? `${arrValue.length} seleccionados` : ""}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'recamaras-select') {
                  const devTiposR = (dev.tipos as string[] | null) || [];
                  const isDepaR = devTiposR.some(t => t.toLowerCase().includes('departamento') || t.toLowerCase().includes('depa'));
                  const recamarasDisabled = !isDepaR;
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit || recamarasDisabled }))} style={{ width: col.width, minWidth: col.width, ...(isRowInactive ? inactiveCellStyle : recamarasDisabled ? { backgroundColor: '#f3f4f6' } : {}) }}>
                      {fieldCanEdit && !recamarasDisabled ? (
                        <ExclusiveSelect
                          value={value || "__unassigned__"}
                          onValueChange={(v) => handleSelectChange(dev.id, col.key, v)}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent" data-testid={`select-recamaras-${dev.id}`}>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__">Seleccionar</SelectItem>
                            {RECAMARAS_OPTIONS.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </ExclusiveSelect>
                      ) : (
                        <div className="flex items-center gap-1 px-2">
                          <span className={cn("text-xs truncate", cellTextClass)}>{value || ""}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'banos-select') {
                  const banosOptions = catalogBanos.map((b: any) => b.name).filter(Boolean);
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      {fieldCanEdit ? (
                        <ExclusiveSelect
                          value={value || "__unassigned__"}
                          onValueChange={(v) => handleSelectChange(dev.id, col.key, v)}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent" data-testid={`select-banos-${dev.id}`}>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__">Seleccionar</SelectItem>
                            {banosOptions.map((opt: string) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </ExclusiveSelect>
                      ) : (
                        <div className="flex items-center gap-1 px-2">
                          <span className={cn("text-xs truncate", cellTextClass)}>{value || ""}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }


                if (col.type === 'redaccion-text') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "input", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      {fieldCanEdit ? (
                        editingCell?.id === dev.id && editingCell?.field === col.key ? (
                          <Input
                            autoFocus
                            defaultValue={value || ""}
                            onBlur={(e) => { handleFieldChange(dev.id, { [col.key]: e.target.value || null }); setEditingCell(null); }}
                            onKeyDown={(e) => { if (e.key === "Enter") { handleFieldChange(dev.id, { [col.key]: (e.target as HTMLInputElement).value || null }); setEditingCell(null); } if (e.key === "Escape") setEditingCell(null); }}
                            className="h-6 text-xs border-0 bg-transparent focus:ring-0 shadow-none p-1"
                            data-testid={`input-redaccion-${dev.id}`}
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center px-2 cursor-pointer"
                            onClick={() => { setEditingCell({ id: dev.id, field: col.key }); setEditValue(value || ""); }}
                            title={value || ""}
                          >
                            <span className="text-xs truncate">{value || ""}</span>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center gap-1 px-2">
                          <span className={cn("text-xs truncate", cellTextClass)}>{value || ""}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'calculated-percent') {
                  const calcFrom = col.calcFrom;
                  let percentValue = '—';
                  if (calcFrom) {
                    const unidades = Number((dev as any)[calcFrom.unidades]) || 0;
                    const vendidas = Number((dev as any)[calcFrom.vendidas]) || 0;
                    if (unidades > 0) {
                      percentValue = `${((vendidas / unidades) * 100).toFixed(1)}%`;
                    }
                  }
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "readonly" }), "text-center justify-center")} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      <span className={cellTextClass}>{percentValue}</span>
                    </div>
                  );
                }

                if (col.type === 'multiselect-acabados') {
                  const arrValue: string[] = Array.isArray(value) ? value : [];
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      {fieldCanEdit ? (
                        <Popover modal>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full justify-between text-xs font-normal">
                              <span className="truncate">{arrValue.length > 0 ? `${arrValue.length} seleccionados` : "Seleccionar"}</span>
                              <ChevronDown className="w-3 h-3 ml-1 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-2 max-h-60 overflow-y-auto">
                            {acabados.map(item => (
                              <div key={item.id} className="flex items-center gap-2 py-1">
                                <Checkbox
                                  checked={arrValue.includes(item.name)}
                                  onCheckedChange={() => handleMultiSelectChange(dev.id, col.key, arrValue, item.name)}
                                />
                                <span className="text-xs">{item.name}</span>
                              </div>
                            ))}
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div className="flex items-center gap-1 px-2">
                          <span className={cn("text-xs truncate", cellTextClass)}>{arrValue.length > 0 ? `${arrValue.length} seleccionados` : ""}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'tipo-contrato-select') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }} data-testid={`cell-${col.key}-${dev.id}`}>
                      {fieldCanEdit ? (
                        <ExclusiveSelect
                          value={value || "__unassigned__"}
                          onValueChange={(v) => handleSelectChange(dev.id, col.key, v)}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                            <SelectValue placeholder="Contrato" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__" style={{ color: '#000' }}>—</SelectItem>
                            {tiposContrato.filter(t => t.active !== false).map(t => (
                              <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </ExclusiveSelect>
                      ) : (
                        <div className="flex items-center gap-1 px-3">
                          <span>{value || ""}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'cesion-derechos-select') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }} data-testid={`cell-${col.key}-${dev.id}`}>
                      {fieldCanEdit ? (
                        <ExclusiveSelect
                          value={value || "__unassigned__"}
                          onValueChange={(v) => handleSelectChange(dev.id, col.key, v)}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                            <SelectValue placeholder="Cesión" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__" style={{ color: '#000' }}>—</SelectItem>
                            {cesionDerechosList.filter(c => c.active !== false).map(c => (
                              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </ExclusiveSelect>
                      ) : (
                        <div className="flex items-center gap-1 px-3">
                          <span>{value || ""}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'presentacion-select') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }} data-testid={`cell-${col.key}-${dev.id}`}>
                      {fieldCanEdit ? (
                        <ExclusiveSelect
                          value={value || "__unassigned__"}
                          onValueChange={(v) => handleSelectChange(dev.id, col.key, v)}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                            <SelectValue placeholder="Presentación" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__" style={{ color: '#000' }}>—</SelectItem>
                            {presentaciones.filter(p => p.active !== false).map(p => (
                              <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </ExclusiveSelect>
                      ) : (
                        <div className="flex items-center gap-1 px-3">
                          <span>{value || ""}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'index') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0 justify-center", getCellStyle({ type: "index" }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      <span className={cn("text-xs", cellTextClass)}>{rowIndex + 1}</span>
                    </div>
                  );
                }

                if (col.type === 'folder-link') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0 justify-center", !isRowInactive && "bg-yellow-100 dark:bg-yellow-900/30", getCellStyle({ type: "actions" }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      <Link
                        href={`/admin/documentos?developmentId=${dev.id}&sectionType=${col.folderSection}`}
                        className="text-yellow-700 dark:text-yellow-400 hover:text-yellow-800 flex items-center justify-center gap-1"
                        data-testid={`link-${col.folderSection}-${dev.id}`}
                      >
                        <FolderOpen className="w-4 h-4" />
                      </Link>
                    </div>
                  );
                }

                if (col.type === 'actions') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "actions" }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(dev.id)}
                        data-testid={`button-delete-${dev.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                }

                if (col.hasInmediato) {
                  const dateValue = (value && value !== null && value !== undefined) ? String(value) : '';
                  let formattedDate = '';
                  if (dateValue && dateValue !== 'null' && dateValue !== 'undefined') {
                    const parts = dateValue.split('-');
                    if (parts.length === 3) {
                      const [year, month, day] = parts.map(Number);
                      const parsed = new Date(year, month - 1, day);
                      if (!isNaN(parsed.getTime())) {
                        formattedDate = parsed.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
                      }
                    }
                  }
                  
                  return (
                    <div 
                      key={col.key} 
                      className={cn(
                        "spreadsheet-cell flex-shrink-0",
                        getCellStyle({ 
                          type: "input", 
                          disabled: !fieldCanEdit
                        })
                      )}
                      style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}
                      data-testid={`cell-${col.key}-${dev.id}`}
                    >
                      {fieldCanEdit ? (
                        <Popover modal
                          open={openDatePopover === `${dev.id}-${col.key}`}
                          onOpenChange={(open) => setOpenDatePopover(open ? `${dev.id}-${col.key}` : null)}
                        >
                          <PopoverTrigger asChild>
                            <div 
                              className="flex items-center gap-1 cursor-pointer min-h-[20px] w-full"
                              data-testid={`trigger-${col.key}-${dev.id}`}
                            >
                              <span className="truncate text-xs">{formattedDate || '-'}</span>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-2" align="start">
                            <div className="flex flex-col gap-2">
                              <Input
                                type="date"
                                defaultValue={dateValue}
                                onBlur={(e) => {
                                  const newValue = e.target.value;
                                  if (newValue !== dateValue) {
                                    handleFieldChange(dev.id, { [col.key]: newValue || null });
                                  }
                                  setOpenDatePopover(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') setOpenDatePopover(null);
                                  if (e.key === 'Enter') {
                                    const newValue = (e.target as HTMLInputElement).value;
                                    if (newValue !== dateValue) {
                                      handleFieldChange(dev.id, { [col.key]: newValue || null });
                                    }
                                    setOpenDatePopover(null);
                                  }
                                }}
                                className="text-xs"
                                data-testid={`input-${col.key}-${dev.id}`}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const now = new Date();
                                  const year = now.getFullYear();
                                  const month = String(now.getMonth() + 1).padStart(2, '0');
                                  const day = String(now.getDate()).padStart(2, '0');
                                  const today = `${year}-${month}-${day}`;
                                  handleFieldChange(dev.id, { [col.key]: today });
                                  setOpenDatePopover(null);
                                }}
                                className="text-xs"
                                data-testid={`button-inmediato-${col.key}-${dev.id}`}
                              >
                                Inmediato
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div className="flex items-center gap-1 min-h-[20px]">
                          <span className="truncate text-xs">{formattedDate || '-'}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                const rawDisplayValue = Array.isArray(value) ? value.join(', ') : String(value ?? '');
                const displayValue = rawDisplayValue && col.suffix ? `${rawDisplayValue} ${col.suffix}` : rawDisplayValue;
                const isLongText = ['name', 'ventasNombre', 'ventasCorreo', 'ventasTelefono', 'pagosNombre', 'pagosCorreo', 'pagosTelefono', 'location'].includes(col.key);

                if (isLongText && col.type !== 'number') {
                  return (
                    <div
                      key={col.key}
                      className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "input", disabled: !fieldCanEdit }))}
                      style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}
                      data-testid={`cell-${col.key}-${dev.id}`}
                    >
                      <div
                        className="flex items-center gap-1 cursor-pointer"
                        onClick={() => {
                          if (fieldCanEdit) {
                            setTextDetail({
                              title: col.label,
                              value: String(value || ''),
                              editable: true,
                              onSave: (newVal) => handleFieldChange(dev.id, { [col.key]: newVal || null }),
                              inputFilterType: getColumnFilterType(col.key),
                            });
                          } else {
                            setTextDetail({ title: col.label, value: String(displayValue || ''), editable: false });
                          }
                        }}
                      >
                        <span className="truncate">{displayValue || ''}</span>
                        
                      </div>
                    </div>
                  );
                }

                return (
                  <div 
                    key={col.key} 
                    className={cn(
                      "spreadsheet-cell flex-shrink-0",
                      getCellStyle({ 
                        type: "input", 
                        disabled: !fieldCanEdit,
                        isEditing 
                      })
                    )}
                    style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}
                    onClick={() => fieldCanEdit && !isEditing && handleCellClick(dev.id, col.key, value)}
                    data-testid={`cell-${col.key}-${dev.id}`}
                  >
                    {isEditing && fieldCanEdit ? (
                      (() => {
                        const filterType = getColumnFilterType(col.key);
                        return (
                          <Input
                            defaultValue={editValue}
                            onBlur={(e) => handleCellBlur(dev.id, col.key, col, e.target.value)}
                            onKeyDown={(e) => {
                              if (filterType) createInputFilter(filterType)(e);
                              if (e.key === 'Enter') handleCellBlur(dev.id, col.key, col, (e.target as HTMLInputElement).value);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            onPaste={filterType ? createPasteFilter(filterType) : undefined}
                            onFocus={(e) => e.target.select()}
                            className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                            autoFocus
                            type={col.type === 'number' ? 'number' : 'text'}
                            data-testid={`input-${col.key}-${dev.id}`}
                          />
                        );
                      })()
                    ) : (
                      <div
                        className="flex items-center gap-1 cursor-pointer"
                        onClick={() => !fieldCanEdit && displayValue && setTextDetail({ title: col.label, value: String(displayValue), editable: false })}
                      >
                        <span className="truncate">{displayValue || ''}</span>
                        
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
          })}
          <div ref={sentinelRef} style={{ height: '1px' }} />
          {developments.length === 0 && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              No hay desarrollos. Haz clic en "Nuevo" para crear uno.
            </div>
          )}
        </div>
      </div>

      <TextDetailModal
        open={!!textDetail}
        onOpenChange={(open) => !open && setTextDetail(null)}
        title={textDetail?.title || ""}
        value={textDetail?.value || ""}
        editable={textDetail?.editable}
        onSave={textDetail?.onSave}
        inputFilterType={textDetail?.inputFilterType}
      />
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar desarrollo?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {showZoomPopup && (
        <div className="fixed bottom-12 right-4 z-50 bg-background border rounded-md shadow-md px-3 py-1 text-xs font-medium">
          {zoomLevel}%
        </div>
      )}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-center bg-background border rounded-md shadow-md p-0">
        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-b-none" onClick={zoomIn} disabled={zoomLevel >= 150}>
          <Plus className="h-3 w-3" />
        </Button>
        <div className="h-px w-3 bg-border" />
        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-t-none" onClick={zoomOut} disabled={zoomLevel <= 50}>
          <Minus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
