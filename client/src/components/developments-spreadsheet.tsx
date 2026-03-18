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
import { useAuth } from "@/lib/auth";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { spreadsheetKey, setSerializer, filterConfigsSerializer } from "@/lib/spreadsheet-persistence";
import { Plus, Minus, Trash2, Building, Loader2, Lock, AlertCircle, FolderOpen, X, Save, Check, ChevronDown, Search, Maximize2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";
import type { Development, Developer, CatalogCity, CatalogZone, CatalogAmenity, CatalogEfficiencyFeature, CatalogOtherFeature, CatalogAcabado, CatalogTipoContrato, CatalogCesionDerechos, CatalogPresentacion } from "@shared/schema";
import { DEVELOPMENT_TYPES } from "@shared/constants";
import { getCellStyle, formatDate, formatTime, formatDateShort, parseDateInput, type CellType, SHEET_COLOR_DARK, SHEET_COLOR_LIGHT, getColumnFilterType, createInputFilter, createPasteFilter, type InputFilterType, CELL_INPUT_CLASS } from "@/lib/spreadsheet-utils";
import { SpreadsheetHeader } from "@/components/ui/spreadsheet-shared";
import { RecycleBinDrawer } from "@/components/ui/recycle-bin";
import { cn } from "@/lib/utils";

function parsePhoneList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try { return JSON.parse(trimmed); } catch { return [trimmed]; }
  }
  return [trimmed];
}

const ActiveDropdownRef = { current: null as (() => void) | null };

function ExclusiveSelect({ children, autoOpen, onClose, onAdvance, ...props }: React.ComponentProps<typeof Select> & { autoOpen?: boolean; onClose?: () => void; onAdvance?: () => void }) {
  const [open, setOpen] = useState(false);
  const shouldAdvanceRef = useRef(false);
  const closeMe = useCallback(() => setOpen(false), []);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;
  useEffect(() => {
    return () => { if (ActiveDropdownRef.current === closeMe) ActiveDropdownRef.current = null; };
  }, [closeMe]);
  useEffect(() => {
    if (autoOpen) {
      requestAnimationFrame(() => {
        if (ActiveDropdownRef.current && ActiveDropdownRef.current !== closeMe) {
          ActiveDropdownRef.current();
        }
        ActiveDropdownRef.current = closeMe;
        setOpen(true);
      });
    }
  }, [autoOpen, closeMe]);
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        if (ActiveDropdownRef.current === closeMe) ActiveDropdownRef.current = null;
        setOpen(false);
        onAdvanceRef.current?.();
      } else if (e.key === 'Enter') {
        shouldAdvanceRef.current = true;
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, closeMe]);
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      if (ActiveDropdownRef.current && ActiveDropdownRef.current !== closeMe) {
        ActiveDropdownRef.current();
      }
      ActiveDropdownRef.current = closeMe;
    } else {
      if (ActiveDropdownRef.current === closeMe) ActiveDropdownRef.current = null;
      if (shouldAdvanceRef.current) {
        shouldAdvanceRef.current = false;
        onAdvanceRef.current?.();
      } else {
        onCloseRef.current?.();
      }
    }
    setOpen(isOpen);
  }, [closeMe]);
  return <Select {...props} open={open} onOpenChange={handleOpenChange}>{children}</Select>;
}

const EMPRESA_TIPO_OPTIONS = ['Desarrollador', 'Comercializadora', 'Constructora', 'Arquitectos'] as const;


interface ColumnDef {
  key: string;
  label: string;
  group: string;
  type?: 'text' | 'number' | 'boolean' | 'select' | 'city-select' | 'zone-select' | 'type-select' | 'developer-select' | 'empresa-tipo-select' | 'nivel-select' | 'torres-select' | 'niveles-select' | 'multiselect-amenities' | 'multiselect-efficiency' | 'multiselect-other' | 'multiselect-acabados' | 'multiselect-tipos' | 'multiselect-vistas' | 'multiselect-creatable' | 'multiselect-tipologias' | 'recamaras-select' | 'banos-select' | 'tipo-contrato-select' | 'cesion-derechos-select' | 'presentacion-select' | 'calculated-percent' | 'folder-link' | 'actions' | 'index' | 'date-display' | 'time-display' | 'tipologias-count' | 'redaccion-text' | 'phone-list';
  width: string;
  folderSection?: string;
  cellType?: CellType;
  suffix?: string;
  isDateColumn?: boolean;
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
  { key: 'noheader_lockoff', label: 'LOCK OFF', color: SHEET_COLOR_LIGHT },
  { key: 'distribucion', label: 'DISTRIBUCIÓN', color: SHEET_COLOR_DARK },
  { key: 'depas', label: 'CANTIDAD', color: SHEET_COLOR_LIGHT },
  { key: 'avance', label: 'VENDIDO', color: SHEET_COLOR_DARK },
  { key: 'noheader_acabados', label: 'ACABADOS', color: SHEET_COLOR_LIGHT },
  { key: 'noheader_redaccion', label: 'DESCRIPCIÓN', color: SHEET_COLOR_DARK },
  { key: 'noheader_amenidades', label: 'AMENIDADES', color: SHEET_COLOR_LIGHT },
  { key: 'noheader_preventa', label: 'PREVENTA', color: SHEET_COLOR_DARK },
  { key: 'obra', label: 'OBRA', color: SHEET_COLOR_LIGHT },
  { key: 'noheader_contrato', label: 'CONTRATO', color: SHEET_COLOR_DARK },
  { key: 'ventas', label: 'VENTAS', color: SHEET_COLOR_LIGHT },
  { key: 'pagos', label: 'PAGOS', color: SHEET_COLOR_DARK },
  { key: 'noheader_ubicacion', label: 'UBICACIÓN', color: SHEET_COLOR_LIGHT },
  { key: 'noheader_presentacion', label: 'PRESENTACIÓN', color: SHEET_COLOR_DARK },
  { key: 'noheader_legales', label: 'LEGALES', color: SHEET_COLOR_LIGHT },
  { key: 'noheader_venta', label: 'MEDIOS', color: SHEET_COLOR_DARK },
  { key: 'actions', label: '', color: SHEET_COLOR_LIGHT },
];

