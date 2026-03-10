import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { TextDetailModal } from "@/components/ui/text-detail-modal";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFieldPermissions } from "@/hooks/use-field-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ColumnFilter, useColumnFilters } from "@/components/ui/column-filter";
import { useAuth } from "@/lib/auth";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { spreadsheetKey, setSerializer, filterConfigsSerializer } from "@/lib/spreadsheet-persistence";
import { Plus, Minus, Trash2, UserPlus, UserCheck, Loader2, Lock, Eye, Calendar, Clock, X, FileText, Download, Search, Save, Maximize2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { getCellStyle, formatDate, formatTime, type CellType, SHEET_COLOR_DARK, SHEET_COLOR_LIGHT, getColumnFilterType, createInputFilter, createPasteFilter } from "@/lib/spreadsheet-utils";
import { SpreadsheetHeader } from "@/components/ui/spreadsheet-shared";
import { RecycleBinDrawer } from "@/components/ui/recycle-bin";
import { cn } from "@/lib/utils";
import type { Client, User, Typology, CatalogCity, CatalogZone, Developer, Development } from "@shared/schema";

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

const COLUMN_GROUPS_PROSPECT = [
  { key: 'corner', label: '', color: '' },
  { key: 'registro', label: 'REGISTRO', color: SHEET_COLOR_DARK },
  { key: 'asesor', label: 'ASESOR', color: SHEET_COLOR_LIGHT },
  { key: 'prospecto', label: 'PROSPECTO', color: SHEET_COLOR_DARK },
  { key: 'general', label: 'GENERAL', color: SHEET_COLOR_LIGHT },
  { key: 'estatus', label: 'ESTATUS', color: SHEET_COLOR_DARK },
  { key: 'etapa', label: 'ETAPA', color: SHEET_COLOR_LIGHT },
  { key: 'ubicacion', label: 'UBICACIÓN', color: SHEET_COLOR_DARK },
  { key: 'unidad', label: 'UNIDAD', color: SHEET_COLOR_LIGHT },
  { key: 'separacion', label: 'SEPARACIÓN', color: SHEET_COLOR_DARK },
  { key: 'enganche', label: 'ENGANCHE', color: SHEET_COLOR_LIGHT },
  { key: 'plazo', label: 'A PLAZO', color: SHEET_COLOR_DARK },
  { key: 'comoPagaGroup', label: 'CÓMO PAGA', color: SHEET_COLOR_LIGHT },
  { key: 'notas', label: 'COMENTARIOS', color: SHEET_COLOR_DARK },
  { key: 'actions', label: '', color: '' },
];

const COLUMN_GROUPS_CLIENT = [
  { key: 'corner', label: '', color: '' },
  { key: 'cregistro', label: 'REGISTRO', color: SHEET_COLOR_DARK },
  { key: 'casesor', label: 'ASESOR', color: SHEET_COLOR_LIGHT },
  { key: 'ccliente', label: 'CLIENTE', color: SHEET_COLOR_DARK },
  { key: 'cgeneral', label: 'GENERAL', color: SHEET_COLOR_LIGHT },
  { key: 'cubicacion', label: 'UBICACIÓN', color: SHEET_COLOR_DARK },
  { key: 'cunidad', label: 'UNIDAD', color: SHEET_COLOR_LIGHT },
  { key: 'cextras', label: 'EXTRAS', color: SHEET_COLOR_DARK },
  { key: 'cpreciototal', label: '', color: SHEET_COLOR_LIGHT },
  { key: 'cseparacion', label: 'SEPARACIÓN', color: SHEET_COLOR_DARK },
  { key: 'cenganche', label: 'ENGANCHE', color: SHEET_COLOR_LIGHT },
  { key: 'cplazo', label: 'A PLAZO', color: SHEET_COLOR_DARK },
  { key: 'cliquidacion', label: 'LIQUIDACIÓN', color: SHEET_COLOR_LIGHT },
  { key: 'ccomentarios', label: '', color: SHEET_COLOR_DARK },
  { key: 'actions', label: '', color: '' },
];


interface ProspectsSpreadsheetProps {
  isClientView?: boolean;
}

export function ProspectsSpreadsheet({ isClientView = false }: ProspectsSpreadsheetProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const uid = user?.id ?? "anon";
  const pageName = isClientView ? 'clientes' : 'prospectos';
  const { canView, canEdit, hasFullAccess, role, canAccess, isLoading: authLoading } = useFieldPermissions(pageName as any);
  const [editingCell, setEditingCell_] = useState<{id: string, field: string} | null>(null);
  const editingCellRef = useRef<{id: string, field: string} | null>(null);
  const setEditingCell = useCallback((v: {id: string, field: string} | null) => { editingCellRef.current = v; setEditingCell_(v); }, []);
  const [textDetail, setTextDetail] = useState<{title: string, value: string} | null>(null);
  const [editValue, setEditValue_] = useState("");
  const editValueRef = useRef("");
  const setEditValue = useCallback((v: string) => { editValueRef.current = v; setEditValue_(v); }, []);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = usePersistedState<Set<string>>(
    spreadsheetKey(uid, pageName, "collapsedGroups"), () => new Set(), setSerializer
  );
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
  const [collapsedColumns, setCollapsedColumns] = usePersistedState<Set<string>>(
    spreadsheetKey(uid, pageName, "collapsedColumns"), () => new Set(), setSerializer
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
  const pendingChangesRef = useRef<Map<string, Partial<Client>>>(new Map());
  const [localEdits, setLocalEdits] = useState<Record<string, Partial<Client>>>({});
  const [activeEditingRowId, setActiveEditingRowId] = useState<string | null>(null);
  const saveRowByIdRef = useRef<(id: string) => Promise<void>>(async () => {});
  const [pendingChangesVersion, setPendingChangesVersion] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  const { data: allClients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const isLoading = authLoading || clientsLoading;

  // Only check access after auth is done loading
  const shouldCheckAccess = !authLoading;

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: typologies = [] } = useQuery<Typology[]>({
    queryKey: ["/api/public/typologies"],
  });

  const { data: cities = [] } = useQuery<CatalogCity[]>({
    queryKey: ["/api/catalog/cities"],
  });

  const { data: zones = [] } = useQuery<CatalogZone[]>({
    queryKey: ["/api/catalog/zones"],
  });

  const { data: developers = [] } = useQuery<Developer[]>({
    queryKey: ["/api/developers"],
  });

  const { data: developments = [] } = useQuery<Development[]>({
    queryKey: ["/api/developments-entity"],
  });

  // Prospect catalog queries
  const { data: catalogTipo = [] } = useQuery<any[]>({ queryKey: ["/api/catalog/tipo-cliente"] });
  const { data: catalogPerfil = [] } = useQuery<any[]>({ queryKey: ["/api/catalog/perfil"] });
  const { data: catalogFuente = [] } = useQuery<any[]>({ queryKey: ["/api/catalog/fuente"] });
  const { data: catalogEstatus = [] } = useQuery<any[]>({ queryKey: ["/api/catalog/status-prospecto"] });
  const { data: catalogEtapa = [] } = useQuery<any[]>({ queryKey: ["/api/catalog/etapa-embudo"] });
  const { data: catalogComoPaga = [] } = useQuery<any[]>({ queryKey: ["/api/catalog/como-paga"] });
  const { data: catalogPositivos = [] } = useQuery<any[]>({ queryKey: ["/api/catalog/positivos"] });
  const { data: catalogNegativos = [] } = useQuery<any[]>({ queryKey: ["/api/catalog/negativos"] });
  const { data: catalogEtapaClientes = [] } = useQuery<any[]>({ queryKey: ["/api/catalog/etapa-clientes"] });

  const prospects = allClients.filter(c => isClientView ? c.isClient === true : c.isClient !== true);

  const createMutation = useMutation({
    mutationFn: (data: Partial<Client>) => 
      apiRequest("POST", "/api/clients", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: isClientView ? "Cliente creado" : "Prospecto creado" });
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) =>
      apiRequest("PUT", `/api/clients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
    onError: () => toast({ title: "Error al actualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: isClientView ? "Cliente eliminado" : "Prospecto eliminado" });
      setDeleteId(null);
    },
    onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
  });

  const handleCellClick = useCallback((id: string, field: string, currentValue: string | null) => {
    setEditingCell({ id, field });
    setEditValue(String(currentValue ?? ""));
  }, []);

  const handleFieldChange = useCallback((id: string, data: Partial<Client>) => {
    // Auto-calculate financial amounts in client view
    if (isClientView) {
      const financialTriggers = ['precioFinal', 'porcentajeSeparacion', 'porcentajeEnganche', 'porcentajePlazo'];
      const changedKeys = Object.keys(data);
      if (changedKeys.some(k => financialTriggers.includes(k))) {
        const record = prospects.find(p => p.id === id);
        const pending = pendingChangesRef.current.get(id) || {};
        const local = localEdits[id] || {};
        const merged: any = { ...record, ...pending, ...local, ...data };
        const precio = parseFloat(merged.precioFinal) || 0;
        if (precio > 0) {
          const pctSep = parseFloat(merged.porcentajeSeparacion) || 0;
          const pctEng = parseFloat(merged.porcentajeEnganche) || 0;
          const pctPlazo = parseFloat(merged.porcentajePlazo) || 0;
          if (pctSep >= 0) (data as any).separacion = String(Math.round(precio * pctSep / 100));
          if (pctEng >= 0) (data as any).enganche = String(Math.round(precio * pctEng / 100));
          if (pctPlazo >= 0) (data as any).plazoTotal = String(Math.round(precio * pctPlazo / 100));
        }
      }
    }
    const current = pendingChangesRef.current.get(id) || {};
    pendingChangesRef.current.set(id, { ...current, ...data });
    setPendingChangesVersion(v => v + 1);
    setLocalEdits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...data } }));
    if (activeEditingRowId && activeEditingRowId !== id) {
      saveRowByIdRef.current(activeEditingRowId);
    }
    setActiveEditingRowId(id);
  }, [activeEditingRowId, isClientView, prospects, localEdits]);

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
    
    const editVal = inputValue !== undefined ? inputValue : editValue;
    if ((field === 'nombre' || field === 'apellido') && editVal && editVal.trim().length < 3) {
      toast({ 
        title: "Error de validación", 
        description: `${field === 'nombre' ? 'Nombre' : 'Apellido'} debe tener al menos 3 caracteres`, 
        variant: "destructive" 
      });
      setEditingCell(null);
      return;
    }
    
    handleFieldChange(id, { [field]: editVal || null } as any);
    setEditingCell(null);
  }, [editingCell, editValue, handleFieldChange, toast]);

  const handleSelectChange = useCallback((id: string, field: string, value: string) => {
    const actualValue = value === '__unassigned__' ? null : (value || null);
    
    const clientFunnelStages = ['separado', 'enganche_firma', 'Separado', 'Enganche y Firma'];
    
    if (field === 'embudo') {
      const currentRecord = prospects.find(p => p.id === id);
      const isCurrentlyClient = currentRecord?.isClient === true;
      const shouldBeClient = clientFunnelStages.includes(value);
      
      if (!isCurrentlyClient && shouldBeClient) {
        updateMutation.mutate({ 
          id, 
          data: { [field]: actualValue, isClient: true, convertedAt: new Date() } as any
        });
        toast({ title: "Prospecto convertido a Cliente", description: "El prospecto ahora aparece en la sección de Clientes." });
        return;
      } else if (isCurrentlyClient && !shouldBeClient) {
        updateMutation.mutate({ 
          id, 
          data: { [field]: actualValue, isClient: false, convertedAt: null } as any
        });
        toast({ title: "Cliente regresado a Prospecto", description: "El cliente ahora aparece en la sección de Prospectos." });
        return;
      }
    }
    
    handleFieldChange(id, { [field]: actualValue } as any);
  }, [handleFieldChange, updateMutation, toast, prospects]);

  const handleTypologySelect = useCallback((prospectId: string, typologyId: string) => {
    if (typologyId === '__unassigned__') {
      handleFieldChange(prospectId, { tipologia: null } as any);
      return;
    }
    const selectedTypology = typologies.find(t => t.id === typologyId);
    if (selectedTypology) {
      handleFieldChange(prospectId, { 
        tipologia: typologyId,
        ciudad: selectedTypology.city || null,
        zona: selectedTypology.zone || null,
        desarrollador: selectedTypology.developer || null,
        desarrollo: selectedTypology.development || null,
      } as any);
    }
  }, [typologies, handleFieldChange]);

  const handleActiveToggle = useCallback((id: string, newValue: boolean | null) => {
    updateMutation.mutate({ id, data: { active: newValue } });
  }, [updateMutation]);

  const handleCreateNew = () => {
    createMutation.mutate({
      nombre: isClientView ? "Nuevo Cliente" : "Nuevo Prospecto",
      telefono: "",
      estatus: "Activo",
      embudo: "Nuevo",
      comoLlega: "web",
      ...(isClientView ? { isClient: true } : {}),
    } as any);
  };


  const getAsesorName = (asesorId: string | null) => {
    if (!asesorId) return "";
    const user = users.find(u => u.id === asesorId);
    return user ? user.name : "";
  };

  const prospectColumns = [
    { key: "index", label: "ID", width: "60px", type: "index", group: "corner" },
    { key: "active", label: "Activo", width: "80px", type: "toggle", group: "registro" },
    { key: "fecha", label: "Fecha", width: "80px", type: "date-display", field: "createdAt", group: "registro" },
    { key: "hora", label: "Hora", width: "65px", type: "time-display", field: "createdAt", group: "registro" },
    { key: "asesorId", label: "", width: "130px", type: "select", group: "asesor" },
    { key: "nombre", label: "Nombre", width: "120px", group: "prospecto" },
    { key: "apellido", label: "Apellido", width: "120px", group: "prospecto" },
    { key: "telefono", label: "Teléfono", width: "110px", group: "prospecto" },
    { key: "correo", label: "Correo", width: "160px", group: "prospecto" },
    { key: "tipofil", label: "Tipo", width: "100px", type: "options-select", group: "general" },
    { key: "perfil", label: "Perfil", width: "110px", type: "options-select", group: "general" },
    { key: "comoLlega", label: "Fuente", width: "130px", type: "options-select", group: "general" },
    { key: "brokerExterno", label: "Asesor Ext.", width: "80px", type: "boolean-select", group: "general" },
    { key: "estatus", label: "", width: "100px", type: "options-select", group: "estatus" },
    { key: "embudo", label: "", width: "140px", type: "options-select", group: "etapa" },
    { key: "ciudad", label: "Ciudad", width: "100px", type: "catalog-select", group: "ubicacion" },
    { key: "zona", label: "Zona", width: "100px", type: "catalog-select", group: "ubicacion" },
    { key: "desarrollador", label: "Desarrollador", width: "130px", type: "catalog-select", group: "unidad" },
    { key: "desarrollo", label: "Desarrollo", width: "130px", type: "catalog-select", group: "unidad" },
    { key: "tipoUnidad", label: "Tipo", width: "100px", type: "typology-type", group: "unidad" },
    { key: "tipologia", label: "Tipología", width: "130px", type: "typology-select", group: "unidad" },
    { key: "precioFinal", label: "Precio Unidad", width: "130px", type: "currency", group: "unidad" },
    { key: "fechaSeparacion", label: "#", width: "100px", type: "date", group: "separacion" },
    { key: "separacion", label: "Monto", width: "120px", type: "currency", group: "separacion" },
    { key: "fechaEnganche", label: "#", width: "100px", type: "date", group: "enganche" },
    { key: "enganche", label: "Monto", width: "120px", type: "currency", group: "enganche" },
    { key: "plazoNumero", label: "#", width: "70px", type: "plain-number", group: "plazo" },
    { key: "plazoMetro", label: "Metro", width: "90px", type: "plain-number", group: "plazo" },
    { key: "plazoMensualidades", label: "Mensualidades", width: "115px", type: "plain-number", group: "plazo" },
    { key: "plazoMonto", label: "Monto", width: "120px", type: "currency", group: "plazo" },
    { key: "comoPaga", label: "", width: "120px", type: "options-select", group: "comoPagaGroup" },
    { key: "positivos", label: "Positivos", width: "140px", type: "multi-select", group: "notas" },
    { key: "negativos", label: "Negativos", width: "140px", type: "multi-select", group: "notas" },
    { key: "comentarios", label: "Otros", width: "160px", noFilter: true, group: "notas" },
    { key: "actions", label: "", width: "50px", type: "actions", group: "actions" },
  ];

  const clientColumns = [
    { key: "index",   label: "ID",   width: "60px",  type: "index",        group: "corner" },
    // REGISTRO
    { key: "active",  label: "Activo", width: "80px", type: "toggle",      group: "cregistro" },
    { key: "fecha",   label: "Fecha",  width: "80px", type: "date-display", field: "createdAt", group: "cregistro" },
    { key: "hora",    label: "Hora",   width: "65px", type: "time-display", field: "createdAt", group: "cregistro" },
    // ASESOR
    { key: "asesorId", label: "", width: "130px", type: "select",    group: "casesor" },
    // CLIENTE
    { key: "nombre",   label: "Nombre",   width: "120px", group: "ccliente" },
    { key: "apellido", label: "Apellido", width: "120px", group: "ccliente" },
    { key: "telefono", label: "Teléfono", width: "110px", group: "ccliente" },
    { key: "correo",   label: "Correo",   width: "160px", group: "ccliente" },
    // GENERAL
    { key: "tipofil",      label: "Tipo",       width: "100px", type: "options-select",  group: "cgeneral" },
    { key: "perfil",       label: "Perfil",     width: "110px", type: "options-select",  group: "cgeneral" },
    { key: "comoLlega",    label: "Fuente",     width: "130px", type: "options-select",  group: "cgeneral" },
    { key: "brokerExterno",label: "Asesor Ext.",width: "80px",  type: "boolean-select",  group: "cgeneral" },
    // UBICACIÓN
    { key: "ciudad", label: "Ciudad", width: "100px", type: "catalog-select", group: "cubicacion" },
    { key: "zona",   label: "Zona",   width: "100px", type: "catalog-select", group: "cubicacion" },
    // UNIDAD
    { key: "desarrollador", label: "Desarrollador", width: "130px", type: "catalog-select",  group: "cunidad" },
    { key: "desarrollo",    label: "Desarrollo",    width: "130px", type: "catalog-select",  group: "cunidad" },
    { key: "tipoUnidad",    label: "Tipo",          width: "100px", type: "typology-type",   group: "cunidad" },
    { key: "tipologia",     label: "Tipología",     width: "130px", type: "typology-select", group: "cunidad" },
    { key: "cajones",       label: "Cajones",       width: "90px",                           group: "cunidad" },
    { key: "bodegas",       label: "Bodega",        width: "90px",                           group: "cunidad" },
    { key: "precioFinal",   label: "Precio Final",  width: "130px", type: "currency",        group: "cunidad" },
    // EXTRAS
    { key: "cajon",        label: "Cajón",       width: "90px",  group: "cextras" },
    { key: "precioCajon",  label: "Precio",      width: "110px", type: "currency", group: "cextras" },
    { key: "bodega",       label: "Bodega",      width: "90px",  group: "cextras" },
    { key: "precioBodega", label: "Precio",      width: "110px", type: "currency", group: "cextras" },
    // PRECIO TOTAL (sección individual)
    { key: "precioTotal",  label: "Precio Total", width: "130px", type: "currency", group: "cpreciototal" },
    // SEPARACIÓN: %, Monto, Fecha, Papelería
    { key: "porcentajeSeparacion", label: "%",         width: "70px",  type: "plain-number", group: "cseparacion" },
    { key: "separacion",           label: "Monto",     width: "120px", type: "currency",     group: "cseparacion" },
    { key: "fechaSeparacion",      label: "Fecha",     width: "100px", type: "date",         group: "cseparacion" },
    { key: "papeleriaSeparacion",  label: "Papelería", width: "120px", type: "currency",     group: "cseparacion" },
    // ENGANCHE: %, Monto, Fecha
    { key: "porcentajeEnganche", label: "%",     width: "70px",  type: "plain-number", group: "cenganche" },
    { key: "enganche",           label: "Monto", width: "120px", type: "currency",     group: "cenganche" },
    { key: "fechaEnganche",      label: "Fecha", width: "100px", type: "date",         group: "cenganche" },
    // A PLAZO: %, Monto, Mensualidades, Monto, Fecha de Inicio, Fecha Final
    { key: "porcentajePlazo",    label: "%",             width: "70px",  type: "plain-number", group: "cplazo" },
    { key: "plazoTotal",         label: "Monto",         width: "120px", type: "currency",     group: "cplazo" },
    { key: "plazoMensualidades", label: "Mensualidades", width: "115px", type: "plain-number", group: "cplazo" },
    { key: "plazoMonto",         label: "Monto",         width: "120px", type: "currency",     group: "cplazo" },
    { key: "plazoFechaInicio",   label: "Fecha de Inicio",width: "115px",type: "date",         group: "cplazo" },
    { key: "plazoFechaFinal",    label: "Fecha Final",   width: "115px", type: "date",         group: "cplazo" },
    // LIQUIDACIÓN: Escrituración, Fecha, Papelería
    { key: "escrituracion",    label: "Escrituración", width: "130px", type: "currency", group: "cliquidacion" },
    { key: "fechaLiquidacion", label: "Fecha",         width: "110px", type: "date",     group: "cliquidacion" },
    { key: "papeleria",        label: "Papelería",     width: "120px", type: "currency", group: "cliquidacion" },
    // COMENTARIOS (sección individual)
    { key: "comentarios",      label: "Comentarios",   width: "200px", noFilter: true,   group: "ccomentarios" },
    // ACTIONS
    { key: "actions", label: "", width: "50px", type: "actions", group: "actions" },
  ];

  const allColumns = isClientView ? clientColumns : prospectColumns;

  const catalogToOptions = (items: any[]) => {
    const seen = new Set<string>();
    return items
      .filter(i => i.active !== false)
      .sort((a: any, b: any) => {
        // Prioritize entries with color
        if (a.color && !b.color) return -1;
        if (!a.color && b.color) return 1;
        return (a.order || 0) - (b.order || 0);
      })
      .filter((i: any) => {
        const key = (i.name || '').trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((i: any) => ({ value: i.name, label: i.name, color: i.color || null }));
  };

  const tipoOptions = useMemo(() => catalogToOptions(catalogTipo), [catalogTipo]);
  const perfilOptions = useMemo(() => catalogToOptions(catalogPerfil), [catalogPerfil]);
  const fuenteOptions = useMemo(() => catalogToOptions(catalogFuente), [catalogFuente]);
  const estatusOptions = useMemo(() => catalogToOptions(catalogEstatus), [catalogEstatus]);
  const embudoOptions = useMemo(() => catalogToOptions(catalogEtapa), [catalogEtapa]);
  const comoPagaOptions = useMemo(() => catalogToOptions(catalogComoPaga), [catalogComoPaga]);
  const positivosOptions = useMemo(() => catalogToOptions(catalogPositivos), [catalogPositivos]);
  const negativosOptions = useMemo(() => catalogToOptions(catalogNegativos), [catalogNegativos]);
  const etapaClientesOptions = useMemo(() => catalogToOptions(catalogEtapaClientes), [catalogEtapaClientes]);

  // Helper: determine if a background color needs white text
  const needsWhiteText = (hex: string | null) => {
    if (!hex) return false;
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.55;
  };

  const optionsMap: Record<string, { value: string; label: string; color?: string | null }[]> = useMemo(() => ({
    tipofil: tipoOptions,
    perfil: perfilOptions,
    comoLlega: fuenteOptions,
    estatus: estatusOptions,
    embudo: embudoOptions,
    comoPaga: comoPagaOptions,
    positivos: positivosOptions,
    negativos: negativosOptions,
  }), [tipoOptions, perfilOptions, fuenteOptions, estatusOptions, embudoOptions, comoPagaOptions, positivosOptions, negativosOptions]);

  const columns = useMemo(() => {
    let cols = allColumns.filter(col => {
      if ((col as any).group === 'corner' || col.type === 'index' || col.type === 'actions' || col.type === 'typology-type') return true;
      return canView(col.key);
    });

    if (collapsedGroups.size > 0) {
      const processed: typeof cols = [];
      let i = 0;
      while (i < cols.length) {
        const col = cols[i];
        const gk = (col as any).group || '';
        if (collapsedGroups.has(gk) && gk !== 'corner') {
          processed.push({ key: `${gk}_collapsed`, label: '', width: '30px', type: 'group-collapsed' as any, group: gk });
          while (i < cols.length && ((cols[i] as any).group || '') === gk) i++;
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
  }, [allColumns, canView, collapsedGroups, collapsedColumns]);

  const COLUMN_GROUPS_CURRENT = isClientView ? COLUMN_GROUPS_CLIENT : COLUMN_GROUPS_PROSPECT;
  const groupLookupMap = useMemo(() => Object.fromEntries(COLUMN_GROUPS_CURRENT.map(g => [g.key, g])), [isClientView]);

  const visibleColumnGroups = useMemo(() => {
    const runs: { key: string; label: string; color: string; colspan: number }[] = [];
    for (const col of columns) {
      const gKey = (col as any).group || '';
      if (gKey === 'fechahora_collapsed') {
        runs.push({ key: 'fechahora_collapsed', label: '', color: SHEET_COLOR_DARK, colspan: 1 });
        continue;
      }
      const groupDef = groupLookupMap[gKey] || { key: gKey, label: '', color: '' };
      const last = runs[runs.length - 1];
      if (last && last.key === gKey) { last.colspan++; } else { runs.push({ ...groupDef, colspan: 1 }); }
    }
    return runs;
  }, [columns, groupLookupMap]);

  const sectionGroupsForSearch = useMemo(() => {
    const result: { label: string; offset: number; width: number }[] = [];
    let offset = 0;
    let currentGroupKey = '';
    for (const col of columns) {
      const w = parseInt(col.width);
      const gKey = (col as any).group || '';
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

  // Create order maps for options-select columns (for proper sorting by position)
  const orderMaps = useMemo(() => {
    const maps: Record<string, Record<string, number>> = {};

    // Estatus order map
    maps['estatus'] = {};
    estatusOptions.forEach((opt, idx) => {
      maps['estatus'][opt.value] = idx;
    });

    // Embudo order map
    maps['embudo'] = {};
    embudoOptions.forEach((opt, idx) => {
      maps['embudo'][opt.value] = idx;
    });

    return maps;
  }, [estatusOptions, embudoOptions]);

  // Create label maps for columns that need display transformations (e.g., IDs to names)
  const labelMaps = useMemo(() => {
    const maps: Record<string, Record<string, string>> = {};
    
    // Asesor ID to name map
    maps['asesorId'] = {};
    users.forEach(user => {
      const fullName = user.name || user.username || 'Sin nombre';
      maps['asesorId'][user.id] = fullName;
    });
    
    // Tipología ID to name map
    maps['tipologia'] = {};
    typologies.forEach(typ => {
      // Combina desarrollo + tipo para un nombre descriptivo
      const displayName = [typ.development, typ.type].filter(Boolean).join(' - ') || 'Sin nombre';
      maps['tipologia'][typ.id] = displayName;
    });
    
    return maps;
  }, [users, typologies]);

  const groupMaps = useMemo(() => {
    const maps: Record<string, Record<string, string[]>> = {};

    const desGroups: Record<string, Set<string>> = {};
    developments.forEach(d => {
      const dev = developers.find(dev => dev.id === d.developerId);
      const devName = dev?.name || 'Sin Desarrollador';
      if (!desGroups[devName]) desGroups[devName] = new Set();
      desGroups[devName].add(d.name);
    });
    maps['desarrollo'] = {};
    Object.entries(desGroups).forEach(([k, v]) => { maps['desarrollo'][k] = Array.from(v).sort(); });

    const tipGroups: Record<string, Set<string>> = {};
    typologies.forEach(typ => {
      const devName = typ.development || 'Sin Desarrollo';
      if (!tipGroups[devName]) tipGroups[devName] = new Set();
      tipGroups[devName].add(typ.id);
    });
    maps['tipologia'] = {};
    Object.entries(tipGroups).forEach(([k, v]) => { maps['tipologia'][k] = Array.from(v); });

    return maps;
  }, [developments, developers, typologies]);

  const effectiveProspects = useMemo(() =>
    prospects.map(p => ({ ...p, ...(localEdits[p.id] || {}) })),
    [prospects, localEdits]
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
      promises.push(fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(changes),
        keepalive: true,
      }));
    });
    pending.clear();
    Promise.all(promises).then(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    });
  }, []);

  useEffect(() => {
    window.addEventListener('beforeunload', flushPendingChanges);
    return () => {
      window.removeEventListener('beforeunload', flushPendingChanges);
      flushPendingChanges();
    };
  }, [flushPendingChanges]);

  // Column filtering and sorting
  const prospSortKey = spreadsheetKey(uid, pageName, "sortConfig");
  const prospFilterKey = spreadsheetKey(uid, pageName, "filterConfigs");
  const readProspInitialSort = () => {
    try { const raw = localStorage.getItem(prospSortKey); if (raw) return JSON.parse(raw); } catch {}
    return undefined;
  };
  const readProspInitialFilters = () => {
    try { const raw = localStorage.getItem(prospFilterKey); if (raw) return filterConfigsSerializer.deserialize(raw); } catch {}
    return undefined;
  };
  const {
    sortConfig,
    filterConfigs,
    uniqueValuesMap,
    filteredAndSortedData,
    handleSort,
    handleFilter,
    handleClearFilter,
    clearAllFilters,
    availableValuesMap,
  } = useColumnFilters(effectiveProspects, columns, orderMaps, {
    defaultSortKey: "createdAt",
    initialSortConfig: readProspInitialSort(),
    initialFilterConfigs: readProspInitialFilters(),
    onSortChange: (c) => {
      try {
        if (!c.key && c.direction === null) localStorage.removeItem(prospSortKey);
        else localStorage.setItem(prospSortKey, JSON.stringify(c));
      } catch {}
    },
    onFilterChange: (c) => {
      try {
        if (Object.keys(c).length === 0) localStorage.removeItem(prospFilterKey);
        else localStorage.setItem(prospFilterKey, filterConfigsSerializer.serialize(c));
      } catch {}
    },
  });

  const INITIAL_ROWS = 50;
  const LOAD_MORE = 30;
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCollapsedGroups(new Set());
  }, [isClientView]);

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
          if (message.type === "client") {
            queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
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
    const sorted = [...prospects].sort((a, b) =>
      new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
    const map = new Map<string, number>();
    sorted.forEach((t, i) => map.set(t.id, i + 1));
    return map;
  }, [prospects]);

  // Zoom controls
  const [zoomLevel, setZoomLevel] = usePersistedState<number>(
    spreadsheetKey(uid, pageName, "zoomLevel"), 100
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
    if (isLoading || prospects.length === 0 || scrollToBottomPhaseRef.current !== 'idle') return;
    scrollToBottomPhaseRef.current = 'loading_all';
    setVisibleCount(filteredAndSortedData.length);
  }, [isLoading, prospects]);

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


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (shouldCheckAccess && !canAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <Lock className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Acceso Denegado</h3>
        <p className="text-muted-foreground">No tienes permisos para ver esta sección.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="prospects-spreadsheet">
      <div className="flex items-center justify-between px-3 py-1.5 border-b">
        <div className="flex items-center gap-2">
          {isClientView ? <UserCheck className="w-4 h-4 text-primary" /> : <UserPlus className="w-4 h-4 text-primary" />}
          <h1 className="text-sm font-bold" data-testid="text-page-title">{isClientView ? "Clientes" : "Prospectos"}</h1>
          {!hasFullAccess && (
            <Badge variant="outline" className="text-xs">
              <Eye className="w-3 h-3 mr-1" />
              Permisos limitados
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
          {!isClientView && (
            <Button size="sm" variant="outline" onClick={() => window.location.href = "/admin/prospectos/resumen"} data-testid="button-view-summary">
              <FileText className="w-4 h-4 mr-1" />
              Resumen
            </Button>
          )}
          <span className="text-xs text-muted-foreground">{filteredAndSortedData.length} {pageName}</span>
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
            data-testid="button-save-pending-prospects"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Guardar{pendingRowCount > 1 ? ` (${pendingRowCount})` : ""}
          </Button>
          {hasFullAccess && (
            <Button size="sm" onClick={handleCreateNew} disabled={createMutation.isPending} data-testid="button-add-prospect">
              <Plus className="w-4 h-4 mr-1" />
              Nuevo
            </Button>
          )}
        </div>
      </div>

      <div ref={contentScrollRef} className="flex-1 overflow-auto spreadsheet-scroll">
        <div className="min-w-max text-xs" style={zoomLevel !== 100 ? { zoom: zoomLevel / 100 } : undefined}>
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
            idFilterKey="index"
            labelMaps={labelMaps}
            groupMaps={groupMaps}
            collapsedGroups={collapsedGroups}
            onToggleGroupCollapse={toggleGroupCollapse}
            collapsedColumns={collapsedColumns}
            onToggleColumnCollapse={toggleColumn}
          />

          {visibleData.map((prospect, index) => {
            const isRowInactive = (prospect as any).active === null;
            const isActiveRow = activeEditingRowId === prospect.id;
            return (
            <div
              key={prospect.id}
              className={cn(
                "flex w-max border-b group",
                isRowInactive
                  ? ""
                  : isActiveRow
                    ? "ring-1 ring-blue-400/50"
                    : index % 2 === 0 ? "bg-background" : "bg-muted/10"
              )}
              style={{ height: '32px', maxHeight: '32px', ...(isRowInactive && !hasFullAccess ? { backgroundColor: '#9ca3af' } : {}) }}
              data-testid={`row-prospect-${prospect.id}`}
              onClick={() => handleRowClick(prospect.id)}
            >
                {columns.map((col) => {
                  const field = col.field || col.key;
                  const hasAsesor = !!(prospect as any).asesorId;
                  const editableWithoutAsesor = ['active', 'asesorId', 'nombre', 'apellido', 'telefono', 'correo', 'estatus', 'embudo', 'comoPaga', 'positivos', 'negativos', 'comentarios'];
                  const isBlockedByAsesor = !hasAsesor && !editableWithoutAsesor.includes(col.key);
                  const fieldCanEdit = hasFullAccess || (canEdit(col.key) && !isBlockedByAsesor);
                  const isEditing = editingCell?.id === prospect.id && editingCell?.field === col.key;

                  if (col.type === 'index') {
                    const dotColor = (prospect as any).active === true ? '#32CD32' : (prospect as any).active === null ? '#1f2937' : '#F16100';
                    return (
                      <div
                        key={col.key}
                        className="spreadsheet-cell flex-shrink-0 justify-center sticky left-0 z-10 relative border-r border-b"
                        style={{ width: col.width, minWidth: col.width, backgroundColor: SHEET_COLOR_LIGHT, color: 'white', height: 32 }}
                        title={prospect.id}
                      >
                        <span className="text-xs font-medium">{stableRowNumberMap.get(prospect.id) ?? index + 1}</span>
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
                      </div>
                    );
                  }

                  if (col.type === 'toggle') {
                    const activeVal = (prospect as any).active;
                    const isActive = activeVal === true;
                    const isDisabled = activeVal === null;
                    const bgColor = isRowInactive && !hasFullAccess ? '#9ca3af' : isActive ? '#dcfce7' : '#9ca3af';
                    const textStyle: React.CSSProperties = isActive ? { color: '#15803d', fontWeight: 600 } : { color: '#4b5563', fontWeight: 500 };
                    const label = isActive ? 'Sí' : '—';
                    return (
                      <div
                        key={col.key}
                        className={cn("spreadsheet-cell flex-shrink-0 px-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))}
                        style={{ width: col.width, minWidth: col.width, backgroundColor: bgColor }}
                      >
                        {fieldCanEdit ? (
                          <ExclusiveSelect
                            value={isActive ? "active" : "disabled"}
                            onValueChange={(v) => handleActiveToggle(prospect.id, v === "active" ? true : null)}
                          >
                            <SelectTrigger
                              className="h-6 w-full text-xs border-0 bg-transparent px-1 !justify-center gap-1 [&_svg]:h-3 [&_svg]:w-3 focus:ring-0 focus:ring-offset-0"
                              style={textStyle}
                              data-testid={`toggle-active-${prospect.id}`}
                            >
                              <span className="truncate">{label}</span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active" className="text-xs">
                                <span style={{ color: '#15803d', fontWeight: 500 }}>Sí</span>
                              </SelectItem>
                              <SelectItem value="disabled" className="text-xs">
                                <span style={{ color: '#4b5563', fontWeight: 500 }}>—</span>
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
                  }

                  if (col.type === 'date-display') {
                    return (
                      <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0 justify-center", getCellStyle({ type: "input" }))} style={{ width: col.width, minWidth: col.width, cursor: 'default' }} data-testid={`cell-fecha-${prospect.id}`}>
                        <span className="text-xs px-1">{formatDate(prospect.createdAt)}</span>
                      </div>
                    );
                  }

                  if (col.type === 'time-display') {
                    return (
                      <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0 justify-center", getCellStyle({ type: "input" }))} style={{ width: col.width, minWidth: col.width, cursor: 'default' }} data-testid={`cell-hora-${prospect.id}`}>
                        <span className="text-xs px-1">{formatTime(prospect.createdAt)}</span>
                      </div>
                    );
                  }

                  if (col.type === 'fechahora-collapsed') {
                    return (
                      <div key="fechahora_collapsed" className="spreadsheet-cell flex-shrink-0 border-r border-b border-gray-200 dark:border-gray-700 bg-teal-50 dark:bg-teal-900/20" style={{ width: '30px', minWidth: '30px' }} />
                    );
                  }

                  if (col.type === 'group-collapsed') {
                    const groupDef = groupLookupMap[(col as any).group || ''];
                    return (
                      <div key={col.key} className="spreadsheet-cell flex-shrink-0 border-r border-b" style={{ width: '30px', minWidth: '30px', backgroundColor: groupDef?.color ? `${groupDef.color}22` : '#f3f4f6' }} />
                    );
                  }

                  if (collapsedColumns.has(col.key)) {
                    return (
                      <div
                        key={col.key}
                        className="spreadsheet-cell flex-shrink-0"
                        style={{ width: COLLAPSED_COL_WIDTH, minWidth: COLLAPSED_COL_WIDTH, ...(isRowInactive && !hasFullAccess ? { backgroundColor: '#9ca3af' } : {}) }}
                      />
                    );
                  }

                  if (col.key === 'asesorId') {
                    const value = (prospect as any).asesorId;
                    const asesorName = getAsesorName(value);
                    return (
                      <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
                        {fieldCanEdit ? (
                          <ExclusiveSelect
                            value={value || "__unassigned__"}
                            onValueChange={(v) => handleSelectChange(prospect.id, 'asesorId', v)}
                          >
                            <SelectTrigger className={`h-6 text-xs border-0 bg-transparent ${!value ? 'text-red-500 font-medium' : ''}`}>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__unassigned__" className="text-red-500 font-medium">SIN ASIGNAR</SelectItem>
                              {users.filter(u => u.role === 'asesor' || u.role === 'admin').map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </ExclusiveSelect>
                        ) : (
                          <div className="flex items-center gap-1 px-3">
                            {value ? (
                              <span>{asesorName}</span>
                            ) : (
                              <span className="text-red-500 font-medium">SIN ASIGNAR</span>
                            )}
                            <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (col.key === 'estatus') {
                    const value = (prospect as any).estatus || (prospect as any).status || '';
                    const estatusOpt = estatusOptions.find(o => o.value === value);
                    const estatusColor = estatusOpt?.color || null;
                    const estatusTextColor = needsWhiteText(estatusColor) ? 'white' : 'black';
                    return (
                      <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, ...(estatusColor ? { backgroundColor: estatusColor } : {}) }}>
                        {fieldCanEdit ? (
                          <ExclusiveSelect
                            value={value || "__unassigned__"}
                            onValueChange={(v) => handleSelectChange(prospect.id, 'estatus', v)}
                          >
                            <SelectTrigger className="h-6 text-xs border-0 bg-transparent font-medium" style={estatusColor ? { color: estatusTextColor } : {}}>
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__unassigned__">—</SelectItem>
                              {estatusOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} style={opt.color ? { backgroundColor: opt.color, color: needsWhiteText(opt.color) ? 'white' : 'black' } : {}}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </ExclusiveSelect>
                        ) : (
                          <div className="flex items-center gap-1 px-3 font-medium" style={estatusColor ? { color: estatusTextColor } : {}}>
                            <span>{estatusOpt?.label || value || '-'}</span>
                            <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Handle catalog-select fields (ciudad, zona, desarrollador, desarrollo)
                  if (col.type === 'catalog-select') {
                    const value = (prospect as any)[col.key];
                    let options: { value: string; label: string }[] = [];
                    
                    if (col.key === 'ciudad') {
                      options = cities.filter(c => c.name?.trim()).map(c => ({ value: c.name, label: c.name }));
                    } else if (col.key === 'zona') {
                      options = zones.filter(z => z.name?.trim()).map(z => ({ value: z.name, label: z.name }));
                    } else if (col.key === 'desarrollador') {
                      options = developers.filter(d => d.name?.trim()).map(d => ({ value: d.name, label: d.name }));
                    } else if (col.key === 'desarrollo') {
                      const developerGroups: Record<string, { id: string; name: string }[]> = {};
                      developments.filter(d => d.name?.trim()).forEach(d => {
                        const dev = developers.find(dev => dev.id === d.developerId);
                        const devName = dev?.name?.trim() ? dev.name : 'Sin Desarrollador';
                        if (!developerGroups[devName]) developerGroups[devName] = [];
                        developerGroups[devName].push({ id: d.id, name: d.name });
                      });
                      
                      return (
                        <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
                          {fieldCanEdit ? (
                            <ExclusiveSelect
                              value={value || "__unassigned__"}
                              onValueChange={(v) => handleSelectChange(prospect.id, col.key, v)}
                            >
                              <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                <SelectItem value="__unassigned__" style={{ color: '#000' }}>—</SelectItem>
                                {Object.entries(developerGroups).map(([devName, devDevelopments]) => (
                                  <SelectGroup key={devName}>
                                    <SelectLabel className="text-xs font-semibold text-muted-foreground">{devName}</SelectLabel>
                                    {devDevelopments.map(d => (
                                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                                    ))}
                                  </SelectGroup>
                                ))}
                              </SelectContent>
                            </ExclusiveSelect>
                          ) : (
                            <div className="flex items-center gap-1 px-3">
                              <span>{value || '-'}</span>
                              <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />
                            </div>
                          )}
                        </div>
                      );
                    }
                    
                    return (
                      <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
                        {fieldCanEdit ? (
                          <ExclusiveSelect
                            value={value || "__unassigned__"}
                            onValueChange={(v) => handleSelectChange(prospect.id, col.key, v)}
                          >
                            <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              <SelectItem value="__unassigned__" style={{ color: '#000' }}>—</SelectItem>
                              {options.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </ExclusiveSelect>
                        ) : (
                          <div className="flex items-center gap-1 px-3">
                            <span>{value || '-'}</span>
                            <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Handle typology-type field (derived read-only: shows type from selected tipología)
                  if (col.type === 'typology-type') {
                    const tipologiaId = (prospect as any).tipologia;
                    const selectedTypology = typologies.find(t => t.id === tipologiaId);
                    const tipoLabel = selectedTypology?.type || '';
                    return (
                      <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "readonly" }))} style={{ width: col.width, minWidth: col.width }} data-testid={`cell-tipoUnidad-${prospect.id}`}>
                        <span className="text-xs px-2 truncate text-muted-foreground">{tipoLabel}</span>
                      </div>
                    );
                  }

                  // Handle typology-select field (cascaded by developer and development)
                  if (col.type === 'typology-select') {
                    const value = (prospect as any).tipologia;
                    const prospectDeveloper = (prospect as any).desarrollador;
                    const prospectDevelopment = (prospect as any).desarrollo;
                    
                    // Filter typologies based on selected developer and development
                    const filteredTypologies = typologies.filter(t => {
                      if (prospectDeveloper && t.developer !== prospectDeveloper) return false;
                      if (prospectDevelopment && t.development !== prospectDevelopment) return false;
                      return true;
                    });
                    
                    const selectedTypology = typologies.find(t => t.id === value);
                    const displayName = selectedTypology 
                      ? `${selectedTypology.development} - ${selectedTypology.type || 'Sin tipo'}`
                      : value || '';
                    return (
                      <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
                        {fieldCanEdit ? (
                          <ExclusiveSelect
                            value={value || "__unassigned__"}
                            onValueChange={(v) => handleTypologySelect(prospect.id, v)}
                          >
                            <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              <SelectItem value="__unassigned__" style={{ color: '#000' }}>—</SelectItem>
                              {filteredTypologies.length > 0 ? (
                                (() => {
                                  const groupedByDev: Record<string, typeof filteredTypologies> = {};
                                  filteredTypologies.forEach(t => {
                                    const devName = t.development || 'Sin Desarrollo';
                                    if (!groupedByDev[devName]) groupedByDev[devName] = [];
                                    groupedByDev[devName].push(t);
                                  });
                                  return Object.entries(groupedByDev).map(([devName, typs]) => (
                                    <SelectGroup key={devName}>
                                      <SelectLabel className="text-xs font-semibold text-muted-foreground">{devName}</SelectLabel>
                                      {typs.map(t => (
                                        <SelectItem key={t.id} value={t.id}>
                                          {t.type || 'Sin tipo'} ({t.city})
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  ));
                                })()
                              ) : (
                                <SelectItem value="__no_options__" disabled>
                                  {prospectDeveloper || prospectDevelopment
                                    ? 'No hay tipologías para esta selección'
                                    : 'Selecciona desarrollador/desarrollo primero'}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </ExclusiveSelect>
                        ) : (
                          <div className="flex items-center gap-1 px-3">
                            <span>{displayName}</span>
                            <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Handle boolean-select field (Broker Externo)
                  if (col.type === 'boolean-select') {
                    const value = (prospect as any)[col.key];
                    const displayValue = value === 'si' ? 'Sí' : value === 'no' ? 'No' : null;
                    // Styling: cell background = light color, text = dark color (no badge)
                    const getCellBgColor = (val: string | null) => {
                      if (val === 'si') return '#dcfce7'; // green-100
                      return '#fee2e2'; // red-100
                    };
                    const getTextColor = (val: string | null) => {
                      if (val === 'si') return 'text-green-700';
                      return 'text-red-600';
                    };
                    const cellBgColor = getCellBgColor(value);
                    const textColorClass = getTextColor(value);
                    return (
                      <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width, backgroundColor: cellBgColor }}>
                        {fieldCanEdit ? (
                          <ExclusiveSelect
                            value={value || "__unassigned__"}
                            onValueChange={(v) => handleSelectChange(prospect.id, col.key, v)}
                          >
                            <SelectTrigger
                              className={`h-6 text-xs border-0 bg-transparent px-2 font-medium ${textColorClass}`}
                            >
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__unassigned__" style={{ color: '#000' }}>—</SelectItem>
                              <SelectItem value="si" className="text-green-700 font-medium">Sí</SelectItem>
                              <SelectItem value="no" className="text-red-600 font-medium">No</SelectItem>
                            </SelectContent>
                          </ExclusiveSelect>
                        ) : (
                          <div className={`flex items-center gap-1 px-2 py-1 font-medium ${textColorClass}`}>
                            <span>{displayValue || '-'}</span>
                            <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Handle options-select fields (tipofil, perfil, comoLlega, embudo, comoPaga)
                  if (col.type === 'options-select') {
                    const value = (prospect as any)[col.key];
                    const options = optionsMap[col.key] || [];
                    const selectedOption = options.find(o => o.value === value);
                    const displayLabel = selectedOption?.label || value || null;
                    const isComoPaga = col.key === 'comoPaga';
                    const isEmbudo = col.key === 'embudo';
                    const optColor = selectedOption?.color || null;
                    const optTextColor = needsWhiteText(optColor) ? 'white' : 'black';
                    const cellClasses = getCellStyle({ type: "dropdown", disabled: !fieldCanEdit });
                    const effectiveClasses = optColor
                      ? cellClasses.replace(/\bbg-\S+/g, '')
                      : cellClasses;

                    return (
                      <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", effectiveClasses)} style={{ width: col.width, minWidth: col.width, ...(optColor ? { backgroundColor: optColor } : {}) }}>
                        {fieldCanEdit ? (
                          <ExclusiveSelect
                            value={isEmbudo ? (value || "Nuevo") : (value || "__unassigned__")}
                            onValueChange={(v) => handleSelectChange(prospect.id, col.key, v)}
                          >
                            <SelectTrigger
                              className={`h-6 text-xs border-0 bg-transparent font-medium ${isComoPaga && !value ? 'text-red-500' : ''}`}
                              style={optColor ? { color: optTextColor } : {}}
                            >
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {!isEmbudo && (
                                <SelectItem value="__unassigned__" className={isComoPaga ? 'text-red-500 font-medium' : ''}>
                                  {isComoPaga ? '-' : '—'}
                                </SelectItem>
                              )}
                              {options.map(opt => (
                                <SelectItem
                                  key={opt.value}
                                  value={opt.value}
                                  style={opt.color ? { backgroundColor: opt.color, color: needsWhiteText(opt.color) ? 'white' : 'black' } : {}}
                                >
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </ExclusiveSelect>
                        ) : (
                          <div className="flex items-center gap-1 px-3 font-medium" style={optColor ? { color: optTextColor } : {}}>
                            {displayLabel ? (
                              <span>{displayLabel}</span>
                            ) : (
                              <span className={isComoPaga ? 'text-red-500' : ''}>
                                {isComoPaga ? 'SIN ASIGNAR' : '-'}
                              </span>
                            )}
                            <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Handle plain-number fields (plazoNumero, plazoMetro, plazoMensualidades)
                  if (col.type === 'plain-number') {
                    const value = (prospect as any)[col.key];
                    const numValue = value !== null && value !== undefined ? Number(value) : null;
                    const isInteger = col.key === 'plazoNumero' || col.key === 'plazoMensualidades';
                    const displayValue = numValue !== null
                      ? isInteger
                        ? numValue.toLocaleString('es-MX')
                        : numValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : '';
                    return (
                      <div
                        key={col.key}
                        className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "input", disabled: !fieldCanEdit, isEditing }))}
                        style={{ width: col.width, minWidth: col.width }}
                        onClick={() => fieldCanEdit && !isEditing && handleCellClick(prospect.id, col.key, String(value ?? ''))}
                        data-testid={`cell-${col.key}-${prospect.id}`}
                      >
                        {isEditing && fieldCanEdit ? (
                          <Input
                            type="number"
                            step={isInteger ? '1' : '0.01'}
                            defaultValue={editValue}
                            onBlur={(e) => {
                              const v = e.target.value;
                              if (v !== String(value ?? '')) {
                                handleFieldChange(prospect.id, { [col.key]: v !== '' ? Number(v) : null } as any);
                              }
                              setEditingCell(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              if (e.key === 'Escape') { setEditingCell(null); }
                            }}
                            autoFocus
                            className="h-6 text-xs border-0 p-0 px-1 focus-visible:ring-0 bg-transparent"
                            data-testid={`input-${col.key}-${prospect.id}`}
                          />
                        ) : (
                          <div className="flex items-center gap-1 px-2">
                            <span className="text-xs text-muted-foreground">{displayValue}</span>
                            {!fieldCanEdit && <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Handle multi-select fields (positivos, negativos)
                  if (col.type === 'multi-select') {
                    const rawValue = (prospect as any)[col.key];
                    const selectedValues: string[] = Array.isArray(rawValue) ? rawValue : (rawValue ? [rawValue] : []);
                    const options = optionsMap[col.key] || [];
                    const count = selectedValues.length;
                    const displayText = count === 0 ? null : `${count} seleccionados`;
                    
                    const handleMultiChange = (optValue: string, checked: boolean) => {
                      const newValues = checked 
                        ? [...selectedValues, optValue]
                        : selectedValues.filter(v => v !== optValue);
                      handleFieldChange(prospect.id, { [col.key]: newValues } as any);
                    };

                    return (
                      <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))} style={{ width: col.width, minWidth: col.width }}>
                        {fieldCanEdit ? (
                          <Popover modal>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" className={`h-6 w-full justify-start text-xs font-normal px-2 ${!displayText ? 'text-red-500 font-medium' : ''}`}>
                                <span className="truncate">{displayText || 'SIN ASIGNAR'}</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-2" align="start">
                              <div className="space-y-1 max-h-60 overflow-y-auto">
                                {options.map(opt => (
                                  <label key={opt.value} className="flex items-center gap-2 px-2 py-1 hover:bg-muted rounded cursor-pointer">
                                    <Checkbox
                                      checked={selectedValues.includes(opt.value)}
                                      onCheckedChange={(checked) => handleMultiChange(opt.value, !!checked)}
                                    />
                                    <span className="text-xs">{opt.label}</span>
                                  </label>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <div className="flex items-center gap-1">
                            {displayText ? (
                              <span className="truncate">{displayText}</span>
                            ) : (
                              <span className="text-red-500 font-medium">SIN ASIGNAR</span>
                            )}
                            <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Handle currency fields
                  if (col.type === 'currency') {
                    const value = (prospect as any)[col.key];
                    const numValue = value ? parseFloat(value) : null;
                    const displayValue = numValue !== null ? 
                      new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(numValue) : 
                      '-';
                    return (
                      <div 
                        key={col.key} 
                        className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "input", disabled: !fieldCanEdit, isEditing }))}
                        style={{ width: col.width, minWidth: col.width }}
                        onClick={() => fieldCanEdit && !isEditing && handleCellClick(prospect.id, col.key, value)}
                        data-testid={`cell-${col.key}-${prospect.id}`}
                      >
                        {isEditing && fieldCanEdit ? (
                          <Input
                            type="number"
                            step="0.01"
                            defaultValue={editValue}
                            onBlur={(e) => {
                              const v = e.target.value;
                              if (v !== String(value ?? '')) {
                                handleFieldChange(prospect.id, { [col.key]: v || null } as any);
                              }
                              setEditingCell(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellBlur(prospect.id, col.key, (e.target as HTMLInputElement).value);
                              if (e.key === 'Escape') { setEditingCell(null); }
                            }}
                            autoFocus
                            className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                            data-testid={`input-${col.key}-${prospect.id}`}
                          />
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>{displayValue}</span>
                            {!fieldCanEdit && <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Handle all date fields (fechaSeparacion, fechaEnganche, plazoFechaFinal, fechaLiquidacion, etc.)
                  if (col.type === 'date') {
                    const rawValue = (prospect as any)[col.key];
                    const dateValue = rawValue ? new Date(rawValue).toISOString().split('T')[0] : '';
                    return (
                      <div 
                        key={col.key} 
                        className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "input", disabled: !fieldCanEdit, isEditing }))}
                        style={{ width: col.width, minWidth: col.width }}
                        onClick={() => fieldCanEdit && !isEditing && setEditingCell({ id: prospect.id, field: col.key })}
                      >
                        {isEditing && fieldCanEdit ? (
                          <Input
                            type="date"
                            defaultValue={dateValue}
                            onBlur={(e) => {
                              const v = e.target.value;
                              if (v !== dateValue) {
                                const newDate = v ? new Date(v).toISOString() : null;
                                handleFieldChange(prospect.id, { [col.key]: newDate } as any);
                              }
                              setEditingCell(null);
                            }}
                            autoFocus
                            className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                            data-testid={`input-${col.key}-${prospect.id}`}
                          />
                        ) : (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span>{rawValue ? formatDate(rawValue) : '-'}</span>
                            {!fieldCanEdit && <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (col.type === 'actions') {
                    return (
                      <div key={col.key} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "actions" }))} style={{ width: col.width, minWidth: col.width }}>
                        {hasFullAccess && (
                          <Dialog open={deleteId === prospect.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                            <DialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => setDeleteId(prospect.id)}
                                data-testid={`button-delete-${prospect.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Eliminar {isClientView ? "Cliente" : "Prospecto"}</DialogTitle>
                              </DialogHeader>
                              <p>¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.</p>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">Cancelar</Button>
                                </DialogClose>
                                <Button
                                  variant="destructive"
                                  onClick={() => deleteMutation.mutate(prospect.id)}
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

                  const value = (prospect as any)[col.key] || (prospect as any)[field];

                  return (
                    <div
                      key={col.key}
                      className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "input", disabled: !fieldCanEdit, isEditing }))}
                      style={{ width: col.width, minWidth: col.width }}
                      onClick={() => fieldCanEdit && !isEditing && handleCellClick(prospect.id, col.key, value)}
                      data-testid={`cell-${col.key}-${prospect.id}`}
                    >
                      {isEditing && fieldCanEdit ? (
                        (() => {
                          const filterType = getColumnFilterType(col.key);
                          return (
                            <Input
                              defaultValue={editValue}
                              onBlur={(e) => handleCellBlur(prospect.id, col.key, e.target.value)}
                              onKeyDown={(e) => {
                                if (filterType) createInputFilter(filterType)(e);
                                if (e.key === "Enter") handleCellBlur(prospect.id, col.key, (e.target as HTMLInputElement).value);
                                if (e.key === "Escape") { setEditingCell(null); }
                              }}
                              onPaste={filterType ? createPasteFilter(filterType) : undefined}
                              autoFocus
                              className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                              data-testid={`input-${col.key}-${prospect.id}`}
                            />
                          );
                        })()
                      ) : (
                        <div
                          className="flex items-center gap-1 cursor-pointer"
                          onClick={() => !fieldCanEdit && value && setTextDetail({ title: col.label, value: String(value) })}
                        >
                          <span className="truncate">
                            {value || ""}
                          </span>
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
          {filteredAndSortedData.length === 0 && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              {hasActiveFilters 
                ? "No hay resultados con los filtros aplicados." 
                : `No hay ${isClientView ? "clientes" : "prospectos"}. Haz clic en "Agregar" para crear uno.`}
            </div>
          )}
        </div>
      </div>
      <TextDetailModal
        open={!!textDetail}
        onOpenChange={(open) => !open && setTextDetail(null)}
        title={textDetail?.title || ""}
        value={textDetail?.value || ""}
      />
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
              entityLabel: "Prospectos",
              deletedEndpoint: "/api/clients/deleted",
              restoreEndpoint: (id) => `/api/clients/${id}/restore`,
              invalidateKeys: ["/api/clients"],
              getItemLabel: (item) => `${item.nombre || ''} ${item.apellido || ''}`.trim() || 'Sin nombre',
              getItemSubLabel: (item) => item.telefono || '',
            }} />
          </>
        )}
      </div>
    </div>
  );
}
