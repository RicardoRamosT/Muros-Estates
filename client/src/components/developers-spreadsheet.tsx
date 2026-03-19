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
import { useAuth } from "@/lib/auth";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { spreadsheetKey, setSerializer, filterConfigsSerializer } from "@/lib/spreadsheet-persistence";
import { Plus, Minus, Trash2, Briefcase, Loader2, Lock, Eye, FolderOpen, X, ChevronDown, Save, Clock, Search, Maximize2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getCellStyle, getCellTypeFromColumnType, formatDate, formatTime, formatDateShort, parseDateInput, maskDateInput, type CellType, SHEET_COLOR_DARK, SHEET_COLOR_LIGHT, getColumnFilterType, createInputFilter, createPasteFilter, CELL_INPUT_CLASS } from "@/lib/spreadsheet-utils";
import { SpreadsheetHeader, MaskedDateInput } from "@/components/ui/spreadsheet-shared";
import { RecycleBinDrawer } from "@/components/ui/recycle-bin";
import type { Developer, Development } from "@shared/schema";
import { cn } from "@/lib/utils";

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
  { key: 'generales', label: 'GENERALES', color: SHEET_COLOR_LIGHT },
  { key: 'antiguedad', label: 'ANTIGÜEDAD', color: SHEET_COLOR_DARK },
  { key: 'tipos', label: 'TIPOS', color: SHEET_COLOR_LIGHT },
  { key: 'preventa', label: 'PREVENTA', color: SHEET_COLOR_DARK },
  { key: 'obra', label: 'OBRA', color: SHEET_COLOR_LIGHT },
  { key: 'entregados', label: 'ENTREGADOS', color: SHEET_COLOR_DARK },
  { key: 'contratos', label: 'CONTRATOS', color: SHEET_COLOR_LIGHT },
  { key: 'contacto', label: 'CONTACTO', color: SHEET_COLOR_DARK },
  { key: 'legales', label: 'LEGALES', color: SHEET_COLOR_LIGHT },
  { key: 'docs', label: '', color: SHEET_COLOR_DARK },
];


function parsePhoneList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try { return JSON.parse(trimmed); } catch { return [trimmed]; }
  }
  return [trimmed];
}


function calcAntiguedad(fecha: Date | string | null): string {
  if (!fecha) return "";
  const start = new Date(fecha);
  if (isNaN(start.getTime())) return "";
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years === 0 && months === 0) return "< 1m";
  return `${years}a ${months}m`;
}

// RFC validation: exactly 12 characters — 3 letters + 6 digits + 3 alphanumeric
function validateRFC(value: string): { isValid: boolean; message: string } {
  const rfcClean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (rfcClean.length !== 12) {
    return { isValid: false, message: "RFC debe tener exactamente 12 caracteres" };
  }
  if (!/^[A-Z]{3}/.test(rfcClean)) {
    return { isValid: false, message: "Los primeros 3 caracteres deben ser letras" };
  }
  if (!/^[A-Z]{3}[0-9]{6}/.test(rfcClean)) {
    return { isValid: false, message: "Los caracteres 4-9 deben ser números" };
  }
  return { isValid: true, message: "" };
}

interface ColumnDef {
  key: string;
  label: string;
  width: string;
  type?: 'index' | 'toggle' | 'text' | 'actions' | 'folder-link' | 'date' | 'multiselect' | 'rfc' | 'tipo-select' | 'date-display' | 'time-display' | 'select' | 'phone-list' | 'group-collapsed' | 'dev-count';
  autoField?: boolean;
  group?: string;
  cellType?: CellType;
}

function isDeveloperComplete(dev: Developer): boolean {
  return !!(
    dev.tipo?.trim() && EMPRESA_TIPOS.some(t => t.value === dev.tipo?.trim()) &&
    dev.name?.trim() && dev.tipos?.length && dev.contratos?.length
  );
}

function getMissingFieldsDeveloper(dev: Developer): string[] {
  const missing: string[] = [];
  if (!dev.tipo?.trim() || !EMPRESA_TIPOS.some(t => t.value === dev.tipo?.trim())) missing.push("Tipo");
  if (!dev.name?.trim()) missing.push("Nombre");
  if (!dev.tipos?.length) missing.push("Tipos");
  if (!dev.contratos?.length) missing.push("Contratos");
  return missing;
}