function calcTiempoTranscurrido(inicioPreventa: string | null | undefined): string {
  if (!inicioPreventa) return "";
  const start = new Date(inicioPreventa);
  if (isNaN(start.getTime())) return "";
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years === 0 && months === 0) return "< 1m";
  return `${years}a ${months}m`;
}

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
  const { toast } = useToast();
  const rangos = parseNivelRangos(dev.nivel);
  const [localRangos, setLocalRangos] = useState<NivelRango[]>(rangos);
  const [localMax, setLocalMax] = useState<string>(dev.nivelMaximo != null ? String(dev.nivelMaximo) : '');

  // Refs for keyboard navigation: 2 inputs per range (desde, hasta) + 1 max input + 1 save button
  const desdeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hastaRefs = useRef<(HTMLInputElement | null)[]>([]);
  const maxRef = useRef<HTMLInputElement | null>(null);
  const saveRef = useRef<HTMLButtonElement | null>(null);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setLocalRangos(parseNivelRangos(dev.nivel));
      setLocalMax(dev.nivelMaximo != null ? String(dev.nivelMaximo) : '');
    }
    setOpen(isOpen);
  };

  const addRango = () => {
    setLocalRangos(prev => {
      if (prev.length === 0) return [{ desde: 1, hasta: 1 }];
      const lastHasta = prev[prev.length - 1].hasta;
      const newDesde = lastHasta + 2;
      return [...prev, { desde: newDesde, hasta: newDesde }];
    });
  };

  const removeRango = (idx: number) => {
    setLocalRangos(prev => prev.filter((_, i) => i !== idx));
  };

  const updateRango = (idx: number, field: 'desde' | 'hasta', val: string) => {
    const num = Math.max(1, parseInt(val) || 1);
    setLocalRangos(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      if (field === 'desde') {
        return { desde: num, hasta: Math.max(num, r.hasta) };
      } else {
        return { desde: Math.min(num, r.desde), hasta: num };
      }
    }));
  };

  const handleSave = () => {
    for (let i = 0; i < localRangos.length; i++) {
      const r = localRangos[i];
      if (r.desde < 1 || r.hasta < 1) {
        toast({ title: 'Error', description: 'Los pisos deben ser mayores o iguales a 1.', variant: 'destructive' });
        return;
      }
      if (r.desde > r.hasta) {
        toast({ title: 'Error', description: `Rango ${i + 1}: "Desde" no puede ser mayor que "Hasta".`, variant: 'destructive' });
        return;
      }
      if (i > 0 && r.desde < localRangos[i - 1].hasta + 2) {
        toast({ title: 'Error', description: `Rango ${i + 1} debe iniciar al menos 2 pisos después del rango anterior.`, variant: 'destructive' });
        return;
      }
    }
    const nivelMaximo = localMax !== '' ? parseInt(localMax) || null : null;
    const nivelJson = localRangos.length > 0 ? JSON.stringify(localRangos) : null;
    onSave({ nivel: nivelJson, nivelMaximo });
    setOpen(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextRef: HTMLInputElement | HTMLButtonElement | null | undefined) => {
    if (e.key === 'Tab' || e.key === 'Enter') {
      if (nextRef) {
        e.preventDefault();
        nextRef.focus();
      }
    }
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
          <span className="truncate text-xs">{display || ''}</span>
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
                ref={(el) => { desdeRefs.current[idx] = el; }}
                type="number"
                className={cn("h-6 text-xs px-1 w-14", r.desde > r.hasta && "border-red-500")}
                value={r.desde}
                onChange={(e) => updateRango(idx, 'desde', e.target.value)}
                onKeyDown={(e) => handleInputKeyDown(e, hastaRefs.current[idx])}
              />
              <span className="text-xs text-muted-foreground shrink-0">Hasta</span>
              <Input
                ref={(el) => { hastaRefs.current[idx] = el; }}
                type="number"
                className={cn("h-6 text-xs px-1 w-14", r.desde > r.hasta && "border-red-500")}
                value={r.hasta}
                onChange={(e) => updateRango(idx, 'hasta', e.target.value)}
                onKeyDown={(e) => {
                  const nextDesde = desdeRefs.current[idx + 1];
                  handleInputKeyDown(e, nextDesde ?? maxRef.current);
                }}
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
                ref={maxRef}
                type="number"
                className="h-6 text-xs px-1 w-14"
                value={localMax}
                onChange={(e) => setLocalMax(e.target.value)}
                onKeyDown={(e) => handleInputKeyDown(e, saveRef.current)}
                placeholder=""
              />
            </div>
          </div>
          <Button ref={saveRef} size="sm" className="w-full h-6 text-xs mt-1" onClick={handleSave}>
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
    dev.empresaTipo && dev.developerId && dev.name && dev.city &&
    dev.tipos?.length && dev.tipologiasList?.length && dev.recamaras && dev.banos &&
    dev.inicioProyectado && dev.entregaProyectada &&
    dev.ventasNombre && dev.ventasTelefono
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
  if (!dev.empresaTipo) missing.push("Tipo empresa");
  if (!dev.developerId) missing.push("Desarrollador");
  if (!dev.name) missing.push("Nombre");
  if (!dev.city) missing.push("Ciudad");
  if (!dev.tipos?.length) missing.push("Tipos");
  if (!dev.tipologiasList?.length) missing.push("Tipologías");
  if (!dev.recamaras) missing.push("Recámaras");
  if (!dev.banos) missing.push("Baños");
  if (!dev.inicioProyectado) missing.push("Inicio proyectado");
  if (!dev.entregaProyectada) missing.push("Entrega proyectada");
  if (!dev.ventasNombre) missing.push("Ventas - Nombre");
  if (!dev.ventasTelefono) missing.push("Ventas - Teléfono");
  return missing;
}

const DEV_ALWAYS_UNLOCKED = new Set(["active", "id", "createdDate", "createdTime", "developerId"]);

const columns: ColumnDef[] = [
  { key: 'id', label: 'ID', group: 'corner', type: 'index', width: '60px', cellType: 'index' },
  { key: 'active', label: 'Activo', group: 'registro', type: 'boolean', width: '80px', cellType: 'checkbox' },
  { key: 'createdDate', label: 'Fecha', group: 'registro', type: 'date-display', width: '85px', cellType: 'readonly' },
  { key: 'createdTime', label: 'Hora', group: 'registro', type: 'time-display', width: '65px', cellType: 'readonly' },
  { key: 'empresaTipo', label: 'Tipo', group: 'empresa', type: 'empresa-tipo-select', width: '110px', cellType: 'dropdown' },
  { key: 'developerId', label: 'Desarrollador', group: 'empresa', type: 'developer-select', width: '120px', cellType: 'dropdown' },
  { key: 'name', label: 'Desarrollo', group: 'empresa', width: '130px', cellType: 'input' },
  { key: 'city', label: 'Ciudad', group: 'ubicacion', type: 'city-select', width: '95px', cellType: 'dropdown' },
  { key: 'zone', label: 'Zona 1', group: 'ubicacion', type: 'zone-select', width: '95px', cellType: 'dropdown' },
  { key: 'zone2', label: 'Zona 2', group: 'ubicacion', type: 'zone-select', width: '95px', cellType: 'dropdown' },
  { key: 'zone3', label: 'Zona 3', group: 'ubicacion', type: 'zone-select', width: '95px', cellType: 'dropdown' },
  { key: 'tipos', label: 'Tipos', group: 'estructura', type: 'multiselect-tipos', width: '110px', cellType: 'dropdown' },
  { key: 'tipologiasList', label: 'Tipologías', group: 'estructura', type: 'multiselect-creatable', width: '110px', cellType: 'dropdown' },
  { key: 'nivel', label: 'Nivel', group: 'estructura', type: 'nivel-select', width: '110px', cellType: 'dropdown' },
  { key: 'torres', label: 'Torres', group: 'estructura', type: 'torres-select', width: '85px', cellType: 'dropdown' },
  { key: 'niveles', label: 'Niveles', group: 'estructura', type: 'niveles-select', width: '85px', cellType: 'dropdown' },
  { key: 'vistas', label: 'Vistas', group: 'estructura', type: 'multiselect-creatable', width: '95px', cellType: 'dropdown' },
  { key: 'tamanoDesde', label: 'Desde', group: 'tamano', type: 'number', width: '85px', cellType: 'input', suffix: 'm²' },
  { key: 'tamanoHasta', label: 'Hasta', group: 'tamano', type: 'number', width: '85px', cellType: 'input', suffix: 'm²' },
  { key: 'lockOff', label: '', group: 'noheader_lockoff', type: 'boolean', width: '110px', cellType: 'checkbox' },
  { key: 'recamaras', label: 'Recámaras', group: 'distribucion', type: 'recamaras-select', width: '110px', cellType: 'dropdown' },
  { key: 'banos', label: 'Baños', group: 'distribucion', type: 'banos-select', width: '80px', cellType: 'dropdown' },
  { key: 'depasUnidades', label: 'Unidades', group: 'depas', type: 'number', width: '105px', cellType: 'input' },
  { key: 'depasM2', label: 'm²', group: 'depas', type: 'number', width: '95px', cellType: 'input', suffix: 'm²' },
  { key: 'depasVendidas', label: '', group: 'avance', type: 'number', width: '95px', cellType: 'input' },
  { key: 'depasPorcentajeCalc', label: 'Porcentaje', group: 'avance', type: 'calculated-percent', width: '100px', cellType: 'readonly', calcFrom: { unidades: 'depasUnidades', vendidas: 'depasVendidas' } },
  { key: 'acabados', label: '', group: 'noheader_acabados', type: 'multiselect-acabados', width: '95px', cellType: 'dropdown' },
  { key: 'redaccionValor', label: '', group: 'noheader_redaccion', type: 'redaccion-text', width: '120px', cellType: 'input' },
  { key: 'amenities', label: 'Amenidades', group: 'noheader_amenidades', type: 'multiselect-amenities', width: '120px', cellType: 'dropdown' },
  { key: 'efficiency', label: 'Eficiencia', group: 'noheader_amenidades', type: 'multiselect-efficiency', width: '110px', cellType: 'dropdown' },
  { key: 'otherFeatures', label: 'Otros', group: 'noheader_amenidades', type: 'multiselect-other', width: '80px', cellType: 'dropdown' },
  { key: 'inicioPreventa', label: 'Inicio Preventa', group: 'noheader_preventa', width: '135px', cellType: 'input', isDateColumn: true },
  { key: 'tiempoTransc', label: 'Tiempo Transcurrido', group: 'noheader_preventa', width: '190px', cellType: 'calculated' },
  { key: 'finPreventa', label: 'Fin de Preventa', group: 'noheader_preventa', width: '135px', cellType: 'input', isDateColumn: true },
  { key: 'inicioProyectado', label: 'Inicio', group: 'obra', width: '105px', cellType: 'input', isDateColumn: true },
  { key: 'entregaProyectada', label: 'Entrega', group: 'obra', width: '105px', cellType: 'input', isDateColumn: true },
  { key: 'tipoContrato', label: 'Contratos', group: 'noheader_contrato', type: 'tipo-contrato-select', width: '110px', cellType: 'dropdown' },
  { key: 'cesionDerechos', label: 'Cesión', group: 'noheader_contrato', type: 'cesion-derechos-select', width: '90px', cellType: 'dropdown' },
  { key: 'ventasNombre', label: 'Nombre', group: 'ventas', width: '100px', cellType: 'input' },
  { key: 'ventasTelefono', label: 'Teléfono', group: 'ventas', width: '110px', type: 'phone-list', cellType: 'input' },
  { key: 'ventasCorreo', label: 'Correo', group: 'ventas', width: '120px', cellType: 'input' },
  { key: 'pagosNombre', label: 'Nombre', group: 'pagos', width: '100px', cellType: 'input' },
  { key: 'pagosTelefono', label: 'Teléfono', group: 'pagos', width: '110px', type: 'phone-list', cellType: 'input' },
  { key: 'pagosCorreo', label: 'Correo', group: 'pagos', width: '120px', cellType: 'input' },
  { key: 'location', label: '', group: 'noheader_ubicacion', width: '100px', cellType: 'input' },
  { key: 'presentacion', label: '', group: 'noheader_presentacion', type: 'presentacion-select', width: '120px', cellType: 'dropdown' },
  { key: 'legalesFolder', label: '', group: 'noheader_legales', type: 'folder-link', folderSection: 'legales', width: '85px' },
  { key: 'ventaFolder', label: '', group: 'noheader_venta', type: 'folder-link', folderSection: 'venta', width: '80px' },
  { key: 'actions', label: '', group: 'actions', type: 'actions', width: '50px' },
];

export function DevelopmentsSpreadsheet() {
  const { toast } = useToast();
  const { user } = useAuth();
  const uid = user?.id ?? "anon";
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

  const [collapsedGroups, setCollapsedGroups] = usePersistedState<Set<string>>(
    spreadsheetKey(uid, "developments", "collapsedGroups"), () => new Set(), setSerializer
  );
  const toggleGroupCollapse = (key: string) => {
    if (activeEditingRowId) {
      saveRowByIdRef.current(activeEditingRowId);
    }
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        // Also uncollapse all individual columns in this group
        const groupColKeys = columns.filter(c => c.group === key).map(c => c.key);
        if (groupColKeys.length > 0) {
          setCollapsedColumns(prevCols => {
            const nextCols = new Set(prevCols);
            groupColKeys.forEach(k => nextCols.delete(k));
            return nextCols;
          });
        }
      } else {
        next.add(key);
      }
      return next;
    });
  };
  const COLLAPSED_COL_WIDTH = 20;
  const [collapsedColumns, setCollapsedColumns] = usePersistedState<Set<string>>(
    spreadsheetKey(uid, "developments", "collapsedColumns"), () => new Set(), setSerializer
  );
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

  // Clear active row when clicking outside data rows
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!activeEditingRowId) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-row-id]')) return;
      if (target.closest('[data-radix-popper-content-wrapper]') || target.closest('[role="dialog"]')) return;
      saveRowByIdRef.current(activeEditingRowId);
      setActiveEditingRowId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeEditingRowId]);

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

  const { data: catalogRecamaras = [] } = useQuery<any[]>({
    queryKey: ["/api/catalog/recamaras"],
  });

  const { data: catalogTorres = [] } = useQuery<any[]>({
    queryKey: ["/api/catalog/torres"],
  });

  const { data: catalogNiveles = [] } = useQuery<any[]>({
    queryKey: ["/api/catalog/niveles"],
  });

  // Document counts for folder columns
  const { data: devDocCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/documents/counts", "development"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/documents/counts?entityType=development");
      return res.json();
    },
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
    } catch (err: any) {
      let msg = "Error al guardar";
      try {
        const parsed = JSON.parse(err?.message?.split(': ').slice(1).join(': ') || '');
        if (parsed.error) msg = parsed.error;
      } catch {}
      toast({ title: msg, variant: "destructive" });
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
    // Use ref to check if cell was already navigated away by Tab/Enter
    const ec = editingCellRef.current;
    if (!ec || ec.id !== id || ec.field !== field) return;

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
    const uniqueSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    createMutation.mutate({
      name: `Nuevo Desarrollo ${uniqueSuffix}`,
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
        legalesFolder: String(devDocCounts[dev.id] || 0),
        ventaFolder: String(devDocCounts[dev.id] || 0),
      };
    });
  }, [effectiveDevelopments, getTypeFromDeveloper, devDocCounts]);

  const devSortKey = spreadsheetKey(uid, "developments", "sortConfig");
  const devFilterKey = spreadsheetKey(uid, "developments", "filterConfigs");
  const readDevInitialSort = () => {
    try { const raw = localStorage.getItem(devSortKey); if (raw) return JSON.parse(raw); } catch {}
    return undefined;
  };
  const readDevInitialFilters = () => {
    try { const raw = localStorage.getItem(devFilterKey); if (raw) return filterConfigsSerializer.deserialize(raw); } catch {}
    return undefined;
  };
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
  } = useColumnFilters(developmentsForFilter, visibleColumns, { developerId: developerOrderMap }, {
    defaultSortKey: "createdAt",
    initialSortConfig: readDevInitialSort(),
    initialFilterConfigs: readDevInitialFilters(),
    onSortChange: (c) => {
      try {
        if (!c.key && c.direction === null) localStorage.removeItem(devSortKey);
        else localStorage.setItem(devSortKey, JSON.stringify(c));
      } catch {}
    },
    onFilterChange: (c) => {
      try {
        if (Object.keys(c).length === 0) localStorage.removeItem(devFilterKey);
        else localStorage.setItem(devFilterKey, filterConfigsSerializer.serialize(c));
      } catch {}
    },
  });

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

  const navigateToNextCell = useCallback((currentId: string, currentField: string, value: string) => {
    // Save current value
    const dev = developments.find(d => d.id === currentId);
    if (dev) {
      const currentValue = String((dev as any)[currentField] ?? "");
      if (value !== currentValue) {
        const col = columns.find(c => c.key === currentField);
        let valueToSave: string | number | null = value || null;
        if (col?.type === 'number' && value) {
          valueToSave = parseFloat(value);
          if (isNaN(valueToSave)) valueToSave = null;
        }
        handleFieldChange(currentId, { [currentField]: valueToSave });
      }
    }
    // Find next editable cell in the same row (inputs + dropdowns)
    const nonEditableTypes = new Set([
      'index', 'boolean', 'actions', 'folder-link', 'date-display', 'time-display',
      'calculated-percent', 'tipologias-count', 'redaccion-text', 'phone-list',
      'multiselect-amenities', 'multiselect-efficiency', 'multiselect-other',
      'multiselect-acabados', 'multiselect-creatable', 'nivel-select',
      'multiselect-tipos', 'multiselect-vistas', 'multiselect-tipologias'
    ]);
    const editableCols = columns.filter(c =>
      !(c.type && nonEditableTypes.has(c.type)) && !collapsedColumns.has(c.key)
    );
    const currentIdx = editableCols.findIndex(c => c.key === currentField);
    if (currentIdx >= 0 && currentIdx < editableCols.length - 1) {
      const nextCol = editableCols[currentIdx + 1];
      const rowData = visibleData.find(d => d.id === currentId);
      setEditingCell({ id: currentId, field: nextCol.key });
      setEditValue(String((rowData as any)?.[nextCol.key] ?? ""));
    } else {
      setEditingCell(null);
    }
  }, [columns, collapsedColumns, visibleData, developments, handleFieldChange, setEditingCell, setEditValue]);

  const advanceFromSelect = useCallback((currentId: string, currentField: string) => {
    const nonEditableTypes = new Set([
      'index', 'boolean', 'actions', 'folder-link', 'date-display', 'time-display',
      'calculated-percent', 'tipologias-count', 'redaccion-text', 'phone-list',
      'multiselect-amenities', 'multiselect-efficiency', 'multiselect-other',
      'multiselect-acabados', 'multiselect-creatable', 'nivel-select',
      'multiselect-tipos', 'multiselect-vistas', 'multiselect-tipologias'
    ]);
    const editableCols = columns.filter(c =>
      !(c.type && nonEditableTypes.has(c.type)) && !collapsedColumns.has(c.key)
    );
    const currentIdx = editableCols.findIndex(c => c.key === currentField);
    if (currentIdx >= 0 && currentIdx < editableCols.length - 1) {
      const nextCol = editableCols[currentIdx + 1];
      const rowData = visibleData.find(d => d.id === currentId);
      setEditingCell({ id: currentId, field: nextCol.key });
      setEditValue(String((rowData as any)?.[nextCol.key] ?? ""));
    } else {
      setEditingCell(null);
    }
  }, [columns, collapsedColumns, visibleData, setEditingCell, setEditValue]);

  const clearEditingIfCurrent = useCallback((id: string, field: string) => {
    if (editingCellRef.current?.id === id && editingCellRef.current?.field === field) {
      setEditingCell(null);
    }
  }, [setEditingCell]);

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
  const [zoomLevel, setZoomLevel] = usePersistedState<number>(
    spreadsheetKey(uid, "developments", "zoomLevel"), 100
  );
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
          <h1 className="text-sm font-bold" data-testid="text-page-title">Desarrollos</h1>

          {(collapsedGroups.size > 0 || collapsedColumns.size > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCollapsedGroups(new Set());
                setCollapsedColumns(new Set());
              }}
              title="Expandir todo"
              data-testid="button-expand-all"
            >
              <Maximize2 className="w-3 h-3 mr-1" />
              Expandir
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
            const isDeveloperBlocked = !hasFullAccess && !!(parentDeveloper && (parentDeveloper.active !== true || !isDeveloperComplete(parentDeveloper)));
            const isActiveRow = activeEditingRowId === dev.id;
            const inactiveCellStyle: React.CSSProperties = isRowInactive && !hasFullAccess
              ? { backgroundColor: '#9ca3af', pointerEvents: 'none' as const, cursor: 'default', color: 'black' }
              : {};
            const cellTextClass = isRowInactive && !hasFullAccess ? "text-gray-700" : "";
            return (
            <div
              key={dev.id}
              className={cn(
                "flex w-max border-b group",
                isRowInactive
                  ? ""
                  : isActiveRow
                    ? "ring-2 ring-blue-500 z-10 relative"
                    : rowIndex % 2 === 0 ? "bg-background" : "bg-muted/10"
              )}
              style={{ height: '32px', maxHeight: '32px', ...(isRowInactive && !hasFullAccess ? { backgroundColor: '#9ca3af' } : {}) }}
              data-testid={`row-development-${dev.id}`}
              data-row-id={dev.id}
              onPointerDown={() => handleRowClick(dev.id)}
            >
              {visibleColumns.map((col) => {
                const fieldCanEdit = canEdit(col.key) && (!isDeveloperBlocked || DEV_ALWAYS_UNLOCKED.has(col.key));
                const value = (dev as any)[col.key];
                const isEditing = editingCell?.id === dev.id && editingCell?.field === col.key;

                if (col.key === 'id') {
                  const isCompleteForDot = isDevelopmentComplete(dev, parentDeveloper);
                  const dotColor = dev.active === null
                    ? '#1f2937'
                    : isCompleteForDot
                      ? (dev.active === true ? '#32CD32' : '#F16100')
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
                    >
                      <span className="text-xs font-medium">{stableRowNumberMap.get(dev.id) ?? rowIndex + 1}</span>
                      {dotTooltip ? (
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full cursor-default"
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

                if (collapsedColumns.has(col.key)) {
                  return (
                    <div
                      key={col.key}
                      className="spreadsheet-cell flex-shrink-0"
                      style={{ width: COLLAPSED_COL_WIDTH, minWidth: COLLAPSED_COL_WIDTH, backgroundColor: isRowInactive ? '#9ca3af' : '#ffffff' }}
                    />
                  );
                }

                if (col.type === 'date-display') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0 justify-center", getCellStyle({ type: "input" }))} style={{ width: col.width, minWidth: col.width, cursor: 'default', ...inactiveCellStyle }} data-testid={`cell-${col.key}-${dev.id}`}>
                      <span className={cn("text-xs px-1", cellTextClass)}>{formatDate(dev.createdAt)}</span>
                    </div>
                  );
                }

                if (col.type === 'time-display') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0 justify-center", getCellStyle({ type: "input" }))} style={{ width: col.width, minWidth: col.width, cursor: 'default', ...inactiveCellStyle }} data-testid={`cell-${col.key}-${dev.id}`}>
                      <span className={cn("text-xs px-1", cellTextClass)}>{formatTime(dev.createdAt)}</span>
                    </div>
                  );
                }

                if (col.type === 'group-collapsed') {
                  return (
                    <div key={col.key} className="spreadsheet-cell flex-shrink-0 border-r border-b" style={{ width: '30px', minWidth: '30px', backgroundColor: isRowInactive ? '#9ca3af' : '#ffffff' }} />
                  );
                }

                if (col.type === 'boolean') {
                  if (col.key === 'active') {
                    const isComplete = isDevelopmentComplete(dev, parentDeveloper);
                    const isDisabled = value === null || value === undefined;
                    const activeState = isDisabled ? "disabled" : (value === true && isComplete) ? "active" : (isComplete ? "ready" : "incomplete");
                    const bgColor = isRowInactive ? '#9ca3af' : activeState === "active" ? "#dcfce7" : activeState === "ready" ? "#FDCDB0" : activeState === "disabled" ? "#9ca3af" : "#fee2e2";
                    const dotColor = activeState === "active" ? "#15803d" : activeState === "ready" ? "#F16100" : activeState === "disabled" ? "#1f2937" : "#dc2626";
                    const textStyle: React.CSSProperties = activeState === "active" ? { color: "#15803d", fontWeight: 600 } : activeState === "ready" ? { color: "#C04D00", fontWeight: 600 } : activeState === "disabled" ? { color: "#4b5563", fontWeight: 500 } : { color: "#dc2626", fontWeight: 500 };
                    const activeLabel = activeState === "active" ? "Sí" : activeState === "disabled" ? "In" : "No";
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
                            <SelectTrigger className="h-6 w-full text-xs border-0 bg-transparent [&_svg]:h-3 [&_svg]:w-3 focus:ring-0 focus:ring-offset-0" style={textStyle} data-testid={`boolean-${col.key}-${dev.id}`}>
                              <span className="truncate">{activeLabel}</span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active" disabled={!isComplete} className="text-xs">
                                <span style={{ color: "#15803d", fontWeight: 500 }}>Sí</span>
                              </SelectItem>
                              <SelectItem value="no" className="text-xs">
                                <span style={{ color: isComplete ? "#f97316" : "#dc2626", fontWeight: 500 }}>No</span>
                              </SelectItem>
                              <SelectItem value="disabled" className="text-xs">
                                <span style={{ color: "#4b5563", fontWeight: 500 }}>Inhabilitado</span>
                              </SelectItem>
                            </SelectContent>
                          </ExclusiveSelect>
                        ) : (
                          <div className="flex items-center justify-center gap-1 px-1" style={textStyle}>
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
                  if (isRowInactive) {
                    const disLabel = value === true ? "Sí" : value === false ? "No" : "-";
                    const disBg = value === true ? '#a8d5b5' : value === false ? '#f0b8b8' : '#9ca3af';
                    const disColor = value === true ? '#4a7c59' : value === false ? '#a05050' : '#6b7280';
                    return (
                      <div key={col.key} className="spreadsheet-cell flex-shrink-0 justify-center gap-0.5 text-xs font-medium"
                        style={{ width: col.width, minWidth: col.width, backgroundColor: disBg, color: disColor, pointerEvents: 'none', cursor: 'default' }}>
                        <span>{disLabel}</span>
                        <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
                      </div>
                    );
                  }
                  const devTipos = (dev.tipos as string[] | null) || [];
                  const isDepa = devTipos.some(t => t.toLowerCase().includes('departamento') || t.toLowerCase().includes('depa'));
                  const isLockOffDisabledByTipo = col.key === 'lockOff' && !isDepa && !hasFullAccess;
                  const cellBgColor = value === true
                    ? isLockOffDisabledByTipo ? '#e5e7eb' : '#dcfce7'
                    : value === false
                      ? isLockOffDisabledByTipo ? '#e5e7eb' : '#fee2e2'
                      : undefined;
                  const textColorClass = value === true
                    ? isLockOffDisabledByTipo ? 'text-gray-400' : 'text-green-700 font-medium'
                    : value === false
                      ? isLockOffDisabledByTipo ? 'text-gray-400' : 'text-red-600 font-medium'
                      : cellTextClass;
                  const effectiveCanEdit = fieldCanEdit && !isLockOffDisabledByTipo;
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !effectiveCanEdit }))} style={{ width: col.width, minWidth: col.width, backgroundColor: cellBgColor }}>
                      {effectiveCanEdit ? (
                        <ExclusiveSelect
                          value={value === true ? "si" : value === false ? "no" : ""}
                          onValueChange={(val) => handleCheckboxChange(dev.id, col.key, val === "si")}
                        >
                          <SelectTrigger className={`h-6 text-xs border-0 bg-transparent relative ${textColorClass}`} data-testid={`boolean-${col.key}-${dev.id}`}>
                            <SelectValue>
                              {value === true ? (
                                <span className="text-center">Sí</span>
                              ) : value === false ? (
                                <span className="text-center">No</span>
                              ) : (
                                <span className="text-center">-</span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="si" className="text-green-700 font-medium">Sí</SelectItem>
                            <SelectItem value="no" className="text-red-600 font-medium">No</SelectItem>
                          </SelectContent>
                        </ExclusiveSelect>
                      ) : (
                        <div className={`flex items-center justify-center w-full ${textColorClass}`}>
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
                  const hasDeveloper = !!dev.developerId;
                  const developerTipo = parentDeveloper?.tipo || null;
                  const tipoIsAutoFilled = hasDeveloper && !!developerTipo;
                  const tipoDisabled = !hasDeveloper || tipoIsAutoFilled || !fieldCanEdit;
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: tipoDisabled }))} style={{ width: col.width, minWidth: col.width, backgroundColor: isRowInactive ? '#b8b3a8' : 'rgb(255,241,220)', color: 'black', ...(isRowInactive ? { pointerEvents: 'none' as const, cursor: 'default' } : {}) }}>
                      {hasDeveloper && fieldCanEdit && !tipoIsAutoFilled ? (
                        <ExclusiveSelect
                          autoOpen={editingCell?.id === dev.id && editingCell?.field === col.key}
                          onClose={() => clearEditingIfCurrent(dev.id, col.key)}
                          onAdvance={() => advanceFromSelect(dev.id, col.key)}
                          value={value || "__unassigned__"}
                          onValueChange={(v) => {
                            handleSelectChange(dev.id, col.key, v);
                            advanceFromSelect(dev.id, col.key);
                          }}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__">{"\u00A0"}</SelectItem>
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
                  const filteredDevs = developers.filter(d => d.active);
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
                            autoOpen={editingCell?.id === dev.id && editingCell?.field === col.key}
                            onClose={() => clearEditingIfCurrent(dev.id, col.key)}
                            onAdvance={() => advanceFromSelect(dev.id, col.key)}
                            value={value || "__unassigned__"}
                            onValueChange={(v) => {
                              const devId = v === '__unassigned__' ? null : (v || null);
                              const selectedDev = devId ? developers.find(d => d.id === devId) : null;
                              handleFieldChange(dev.id, {
                                developerId: devId,
                                empresaTipo: selectedDev?.tipo || null,
                              });
                              advanceFromSelect(dev.id, col.key);
                            }}
                          >
                            <SelectTrigger className="h-6 text-xs border-0 bg-transparent flex-1 min-w-0">
                              <SelectValue placeholder="" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__unassigned__">{"\u00A0"}</SelectItem>
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
                          autoOpen={editingCell?.id === dev.id && editingCell?.field === col.key}
                          onClose={() => clearEditingIfCurrent(dev.id, col.key)}
                          onAdvance={() => advanceFromSelect(dev.id, col.key)}
                          value={value || "__unassigned__"}
                          onValueChange={(v) => { handleSelectChange(dev.id, col.key, v); advanceFromSelect(dev.id, col.key); }}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__">{"\u00A0"}</SelectItem>
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
                          autoOpen={editingCell?.id === dev.id && editingCell?.field === col.key}
                          onClose={() => clearEditingIfCurrent(dev.id, col.key)}
                          onAdvance={() => advanceFromSelect(dev.id, col.key)}
                          value={value || "__unassigned__"}
                          onValueChange={(v) => { handleSelectChange(dev.id, col.key, v); advanceFromSelect(dev.id, col.key); }}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__">{"\u00A0"}</SelectItem>
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
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent" data-testid={`select-tipos-${dev.id}`}>
                            <SelectValue>
                              <span>{selectedTipo || ''}</span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__">{"\u00A0"}</SelectItem>
                            {developerTipos.map((tipo: string) => (
                              <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                            ))}
                          </SelectContent>
                        </ExclusiveSelect>
                      ) : (
                        <div className="flex items-center gap-1 px-1">
                          <span className={cn('text-xs', cellTextClass)}>
                            {selectedTipo || ''}
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
                          autoOpen={editingCell?.id === dev.id && editingCell?.field === col.key}
                          onClose={() => clearEditingIfCurrent(dev.id, col.key)}
                          onAdvance={() => advanceFromSelect(dev.id, col.key)}
                          value={value?.toString() || "__unassigned__"}
                          onValueChange={(v) => { handleSelectChange(dev.id, col.key, v === "__unassigned__" ? "" : v); advanceFromSelect(dev.id, col.key); }}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__">{"\u00A0"}</SelectItem>
                            {catalogTorres.filter((t: any) => t.active !== false).map((t: any) => (
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

                if (col.type === 'niveles-select') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      {fieldCanEdit ? (
                        <ExclusiveSelect
                          autoOpen={editingCell?.id === dev.id && editingCell?.field === col.key}
                          onClose={() => clearEditingIfCurrent(dev.id, col.key)}
                          onAdvance={() => advanceFromSelect(dev.id, col.key)}
                          value={value?.toString() || "__unassigned__"}
                          onValueChange={(v) => { handleSelectChange(dev.id, col.key, v === "__unassigned__" ? "" : v); advanceFromSelect(dev.id, col.key); }}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="__unassigned__">{"\u00A0"}</SelectItem>
                            {catalogNiveles.filter((n: any) => n.active !== false).map((n: any) => (
                              <SelectItem key={n.id} value={n.name}>{n.name}</SelectItem>
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
                              <span className="truncate">{arrValue.length > 0 ? `${arrValue.length}` : ""}</span>
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
                          <span className={cn("text-xs truncate", cellTextClass)}>{arrValue.length > 0 ? `${arrValue.length}` : ""}</span>
                          
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
                              <span className="truncate">{arrValue.length > 0 ? `${arrValue.length}` : ""}</span>
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
                          <span className={cn("text-xs truncate", cellTextClass)}>{arrValue.length > 0 ? `${arrValue.length}` : ""}</span>
                          
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
                              <span className="truncate">{arrValue.length > 0 ? `${arrValue.length}` : ""}</span>
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
                          <span className={cn("text-xs truncate", cellTextClass)}>{arrValue.length > 0 ? `${arrValue.length}` : ""}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'recamaras-select') {
                  const devTiposR = (dev.tipos as string[] | null) || [];
                  const isDepaR = devTiposR.some(t => t.toLowerCase().includes('departamento') || t.toLowerCase().includes('depa'));
                  const recamarasDisabled = !isDepaR && !hasFullAccess;
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit || recamarasDisabled }))} style={{ width: col.width, minWidth: col.width, ...(isRowInactive ? inactiveCellStyle : recamarasDisabled ? { backgroundColor: '#f3f4f6' } : {}) }}>
                      {fieldCanEdit && !recamarasDisabled ? (
                        <ExclusiveSelect
                          autoOpen={editingCell?.id === dev.id && editingCell?.field === col.key}
                          onClose={() => clearEditingIfCurrent(dev.id, col.key)}
                          onAdvance={() => advanceFromSelect(dev.id, col.key)}
                          value={value || "__unassigned__"}
                          onValueChange={(v) => { handleSelectChange(dev.id, col.key, v); advanceFromSelect(dev.id, col.key); }}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent" data-testid={`select-recamaras-${dev.id}`}>
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__">{"\u00A0"}</SelectItem>
                            {catalogRecamaras.filter((r: any) => r.active !== false).map((r: any) => (
                              <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
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
                          autoOpen={editingCell?.id === dev.id && editingCell?.field === col.key}
                          onClose={() => clearEditingIfCurrent(dev.id, col.key)}
                          onAdvance={() => advanceFromSelect(dev.id, col.key)}
                          value={value || "__unassigned__"}
                          onValueChange={(v) => { handleSelectChange(dev.id, col.key, v); advanceFromSelect(dev.id, col.key); }}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent" data-testid={`select-banos-${dev.id}`}>
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__">{"\u00A0"}</SelectItem>
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


                if (col.type === 'phone-list') {
                  const phoneList = parsePhoneList(value as string);
                  const savePhones = (phones: string[]) => {
                    const stored = phones.length <= 1 ? (phones[0] || '') : JSON.stringify(phones);
                    handleFieldChange(dev.id, { [col.key]: stored || null });
                  };
                  return (
                    <div
                      key={col.key}
                      className={cn("spreadsheet-cell flex-shrink-0 overflow-hidden", getCellStyle({ type: "input", disabled: !fieldCanEdit }))}
                      style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}
                      data-testid={`cell-${col.key}-${dev.id}`}
                    >
                      {fieldCanEdit ? (
                        <Popover modal>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full justify-between text-xs font-normal h-full px-1">
                              <span className="truncate">{phoneList.length > 0 ? phoneList[0] : ""}</span>
                              {phoneList.length > 1 && <span className="text-[10px] ml-0.5 opacity-60 shrink-0">+{phoneList.length - 1}</span>}
                              <ChevronDown className="w-3 h-3 ml-1 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-2">
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-1">
                                <Input
                                  placeholder="10 dígitos..."
                                  className="h-7 text-xs"
                                  maxLength={10}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const val = (e.target as HTMLInputElement).value.replace(/\D/g, '');
                                      if (val.length === 10 && !phoneList.includes(val)) {
                                        savePhones([...phoneList, val]);
                                      }
                                      (e.target as HTMLInputElement).value = '';
                                    }
                                  }}
                                />
                              </div>
                              {phoneList.length > 0 && (
                                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                                  {phoneList.map((phone, idx) => (
                                    <div key={idx} className="flex items-center justify-between gap-1 px-1 py-0.5 rounded bg-muted/50">
                                      <span className="text-xs truncate">{phone}</span>
                                      <button onClick={() => savePhones(phoneList.filter((_, i) => i !== idx))} className="flex-shrink-0 cursor-pointer">
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
                          <span className={cn("text-xs truncate", cellTextClass)}>{phoneList.length > 0 ? phoneList[0] : ""}</span>
                          {phoneList.length > 1 && <span className="text-[10px] opacity-60 shrink-0">+{phoneList.length - 1}</span>}
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'redaccion-text') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "input", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      <div
                        className="w-full h-full flex items-center px-2 cursor-pointer"
                        onClick={() => {
                          if (fieldCanEdit) {
                            setTextDetail({
                              title: 'Descripción',
                              value: String(value || ''),
                              editable: true,
                              onSave: (newVal) => handleFieldChange(dev.id, { [col.key]: newVal || null }),
                            });
                          } else {
                            setTextDetail({ title: 'Descripción', value: String(value || ''), editable: false });
                          }
                        }}
                        title={value || ""}
                        data-testid={`input-redaccion-${dev.id}`}
                      >
                        <span className={cn("text-xs truncate", cellTextClass)}>{value || ""}</span>
                      </div>
                    </div>
                  );
                }

                if (col.type === 'calculated-percent') {
                  const calcFrom = col.calcFrom;
                  let percentValue = '';
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
                              <span className="truncate">{arrValue.length > 0 ? `${arrValue.length}` : ""}</span>
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
                          <span className={cn("text-xs truncate", cellTextClass)}>{arrValue.length > 0 ? `${arrValue.length}` : ""}</span>
                          
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
                          autoOpen={editingCell?.id === dev.id && editingCell?.field === col.key}
                          onClose={() => clearEditingIfCurrent(dev.id, col.key)}
                          onAdvance={() => advanceFromSelect(dev.id, col.key)}
                          value={value || "__unassigned__"}
                          onValueChange={(v) => { handleSelectChange(dev.id, col.key, v); advanceFromSelect(dev.id, col.key); }}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__">{"\u00A0"}</SelectItem>
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
                          autoOpen={editingCell?.id === dev.id && editingCell?.field === col.key}
                          onClose={() => clearEditingIfCurrent(dev.id, col.key)}
                          onAdvance={() => advanceFromSelect(dev.id, col.key)}
                          value={value || "__unassigned__"}
                          onValueChange={(v) => { handleSelectChange(dev.id, col.key, v); advanceFromSelect(dev.id, col.key); }}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__">{"\u00A0"}</SelectItem>
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
                          autoOpen={editingCell?.id === dev.id && editingCell?.field === col.key}
                          onClose={() => clearEditingIfCurrent(dev.id, col.key)}
                          onAdvance={() => advanceFromSelect(dev.id, col.key)}
                          value={value || "__unassigned__"}
                          onValueChange={(v) => { handleSelectChange(dev.id, col.key, v); advanceFromSelect(dev.id, col.key); }}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__">{"\u00A0"}</SelectItem>
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
                  const docCount = devDocCounts[dev.id] || 0;
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0 justify-center", !isRowInactive && "bg-yellow-100 dark:bg-yellow-900/30", getCellStyle({ type: "actions" }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      <Link
                        href={`/admin/documentos?developmentId=${dev.id}&sectionType=${col.folderSection}`}
                        className="text-yellow-700 dark:text-yellow-400 hover:text-yellow-800 flex items-center justify-center gap-1"
                        data-testid={`link-${col.folderSection}-${dev.id}`}
                      >
                        <FolderOpen className="w-4 h-4" />
                        <span className="text-xs font-medium">{docCount}</span>
                      </Link>
                    </div>
                  );
                }

                if (col.type === 'actions') {
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0 justify-center", getCellStyle({ type: "actions" }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
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

                if (col.key === 'tiempoTransc') {
                  const elapsed = calcTiempoTranscurrido(dev.inicioPreventa as string);
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "calculated" }))}
                      style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle, ...(!isRowInactive ? { backgroundColor: 'rgb(255,241,220)' } : {}) }}
                      data-testid={`cell-${col.key}-${dev.id}`}
                    >
                      <span className="truncate text-xs">{elapsed}</span>
                    </div>
                  );
                }

                if (col.isDateColumn) {
                  const storedValue = (value && value !== 'null' && value !== 'undefined') ? String(value) : '';
                  const displayValue = formatDateShort(storedValue);
                  return (
                    <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "input", disabled: !fieldCanEdit, isEditing }))}
                      style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}
                      onClick={() => fieldCanEdit && !isEditing && handleCellClick(dev.id, col.key, displayValue || storedValue)}
                      data-testid={`cell-${col.key}-${dev.id}`}
                    >
                      {isEditing && fieldCanEdit ? (
                        <Input
                          defaultValue={displayValue || editValue}
                          placeholder="dd/mm/aa"
                          onBlur={(e) => {
                            const raw = e.target.value.trim();
                            if (!raw) { handleCellBlur(dev.id, col.key, col, ""); return; }
                            const iso = parseDateInput(raw);
                            if (iso) { handleCellBlur(dev.id, col.key, col, iso); }
                            else { toast({ title: "Formato inválido", description: "Usa dd/mm/aa", variant: "destructive" }); setEditingCell(null); }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Tab" || e.key === "Enter") {
                              e.preventDefault();
                              const raw = (e.target as HTMLInputElement).value.trim();
                              if (!raw) { navigateToNextCell(dev.id, col.key, ""); return; }
                              const iso = parseDateInput(raw);
                              if (iso) { navigateToNextCell(dev.id, col.key, iso); }
                              else { toast({ title: "Formato inválido", description: "Usa dd/mm/aa", variant: "destructive" }); setEditingCell(null); }
                            }
                            if (e.key === "Escape") setEditingCell(null);
                          }}
                          autoFocus
                          onFocus={(e) => e.target.select()}
                          className={CELL_INPUT_CLASS}
                          data-testid={`input-${col.key}-${dev.id}`}
                        />
                      ) : (
                        <span className="truncate text-xs">{displayValue || ''}</span>
                      )}
                    </div>
                  );
                }

                const rawDisplayValue = Array.isArray(value) ? value.join(', ') : String(value ?? '');
                const displayValue = rawDisplayValue && col.suffix ? `${rawDisplayValue} ${col.suffix}` : rawDisplayValue;
                const isLongText = false; // name column now uses inline editing

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
                              if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); navigateToNextCell(dev.id, col.key, (e.target as HTMLInputElement).value); }
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            onPaste={filterType ? createPasteFilter(filterType) : undefined}
                            onFocus={(e) => e.target.select()}
                            className={CELL_INPUT_CLASS}
                            autoFocus
                            type={col.type === 'number' ? 'number' : 'text'}
                            data-testid={`input-${col.key}-${dev.id}`}
                          />
                        );
                      })()
                    ) : (
                      <div
                        className={cn("flex items-center gap-1 cursor-pointer", col.type === 'number' && "justify-end w-full pr-2")}
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
        <Button size="icon" variant="ghost" className={cn("h-6 w-6", hasFullAccess ? "rounded-none" : "rounded-t-none")} onClick={zoomOut} disabled={zoomLevel <= 50}>
          <Minus className="h-3 w-3" />
        </Button>
        {hasFullAccess && (
          <>
            <div className="h-px w-3 bg-border" />
            <RecycleBinDrawer config={{
              entityLabel: "Desarrollos",
              deletedEndpoint: "/api/developments-entity/deleted",
              restoreEndpoint: (id) => `/api/developments-entity/${id}/restore`,
              invalidateKeys: ["/api/developments-entity"],
              getItemLabel: (item) => item.name || 'Sin nombre',
              getItemSubLabel: (item) => item.city || '',
            }} />
          </>
        )}
      </div>
    </div>
  );
}
