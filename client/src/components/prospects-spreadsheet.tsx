import { useState, useCallback, useMemo } from "react";
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
import { Plus, Trash2, Users, Loader2, Lock, Eye, Calendar, Clock, X, FileText, Download } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { getCellStyle, type CellType } from "@/lib/spreadsheet-utils";
import type { Client, User, Typology, CatalogCity, CatalogZone, Developer, Development } from "@shared/schema";

interface ProspectsSpreadsheetProps {
  isClientView?: boolean;
}

export function ProspectsSpreadsheet({ isClientView = false }: ProspectsSpreadsheetProps) {
  const { toast } = useToast();
  const pageName = isClientView ? 'clientes' : 'prospectos';
  const { canView, canEdit, hasFullAccess, role, canAccess, isLoading: authLoading } = useFieldPermissions(pageName as any);
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [textDetail, setTextDetail] = useState<{title: string, value: string} | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const handleCellBlur = useCallback((id: string, field: string) => {
    if (!editingCell || editingCell.id !== id || editingCell.field !== field) return;
    
    const prospect = prospects.find(p => p.id === id);
    if (!prospect) return;
    
    // Validación: nombre y apellido deben tener al menos 3 caracteres
    if ((field === 'nombre' || field === 'apellido') && editValue && editValue.trim().length < 3) {
      toast({ 
        title: "Error de validación", 
        description: `${field === 'nombre' ? 'Nombre' : 'Apellido'} debe tener al menos 3 caracteres`, 
        variant: "destructive" 
      });
      setEditingCell(null);
      return;
    }
    
    const currentValue = String((prospect as any)[field] ?? "");
    if (editValue !== currentValue) {
      updateMutation.mutate({ id, data: { [field]: editValue || null } });
    }
    setEditingCell(null);
  }, [editingCell, editValue, prospects, updateMutation, toast]);

  const handleSelectChange = useCallback((id: string, field: string, value: string) => {
    // Convert special unassigned value to null for database
    const actualValue = value === '__unassigned__' ? null : (value || null);
    
    // Define client funnel stages (stages that make someone a client)
    const clientFunnelStages = ['separado', 'enganche_firma'];
    
    if (field === 'embudo') {
      const currentRecord = prospects.find(p => p.id === id);
      const isCurrentlyClient = currentRecord?.isClient === true;
      const shouldBeClient = clientFunnelStages.includes(value);
      
      if (!isCurrentlyClient && shouldBeClient) {
        // Convert Prospect to Client
        updateMutation.mutate({ 
          id, 
          data: { 
            [field]: actualValue,
            isClient: true,
            convertedAt: new Date(),
          } as any
        });
        toast({ title: "Prospecto convertido a Cliente", description: "El prospecto ahora aparece en la sección de Clientes." });
        return;
      } else if (isCurrentlyClient && !shouldBeClient) {
        // Convert Client back to Prospect
        updateMutation.mutate({ 
          id, 
          data: { 
            [field]: actualValue,
            isClient: false,
            convertedAt: null,
          } as any
        });
        toast({ title: "Cliente regresado a Prospecto", description: "El cliente ahora aparece en la sección de Prospectos." });
        return;
      }
    }
    
    updateMutation.mutate({ id, data: { [field]: actualValue } });
  }, [updateMutation, toast, prospects]);

  const handleTypologySelect = useCallback((prospectId: string, typologyId: string) => {
    if (typologyId === '__unassigned__') {
      updateMutation.mutate({ id: prospectId, data: { tipologia: null } });
      return;
    }
    const selectedTypology = typologies.find(t => t.id === typologyId);
    if (selectedTypology) {
      updateMutation.mutate({ 
        id: prospectId, 
        data: { 
          tipologia: typologyId,
          ciudad: selectedTypology.city || null,
          zona: selectedTypology.zone || null,
          desarrollador: selectedTypology.developer || null,
          desarrollo: selectedTypology.development || null,
        } 
      });
    }
  }, [typologies, updateMutation]);

  const handleCreateNew = () => {
    createMutation.mutate({
      nombre: "Nuevo Prospecto",
      telefono: "",
      estatus: "activo",
      embudo: "nuevo",
      comoLlega: "web",
    } as any);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  const getAsesorName = (asesorId: string | null) => {
    if (!asesorId) return "";
    const user = users.find(u => u.id === asesorId);
    return user ? user.name : "";
  };

  // Columns for Prospectos (22 fields)
  const prospectColumns = [
    { key: "index", label: "ID", width: "45px", type: "index" },
    { key: "fecha", label: "Fecha", width: "85px", type: "date", field: "createdAt" },
    { key: "hora", label: "Hora", width: "65px", type: "time", field: "createdAt" },
    { key: "asesorId", label: "Asesor", width: "120px", type: "select" },
    { key: "ciudad", label: "Ciudad", width: "100px", type: "catalog-select" },
    { key: "zona", label: "Zona", width: "100px", type: "catalog-select" },
    { key: "desarrollador", label: "Desarrollador", width: "130px", type: "catalog-select" },
    { key: "desarrollo", label: "Desarrollo", width: "130px", type: "catalog-select" },
    { key: "tipologia", label: "Tipología", width: "120px", type: "typology-select" },
    { key: "nombre", label: "Nombre", width: "120px" },
    { key: "apellido", label: "Apellido", width: "120px" },
    { key: "telefono", label: "Teléfono", width: "110px" },
    { key: "correo", label: "Correo", width: "160px" },
    { key: "tipofil", label: "Tipo", width: "100px", type: "options-select" },
    { key: "perfil", label: "Perfil", width: "110px", type: "options-select" },
    { key: "comoLlega", label: "Fuente", width: "130px", type: "options-select" },
    { key: "brokerExterno", label: "Broker Ext.", width: "90px", type: "boolean-select" },
    { key: "estatus", label: "Estatus", width: "100px", type: "options-select" },
    { key: "embudo", label: "Embudo", width: "130px", type: "options-select" },
    { key: "comoPaga", label: "Cómo Paga", width: "110px", type: "options-select" },
    { key: "positivos", label: "Positivos", width: "140px", type: "multi-select" },
    { key: "negativos", label: "Negativos", width: "140px", type: "multi-select" },
    { key: "comentarios", label: "Comentarios", width: "160px", noFilter: true },
    { key: "actions", label: "", width: "50px", type: "actions" },
  ];

  const clientColumns = [
    { key: "index", label: "ID", width: "45px", type: "index" },
    { key: "fecha", label: "Fecha", width: "85px", type: "date", field: "createdAt" },
    { key: "hora", label: "Hora", width: "65px", type: "time", field: "createdAt" },
    { key: "asesorId", label: "Asesor", width: "120px", type: "select" },
    { key: "nombre", label: "Nombre", width: "120px" },
    { key: "apellido", label: "Apellido", width: "120px" },
    { key: "telefono", label: "Teléfono", width: "110px" },
    { key: "correo", label: "Correo", width: "160px" },
    { key: "embudo", label: "Embudo", width: "130px", type: "options-select" },
    { key: "desarrollador", label: "Desarrollador", width: "130px", type: "catalog-select" },
    { key: "desarrollo", label: "Desarrollo", width: "130px", type: "catalog-select" },
    { key: "tipologia", label: "Tipología", width: "120px", type: "typology-select" },
    { key: "precioFinal", label: "Precio Final", width: "120px", type: "currency" },
    { key: "separacion", label: "Separación", width: "110px", type: "currency" },
    { key: "fechaSeparacion", label: "F. Separación", width: "110px", type: "date" },
    { key: "enganche", label: "Enganche", width: "110px", type: "currency" },
    { key: "fechaEnganche", label: "F. Enganche", width: "110px", type: "date" },
    { key: "actions", label: "", width: "50px", type: "actions" },
  ];

  const allColumns = isClientView ? clientColumns : prospectColumns;

  const tipoOptions = [
    { value: "inversionista", label: "Inversionista" },
    { value: "uso_propio", label: "Uso Propio" },
    { value: "revender", label: "Revender" },
  ];

  const perfilOptions = [
    { value: "estudiante", label: "Estudiante" },
    { value: "profesionista", label: "Profesionista" },
    { value: "pareja", label: "Pareja" },
    { value: "familia_joven", label: "Familia Joven" },
    { value: "familia_grande", label: "Familia Grande" },
    { value: "tercera_edad", label: "Tercera Edad" },
  ];

  const fuenteOptions = [
    { value: "instagram_ads", label: "Instagram Ads" },
    { value: "instagram_follower", label: "Instagram Follower" },
    { value: "facebook_ads", label: "Facebook Ads" },
    { value: "facebook_fan", label: "Facebook Fan" },
    { value: "landing_page", label: "Landing Page" },
    { value: "grupo_facebook", label: "Grupo Facebook" },
    { value: "fb_marketplace", label: "FB Marketplace" },
    { value: "broker_externo", label: "Broker Externo" },
    { value: "referido", label: "Referido" },
    { value: "lead_pasado", label: "Lead Pasado" },
    { value: "conocido_asesor", label: "Conocido de Asesor" },
    { value: "base_datos", label: "Base de Datos" },
    { value: "periodico", label: "Periódico" },
    { value: "flyer", label: "Flyer" },
    { value: "rotulo", label: "Rótulo" },
    { value: "google_ads", label: "Google Ads" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "tiktok", label: "TikTok" },
    { value: "twitter", label: "Twitter" },
  ];

  const estatusOptions = [
    { value: "activo", label: "Activo", order: 1 },
    { value: "en_hold", label: "En Hold", order: 2 },
    { value: "no_activo", label: "No Activo", order: 3 },
  ];

  const embudoOptions = [
    { value: "nuevo", label: "Nuevo", order: 1, color: "#87CEEB" },
    { value: "asignado", label: "Asignado", order: 2, color: "#90EE90" },
    { value: "no_contesta", label: "No Contesta", order: 3, color: "#FFD700" },
    { value: "no_le_intereso", label: "No le Interesó", order: 4, color: "#FF6B6B" },
    { value: "validado", label: "Validado", order: 5, color: "#32CD32" },
    { value: "envio_info", label: "Envío de Info", order: 6, color: "#9370DB" },
    { value: "muestra_interes", label: "Muestra Interés", order: 7, color: "#FF69B4" },
    { value: "presentacion", label: "Presentación", order: 8, color: "#FFA500" },
    { value: "showroom", label: "Showroom", order: 9, color: "#4169E1" },
    { value: "evaluando", label: "Evaluando", order: 10, color: "#40E0D0" },
    { value: "negociacion", label: "Negociación", order: 11, color: "#228B22" },
    { value: "cierre_ganado", label: "Cierre Ganado", order: 12, color: "#00FF00" },
    { value: "cierre_perdido", label: "Cierre Perdido", order: 13, color: "#DC143C" },
    { value: "separado", label: "Separado", order: 14, color: "#FF1493" },
    { value: "enganche_firma", label: "Enganche y Firma", order: 15, color: "#8B008B" },
  ];

  const comoPagaOptions = [
    { value: "enganche_bajo", label: "Enganche Bajo" },
    { value: "enganche_alto", label: "Enganche Alto" },
    { value: "capital_semilla", label: "Capital Semilla" },
  ];

  const positivosOptions = [
    { value: "precio", label: "Precio" },
    { value: "ubicacion", label: "Ubicación" },
    { value: "diseno", label: "Diseño" },
    { value: "tamano", label: "Tamaño" },
    { value: "amenidades", label: "Amenidades" },
    { value: "esquema_pagos", label: "Esquema de Pagos" },
  ];

  const negativosOptions = [
    { value: "precio", label: "Precio" },
    { value: "ubicacion", label: "Ubicación" },
    { value: "diseno", label: "Diseño" },
    { value: "tamano", label: "Tamaño" },
    { value: "amenidades", label: "Amenidades" },
    { value: "esquema_pagos", label: "Esquema de Pagos" },
    { value: "permisos", label: "Permisos" },
    { value: "desarrollador", label: "Desarrollador" },
    { value: "tiempo_entrega", label: "Tiempo de Entrega" },
  ];

  const optionsMap: Record<string, { value: string; label: string }[]> = {
    tipofil: tipoOptions,
    perfil: perfilOptions,
    comoLlega: fuenteOptions,
    estatus: estatusOptions,
    embudo: embudoOptions,
    comoPaga: comoPagaOptions,
    positivos: positivosOptions,
    negativos: negativosOptions,
  };

  const columns = useMemo(() => {
    return allColumns.filter(col => {
      if (col.type === 'index' || col.type === 'actions') return true;
      // Use col.key for permission check (fecha, hora are defined in permissions, not createdAt)
      return canView(col.key);
    });
  }, [allColumns, canView]);

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
  }, []);

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

  // Column filtering and sorting
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
  } = useColumnFilters(prospects, columns, orderMaps);

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
          <Users className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-bold" data-testid="text-page-title">{isClientView ? "Clientes" : "Prospectos"}</h1>
          {!hasFullAccess && (
            <Badge variant="outline" className="text-xs">
              <Eye className="w-3 h-3 mr-1" />
              Permisos limitados
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
          {!isClientView && (
            <Button size="sm" variant="outline" onClick={() => window.location.href = "/admin/prospectos/resumen"} data-testid="button-view-summary">
              <FileText className="w-4 h-4 mr-1" />
              Resumen
            </Button>
          )}
          <span className="text-xs text-muted-foreground">{filteredAndSortedData.length} {pageName}</span>
          {hasFullAccess && (
            <Button size="sm" onClick={handleCreateNew} disabled={createMutation.isPending} data-testid="button-add-prospect">
              <Plus className="w-4 h-4 mr-1" />
              Nuevo
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto spreadsheet-scroll">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10" data-testid="prospects-table-header">
            <tr className="bg-gray-100 dark:bg-gray-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  rowSpan={2}
                  className={`border-b border-r border-gray-200 dark:border-gray-700 px-2 font-medium text-xs tracking-wide whitespace-nowrap ${col.type === 'index' ? 'text-center' : 'text-left'} align-middle`}
                  style={{ minWidth: col.width, height: '68px' }}
                  data-testid={`column-header-${col.key}`}
                >
                  {col.type === 'actions' || col.type === 'index' || (col as any).noFilter ? (
                    <div className={`flex items-center ${col.type === 'index' ? 'justify-center' : ''}`}>
                      <span className="truncate">{col.label}</span>
                    </div>
                  ) : (
                    <ColumnFilter
                      columnKey={col.key}
                      columnLabel={col.label}
                      columnType={
                        col.type === 'currency' ? 'number' : 
                        col.type === 'date' || col.type === 'time' ? 'date' :
                        col.type === 'select' ? 'select' : 'text'
                      }
                      uniqueValues={uniqueValuesMap[col.key] || []}
                      availableValues={availableValuesMap[col.key]}
                      sortDirection={sortConfig.key === col.key ? sortConfig.direction : null}
                      filterState={filterConfigs[col.key] || { search: "", selectedValues: new Set() }}
                      onSort={(dir) => handleSort(col.key, dir)}
                      onFilter={(state) => handleFilter(col.key, state)}
                      onClear={() => handleClearFilter(col.key)}
                      labelMap={labelMaps[col.key]}
                      groupMap={groupMaps[col.key]}
                    />
                  )}
                </th>
              ))}
            </tr>
            <tr>{/* Empty row for rowSpan=2 alignment */}</tr>
          </thead>
          <tbody>
            {filteredAndSortedData.map((prospect, index) => (
              <tr key={prospect.id} className="group" style={{ height: '32px', maxHeight: '32px' }} data-testid={`row-prospect-${prospect.id}`}>
                {columns.map((col) => {
                  const field = col.field || col.key;
                  const hasAsesor = !!(prospect as any).asesorId;
                  const editableWithoutAsesor = ['asesorId', 'nombre', 'apellido', 'telefono', 'correo', 'estatus', 'embudo', 'comoPaga', 'positivos', 'negativos', 'comentarios'];
                  const isBlockedByAsesor = !hasAsesor && !editableWithoutAsesor.includes(col.key);
                  const fieldCanEdit = canEdit(col.key) && !isBlockedByAsesor;
                  const isEditing = editingCell?.id === prospect.id && editingCell?.field === col.key;

                  if (col.type === 'index') {
                    return (
                      <td key={col.key} className={getCellStyle({ type: "index" })} title={prospect.id}>
                        <span className="text-xs font-mono">{index + 1}</span>
                      </td>
                    );
                  }

                  if (col.key === 'fecha') {
                    const dateValue = prospect.createdAt ? new Date(prospect.createdAt).toISOString().split('T')[0] : '';
                    return (
                      <td 
                        key={col.key} 
                        className={getCellStyle({ type: "input", disabled: !fieldCanEdit, isEditing })}
                        onClick={() => fieldCanEdit && !isEditing && setEditingCell({ id: prospect.id, field: 'fecha' })}
                      >
                        {isEditing && fieldCanEdit ? (
                          <Input
                            type="date"
                            value={editValue || dateValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onFocus={() => setEditValue(dateValue)}
                            onBlur={() => {
                              if (editValue && editValue !== dateValue) {
                                const currentDate = prospect.createdAt ? new Date(prospect.createdAt) : new Date();
                                const [year, month, day] = editValue.split('-').map(Number);
                                currentDate.setFullYear(year, month - 1, day);
                                updateMutation.mutate({ id: prospect.id, data: { createdAt: currentDate.toISOString() } as any });
                              }
                              setEditingCell(null);
                            }}
                            autoFocus
                            className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                            data-testid={`input-fecha-${prospect.id}`}
                          />
                        ) : (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span>{formatDate(prospect.createdAt)}</span>
                            {!fieldCanEdit && <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />}
                          </div>
                        )}
                      </td>
                    );
                  }

                  if (col.key === 'hora') {
                    const timeValue = prospect.createdAt ? new Date(prospect.createdAt).toTimeString().slice(0, 5) : '';
                    return (
                      <td 
                        key={col.key} 
                        className={getCellStyle({ type: "input", disabled: !fieldCanEdit, isEditing })}
                        onClick={() => fieldCanEdit && !isEditing && setEditingCell({ id: prospect.id, field: 'hora' })}
                      >
                        {isEditing && fieldCanEdit ? (
                          <Input
                            type="time"
                            value={editValue || timeValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onFocus={() => setEditValue(timeValue)}
                            onBlur={() => {
                              if (editValue && editValue !== timeValue) {
                                const currentDate = prospect.createdAt ? new Date(prospect.createdAt) : new Date();
                                const [hours, minutes] = editValue.split(':').map(Number);
                                currentDate.setHours(hours, minutes);
                                updateMutation.mutate({ id: prospect.id, data: { createdAt: currentDate.toISOString() } as any });
                              }
                              setEditingCell(null);
                            }}
                            autoFocus
                            className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                            data-testid={`input-hora-${prospect.id}`}
                          />
                        ) : (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span>{formatTime(prospect.createdAt)}</span>
                            {!fieldCanEdit && <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />}
                          </div>
                        )}
                      </td>
                    );
                  }

                  if (col.key === 'asesorId') {
                    const value = (prospect as any).asesorId;
                    const asesorName = getAsesorName(value);
                    return (
                      <td key={col.key} className={getCellStyle({ type: "dropdown", disabled: !fieldCanEdit })}>
                        {fieldCanEdit ? (
                          <Select
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
                          </Select>
                        ) : (
                          <div className="flex items-center gap-1">
                            {value ? (
                              <span>{asesorName}</span>
                            ) : (
                              <span className="text-red-500 font-medium">SIN ASIGNAR</span>
                            )}
                            <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />
                          </div>
                        )}
                      </td>
                    );
                  }

                  if (col.key === 'estatus') {
                    const value = (prospect as any).estatus || (prospect as any).status || 'nuevo';
                    return (
                      <td key={col.key} className={getCellStyle({ type: "dropdown", disabled: !fieldCanEdit })}>
                        {fieldCanEdit ? (
                          <Select
                            value={value}
                            onValueChange={(v) => handleSelectChange(prospect.id, 'estatus', v)}
                          >
                            <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {estatusOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {estatusOptions.find(o => o.value === value)?.label || value}
                            </Badge>
                            <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />
                          </div>
                        )}
                      </td>
                    );
                  }

                  // Handle catalog-select fields (ciudad, zona, desarrollador, desarrollo)
                  if (col.type === 'catalog-select') {
                    const value = (prospect as any)[col.key];
                    let options: { value: string; label: string }[] = [];
                    
                    if (col.key === 'ciudad') {
                      options = cities.map(c => ({ value: c.name, label: c.name }));
                    } else if (col.key === 'zona') {
                      options = zones.map(z => ({ value: z.name, label: z.name }));
                    } else if (col.key === 'desarrollador') {
                      options = developers.map(d => ({ value: d.name, label: d.name }));
                    } else if (col.key === 'desarrollo') {
                      const developerGroups: Record<string, { id: string; name: string }[]> = {};
                      developments.forEach(d => {
                        const dev = developers.find(dev => dev.id === d.developerId);
                        const devName = dev?.name || 'Sin Desarrollador';
                        if (!developerGroups[devName]) developerGroups[devName] = [];
                        developerGroups[devName].push({ id: d.id, name: d.name });
                      });
                      
                      return (
                        <td key={col.key} className={getCellStyle({ type: "dropdown", disabled: !fieldCanEdit })}>
                          {fieldCanEdit ? (
                            <Select
                              value={value || "__unassigned__"}
                              onValueChange={(v) => handleSelectChange(prospect.id, col.key, v)}
                            >
                              <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                <SelectItem value="__unassigned__">Sin asignar</SelectItem>
                                {Object.entries(developerGroups).map(([devName, devDevelopments]) => (
                                  <SelectGroup key={devName}>
                                    <SelectLabel className="text-xs font-semibold text-muted-foreground">{devName}</SelectLabel>
                                    {devDevelopments.map(d => (
                                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                                    ))}
                                  </SelectGroup>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span>{value || '-'}</span>
                              <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />
                            </div>
                          )}
                        </td>
                      );
                    }
                    
                    return (
                      <td key={col.key} className={getCellStyle({ type: "dropdown", disabled: !fieldCanEdit })}>
                        {fieldCanEdit ? (
                          <Select
                            value={value || "__unassigned__"}
                            onValueChange={(v) => handleSelectChange(prospect.id, col.key, v)}
                          >
                            <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              <SelectItem value="__unassigned__">Sin asignar</SelectItem>
                              {options.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>{value || '-'}</span>
                            <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />
                          </div>
                        )}
                      </td>
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
                      <td key={col.key} className={getCellStyle({ type: "dropdown", disabled: !fieldCanEdit })}>
                        {fieldCanEdit ? (
                          <Select
                            value={value || "__unassigned__"}
                            onValueChange={(v) => handleTypologySelect(prospect.id, v)}
                          >
                            <SelectTrigger className="h-6 text-xs border-0 bg-transparent">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              <SelectItem value="__unassigned__">Sin asignar</SelectItem>
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
                          </Select>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>{displayName}</span>
                            <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />
                          </div>
                        )}
                      </td>
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
                      <td key={col.key} className={getCellStyle({ type: "dropdown", disabled: !fieldCanEdit })} style={{ backgroundColor: cellBgColor }}>
                        {fieldCanEdit ? (
                          <Select
                            value={value || "__unassigned__"}
                            onValueChange={(v) => handleSelectChange(prospect.id, col.key, v)}
                          >
                            <SelectTrigger 
                              className={`h-6 text-xs border-0 bg-transparent px-2 font-medium ${textColorClass}`}
                            >
                              <SelectValue placeholder="Sin asignar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__unassigned__" className="text-red-600 font-medium">Sin asignar</SelectItem>
                              <SelectItem value="si" className="text-green-700 font-medium">Sí</SelectItem>
                              <SelectItem value="no" className="text-red-600 font-medium">No</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className={`flex items-center gap-1 px-2 py-1 font-medium ${textColorClass}`}>
                            <span>{displayValue || 'Sin asignar'}</span>
                            <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />
                          </div>
                        )}
                      </td>
                    );
                  }

                  // Handle options-select fields (tipofil, perfil, comoLlega, estatus, embudo, comoPaga)
                  if (col.type === 'options-select') {
                    const value = (prospect as any)[col.key];
                    const options = optionsMap[col.key] || [];
                    const selectedOption = options.find(o => o.value === value);
                    const displayLabel = selectedOption?.label || value || null;
                    const isComoPaga = col.key === 'comoPaga';
                    const isEmbudo = col.key === 'embudo';
                    const embudoColor = isEmbudo && selectedOption ? (selectedOption as any).color : null;
                    
                    return (
                      <td key={col.key} className={getCellStyle({ type: "dropdown", disabled: !fieldCanEdit })}>
                        {fieldCanEdit ? (
                          <Select
                            value={value || "__unassigned__"}
                            onValueChange={(v) => handleSelectChange(prospect.id, col.key, v)}
                          >
                            <SelectTrigger 
                              className={`h-6 text-xs border-0 bg-transparent ${isComoPaga && !value ? 'text-red-500 font-medium' : ''}`}
                              style={embudoColor ? { backgroundColor: embudoColor, color: '#000', fontWeight: 500 } : {}}
                            >
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              <SelectItem value="__unassigned__" className={isComoPaga ? 'text-red-500 font-medium' : ''}>
                                {isComoPaga ? 'SIN ASIGNAR' : 'Sin asignar'}
                              </SelectItem>
                              {options.map(opt => (
                                <SelectItem 
                                  key={opt.value} 
                                  value={opt.value}
                                  style={isEmbudo && (opt as any).color ? { backgroundColor: (opt as any).color } : {}}
                                >
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-1">
                            {displayLabel ? (
                              isEmbudo && embudoColor ? (
                                <span 
                                  className="px-2 py-0.5 rounded text-xs font-medium" 
                                  style={{ backgroundColor: embudoColor, color: '#000' }}
                                >
                                  {displayLabel}
                                </span>
                              ) : (
                                <span>{displayLabel}</span>
                              )
                            ) : (
                              <span className={isComoPaga ? 'text-red-500 font-medium' : ''}>
                                {isComoPaga ? 'SIN ASIGNAR' : '-'}
                              </span>
                            )}
                            <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />
                          </div>
                        )}
                      </td>
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
                      updateMutation.mutate({ id: prospect.id, data: { [col.key]: newValues } as any });
                    };

                    return (
                      <td key={col.key} className={getCellStyle({ type: "dropdown", disabled: !fieldCanEdit })}>
                        {fieldCanEdit ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" className={`h-6 w-full justify-start text-sm font-normal px-2 ${!displayText ? 'text-red-500 font-medium' : ''}`}>
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
                      </td>
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
                      <td 
                        key={col.key} 
                        className={getCellStyle({ type: "input", disabled: !fieldCanEdit, isEditing })}
                        onClick={() => fieldCanEdit && !isEditing && handleCellClick(prospect.id, col.key, value)}
                        data-testid={`cell-${col.key}-${prospect.id}`}
                      >
                        {isEditing && fieldCanEdit ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => {
                              if (editValue !== String(value ?? '')) {
                                updateMutation.mutate({ id: prospect.id, data: { [col.key]: editValue || null } as any });
                              }
                              setEditingCell(null);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleCellBlur(prospect.id, col.key)}
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
                      </td>
                    );
                  }

                  // Handle client-specific date fields (fechaSeparacion, fechaEnganche)
                  if ((col.key === 'fechaSeparacion' || col.key === 'fechaEnganche') && col.type === 'date') {
                    const rawValue = (prospect as any)[col.key];
                    const dateValue = rawValue ? new Date(rawValue).toISOString().split('T')[0] : '';
                    return (
                      <td 
                        key={col.key} 
                        className={getCellStyle({ type: "input", disabled: !fieldCanEdit, isEditing })}
                        onClick={() => fieldCanEdit && !isEditing && setEditingCell({ id: prospect.id, field: col.key })}
                      >
                        {isEditing && fieldCanEdit ? (
                          <Input
                            type="date"
                            value={editValue || dateValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onFocus={() => setEditValue(dateValue)}
                            onBlur={() => {
                              if (editValue !== dateValue) {
                                const newDate = editValue ? new Date(editValue).toISOString() : null;
                                updateMutation.mutate({ id: prospect.id, data: { [col.key]: newDate } as any });
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
                      </td>
                    );
                  }

                  if (col.type === 'actions') {
                    return (
                      <td key={col.key} className={getCellStyle({ type: "actions" })}>
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
                      </td>
                    );
                  }

                  const value = (prospect as any)[col.key] || (prospect as any)[field];

                  return (
                    <td
                      key={col.key}
                      className={getCellStyle({ type: "input", disabled: !fieldCanEdit, isEditing })}
                      onClick={() => fieldCanEdit && !isEditing && handleCellClick(prospect.id, col.key, value)}
                      data-testid={`cell-${col.key}-${prospect.id}`}
                    >
                      {isEditing && fieldCanEdit ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleCellBlur(prospect.id, col.key)}
                          onKeyDown={(e) => e.key === "Enter" && handleCellBlur(prospect.id, col.key)}
                          autoFocus
                          className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                          data-testid={`input-${col.key}-${prospect.id}`}
                        />
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
                    </td>
                  );
                })}
              </tr>
            ))}
            {filteredAndSortedData.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  {hasActiveFilters 
                    ? "No hay resultados con los filtros aplicados." 
                    : `No hay ${isClientView ? "clientes" : "prospectos"}. Haz clic en "Agregar" para crear uno.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <TextDetailModal
        open={!!textDetail}
        onOpenChange={(open) => !open && setTextDetail(null)}
        title={textDetail?.title || ""}
        value={textDetail?.value || ""}
      />
    </div>
  );
}
