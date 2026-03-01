import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { TextDetailModal } from "@/components/ui/text-detail-modal";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFieldPermissions } from "@/hooks/use-field-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Minus, Trash2, Building, Loader2, Lock, AlertCircle, FolderOpen, X, Check, ChevronDown, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";
import type { Development, Developer, CatalogCity, CatalogZone, CatalogAmenity, CatalogEfficiencyFeature, CatalogOtherFeature, CatalogAcabado, CatalogTipoContrato, CatalogCesionDerechos, CatalogPresentacion, CatalogNivelMantenimiento } from "@shared/schema";
import { DEVELOPMENT_TYPES } from "@shared/constants";
import { getCellStyle, formatDate, formatTime, type CellType, SHEET_COLOR_DARK, SHEET_COLOR_LIGHT, SHEET_FECHAHORA_COLOR } from "@/lib/spreadsheet-utils";
import { SpreadsheetHeader } from "@/components/ui/spreadsheet-shared";
import { cn } from "@/lib/utils";

const TORRES_OPTIONS = Array.from({ length: 9 }, (_, i) => i + 1);
const NIVELES_OPTIONS = Array.from({ length: 110 }, (_, i) => i + 1);
const EMPRESA_TIPO_OPTIONS = ['Desarrollador', 'Comercializadora'] as const;
const RECAMARAS_OPTIONS = ['Loft', '1 + flex', '2 + flex', '3 + flex'] as const;


interface ColumnDef {
  key: string;
  label: string;
  group: string;
  type?: 'text' | 'number' | 'boolean' | 'select' | 'city-select' | 'zone-select' | 'type-select' | 'developer-select' | 'empresa-tipo-select' | 'nivel-select' | 'torres-select' | 'niveles-select' | 'multiselect-amenities' | 'multiselect-efficiency' | 'multiselect-other' | 'multiselect-acabados' | 'multiselect-tipos' | 'multiselect-vistas' | 'multiselect-creatable' | 'multiselect-tipologias' | 'single-tipologia' | 'recamaras-select' | 'banos-select' | 'tipo-contrato-select' | 'cesion-derechos-select' | 'presentacion-select' | 'calculated-percent' | 'folder-link' | 'actions' | 'index' | 'date-display' | 'time-display' | 'fechahora-collapsed' | 'tipologias-count' | 'redaccion-text';
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
  { key: 'fechahora', label: 'FECHA/HORA', color: SHEET_FECHAHORA_COLOR },
  { key: 'fechahora_collapsed', label: '' },
  { key: 'empresa', label: 'EMPRESA', color: SHEET_COLOR_LIGHT },
  { key: 'ubicacion', label: 'UBICACIÓN', color: SHEET_COLOR_DARK },
  { key: 'estructura', label: 'ESTRUCTURA', color: SHEET_COLOR_LIGHT },
  { key: 'tamano', label: 'TAMAÑO', color: SHEET_COLOR_DARK },
  { key: 'noheader_lockoff', label: '', color: SHEET_COLOR_DARK },
  { key: 'distribucion', label: 'DISTRIBUCIÓN', color: SHEET_COLOR_LIGHT },
  { key: 'depas', label: 'DEPAS', color: SHEET_COLOR_DARK },
  { key: 'avance', label: 'AVANCE', color: SHEET_COLOR_LIGHT },
  { key: 'noheader_preventa', label: '', color: SHEET_COLOR_LIGHT },
  { key: 'noheader_redaccion', label: '', color: SHEET_COLOR_LIGHT },
  { key: 'depas_pct', label: 'DEPAS %', color: SHEET_COLOR_DARK },
  { key: 'avance_pct', label: 'AVANCE %', color: SHEET_COLOR_LIGHT },
  { key: 'obra', label: 'OBRA', color: SHEET_COLOR_DARK },
  { key: 'noheader_contrato', label: '', color: SHEET_COLOR_DARK },
  { key: 'ventas', label: 'VENTAS', color: SHEET_COLOR_LIGHT },
  { key: 'pagos', label: 'PAGOS', color: SHEET_COLOR_DARK },
  { key: 'noheader4', label: '', color: SHEET_COLOR_DARK },
  { key: 'noheader_amenidades', label: '', color: SHEET_COLOR_DARK },
  { key: 'actions', label: '' },
];