export function DevelopersSpreadsheet() {
  const { toast } = useToast();
  const { user } = useAuth();
  const uid = user?.id ?? "anon";
  const { canView, canEdit, hasFullAccess, role, canAccess } = useFieldPermissions('desarrolladores');
  const [editingCell, setEditingCell_] = useState<{id: string, field: string} | null>(null);
  const editingCellRef = useRef<{id: string, field: string} | null>(null);
  const setEditingCell = useCallback((v: {id: string, field: string} | null) => { editingCellRef.current = v; setEditingCell_(v); }, []);
  const LONG_TEXT_FIELDS = ['name', 'razonSocial', 'domicilio', 'representante', 'contactName', 'contactPhone', 'contactEmail'];
  const [editValue, setEditValue_] = useState("");
  const editValueRef = useRef("");
  const setEditValue = useCallback((v: string) => { editValueRef.current = v; setEditValue_(v); }, []);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = usePersistedState<Set<string>>(
    spreadsheetKey(uid, "developers", "collapsedGroups"), () => new Set(), setSerializer
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
        const groupColKeys = allColumns.filter(c => c.group === key).map(c => c.key);
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
    spreadsheetKey(uid, "developers", "collapsedColumns"), () => new Set(), setSerializer
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
  const pendingChangesRef = useRef<Map<string, Partial<Developer>>>(new Map());
  const [localEdits, setLocalEdits] = useState<Record<string, Partial<Developer>>>({});
  const [activeEditingRowId, setActiveEditingRowId] = useState<string | null>(null);
  const saveRowByIdRef = useRef<(id: string) => Promise<void>>(async () => {});
  const [pendingChangesVersion, setPendingChangesVersion] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // Clear active row when clicking outside data rows
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!activeEditingRowId) return;
      const target = e.target as HTMLElement;
      // If click is inside a data row, handleRowClick will handle it
      if (target.closest('[data-row-id]')) return;
      // If click is inside a popover/dialog/dropdown, ignore
      if (target.closest('[data-radix-popper-content-wrapper]') || target.closest('[role="dialog"]')) return;
      saveRowByIdRef.current(activeEditingRowId);
      setActiveEditingRowId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeEditingRowId]);

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

  const { data: allDevelopments = [] } = useQuery<Development[]>({
    queryKey: ["/api/developments-entity"],
  });

  // PREVENTA/OBRA/ENTREGADOS counts per developer
  const devCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const counts: Record<string, { preventa: Development[]; obra: Development[]; entregados: Development[] }> = {};
    for (const d of allDevelopments) {
      if (!d.developerId) continue;
      if (!counts[d.developerId]) counts[d.developerId] = { preventa: [], obra: [], entregados: [] };
      const entry = counts[d.developerId];

      const entregaDate = d.entregaActualizada || d.entregaProyectada;
      const inicioObraDate = d.inicioReal || d.inicioProyectado;

      // ENTREGADOS: entrega date <= today
      if (entregaDate && new Date(entregaDate) <= today) {
        entry.entregados.push(d);
      }
      // OBRA: inicio obra <= today AND not entregados
      else if (inicioObraDate && new Date(inicioObraDate) <= today) {
        entry.obra.push(d);
      }
      // PREVENTA: inicioPreventa set AND (finPreventa not set OR finPreventa > today)
      else if (d.inicioPreventa) {
        const finPreventa = (d as any).finPreventa;
        if (!finPreventa || new Date(finPreventa) > today) {
          entry.preventa.push(d);
        }
      }
    }
    return counts;
  }, [allDevelopments]);

  // Document counts for legales
  const { data: docCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/documents/counts", "developer"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/documents/counts?entityType=developer");
      return res.json();
    },
  });

  const allColumns: ColumnDef[] = [
    { key: "id", label: "ID", width: "60px", type: "index", autoField: true, cellType: "index", group: "corner" },
    { key: "active", label: "Activo", width: "80px", type: "toggle", cellType: "checkbox", group: "registro" },
    { key: "createdDate", label: "Fecha", width: "80px", type: "date-display", group: "registro", cellType: "readonly" },
    { key: "createdTime", label: "Hora", width: "65px", type: "time-display", group: "registro", cellType: "readonly" },
    { key: "tipo", label: "Tipo", width: "120px", type: "tipo-select", cellType: "dropdown", group: "generales" },
    { key: "ciudad", label: "Ciudad", width: "100px", type: "select", cellType: "dropdown", group: "generales" },
    { key: "zona", label: "Zona", width: "120px", type: "select", cellType: "dropdown", group: "generales" },
    { key: "name", label: "Nombre", width: "170px", cellType: "input", group: "generales" },
    { key: "razonSocial", label: "Razón Social", width: "250px", cellType: "input", group: "generales" },
    { key: "rfc", label: "RFC", width: "100px", type: "rfc", cellType: "input", group: "generales" },
    { key: "domicilio", label: "Domicilio", width: "250px", cellType: "input", group: "generales" },
    { key: "representante", label: "Representante", width: "170px", cellType: "input", group: "generales" },
    { key: "fechaAntiguedad", label: "Fecha", width: "100px", type: "date", cellType: "date", group: "antiguedad" },
    { key: "antiguedadCalc", label: "Antigüedad", width: "100px", autoField: true, cellType: "readonly", group: "antiguedad" },
    { key: "tipos", label: "Tipos", width: "95px", type: "multiselect", cellType: "dropdown", group: "tipos" },
    { key: "preventaCount", label: "Preventa", width: "90px", type: "dev-count", autoField: true, cellType: "readonly", group: "preventa" },
    { key: "obraCount", label: "Obra", width: "90px", type: "dev-count", autoField: true, cellType: "readonly", group: "obra" },
    { key: "entregadosCount", label: "Entregados", width: "115px", type: "dev-count", autoField: true, cellType: "readonly", group: "entregados" },
    { key: "contratos", label: "Contratos", width: "120px", type: "multiselect", cellType: "dropdown", group: "contratos" },
    { key: "contactName", label: "Ventas", width: "170px", cellType: "input", group: "contacto" },
    { key: "contactPhone", label: "Teléfono", width: "120px", type: "phone-list", cellType: "input", group: "contacto" },
    { key: "contactEmail", label: "Correo", width: "170px", cellType: "input", group: "contacto" },
    { key: "legales", label: "Legales", width: "110px", type: "folder-link", cellType: "actions", group: "legales" },
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
          processed.push({ key: `${gk}_collapsed`, label: '', group: gk, type: 'group-collapsed' as any, width: '30px', cellType: 'readonly' });
          while (i < cols.length && cols[i].group === gk) i++;
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
    developers.map(d => ({
      ...d,
      ...(localEdits[d.id] || {}),
      legales: String(docCounts[d.id] || 0),
    })),
    [developers, localEdits, docCounts]
  );

  const flushPendingChanges = useCallback(() => {
    const ec = editingCellRef.current;
    if (ec) {
      const current = pendingChangesRef.current.get(ec.id) || {};
      pendingChangesRef.current.set(ec.id, { ...current, [ec.field]: editValueRef.current || null });
    }
    const pending = pendingChangesRef.current;
    if (pending.size === 0) return;
    const promises: Promise<any>[] = [];
    pending.forEach((changes, id) => {
      if (!changes || Object.keys(changes).length === 0) return;
      promises.push(fetch(`/api/developers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
        credentials: "include",
        keepalive: true,
      }));
    });
    Promise.all(promises)
      .then(() => {
        pending.clear();
        setPendingChangesVersion(0);
        queryClient.invalidateQueries({ queryKey: ["/api/developers"] });
      })
      .catch((err) => {
        console.error("Error saving pending changes:", err);
      });
  }, []);

  useEffect(() => {
    window.addEventListener('beforeunload', flushPendingChanges);
    return () => {
      window.removeEventListener('beforeunload', flushPendingChanges);
      flushPendingChanges();
    };
  }, [flushPendingChanges]);

  const sortKey = spreadsheetKey(uid, "developers", "sortConfig");
  const filterKey = spreadsheetKey(uid, "developers", "filterConfigs");
  const readInitialSort = () => {
    try { const raw = localStorage.getItem(sortKey); if (raw) return JSON.parse(raw); } catch {}
    return undefined;
  };
  const readInitialFilters = () => {
    try { const raw = localStorage.getItem(filterKey); if (raw) return filterConfigsSerializer.deserialize(raw); } catch {}
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
  } = useColumnFilters(effectiveDevelopers, columns, undefined, {
    defaultSortKey: "createdAt",
    initialSortConfig: readInitialSort(),
    initialFilterConfigs: readInitialFilters(),
    onSortChange: (c) => {
      try {
        if (!c.key && c.direction === null) localStorage.removeItem(sortKey);
        else localStorage.setItem(sortKey, JSON.stringify(c));
      } catch {}
    },
    onFilterChange: (c) => {
      try {
        if (Object.keys(c).length === 0) localStorage.removeItem(filterKey);
        else localStorage.setItem(filterKey, filterConfigsSerializer.serialize(c));
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
          if (message.type === "developer") {
            queryClient.invalidateQueries({ queryKey: ["/api/developers"] });
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
    const sorted = [...developers].sort((a, b) =>
      new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
    const map = new Map<string, number>();
    sorted.forEach((t, i) => map.set(t.id, i + 1));
    return map;
  }, [developers]);

  // Zoom controls
  const [zoomLevel, setZoomLevel] = usePersistedState<number>(
    spreadsheetKey(uid, "developers", "zoomLevel"), 100
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
    if (isLoading || developers.length === 0 || scrollToBottomPhaseRef.current !== 'idle') return;
    scrollToBottomPhaseRef.current = 'loading_all';
    setVisibleCount(filteredAndSortedData.length);
  }, [isLoading, developers]);

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
    // Use ref to check if cell was already navigated away by Tab/Enter
    const ec = editingCellRef.current;
    if (!ec || ec.id !== id || ec.field !== field) return;

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

    if (field === 'contactEmail' && valueToSave) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valueToSave)) {
        toast({ title: "Correo inválido. Debe incluir un dominio válido (ej. @gmail.com)", variant: "destructive" });
        setEditingCell(null);
        return;
      }
    }

    const existingValue = pendingChangesRef.current.get(id)?.[field as keyof Developer] ?? developers.find(d => d.id === id)?.[field as keyof Developer];
    if (String(existingValue ?? '') === String(valueToSave ?? '')) {
      setEditingCell(null);
      return;
    }

    handleFieldChange(id, { [field]: valueToSave || null });
    setEditingCell(null);
  }, [editingCell, editValue, handleFieldChange, toast, developers]);

  const navigateToNextCell = useCallback((currentId: string, currentField: string, value: string) => {
    // Save current value
    if (currentField === 'contactEmail' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast({ title: "Correo inválido. Debe incluir un dominio válido (ej. @gmail.com)", variant: "destructive" });
      setEditingCell(null);
      return;
    }
    const existingValue = pendingChangesRef.current.get(currentId)?.[currentField as keyof Developer] ?? developers.find(d => d.id === currentId)?.[currentField as keyof Developer];
    if (String(existingValue ?? '') !== String(value ?? '')) {
      handleFieldChange(currentId, { [currentField]: value || null });
    }
    // Find next editable cell in the same row (inputs + dropdowns)
    const nonEditableTypes = new Set([
      'index', 'toggle', 'actions', 'folder-link', 'date-display', 'time-display',
      'multiselect', 'phone-list', 'dev-count', 'group-collapsed'
    ]);
    const editableCols = columns.filter(c =>
      !(c.type && nonEditableTypes.has(c.type)) && !collapsedColumns.has(c.key)
    );
    const currentIdx = editableCols.findIndex(c => c.key === currentField);
    if (currentIdx >= 0 && currentIdx < editableCols.length - 1) {
      const nextCol = editableCols[currentIdx + 1];
      const rowData = effectiveDevelopers.find(d => d.id === currentId);
      setEditingCell({ id: currentId, field: nextCol.key });
      setEditValue(String((rowData as any)?.[nextCol.key] ?? ""));
    } else {
      setEditingCell(null);
    }
  }, [columns, collapsedColumns, effectiveDevelopers, developers, handleFieldChange, setEditingCell, setEditValue]);

  const advanceFromSelect = useCallback((currentId: string, currentField: string) => {
    const nonEditableTypes = new Set([
      'index', 'toggle', 'actions', 'folder-link', 'date-display', 'time-display',
      'multiselect', 'phone-list', 'dev-count', 'group-collapsed'
    ]);
    const editableCols = columns.filter(c =>
      !(c.type && nonEditableTypes.has(c.type)) && !collapsedColumns.has(c.key)
    );
    const currentIdx = editableCols.findIndex(c => c.key === currentField);
    if (currentIdx >= 0 && currentIdx < editableCols.length - 1) {
      const nextCol = editableCols[currentIdx + 1];
      const rowData = effectiveDevelopers.find(d => d.id === currentId);
      setEditingCell({ id: currentId, field: nextCol.key });
      setEditValue(String((rowData as any)?.[nextCol.key] ?? ""));
    } else {
      setEditingCell(null);
    }
  }, [columns, collapsedColumns, effectiveDevelopers, setEditingCell, setEditValue]);

  const clearEditingIfCurrent = useCallback((id: string, field: string) => {
    if (editingCellRef.current?.id === id && editingCellRef.current?.field === field) {
      setEditingCell(null);
    }
  }, [setEditingCell]);

  const handleMultiselectChange = useCallback((id: string, field: string, selectedValues: string[]) => {
    handleFieldChange(id, { [field]: selectedValues });
  }, [handleFieldChange]);

  const handleDateChange = useCallback((id: string, field: string, value: string) => {
    const dateValue = value ? new Date(value) : null;
    handleFieldChange(id, { [field]: dateValue });
  }, [handleFieldChange]);

  const handleActiveToggle = useCallback((id: string, newValue: boolean | null) => {
    handleFieldChange(id, { active: newValue });
    saveRowByIdRef.current(id);
  }, [handleFieldChange]);

  const handleCreateNew = () => {
    createMutation.mutate({
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
          <h1 className="text-sm font-bold" data-testid="text-page-title">Desarrolladores</h1>
          {!hasFullAccess && (
            <Badge variant="outline" className="text-xs">
              <Eye className="w-3 h-3 mr-1" />
              Solo lectura
            </Badge>
          )}
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
        <div className="min-w-max text-xs" style={zoomLevel !== 100 ? { zoom: zoomLevel / 100 } : undefined}>
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
            const isRowInactive = dev.active === null && dev.name !== "";
            const isActiveRow = activeEditingRowId === dev.id;
            const inactiveCellStyle: React.CSSProperties = isRowInactive && !hasFullAccess
              ? { backgroundColor: '#9ca3af', cursor: 'default', color: 'black' }
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
                    ? ""
                    : index % 2 === 0 ? "bg-background" : "bg-muted/10"
              )}
              style={{ height: '32px', maxHeight: '32px', ...(isRowInactive && !hasFullAccess ? { backgroundColor: '#9ca3af' } : {}) }}
              data-testid={`row-developer-${dev.id}`}
              data-row-id={dev.id}
              onPointerDown={() => handleRowClick(dev.id)}
            >
              {columns.map((col) => {
                const field = col.key;
                const fieldCanEdit = canEdit(field);
                const isEditing = editingCell?.id === dev.id && editingCell?.field === field;
                const cellType = col.cellType || getCellTypeFromColumnType(col.type);
                
                if (col.type === 'index') {
                  const isCompleteForDot = isDeveloperComplete(dev);
                  const dotColor = dev.active === null
                    ? '#1f2937'
                    : isCompleteForDot
                      ? (dev.active === true ? '#32CD32' : '#F16100')
                      : '#ef4444';
                  const missingForDot = !isCompleteForDot ? getMissingFieldsDeveloper(dev) : [];
                  const dotTooltip = missingForDot.length > 0
                    ? `Campos vacíos (${missingForDot.length}):\n${missingForDot.map(f => `• ${f}`).join('\n')}`
                    : null;
                  return (
                    <div
                      key={field}
                      className="spreadsheet-cell flex-shrink-0 justify-center sticky left-0 z-10 relative border-r border-b"
                      style={{ width: col.width, minWidth: col.width, backgroundColor: SHEET_COLOR_LIGHT, color: 'white', height: 32 }}
                    >
                      <span className="text-xs font-medium">{stableRowNumberMap.get(dev.id) ?? index + 1}</span>
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
                      key={field}
                      className="spreadsheet-cell flex-shrink-0"
                      style={{ width: COLLAPSED_COL_WIDTH, minWidth: COLLAPSED_COL_WIDTH, ...inactiveCellStyle }}
                    />
                  );
                }

                if (col.type === 'date-display') {
                  return (
                    <div key={field} className={cn("spreadsheet-cell flex-shrink-0 px-1 justify-center", getCellStyle({ type: "input" }))} style={{ width: col.width, minWidth: col.width, cursor: 'default', ...inactiveCellStyle }} data-testid={`cell-${field}-${dev.id}`}>
                      <span className={cn("text-xs", cellTextClass)}>{formatDate(dev.createdAt)}</span>
                    </div>
                  );
                }

                if (col.type === 'time-display') {
                  return (
                    <div key={field} className={cn("spreadsheet-cell flex-shrink-0 px-1 justify-center", getCellStyle({ type: "input" }))} style={{ width: col.width, minWidth: col.width, cursor: 'default', ...inactiveCellStyle }} data-testid={`cell-${field}-${dev.id}`}>
                      <span className={cn("text-xs", cellTextClass)}>{formatTime(dev.createdAt)}</span>
                    </div>
                  );
                }

                if (col.type === 'dev-count') {
                  const counts = devCounts[dev.id];
                  const list = col.key === 'preventaCount' ? counts?.preventa : col.key === 'obraCount' ? counts?.obra : counts?.entregados;
                  const count = list?.length || 0;
                  const groupDef = COLUMN_GROUPS_DEV.find(g => g.key === col.group);
                  const countColor = groupDef?.color || SHEET_COLOR_DARK;
                  return (
                    <div key={field} className={cn("spreadsheet-cell flex-shrink-0 justify-center", getCellStyle({ type: "readonly" }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }} data-testid={`cell-${field}-${dev.id}`}>
                      {count > 0 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="text-xs font-medium hover:underline cursor-pointer" style={{ color: countColor }}>{count}</button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-2" align="start">
                            <div className="text-xs font-semibold mb-1">{col.label}</div>
                            <div className="space-y-0.5 max-h-32 overflow-y-auto">
                              {list!.map(d => (
                                <div key={d.id} className="text-xs text-muted-foreground truncate">{d.name}</div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="text-xs" style={{ color: countColor, opacity: 0.5 }}>0</span>
                      )}
                    </div>
                  );
                }

                if (col.type === 'group-collapsed') {
                  const groupDef = groupLookupMap[col.group || ''];
                  return (
                    <div key={col.key} className="spreadsheet-cell flex-shrink-0 border-r border-b" style={{ width: '30px', minWidth: '30px', backgroundColor: isRowInactive ? '#9ca3af' : (groupDef?.color ? `${groupDef.color}22` : '#f3f4f6') }} />
                  );
                }

                if (col.type === 'toggle') {
                  const isComplete = isDeveloperComplete(dev);
                  const isDisabled = dev.active === null || dev.active === undefined;
                  const activeState = isDisabled ? "disabled" : (dev.active === true && isComplete) ? "active" : (isComplete ? "ready" : "incomplete");
                  const bgColor = isRowInactive ? '#9ca3af' : activeState === "active" ? "#dcfce7" : activeState === "ready" ? "#FDCDB0" : activeState === "disabled" ? "#9ca3af" : "#fee2e2";
                  const textStyle: React.CSSProperties = activeState === "active" ? { color: "#15803d", fontWeight: 600 } : activeState === "ready" ? { color: "#C04D00", fontWeight: 600 } : activeState === "disabled" ? { color: "#4b5563", fontWeight: 500 } : { color: "#dc2626", fontWeight: 500 };
                  const label = activeState === "active" ? "Sí" : activeState === "disabled" ? "In" : "No";
                  const cellContent = (
                    <div
                      key={field}
                      className={cn("spreadsheet-cell flex-shrink-0 px-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit, isEditing }))}
                      style={{ width: col.width, minWidth: col.width, backgroundColor: bgColor }}
                      onPointerDown={(e) => e.button === 0 && fieldCanEdit && !isEditing && setEditingCell({ id: dev.id, field })}
                    >
                      {fieldCanEdit ? (
                        <ExclusiveSelect
                          value={activeState === "active" ? "active" : activeState === "disabled" ? "disabled" : "no"}
                          onValueChange={(v) => {
                            if (v === "disabled") handleActiveToggle(dev.id, null);
                            else if (v === "active") { if (isComplete) handleActiveToggle(dev.id, true); }
                            else handleActiveToggle(dev.id, false);
                          }}
                        >
                          <SelectTrigger
                            className="h-6 w-full text-xs border-0 bg-transparent [&_svg]:h-3 [&_svg]:w-3 focus:ring-0 focus:ring-offset-0"
                            style={textStyle}
                            data-testid={`toggle-active-${dev.id}`}
                          >
                            <span className="truncate">{label}</span>
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
                        <div className="flex items-center justify-center px-1" style={textStyle}>
                          <span>{label}</span>
                        </div>
                      )}
                    </div>
                  );
                  return cellContent;
                }
                
                if (col.type === 'tipo-select') {
                  const tipoValue = dev.tipo || '';
                  return (
                    <div
                      key={field}
                      className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit, isEditing }))}
                      style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}
                      data-testid={`cell-${field}-${dev.id}`}
                      onPointerDown={(e) => e.button === 0 && fieldCanEdit && !isEditing && setEditingCell({ id: dev.id, field })}
                    >
                      {fieldCanEdit ? (
                        <ExclusiveSelect
                          autoOpen={editingCell?.id === dev.id && editingCell?.field === field}
                          onClose={() => clearEditingIfCurrent(dev.id, field)}
                          onAdvance={() => advanceFromSelect(dev.id, field)}
                          value={tipoValue || "__empty__"}
                          onValueChange={(v) => {
                            const val = v === "__empty__" ? "" : v;
                            handleFieldChange(dev.id, { tipo: val as any });
                            advanceFromSelect(dev.id, field);
                          }}
                        >
                          <SelectTrigger className="h-6 w-full min-w-0 text-xs border-0 shadow-none bg-transparent [&_svg]:h-3 [&_svg]:w-3 [&_svg]:shrink-0">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__empty__">{"\u00A0"}</SelectItem>
                            {EMPRESA_TIPOS.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </ExclusiveSelect>
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
                      className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit, isEditing }))}
                      style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}
                      data-testid={`cell-${field}-${dev.id}`}
                      onPointerDown={(e) => e.button === 0 && fieldCanEdit && !isEditing && setEditingCell({ id: dev.id, field })}
                    >
                      {fieldCanEdit ? (
                        <ExclusiveSelect
                          autoOpen={editingCell?.id === dev.id && editingCell?.field === field}
                          onClose={() => clearEditingIfCurrent(dev.id, field)}
                          onAdvance={() => advanceFromSelect(dev.id, field)}
                          value={selectValue || "__empty__"}
                          onValueChange={(v) => {
                            const val = v === "__empty__" ? "" : v;
                            handleFieldChange(dev.id, { [field]: val } as any);
                            advanceFromSelect(dev.id, field);
                          }}
                        >
                          <SelectTrigger className="h-6 w-full min-w-0 text-xs border-0 shadow-none bg-transparent [&_svg]:h-3 [&_svg]:w-3 [&_svg]:shrink-0">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__empty__">{"\u00A0"}</SelectItem>
                            {selectOptions.map(o => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </ExclusiveSelect>
                      ) : (
                        <div className="flex items-center gap-1 px-2">
                          <span className="truncate text-xs">{selectValue}</span>
                          
                        </div>
                      )}
                    </div>
                  );
                }

                if (col.key === 'antiguedadCalc') {
                  const calculated = calcAntiguedad(dev.fechaAntiguedad);
                  return (
                    <div
                      key={field}
                      className={cn("spreadsheet-cell flex-shrink-0 px-2 justify-center", getCellStyle({ type: "readonly" }))}
                      style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}
                      data-testid={`cell-${field}-${dev.id}`}
                    >
                      <span className={cn("text-xs", cellTextClass)}>{calculated}</span>
                    </div>
                  );
                }

                if (col.type === 'folder-link') {
                  const docCount = docCounts[dev.id] || 0;
                  return (
                    <div key={field} className={cn("spreadsheet-cell flex-shrink-0 justify-center", !isRowInactive && "bg-yellow-100 dark:bg-yellow-900/30", getCellStyle({ type: "actions" }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
                      <a
                        href={`/admin/documentos?developerId=${dev.id}&sectionType=legales`}
                        className="inline-flex items-center gap-1.5 text-amber-700 hover:underline text-xs"
                        data-testid={`link-legales-${dev.id}`}
                      >
                        <FolderOpen className="w-4 h-4" />
                        <span className="font-medium">{docCount}</span>
                      </a>
                    </div>
                  );
                }
                
                if (col.type === 'actions') {
                  return (
                    <div key={field} className={cn("spreadsheet-cell flex-shrink-0 justify-center", getCellStyle({ type: "actions" }))} style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}>
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
                  const storedIso = dateValue ? new Date(dateValue).toISOString().split('T')[0] : '';
                  const displayValue = formatDateShort(storedIso);
                  return (
                    <div
                      key={field}
                      className={cn("spreadsheet-cell flex-shrink-0 justify-center", getCellStyle({ type: "date", disabled: !fieldCanEdit, isEditing }))}
                      style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}
                      data-testid={`cell-${field}-${dev.id}`}
                      onClick={() => fieldCanEdit && !isEditing && setEditingCell({ id: dev.id, field })}
                    >
                      {isEditing && fieldCanEdit ? (
                        <MaskedDateInput
                          defaultValue={displayValue}
                          onBlur={(e) => {
                            const ec = editingCellRef.current;
                            if (ec && (ec.id !== dev.id || ec.field !== field)) return;
                            const raw = (e.target as HTMLInputElement).value.trim();
                            if (!raw) { handleDateChange(dev.id, field, ""); setEditingCell(null); return; }
                            const iso = parseDateInput(raw);
                            if (iso) { handleDateChange(dev.id, field, iso); }
                            else { toast({ title: "Formato inválido", description: "Usa dd/mm/aa", variant: "destructive" }); }
                            setEditingCell(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab' || e.key === 'Enter') {
                              e.preventDefault();
                              const raw = (e.target as HTMLInputElement).value.trim();
                              if (!raw) { handleDateChange(dev.id, field, ""); advanceFromSelect(dev.id, field); return; }
                              const iso = parseDateInput(raw);
                              if (iso) { handleDateChange(dev.id, field, iso); advanceFromSelect(dev.id, field); }
                              else { toast({ title: "Formato inválido", description: "Usa dd/mm/aa", variant: "destructive" }); setEditingCell(null); }
                            }
                            if (e.key === 'Escape') { setEditingCell(null); }
                          }}
                          className={CELL_INPUT_CLASS}
                          data-testid={`input-${field}-${dev.id}`}
                        />
                      ) : (
                        <span className={cn("text-xs", cellTextClass)}>{displayValue}</span>
                      )}
                    </div>
                  );
                }

                if (col.type === 'multiselect') {
                  const currentValues = (dev[field as keyof Developer] as string[] | null) || [];
                  const countDisplay = currentValues.length > 0 ? String(currentValues.length) : '';
                  const tooltipText = currentValues.length > 0 ? currentValues.join(', ') : '';
                  const options = col.key === 'contratos'
                    ? catalogContratos.map(c => ({ value: c.name, label: c.name }))
                    : DESARROLLO_TIPOS;

                  return (
                    <div
                      key={field}
                      className={cn("spreadsheet-cell flex-shrink-0 justify-center", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit, isEditing }))}
                      style={{ width: col.width, minWidth: col.width, ...inactiveCellStyle }}
                      data-testid={`cell-${field}-${dev.id}`}
                      title={tooltipText}
                      onPointerDown={(e) => e.button === 0 && fieldCanEdit && !isEditing && setEditingCell({ id: dev.id, field })}
                    >
                      {fieldCanEdit ? (
                        <Popover modal>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-6 w-full justify-between px-1 font-normal text-xs"
                              data-testid={`select-${col.key}-${dev.id}`}
                              title={tooltipText}
                            >
                              <span>{countDisplay}</span>
                              <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-2" align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
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
                        <span className="text-xs" title={tooltipText}>{countDisplay}</span>
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
                          onKeyDown={(e) => {
                            // Position-aware RFC filter: 0-2 letters, 3-8 digits, 9-11 alphanumeric
                            const input = e.target as HTMLInputElement;
                            const pos = input.selectionStart || 0;
                            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                              if (pos < 3 && !/^[A-Za-z]$/.test(e.key)) e.preventDefault();
                              else if (pos >= 3 && pos < 9 && !/^[0-9]$/.test(e.key)) e.preventDefault();
                              else if (pos >= 9 && !/^[A-Za-z0-9]$/.test(e.key)) e.preventDefault();
                            }
                            if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); const v = (e.target as HTMLInputElement).value.toUpperCase(); const validation = validateRFC(v); if (v && !validation.isValid) { toast({ title: validation.message, variant: "destructive" }); setEditingCell(null); return; } navigateToNextCell(dev.id, field, v); }
                            if (e.key === "Escape") setEditingCell(null);
                          }}
                          onPaste={createPasteFilter('rfc')}
                          onInput={(e) => { (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase(); }}
                          autoFocus
                          maxLength={12}
                          className={cn(CELL_INPUT_CLASS, "uppercase")}
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
                
                if (col.type === 'phone-list') {
                  const rawPhone = dev[field as keyof Developer] as string;
                  const phoneList = parsePhoneList(rawPhone);
                  const savePhones = (phones: string[]) => {
                    const stored = phones.length <= 1 ? (phones[0] || '') : JSON.stringify(phones);
                    handleFieldChange(dev.id, { [field]: stored || null } as any);
                  };
                  return (
                    <div
                      key={field}
                      className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit, isEditing }))}
                      style={{ width: col.width, minWidth: col.width, display: 'flex', alignItems: 'center', height: 32, maxHeight: 32, padding: 0, overflow: 'hidden', ...inactiveCellStyle }}
                      data-testid={`cell-${field}-${dev.id}`}
                      onPointerDown={(e) => e.button === 0 && fieldCanEdit && !isEditing && setEditingCell({ id: dev.id, field })}
                    >
                      {fieldCanEdit ? (
                        <Popover modal>
                          <PopoverTrigger asChild>
                            <button data-phone-list className="flex items-center h-full text-xs pl-1.5 pr-1 hover:bg-accent/50" style={{ width: '100%' }}>
                              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{phoneList.length > 0 ? phoneList[0] : ""}</span>
                              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                {phoneList.length > 1 && <span className="text-xs opacity-60">+{phoneList.length - 1}</span>}
                                <ChevronDown className="w-3 h-3 opacity-50" />
                              </span>
                            </button>
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
                        <div className="flex items-center px-2 w-full">
                          <span className={cn("text-xs truncate min-w-0 flex-1", cellTextClass)}>{phoneList.length > 0 ? phoneList[0] : ""}</span>
                          {phoneList.length > 1 && <span className="text-xs opacity-60 shrink-0 ml-1">+{phoneList.length - 1}</span>}
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
                      (() => {
                        const filterType = getColumnFilterType(field);
                        return (
                          <Input
                            defaultValue={editValue}
                            onBlur={(e) => handleCellBlur(dev.id, field, e.target.value)}
                            onKeyDown={(e) => {
                              if (filterType) createInputFilter(filterType)(e);
                              if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); navigateToNextCell(dev.id, field, (e.target as HTMLInputElement).value); }
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                            onPaste={filterType ? createPasteFilter(filterType) : undefined}
                            autoFocus
                            className={CELL_INPUT_CLASS}
                            data-testid={`input-${field}-${dev.id}`}
                          />
                        );
                      })()
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
      {showZoomPopup && (
        <div className="fixed bottom-4 right-12 z-[100] bg-black/80 text-white px-2 py-1 rounded-md text-[10px] font-medium animate-in fade-in slide-in-from-right-1 duration-200 shadow-sm border border-white/10">
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
              entityLabel: "Desarrolladores",
              deletedEndpoint: "/api/developers/deleted",
              restoreEndpoint: (id) => `/api/developers/${id}/restore`,
              invalidateKeys: ["/api/developers"],
              getItemLabel: (item) => item.name || 'Sin nombre',
              getItemSubLabel: (item) => item.tipo || '',
            }} />
          </>
        )}
      </div>
    </div>
  );
}
