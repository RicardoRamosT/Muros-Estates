import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFieldPermissions } from "@/hooks/use-field-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ColumnFilter, useColumnFilters, type SortDirection, type FilterState } from "@/components/ui/column-filter";
import { Plus, Minus, Trash2, Building2, Loader2, Lock, Eye, FolderOpen, X, ChevronDown, Save, Clock, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getCellStyle, getCellTypeFromColumnType, formatDate, formatTime, type CellType, SHEET_COLOR_DARK, SHEET_COLOR_LIGHT } from "@/lib/spreadsheet-utils";
import { SpreadsheetHeader } from "@/components/ui/spreadsheet-shared";
import type { Developer } from "@shared/schema";
import { cn } from "@/lib/utils";

const DESARROLLO_TIPOS = [
  { value: "Residencial", label: "Residencial" },
  { value: "Comercial", label: "Comercial" },
  { value: "Oficinas", label: "Oficinas" },
  { value: "Salud", label: "Salud" },
];

const EMPRESA_TIPOS = [
  { value: "Desarrollador", label: "Desarrollador" },
  { value: "Comercializadora", label: "Comercializadora" },
  { value: "Constructora", label: "Constructora" },
  { value: "Arquitectos", label: "Arquitectos" },
];

const COLUMN_GROUPS_DEV = [
  { key: 'corner', label: '', color: '' },
  { key: 'registro', label: 'REGISTRO', color: SHEET_COLOR_DARK },
  { key: 'empresa', label: 'EMPRESA', color: SHEET_COLOR_LIGHT },
  { key: 'fiscal', label: 'FISCAL', color: SHEET_COLOR_DARK },
  { key: 'tipos', label: 'TIPOS', color: SHEET_COLOR_LIGHT },
  { key: 'contacto', label: 'CONTACTO', color: SHEET_COLOR_DARK },
  { key: 'docs', label: '', color: '' },
];


function calcAntiguedad(fecha: Date | string | null): string {
  if (!fecha) return "";
  const start = new Date(fecha);
  if (isNaN(start.getTime())) return "";
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years > 0 && months > 0) return `${years}a ${months}m`;
  if (years > 0) return `${years} año${years > 1 ? 's' : ''}`;
  if (months > 0) return `${months} mes${months > 1 ? 'es' : ''}`;
  return "< 1 mes";
}

// RFC validation: 12-13 digits, uppercase
function validateRFC(value: string): { isValid: boolean; message: string } {
  const rfcClean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (rfcClean.length < 12 || rfcClean.length > 13) {
    return { isValid: false, message: "RFC debe tener 12 o 13 caracteres" };
  }
  return { isValid: true, message: "" };
}

interface ColumnDef {
  key: string;
  label: string;
  width: string;
  type?: 'index' | 'toggle' | 'text' | 'actions' | 'folder-link' | 'date' | 'multiselect' | 'rfc' | 'tipo-select' | 'date-display' | 'time-display' | 'select';
  autoField?: boolean;
  group?: string;
  cellType?: CellType;
}

function isDeveloperComplete(dev: Developer): boolean {
  return !!(
    dev.tipo && dev.name && dev.razonSocial && dev.rfc && dev.domicilio &&
    dev.tipos?.length && dev.contratos?.length && dev.representante &&
    dev.contactName && dev.contactPhone && dev.contactEmail
  );
}