const columns: ColumnDef[] = [
  { key: 'id', label: 'ID', group: 'corner', type: 'index', width: '60px', cellType: 'index' },
  { key: 'createdDate', label: 'Fecha', group: 'fechahora', type: 'date-display', width: '85px', cellType: 'readonly' },
  { key: 'createdTime', label: 'Hora', group: 'fechahora', type: 'time-display', width: '65px', cellType: 'readonly' },
  { key: 'active', label: 'Act.', group: 'empresa', type: 'boolean', width: '58px', cellType: 'checkbox' },
  { key: 'empresaTipo', label: 'Tipo', group: 'empresa', type: 'empresa-tipo-select', width: '110px', cellType: 'dropdown' },
  { key: 'developerId', label: 'Desarrollador', group: 'empresa', type: 'developer-select', width: '120px', cellType: 'dropdown' },
  { key: 'name', label: 'Desarrollo', group: 'empresa', width: '130px', cellType: 'input' },
  { key: 'city', label: 'Ciudad', group: 'ubicacion', type: 'city-select', width: '95px', cellType: 'dropdown' },
  { key: 'zone', label: 'Zona 1', group: 'ubicacion', type: 'zone-select', width: '95px', cellType: 'dropdown' },
  { key: 'zone2', label: 'Zona 2', group: 'ubicacion', type: 'zone-select', width: '95px', cellType: 'dropdown' },
  { key: 'zone3', label: 'Zona 3', group: 'ubicacion', type: 'zone-select', width: '95px', cellType: 'dropdown' },
  { key: 'tipos', label: 'Tipos', group: 'estructura', type: 'multiselect-tipos', width: '110px', cellType: 'dropdown' },
  { key: 'tipologiasList', label: 'Tipología', group: 'estructura', type: 'single-tipologia', width: '110px', cellType: 'dropdown' },
  { key: 'nivel', label: 'Nivel', group: 'estructura', type: 'nivel-select', width: '75px', cellType: 'dropdown' },
  { key: 'torres', label: 'Torres', group: 'estructura', type: 'torres-select', width: '60px', cellType: 'dropdown' },
  { key: 'niveles', label: 'Niveles', group: 'estructura', type: 'niveles-select', width: '65px', cellType: 'dropdown' },
  { key: 'vistas', label: 'Vistas', group: 'estructura', type: 'multiselect-creatable', width: '95px', cellType: 'dropdown' },
  { key: 'tamanoDesde', label: 'Desde', group: 'tamano', type: 'number', width: '75px', cellType: 'input', suffix: 'm²' },
  { key: 'tamanoHasta', label: 'Hasta', group: 'tamano', type: 'number', width: '75px', cellType: 'input', suffix: 'm²' },
  { key: 'lockOff', label: 'Lock Off', group: 'noheader_lockoff', type: 'boolean', width: '58px', cellType: 'checkbox' },
  { key: 'recamaras', label: 'Recámaras', group: 'distribucion', type: 'recamaras-select', width: '110px', cellType: 'dropdown' },
  { key: 'banos', label: 'Baños', group: 'distribucion', type: 'banos-select', width: '80px', cellType: 'dropdown' },
  { key: 'depasUnidades', label: 'Uds', group: 'depas', type: 'number', width: '55px', cellType: 'input' },
  { key: 'depasM2', label: 'm²', group: 'depas', type: 'number', width: '60px', cellType: 'input', suffix: 'm²' },
  { key: 'localesUnidades', label: 'Uds', group: 'avance', type: 'number', width: '55px', cellType: 'input' },
  { key: 'localesM2', label: 'm²', group: 'avance', type: 'number', width: '60px', cellType: 'input', suffix: 'm²' },
  { key: 'oficinasUnidades', label: 'Uds', group: 'avance', type: 'number', width: '55px', cellType: 'input' },
  { key: 'oficinasM2', label: 'm²', group: 'avance', type: 'number', width: '60px', cellType: 'input', suffix: 'm²' },
  { key: 'saludUnidades', label: 'Uds', group: 'avance', type: 'number', width: '55px', cellType: 'input' },
  { key: 'saludM2', label: 'm²', group: 'avance', type: 'number', width: '60px', cellType: 'input', suffix: 'm²' },
  { key: 'inicioPreventa', label: 'Inicio Prev.', group: 'noheader_preventa', width: '90px', cellType: 'input' },
  { key: 'tiempoTransc', label: 'Tiempo Transc.', group: 'noheader_preventa', width: '85px', cellType: 'input' },
  { key: 'redaccionValor', label: 'Redacción Valor', group: 'noheader_redaccion', type: 'redaccion-text', width: '120px', cellType: 'input' },
  { key: 'depasVendidas', label: 'Vendidas', group: 'depas_pct', type: 'number', width: '65px', cellType: 'input' },
  { key: 'depasPorcentajeCalc', label: '%', group: 'depas_pct', type: 'calculated-percent', width: '55px', cellType: 'readonly', calcFrom: { unidades: 'depasUnidades', vendidas: 'depasVendidas' } },
  { key: 'localesVendidas', label: 'Vendidas', group: 'avance_pct', type: 'number', width: '65px', cellType: 'input' },
  { key: 'localesPorcentajeCalc', label: '%', group: 'avance_pct', type: 'calculated-percent', width: '55px', cellType: 'readonly', calcFrom: { unidades: 'localesUnidades', vendidas: 'localesVendidas' } },
  { key: 'oficinasVendidas', label: 'Vendidas', group: 'avance_pct', type: 'number', width: '65px', cellType: 'input' },
  { key: 'oficinasPorcentajeCalc', label: '%', group: 'avance_pct', type: 'calculated-percent', width: '55px', cellType: 'readonly', calcFrom: { unidades: 'oficinasUnidades', vendidas: 'oficinasVendidas' } },
  { key: 'saludVendidas', label: 'Vendidas', group: 'avance_pct', type: 'number', width: '65px', cellType: 'input' },
  { key: 'saludPorcentajeCalc', label: '%', group: 'avance_pct', type: 'calculated-percent', width: '55px', cellType: 'readonly', calcFrom: { unidades: 'saludUnidades', vendidas: 'saludVendidas' } },
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
  { key: 'location', label: 'Ubicación', group: 'noheader4', width: '80px', cellType: 'input' },
  { key: 'presentacion', label: 'Presentación', group: 'noheader4', type: 'presentacion-select', width: '100px', cellType: 'dropdown' },
  { key: 'legalesFolder', label: 'Legales', group: 'noheader4', type: 'folder-link', folderSection: 'legales', width: '70px' },
  { key: 'ventaFolder', label: 'Venta', group: 'noheader4', type: 'folder-link', folderSection: 'venta', width: '70px' },
  { key: 'amenities', label: 'Amenidades', group: 'noheader_amenidades', type: 'multiselect-amenities', width: '95px', cellType: 'dropdown' },
  { key: 'efficiency', label: 'Eficiencia', group: 'noheader_amenidades', type: 'multiselect-efficiency', width: '90px', cellType: 'dropdown' },
  { key: 'otherFeatures', label: 'Otros', group: 'noheader_amenidades', type: 'multiselect-other', width: '85px', cellType: 'dropdown' },
  { key: 'acabados', label: 'Acabados', group: 'noheader_amenidades', type: 'multiselect-acabados', width: '95px', cellType: 'dropdown' },
  { key: 'actions', label: '', group: 'actions', type: 'actions', width: '50px' },
];