export function DevelopersSpreadsheet() {
  const { toast } = useToast();
  const { canView, canEdit, hasFullAccess, role, canAccess } = useFieldPermissions('desarrolladores');
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const LONG_TEXT_FIELDS = ['name', 'razonSocial', 'domicilio', 'representante', 'contactName', 'contactPhone', 'contactEmail'];
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const COLLAPSED_COL_WIDTH = 20;
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const toggleColumn = (key: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const pendingChangesRef = useRef<Map<string, Partial<Developer>>>(new Map());
  const [localEdits, setLocalEdits] = useState<Record<string, Partial<Developer>>>({});
  const [activeEditingRowId, setActiveEditingRowId] = useState<string | null>(null);
  const saveRowByIdRef = useRef<(id: string) => Promise<void>>(async () => {});
  const [pendingChangesVersion, setPendingChangesVersion] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  const { data: developers = [], isLoading } = useQuery<Developer[]>({
    queryKey: ["/api/developers"],
  });

  const { data: catalogContratos = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/catalog/tipo-contrato"],
  });

  const { data: catalogCities = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/catalog/cities"],
  });
  const { data: catalogZones = [] } = useQuery<{ id: string; name: string; cityId?: string }[]>({
    queryKey: ["/api/catalog/zones"],
  });

  const allColumns: ColumnDef[] = [
    { key: "id", label: "ID", width: "60px", type: "index", autoField: true, cellType: "index", group: "corner" },
    { key: "active", label: "Act.", width: "70px", type: "toggle", cellType: "checkbox", group: "registro" },
    { key: "createdDate", label: "Fecha", width: "80px", type: "date-display", group: "registro", cellType: "readonly" },
    { key: "createdTime", label: "Hora", width: "66px", type: "time-display", group: "registro", cellType: "readonly" },
    { key: "antiguedadCalc", label: "Antigüedad", width: "100px", autoField: true, cellType: "readonly", group: "empresa" },
    { key: "tipo", label: "Tipo", width: "120px", type: "tipo-select", cellType: "dropdown", group: "empresa" },
    { key: "ciudad", label: "Ciudad", width: "100px", type: "select", cellType: "dropdown", group: "empresa" },
    { key: "zona", label: "Zona", width: "120px", type: "select", cellType: "dropdown", group: "empresa" },
    { key: "name", label: "Desarrollador", width: "170px", cellType: "input", group: "empresa" },
    { key: "razonSocial", label: "Razón Social", width: "250px", cellType: "input", group: "fiscal" },
    { key: "rfc", label: "RFC", width: "100px", type: "rfc", cellType: "input", group: "fiscal" },
    { key: "domicilio", label: "Domicilio", width: "250px", cellType: "input", group: "fiscal" },
    { key: "tipos", label: "Tipos", width: "140px", type: "multiselect", cellType: "dropdown", group: "tipos" },
    { key: "contratos", label: "Contratos", width: "140px", type: "multiselect", cellType: "dropdown", group: "tipos" },
    { key: "representante", label: "Representante", width: "170px", cellType: "input", group: "contacto" },
    { key: "contactName", label: "Ventas", width: "170px", cellType: "input", group: "contacto" },
    { key: "contactPhone", label: "Teléfono", width: "110px", cellType: "input", group: "contacto" },
    { key: "contactEmail", label: "Correo", width: "170px", cellType: "input", group: "contacto" },
    { key: "legales", label: "Legales", width: "80px", type: "folder-link", cellType: "actions", group: "docs" },
    { key: "actions", label: "", width: "60px", type: "actions", cellType: "actions", group: "docs" },
  ];

  const columns = useMemo(() => {
    let cols = allColumns.filter(col => {
      if (col.group === 'corner' || col.group === 'registro' || col.type === 'index' || col.type === 'actions' || col.type === 'folder-link' || col.autoField) return true;
      return canView(col.key);
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
  }, [canView, collapsedGroups, collapsedColumns]);

  const effectiveDevelopers = useMemo(() =>
    developers.map(d => ({ ...d, ...(localEdits[d.id] || {}) })),
    [developers, localEdits]
  );

  useEffect(() => {
    const handleBeforeUnload = () => {
      pendingChangesRef.current.forEach((changes, id) => {
        if (Object.keys(changes).length > 0) {
          fetch(`/api/developers/${id}`, {
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
  } = useColumnFilters(effectiveDevelopers, columns);

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
    const groupLookup = Object.fromEntries(COLUMN_GROUPS_DEV.map(g => [g.key, g]));
    const runs: { key: string; label: string; color: string; colspan: number }[] = [];
    let currentGroup: string | null = null;
    columns.forEach(col => {
      const g = col.group || '';
      if (g !== currentGroup) {
        const groupDef = groupLookup[g] || { key: g, label: '', color: '' };
        runs.push({ key: groupDef.key, label: groupDef.label, color: groupDef.color || '', colspan: 1 });
        currentGroup = g;
      } else {
        runs[runs.length - 1].colspan++;
      }
    });
    return runs;
  }, [columns]);

  const groupLookupMap = useMemo(() => Object.fromEntries(COLUMN_GROUPS_DEV.map(g => [g.key, g])), []);

  const sectionGroupsForSearch = useMemo(() => {
    const result: { label: string; offset: number; width: number }[] = [];
    let offset = 0;
    let currentGroupKey = '';
    for (const col of columns) {
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
  }, [columns, groupLookupMap]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<Developer>) => 
      apiRequest("POST", "/api/developers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developers"] });
      toast({ title: "Desarrollador creado" });
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Developer> }) =>
      apiRequest("PUT", `/api/developers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developers"] });
    },
    onError: () => toast({ title: "Error al actualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/developers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developers"] });
      toast({ title: "Desarrollador eliminado" });
      setDeleteId(null);
    },
    onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
  });

  const handleCellClick = useCallback((id: string, field: string, currentValue: string | boolean | null) => {
    setEditingCell({ id, field });
    setEditValue(String(currentValue ?? ""));
  }, []);

  const handleFieldChange = useCallback((id: string, data: Partial<Developer>) => {
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

  const handleCellBlur = useCallback((id: string, field: string, inputValue?: string) => {
    if (!editingCell || editingCell.id !== id || editingCell.field !== field) return;
    
    let valueToSave = inputValue !== undefined ? inputValue : editValue;
    
    if (field === 'rfc' && valueToSave) {
      valueToSave = valueToSave.toUpperCase();
      const validation = validateRFC(valueToSave);
      if (!validation.isValid) {
        toast({ title: validation.message, variant: "destructive" });
        setEditingCell(null);
        return;
      }
    }
    
    handleFieldChange(id, { [field]: valueToSave || null });
    setEditingCell(null);
  }, [editingCell, editValue, handleFieldChange, toast]);

  const handleMultiselectChange = useCallback((id: string, field: string, selectedValues: string[]) => {
    handleFieldChange(id, { [field]: selectedValues });
  }, [handleFieldChange]);

  const handleDateChange = useCallback((id: string, field: string, value: string) => {
    const dateValue = value ? new Date(value) : null;
    handleFieldChange(id, { [field]: dateValue });
  }, [handleFieldChange]);

  const handleActiveToggle = useCallback((id: string, newValue: boolean | null) => {
    updateMutation.mutate({ id, data: { active: newValue } });
  }, [updateMutation]);

  const handleCreateNew = () => {
    // Generate unique name with random suffix to avoid duplicate key errors
    const uniqueSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    createMutation.mutate({
      name: `Nuevo Desarrollador ${uniqueSuffix}`,
      active: false,
    });
  };

  const filterLabelMaps = useMemo<Record<string, Record<string, string>>>(() => ({
    active: { "true": "Sí", "false": "No" },
    id: Object.fromEntries(effectiveDevelopers.map((d, i) => [d.id, String(i + 1)])),
  }), [effectiveDevelopers]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <Lock className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Acceso Denegado</h3>
        <p className="text-muted-foreground">No tienes permisos para ver esta sección.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="developers-spreadsheet">
      <div className="flex items-center justify-between px-3 py-1.5 border-b">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-bold" data-testid="text-page-title">Desarrolladores</h1>
          {!hasFullAccess && (
            <Badge variant="outline" className="text-xs">
              <Eye className="w-3 h-3 mr-1" />
              Solo lectura
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
          <span className="text-xs text-muted-foreground">{filteredAndSortedData.length} desarrolladores</span>
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
            data-testid="button-save-pending-developers"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Guardar{pendingRowCount > 1 ? ` (${pendingRowCount})` : ""}
          </Button>
          {hasFullAccess && (
            <Button size="sm" onClick={handleCreateNew} disabled={createMutation.isPending} data-testid="button-add-developer">
              <Plus className="w-4 h-4 mr-1" />
              Nuevo
            </Button>
          )}
        </div>
      </div>
      
      <div ref={contentScrollRef} className="flex-1 overflow-auto spreadsheet-scroll">
        <div className="min-w-max text-xs">
          {/* Header: Three-row structure (matches Tipologías) */}
          <SpreadsheetHeader
            visibleColumns={columns}
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

          {/* Data rows */}
          {visibleData.map((dev, index) => {
            const isRowInactive = dev.active === null;
            const isActiveRow = activeEditingRowId === dev.id;
            const inactiveCellStyle: React.CSSProperties = isRowInactive
              ? { backgroundColor: '#9ca3af' }
              : {};
            return (
            <div
              key={dev.id}
              className={cn(
                "flex border-b group",
                isRowInactive
                  ? ""
                  : isActiveRow
                    ? "ring-1 ring-blue-400/50 bg-blue-50/30 dark:bg-blue-950/20"
                    : index % 2 === 0 ? "bg-background" : "bg-muted/10"
              )}
              style={{ height: '32px', maxHeight: '32px', ...(isRowInactive ? { backgroundColor: '#9ca3af' } : {}) }}
              data-testid={`row-developer-${dev.id}`}
              onClick={() => handleRowClick(dev.id)}
            >
              {columns.map((col) => {
                const field = col.key;
                const fieldCanEdit = canEdit(field);
                const isEditing = editingCell?.id === dev.id && editingCell?.field === field;
                const cellType = col.cellType || getCellTypeFromColumnType(col.type);
                
                if (col.type === 'index') {
                  const isCompleteForDot = isDeveloperComplete(dev);
                  const dotColor = dev.active === null
                    ? '#6b7280'
                    : isCompleteForDot
                      ? (dev.active === true ? '#15803d' : '#F16100')
                      : '#ef4444';
                  return (
                    <div
                      key={field}
                      className="spreadsheet-cell flex-shrink-0 justify-center sticky left-0 z-10 relative border-r border-b"
                      style={{ width: col.width, minWidth: col.width, backgroundColor: SHEET_COLOR_LIGHT, color: 'white', height: 32 }}
                      title={dev.id}
                    >
                      <span className="text-xs font-medium">{index + 1}</span>
                      <span
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                        style={{ backgroundColor: dotColor }}
                      />
                    </div>
                  );
                }
                
                if (col.type === 'date-display') {
                  return (
                    <div key={field} className={cn("spreadsheet-cell flex-shrink-0 px-1", getCellStyle({ type: "readonly" }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }} data-testid={`cell-${field}-${dev.id}`}>
                      <span className="text-xs text-muted-foreground">{formatDate(dev.createdAt)}</span>
                    </div>
                  );
                }

                if (col.type === 'time-display') {
                  return (
                    <div key={field} className={cn("spreadsheet-cell flex-shrink-0 px-1", getCellStyle({ type: "readonly" }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }} data-testid={`cell-${field}-${dev.id}`}>
                      <span className="text-xs text-muted-foreground">{formatTime(dev.createdAt)}</span>
                    </div>
                  );
                }

                if (col.type === 'group-collapsed') {
                  const groupDef = groupLookupMap[col.group || ''];
                  return (
                    <div key={col.key} className="spreadsheet-cell flex-shrink-0 border-r border-b" style={{ width: '30px', minWidth: '30px', backgroundColor: groupDef?.color ? `${groupDef.color}22` : '#f3f4f6' }} />
                  );
                }

                if (collapsedColumns.has(col.key)) {
                  return (
                    <div
                      key={field}
                      className="spreadsheet-cell flex-shrink-0"
                      style={{ width: COLLAPSED_COL_WIDTH, minWidth: COLLAPSED_COL_WIDTH, ...inactiveCellStyle }}
                    />
                  );
                }

                if (col.type === 'toggle') {
                  const isComplete = isDeveloperComplete(dev);
                  const isDisabled = dev.active === null || dev.active === undefined;
                  const activeState = isDisabled ? "disabled" : (dev.active === true && isComplete) ? "active" : (isComplete ? "ready" : "incomplete");
                  const bgColor = isRowInactive ? '#9ca3af' : activeState === "active" ? "#dcfce7" : activeState === "ready" ? "#FDCDB0" : activeState === "disabled" ? "#9ca3af" : "#fee2e2";
                  const dotColor = activeState === "active" ? "#15803d" : activeState === "ready" ? "#F16100" : activeState === "disabled" ? "#1f2937" : "#dc2626";
                  const textStyle: React.CSSProperties = activeState === "active" ? { color: "#15803d", fontWeight: 600 } : activeState === "ready" ? { color: "#C04D00", fontWeight: 600 } : activeState === "disabled" ? { color: "#1f2937", fontWeight: 500 } : { color: "#dc2626", fontWeight: 500 };
                  const label = activeState === "active" ? "Sí" : activeState === "disabled" ? "Deshabilitado" : "No";
                  return (
                    <div 
                      key={field} 
                      className={cn("spreadsheet-cell flex-shrink-0 px-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))}
                      style={{ width: col.width, minWidth: col.width, backgroundColor: bgColor }}
                    >
                      {fieldCanEdit ? (
                        <Select
                          value={activeState === "active" ? "active" : activeState === "disabled" ? "disabled" : "no"}
                          onValueChange={(v) => {
                            if (v === "disabled") handleActiveToggle(dev.id, null);
                            else if (v === "active") { if (isComplete) handleActiveToggle(dev.id, true); }
                            else handleActiveToggle(dev.id, false);
                          }}
                        >
                          <SelectTrigger 
                            className="h-6 w-full text-xs border-0 bg-transparent px-1 !justify-center gap-1 [&_svg]:h-3 [&_svg]:w-3 focus:ring-0 focus:ring-offset-0"
                            style={textStyle}
                            data-testid={`toggle-active-${dev.id}`}
                          >
                            <span style={{ color: dotColor }} className="text-[8px] leading-none">●</span>
                            <span className="truncate">{label}</span>
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
                        </Select>
                      ) : (
                        <div className="flex items-center justify-center gap-1 px-1" style={textStyle}>
                          <span style={{ color: dotColor }} className="text-[8px] leading-none">●</span>
                          <span>{label}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }
                
                if (col.type === 'tipo-select') {
                  const tipoValue = dev.tipo || '';
                  return (
                    <div
                      key={field}
                      className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))}
                      style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}
                      data-testid={`cell-${field}-${dev.id}`}
                    >
                      {fieldCanEdit ? (
                        <Select
                          value={tipoValue || "__empty__"}
                          onValueChange={(v) => {
                            const val = v === "__empty__" ? "" : v;
                            handleFieldChange(dev.id, { tipo: val as any });
                          }}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent px-2">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__empty__">Seleccionar</SelectItem>
                            {EMPRESA_TIPOS.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1 px-2">
                          <span className="truncate text-xs">{tipoValue}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'select') {
                  const selectValue = (dev[field as keyof Developer] as string) || '';
                  const isCiudad = col.key === 'ciudad';
                  const isZona = col.key === 'zona';
                  let selectOptions: { value: string; label: string }[] = [];
                  if (isCiudad) {
                    selectOptions = catalogCities.map(c => ({ value: c.name, label: c.name }));
                  } else if (isZona) {
                    const devCiudad = (dev as any).ciudad || '';
                    const cityRecord = catalogCities.find(c => c.name === devCiudad);
                    const filtered = cityRecord
                      ? catalogZones.filter(z => z.cityId === cityRecord.id)
                      : catalogZones;
                    selectOptions = filtered.map(z => ({ value: z.name, label: z.name }));
                  }
                  return (
                    <div
                      key={field}
                      className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))}
                      style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}
                      data-testid={`cell-${field}-${dev.id}`}
                    >
                      {fieldCanEdit ? (
                        <Select
                          value={selectValue || "__empty__"}
                          onValueChange={(v) => {
                            const val = v === "__empty__" ? "" : v;
                            handleFieldChange(dev.id, { [field]: val } as any);
                          }}
                        >
                          <SelectTrigger className="h-6 text-xs border-0 bg-transparent px-2">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__empty__">Seleccionar</SelectItem>
                            {selectOptions.map(o => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1 px-2">
                          <span className="truncate text-xs">{selectValue}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.key === 'antiguedadCalc') {
                  const calculated = calcAntiguedad(dev.createdAt);
                  return (
                    <div
                      key={field}
                      className={cn("spreadsheet-cell flex-shrink-0 px-2", getCellStyle({ type: "readonly" }))}
                      style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}
                      data-testid={`cell-${field}-${dev.id}`}
                    >
                      <span className="text-xs text-muted-foreground">{calculated}</span>
                    </div>
                  );
                }

                if (col.type === 'folder-link') {
                  return (
                    <div key={field} className={cn("spreadsheet-cell flex-shrink-0 justify-center bg-yellow-100 dark:bg-yellow-900/30", getCellStyle({ type: "actions" }))} style={{ width: col.width, minWidth: col.width }}>
                      <a
                        href={`/admin/documentos?developerId=${dev.id}&sectionType=legales`}
                        className="inline-flex items-center gap-1.5 text-amber-700 hover:underline text-xs"
                        data-testid={`link-legales-${dev.id}`}
                      >
                        <FolderOpen className="w-4 h-4" />
                        <span>Ver</span>
                      </a>
                    </div>
                  );
                }
                
                if (col.type === 'actions') {
                  return (
                    <div key={field} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "actions" }))} style={{ width: col.width, minWidth: col.width }}>
                      {hasFullAccess && (
                        <Dialog open={deleteId === dev.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                          <DialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(dev.id)}
                              data-testid={`button-delete-${dev.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Eliminar Desarrollador</DialogTitle>
                            </DialogHeader>
                            <p>¿Estás seguro de eliminar "{dev.name}"? Esta acción no se puede deshacer.</p>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Cancelar</Button>
                              </DialogClose>
                              <Button
                                variant="destructive"
                                onClick={() => deleteMutation.mutate(dev.id)}
                                disabled={deleteMutation.isPending}
                                data-testid="button-confirm-delete"
                              >
                                Eliminar
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  );
                }

                if (col.type === 'date') {
                  const dateValue = dev[field as keyof Developer] as Date | string | null;
                  const formattedDate = dateValue ? new Date(dateValue).toISOString().split('T')[0] : '';
                  return (
                    <div
                      key={field}
                      className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "date", disabled: !fieldCanEdit }))}
                      style={{ width: col.width, minWidth: col.width }}
                      data-testid={`cell-${field}-${dev.id}`}
                    >
                      {fieldCanEdit ? (
                        <Input
                          type="date"
                          value={formattedDate}
                          onChange={(e) => handleDateChange(dev.id, field, e.target.value)}
                          className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                          data-testid={`input-${field}-${dev.id}`}
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="truncate">{formatDate(dateValue)}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'multiselect') {
                  const currentValues = (dev[field as keyof Developer] as string[] | null) || [];
                  const displayValue = currentValues.length > 0 
                    ? `${currentValues.length} seleccionados`
                    : '';
                  const options = col.key === 'contratos'
                    ? catalogContratos.map(c => ({ value: c.name, label: c.name }))
                    : DESARROLLO_TIPOS;
                  
                  return (
                    <div
                      key={field}
                      className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))}
                      style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}
                      data-testid={`cell-${field}-${dev.id}`}
                    >
                      {fieldCanEdit ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-6 w-full justify-between px-1 text-left font-normal text-xs"
                              data-testid={`select-${col.key}-${dev.id}`}
                            >
                              <span className="truncate">{displayValue || 'Seleccionar...'}</span>
                              <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-2" align="start">
                            <div className="space-y-1">
                              {options.map((opt) => (
                                <label
                                  key={opt.value}
                                  className="flex items-center gap-2 px-2 py-1 hover:bg-muted rounded cursor-pointer"
                                >
                                  <Checkbox
                                    checked={currentValues.includes(opt.value)}
                                    onCheckedChange={(checked) => {
                                      const newValues = checked
                                        ? [...currentValues, opt.value]
                                        : currentValues.filter(v => v !== opt.value);
                                      handleMultiselectChange(dev.id, field, newValues);
                                    }}
                                    data-testid={`checkbox-${col.key}-${opt.value}-${dev.id}`}
                                  />
                                  <span className="text-xs">{opt.label}</span>
                                </label>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="truncate">{displayValue}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.type === 'rfc') {
                  const value = dev[field as keyof Developer] as string;
                  return (
                    <div
                      key={field}
                      className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: cellType, disabled: !fieldCanEdit, isEditing }))}
                      style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}
                      onClick={() => fieldCanEdit && handleCellClick(dev.id, field, value)}
                      data-testid={`cell-${field}-${dev.id}`}
                    >
                      {isEditing && fieldCanEdit ? (
                        <Input
                          defaultValue={editValue.toUpperCase()}
                          onBlur={(e) => handleCellBlur(dev.id, field, e.target.value.toUpperCase())}
                          onKeyDown={(e) => { if (e.key === "Enter") handleCellBlur(dev.id, field, (e.target as HTMLInputElement).value.toUpperCase()); }}
                          autoFocus
                          maxLength={13}
                          placeholder="12-13 dígitos"
                          className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent uppercase"
                          data-testid={`input-${field}-${dev.id}`}
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="truncate uppercase" title={value ? String(value) : undefined}>{value || ''}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }
                
                const value = dev[field as keyof Developer] as string;

                return (
                  <div
                    key={field}
                    className={cn("spreadsheet-cell flex-shrink-0 overflow-hidden", getCellStyle({ type: cellType, disabled: !fieldCanEdit, isEditing }))}
                    style={{ width: col.width, minWidth: col.width, maxWidth: col.width, ...inactiveCellStyle }}
                    onClick={() => fieldCanEdit && handleCellClick(dev.id, field, value)}
                    data-testid={`cell-${field}-${dev.id}`}
                  >
                    {isEditing && fieldCanEdit ? (
                      <Input
                        defaultValue={editValue}
                        onBlur={(e) => handleCellBlur(dev.id, field, e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleCellBlur(dev.id, field, (e.target as HTMLInputElement).value); }}
                        autoFocus
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                        data-testid={`input-${field}-${dev.id}`}
                      />
                    ) : (
                      <div className="flex items-center gap-1 overflow-hidden">
                        <span
                          className="truncate"
                          title={LONG_TEXT_FIELDS.includes(field) && value ? String(value) : undefined}
                        >
                          {value || ''}
                        </span>
                        
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            );
          })}
          <div ref={sentinelRef} style={{ height: '1px' }} />
          {filteredAndSortedData.length === 0 && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              {developers.length === 0 
                ? 'No hay desarrolladores. Haz clic en "Agregar" para crear uno.'
                : 'No se encontraron resultados con los filtros aplicados.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