function SingleTipologiaCell({
  dev,
  onSave,
  fieldCanEdit,
  developerTipos,
}: {
  dev: Development;
  onSave: (data: Partial<Development>) => void;
  fieldCanEdit: boolean;
  developerTipos: string[];
}) {
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);
  const [openTipoFor, setOpenTipoFor] = useState<string | null>(null);

  const arrValue: string[] = Array.isArray(dev.tipologiasList) ? (dev.tipologiasList as string[]) : [];
  const tipologiasConfig: Record<string, string[]> = (dev.tipologiasConfig as Record<string, string[]>) || {};
  const displayLabel = arrValue.length === 0 ? "" : arrValue.length <= 2 ? arrValue.join(", ") : `${arrValue[0]}, +${arrValue.length - 1}`;

  const handleToggle = (val: string) => {
    const next = arrValue.includes(val)
      ? arrValue.filter(v => v !== val)
      : [...arrValue, val];
    const newConfig = { ...tipologiasConfig };
    if (!next.includes(val)) delete newConfig[val];
    onSave({ tipologiasList: next, tipologiasConfig: newConfig });
  };

  const handleSetTipo = (tipologia: string, tipo: string) => {
    const current = tipologiasConfig[tipologia] || [];
    const next = current.includes(tipo)
      ? current.filter(t => t !== tipo)
      : [...current, tipo];
    const newConfig = { ...tipologiasConfig, [tipologia]: next };
    onSave({ tipologiasConfig: newConfig });
  };

  const handleAddNew = () => {
    const val = newName.trim();
    if (!val || arrValue.includes(val)) return;
    onSave({ tipologiasList: [...arrValue, val] });
    setNewName("");
  };

  if (!fieldCanEdit) {
    return (
      <div className="flex items-center gap-1 px-2">
        <span className="text-xs text-muted-foreground truncate">{displayLabel}</span>
        <Lock className="w-3 h-3 opacity-50 shrink-0" />
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between text-xs font-normal" title={arrValue.join(", ")}>
          <span className="truncate">{displayLabel || <span className="text-muted-foreground">—</span>}</span>
          <ChevronDown className="w-3 h-3 ml-1 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-2", developerTipos.length > 0 ? "w-72" : "w-56")} align="start">
        <div className="flex flex-col gap-1.5">
          {arrValue.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {arrValue.map(item => {
                const assignedTipos = tipologiasConfig[item] || [];
                return (
                  <div key={item} className="flex items-center gap-1 bg-muted/40 rounded px-1.5 py-1">
                    <button
                      className="flex-1 text-left text-xs truncate hover:text-foreground"
                      onClick={() => handleToggle(item)}
                      data-testid={`tipologia-option-${dev.id}-${item}`}
                      title="Clic para quitar"
                    >
                      <span className="truncate">{item}</span>
                    </button>
                    {developerTipos.length > 0 && (
                      <Popover open={openTipoFor === item} onOpenChange={v => setOpenTipoFor(v ? item : null)} modal>
                        <PopoverTrigger asChild>
                          <button
                            className={cn(
                              "shrink-0 flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                              assignedTipos.length > 0
                                ? "bg-primary/10 text-primary border-primary/30"
                                : "bg-background text-muted-foreground border-border hover:border-primary/40"
                            )}
                            onClick={e => e.stopPropagation()}
                            data-testid={`tipo-trigger-${dev.id}-${item}`}
                          >
                            <span className="max-w-[80px] truncate">
                              {assignedTipos.length === 0 ? "Tipo" : assignedTipos.join(", ")}
                            </span>
                            <ChevronDown className="w-2.5 h-2.5 opacity-60 shrink-0" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-1.5 z-[300]" side="right" align="start">
                          <p className="text-[10px] text-muted-foreground px-1 mb-1">Tipo para "{item}"</p>
                          <div className="flex flex-col gap-0.5">
                            {developerTipos.map(tipo => (
                              <button
                                key={tipo}
                                className={cn(
                                  "w-full text-left text-xs px-2 py-1 rounded flex items-center justify-between gap-1",
                                  assignedTipos.includes(tipo) ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                                )}
                                onClick={e => { e.stopPropagation(); handleSetTipo(item, tipo); }}
                                data-testid={`tipo-option-${dev.id}-${item}-${tipo}`}
                              >
                                <span>{tipo}</span>
                                {assignedTipos.includes(tipo) && <Check className="w-3 h-3 shrink-0" />}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    <button
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                      onClick={() => handleToggle(item)}
                      title="Quitar tipología"
                    >
                      <Check className="w-3 h-3 text-primary" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div className={cn("flex gap-1", arrValue.length > 0 && "border-t pt-1.5")}>
            <Input
              placeholder="Nueva tipología..."
              className="h-7 text-xs flex-1"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddNew(); }}
            />
            <Button size="sm" className="h-7 px-2 text-xs" onClick={handleAddNew} disabled={!newName.trim() || arrValue.includes(newName.trim())}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DevelopmentsSpreadsheet() {
  const { toast } = useToast();
  const { canView, canEdit, hasFullAccess, role, canAccess, isLoading: authLoading } = useFieldPermissions('desarrollos');
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [textDetail, setTextDetail] = useState<{title: string, value: string, editable: boolean, onSave?: (v: string) => void} | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [openDatePopover, setOpenDatePopover] = useState<string | null>(null);
  const [fechaHoraExpanded, setFechaHoraExpanded] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const pendingChangesRef = useRef<Map<string, Partial<Development>>>(new Map());
  const [localEdits, setLocalEdits] = useState<Record<string, Partial<Development>>>({});
  const [activeEditingRowId, setActiveEditingRowId] = useState<string | null>(null);
  const saveRowByIdRef = useRef<(id: string) => Promise<void>>(async () => {});

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

  const { data: catalogNivelMantenimiento = [] } = useQuery<CatalogNivelMantenimiento[]>({
    queryKey: ["/api/catalog/nivel-mantenimiento"],
  });

  const nivelOptions = useMemo(() =>
    catalogNivelMantenimiento
      .filter((n) => n.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((n) => n.name),
    [catalogNivelMantenimiento]
  );

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
    setLocalEdits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...data } }));
    if (activeEditingRowId && activeEditingRowId !== id) {
      saveRowByIdRef.current(activeEditingRowId);
    }
    setActiveEditingRowId(id);
  }, [activeEditingRowId]);

  const saveRowById = useCallback(async (id: string) => {
    const changes = pendingChangesRef.current.get(id);
    if (!changes || Object.keys(changes).length === 0) return;
    try {
      await updateMutation.mutateAsync({ id, data: changes });
      pendingChangesRef.current.delete(id);
      setLocalEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
    } catch {}
  }, [updateMutation]);

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

  const handleCellBlur = useCallback((id: string, field: string, col: ColumnDef) => {
    if (!editingCell || editingCell.id !== id || editingCell.field !== field) return;

    const dev = developments.find(d => d.id === id);
    if (!dev) return;

    const currentValue = String((dev as any)[field] ?? "");
    if (editValue !== currentValue) {
      let valueToSave: string | number | null = editValue || null;
      if (col.type === 'number' && editValue) {
        valueToSave = parseFloat(editValue);
        if (isNaN(valueToSave)) valueToSave = null;
      }
      const dataToSave: Record<string, any> = { [field]: valueToSave };
      if (field === 'name' && editValue && !dev.inicioPreventa) {
        const match = developments.find(d => d.id !== id && d.name === editValue && d.inicioPreventa);
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
      active: true,
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
      if (col.group === 'fechahora' && !fechaHoraExpanded) return false;
      if (col.type === 'actions') return hasFullAccess;
      if (col.key === 'id' || col.group === 'corner' || col.type === 'date-display' || col.type === 'time-display') return true;
      const perm = canView(col.key);
      return perm;
    });

    if (!fechaHoraExpanded) {
      const insertAt = cols.findIndex(c => c.group !== 'corner' && c.group !== 'fechahora' && c.group !== 'fechahora_collapsed');
      const pos = insertAt >= 0 ? insertAt : 1;
      const collapsedCol: ColumnDef = { key: 'fechahora_collapsed', label: '', group: 'fechahora_collapsed', type: 'fechahora-collapsed' as any, width: '30px', cellType: 'readonly' };
      cols.splice(pos, 0, collapsedCol);
    }

    if (collapsedGroups.size > 0) {
      const processed: ColumnDef[] = [];
      let i = 0;
      while (i < cols.length) {
        const col = cols[i];
        const gk = col.group || '';
        if (collapsedGroups.has(gk) && gk !== 'fechahora' && gk !== 'corner' && gk !== 'fechahora_collapsed') {
          processed.push({ key: `${gk}_collapsed`, label: '', group: gk, type: 'group-collapsed' as any, width: '30px', cellType: 'readonly' });
          while (i < cols.length && cols[i].group === gk) i++;
        } else {
          processed.push(col);
          i++;
        }
      }
      cols = processed;
    }

    return cols;
  }, [canView, hasFullAccess, fechaHoraExpanded, collapsedGroups]);

  const developerOrderMap = useMemo(() => {
    const sorted = [...developers].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return Object.fromEntries(sorted.map((d, i) => [String(d.id), i]));
  }, [developers]);

  const effectiveDevelopments = useMemo(() =>
    developments.map(d => ({ ...d, ...(localEdits[d.id] || {}) })),
    [developments, localEdits]
  );

  useEffect(() => {
    const handleBeforeUnload = () => {
      pendingChangesRef.current.forEach((changes, id) => {
        if (Object.keys(changes).length > 0) {
          fetch(`/api/developments-entity/${id}`, {
            method: 'PUT',
            keepalive: true,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(changes),
          });
        }
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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
  } = useColumnFilters(developmentsForFilter, visibleColumns, { developerId: developerOrderMap });

  const INITIAL_ROWS = 50;
  const LOAD_MORE = 30;
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(INITIAL_ROWS);
  }, [filteredAndSortedData.length]);

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

  const visibleData = useMemo(
    () => filteredAndSortedData.slice(0, visibleCount),
    [filteredAndSortedData, visibleCount]
  );

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
          {role && (
            <Badge variant="outline" className="text-xs">
              {role}
            </Badge>
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
          {Object.keys(localEdits).length > 0 && (
            <Button size="sm" onClick={saveAllPending} disabled={updateMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white" data-testid="button-save-pending-developments">
              <Check className="w-4 h-4 mr-1" />
              Guardar
            </Button>
          )}
          {hasFullAccess && (
            <Button onClick={handleCreateNew} size="sm" disabled={createMutation.isPending} data-testid="button-add-development">
              <Plus className="w-4 h-4 mr-1" />
              Nuevo
            </Button>
          )}
        </div>
      </div>

      <div ref={contentScrollRef} className="flex-1 overflow-auto spreadsheet-scroll">
        <div className="min-w-max text-xs">
          <SpreadsheetHeader
            visibleColumns={visibleColumns}
            visibleColumnGroups={visibleColumnGroups}
            groupLookupMap={groupLookupMap}
            filterConfigs={filterConfigs}
            sortConfig={sortConfig}
            uniqueValuesMap={uniqueValuesMap}
            availableValuesMap={availableValuesMap}
            fechaHoraExpanded={fechaHoraExpanded}
            onFechaHoraExpand={() => setFechaHoraExpanded(true)}
            onFechaHoraCollapse={() => setFechaHoraExpanded(false)}
            onSort={handleSort}
            onFilter={handleFilter}
            onClear={handleClearFilter}
            sectionGroups={sectionGroupsForSearch}
            scrollRef={contentScrollRef}
            collapsedGroups={collapsedGroups}
            onToggleGroupCollapse={toggleGroupCollapse}
          />

          {visibleData.map((dev, rowIndex) => {
            const isRowInactive = dev.active === false;
            const isActiveRow = activeEditingRowId === dev.id;
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
                const fieldCanEdit = canEdit(col.key);
                const value = (dev as any)[col.key];
                const isEditing = editingCell?.id === dev.id && editingCell?.field === col.key;

                if (col.key === 'id') {
                  const dotColor = dev.active === true ? '#15803d' : dev.active === false ? '#F16100' : '#6b7280';
                  return (
                    <div
                      key={col.key}
                      className="spreadsheet-cell flex-shrink-0 justify-center sticky left-0 z-10 relative border-r border-b"
                      style={{ width: col.width, minWidth: col.width, backgroundColor: SHEET_COLOR_LIGHT, color: 'white', height: 32 }}
                      title={dev.id}
                    >
                      <span className="text-xs font-medium">{rowIndex + 1}</span>
                      <span
                        className="absolute bottom-1 right-1 rounded-full"
                        style={{ width: 6, height: 6, backgroundColor: dotColor }}
                      />
                    </div>
                  );
                }

                if (col.type === 'date-display') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "readonly" }))} style={{ width: col.width, minWidth: col.width }} data-testid={`cell-${col.key}-${dev.id}`}>
                      <span className="text-xs text-muted-foreground px-1">{formatDate(dev.createdAt)}</span>
                    </div>
                  );
                }

                if (col.type === 'time-display') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "readonly" }))} style={{ width: col.width, minWidth: col.width }} data-testid={`cell-${col.key}-${dev.id}`}>
                      <span className="text-xs text-muted-foreground px-1">{formatTime(dev.createdAt)}</span>
                    </div>
                  );
                }

                if (col.type === 'fechahora-collapsed') {
                  return (
                    <div key="fechahora_collapsed" className="spreadsheet-cell flex-shrink-0 border-r border-b border-gray-200 dark:border-gray-700 bg-teal-50 dark:bg-teal-900/20" style={{ width: '30px', minWidth: '30px' }} />
                  );
                }

                if (col.type === 'group-collapsed') {
                  const groupDef = groupLookupMap[col.group || ''];
                  return (
                    <div key={col.key} className="spreadsheet-cell flex-shrink-0 border-r border-b" style={{ width: '30px', minWidth: '30px', backgroundColor: groupDef?.color ? `${groupDef.color}22` : '#f3f4f6' }} />
                  );
                }

                if (col.type === 'boolean') {
                  const devTipos = (dev.tipos as string[] | null) || [];
                  const isDepa = devTipos.some(t => t.toLowerCase().includes('departamento') || t.toLowerCase().includes('depa'));
                  const isLockOffDisabledByTipo = col.key === 'lockOff' && !isDepa;
                  const cellBgColor = value === true 
                    ? isLockOffDisabledByTipo ? '#e5e7eb' : '#dcfce7'
                    : value === false 
                      ? isLockOffDisabledByTipo ? '#e5e7eb' : '#fee2e2'
                      : undefined;
                  const textColorClass = value === true 
                    ? isLockOffDisabledByTipo ? 'text-gray-400' : 'text-green-700 font-medium' 
                    : value === false 
                      ? isLockOffDisabledByTipo ? 'text-gray-400' : 'text-red-600 font-medium' 
                      : 'text-muted-foreground';
                  const effectiveCanEdit = fieldCanEdit && !isLockOffDisabledByTipo;
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !effectiveCanEdit }))} style={{ width: col.width, minWidth: col.width, backgroundColor: isRowInactive ? '#9ca3af' : cellBgColor }}>
                      {effectiveCanEdit ? (
                        <Select
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
                        </Select>
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
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
                      {fieldCanEdit ? (
                        <Select
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
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{value || ""}</span>
                          <Lock className="w-3 h-3 opacity-50" />
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'developer-select') {
                  const filteredDevs = developers.filter(d => {
                    if (dev.empresaTipo) {
                      return d.tipo === dev.empresaTipo;
                    }
                    return d.tipo === 'Desarrollador' || d.tipo === 'Comercializadora';
                  });
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
                      {fieldCanEdit ? (
                        <Select
                          value={value || "__unassigned__"}
                          onValueChange={(v) => handleSelectChange(dev.id, col.key, v)}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__" style={{ color: '#000' }}>—</SelectItem>
                            {filteredDevs.map(d => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{getDeveloperName(value)}</span>
                          <Lock className="w-3 h-3 opacity-50" />
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'city-select') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
                      {fieldCanEdit ? (
                        <Select
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
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{value || ""}</span>
                          <Lock className="w-3 h-3 opacity-50" />
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'zone-select') {
                  const zones = getZonesForCity(dev.city);
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
                      {fieldCanEdit ? (
                        <Select
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
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{value || ""}</span>
                          <Lock className="w-3 h-3 opacity-50" />
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
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit || developerTipos.length === 0 }))} style={{ width: col.width, minWidth: col.width }}>
                      {fieldCanEdit && developerTipos.length > 0 ? (
                        <Select
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
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1 px-1">
                          <span className={!selectedTipo && developerTipos.length > 0 ? 'text-red-500 font-medium text-xs' : 'text-xs text-muted-foreground'}>
                            {!selectedTipo && developerTipos.length > 0 ? 'SIN ASIGNAR' : (selectedTipo || 'Sin tipos')}
                          </span>
                          {!fieldCanEdit && <Lock className="w-3 h-3 opacity-50 shrink-0" />}
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'nivel-select') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
                      {fieldCanEdit ? (
                        <Select
                          value={value || "__unassigned__"}
                          onValueChange={(v) => handleSelectChange(dev.id, col.key, v)}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                            <SelectValue placeholder="Nivel" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__" style={{ color: '#000' }}>—</SelectItem>
                            {nivelOptions.map(n => (
                              <SelectItem key={n} value={n}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{value || ""}</span>
                          <Lock className="w-3 h-3 opacity-50" />
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'torres-select') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
                      {fieldCanEdit ? (
                        <Select
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
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{value || ""}</span>
                          <Lock className="w-3 h-3 opacity-50" />
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'niveles-select') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
                      {fieldCanEdit ? (
                        <Select
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
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{value || ""}</span>
                          <Lock className="w-3 h-3 opacity-50" />
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'multiselect-amenities') {
                  const arrValue: string[] = Array.isArray(value) ? value : [];
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
                      {fieldCanEdit ? (
                        <Popover>
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
                          <span className="text-xs text-muted-foreground truncate">{arrValue.length > 0 ? `${arrValue.length} seleccionados` : ""}</span>
                          <Lock className="w-3 h-3 opacity-50 shrink-0" />
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'single-tipologia') {
                  const allDevTipos = getTypeFromDeveloper(dev.developerId) || [];
                  const cellDeveloperTipos = ((dev.tipos as string[] | null) || []).filter(t => allDevTipos.includes(t));
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
                      <SingleTipologiaCell
                        dev={dev}
                        onSave={(data) => handleFieldChange(dev.id, data)}
                        fieldCanEdit={fieldCanEdit}
                        developerTipos={cellDeveloperTipos}
                      />
                    </div>
                  );
                }

                if (col.type === 'multiselect-creatable') {
                  const arrValue: string[] = Array.isArray(value) ? value : [];
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
                      {fieldCanEdit ? (
                        <Popover>
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
                          <span className="text-xs text-muted-foreground truncate">{arrValue.length > 0 ? arrValue.join(', ') : ""}</span>
                          <Lock className="w-3 h-3 opacity-50 shrink-0" />
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'multiselect-efficiency') {
                  const arrValue: string[] = Array.isArray(value) ? value : [];
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
                      {fieldCanEdit ? (
                        <Popover>
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
                          <span className="text-xs text-muted-foreground truncate">{arrValue.length > 0 ? `${arrValue.length} seleccionados` : ""}</span>
                          <Lock className="w-3 h-3 opacity-50 shrink-0" />
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'multiselect-other') {
                  const arrValue: string[] = Array.isArray(value) ? value : [];
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
                      {fieldCanEdit ? (
                        <Popover>
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
                          <span className="text-xs text-muted-foreground truncate">{arrValue.length > 0 ? `${arrValue.length} seleccionados` : ""}</span>
                          <Lock className="w-3 h-3 opacity-50 shrink-0" />
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
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit || recamarasDisabled }))} style={{ width: col.width, minWidth: col.width, ...(recamarasDisabled ? { backgroundColor: '#f3f4f6' } : {}) }}>
                      {fieldCanEdit && !recamarasDisabled ? (
                        <Select
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
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1 px-2">
                          <span className="text-xs text-muted-foreground truncate">{value || ""}</span>
                          {!fieldCanEdit && <Lock className="w-3 h-3 opacity-50 shrink-0" />}
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'banos-select') {
                  const banosOptions = catalogBanos.map((b: any) => b.name).filter(Boolean);
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
                      {fieldCanEdit ? (
                        <Select
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
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1 px-2">
                          <span className="text-xs text-muted-foreground truncate">{value || ""}</span>
                          <Lock className="w-3 h-3 opacity-50 shrink-0" />
                        </div>
                      )}
                    </div>
                  );
                }


                if (col.type === 'redaccion-text') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "input", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
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
                          <span className="text-xs text-muted-foreground truncate">{value || ""}</span>
                          <Lock className="w-3 h-3 opacity-50 shrink-0" />
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
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "readonly" }), "text-center justify-center")} style={{ width: col.width, minWidth: col.width }}>
                      <span className="text-muted-foreground">{percentValue}</span>
                    </div>
                  );
                }

                if (col.type === 'multiselect-acabados') {
                  const arrValue: string[] = Array.isArray(value) ? value : [];
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
                      {fieldCanEdit ? (
                        <Popover>
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
                          <span className="text-xs text-muted-foreground truncate">{arrValue.length > 0 ? `${arrValue.length} seleccionados` : ""}</span>
                          <Lock className="w-3 h-3 opacity-50 shrink-0" />
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'tipo-contrato-select') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }} data-testid={`cell-${col.key}-${dev.id}`}>
                      {fieldCanEdit ? (
                        <Select
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
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{value || ""}</span>
                          <Lock className="w-3 h-3 opacity-50" />
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'cesion-derechos-select') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }} data-testid={`cell-${col.key}-${dev.id}`}>
                      {fieldCanEdit ? (
                        <Select
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
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{value || ""}</span>
                          <Lock className="w-3 h-3 opacity-50" />
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'presentacion-select') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }} data-testid={`cell-${col.key}-${dev.id}`}>
                      {fieldCanEdit ? (
                        <Select
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
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{value || ""}</span>
                          <Lock className="w-3 h-3 opacity-50" />
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'index') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0 justify-center", getCellStyle({ type: "index" }))} style={{ width: col.width, minWidth: col.width }}>
                      <span className="text-xs text-muted-foreground">{rowIndex + 1}</span>
                    </div>
                  );
                }

                if (col.type === 'folder-link') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0 justify-center bg-yellow-100 dark:bg-yellow-900/30", getCellStyle({ type: "actions" }))} style={{ width: col.width, minWidth: col.width }}>
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
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "actions" }))} style={{ width: col.width, minWidth: col.width }}>
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
                      style={{ width: col.width, minWidth: col.width }}
                      data-testid={`cell-${col.key}-${dev.id}`}
                    >
                      {fieldCanEdit ? (
                        <Popover 
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
                          <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />
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
                      style={{ width: col.width, minWidth: col.width }}
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
                            });
                          } else {
                            setTextDetail({ title: col.label, value: String(displayValue || ''), editable: false });
                          }
                        }}
                      >
                        <span className="truncate">{displayValue || ''}</span>
                        {!fieldCanEdit && <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />}
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
                    style={{ width: col.width, minWidth: col.width }}
                    onClick={() => fieldCanEdit && !isEditing && handleCellClick(dev.id, col.key, value)}
                    data-testid={`cell-${col.key}-${dev.id}`}
                  >
                    {isEditing && fieldCanEdit ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellBlur(dev.id, col.key, col)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCellBlur(dev.id, col.key, col)}
                        onFocus={(e) => e.target.select()}
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                        autoFocus
                        type={col.type === 'number' ? 'number' : 'text'}
                        data-testid={`input-${col.key}-${dev.id}`}
                      />
                    ) : (
                      <div
                        className="flex items-center gap-1 cursor-pointer"
                        onClick={() => !fieldCanEdit && displayValue && setTextDetail({ title: col.label, value: String(displayValue), editable: false })}
                      >
                        <span className="truncate">{displayValue || ''}</span>
                        {!fieldCanEdit && <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />}
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
    </div>
  );
}
