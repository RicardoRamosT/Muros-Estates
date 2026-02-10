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
import { Plus, Minus, Trash2, Building2, Loader2, Lock, Eye, FolderOpen, X, ChevronDown, Check, Clock } from "lucide-react";
import { getCellStyle, getCellTypeFromColumnType, formatDate, formatTime, type CellType } from "@/lib/spreadsheet-utils";
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
  type?: 'index' | 'toggle' | 'text' | 'actions' | 'folder-link' | 'date' | 'multiselect' | 'rfc' | 'tipo-select' | 'date-display' | 'time-display' | 'fechahora-collapsed';
  autoField?: boolean;
  group?: string;
  cellType?: CellType;
}

export function DevelopersSpreadsheet() {
  const { toast } = useToast();
  const { canView, canEdit, hasFullAccess, role, canAccess } = useFieldPermissions('desarrolladores');
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const LONG_TEXT_FIELDS = ['name', 'razonSocial', 'domicilio', 'contactName', 'contactEmail'];
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [fechaHoraExpanded, setFechaHoraExpanded] = useState(true);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);

  const syncScrollFromTop = useCallback(() => {
    if (topScrollRef.current && contentScrollRef.current) {
      contentScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  }, []);

  const syncScrollFromContent = useCallback(() => {
    if (topScrollRef.current && contentScrollRef.current) {
      topScrollRef.current.scrollLeft = contentScrollRef.current.scrollLeft;
    }
  }, []);

  const { data: developers = [], isLoading } = useQuery<Developer[]>({
    queryKey: ["/api/developers"],
  });

  const { data: catalogContratos = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/catalog/tipo-contrato"],
  });

  const allColumns: ColumnDef[] = [
    { key: "id", label: "ID", width: "45px", type: "index", autoField: true, cellType: "index" },
    { key: "active", label: "Act.", width: "55px", type: "toggle", autoField: true, cellType: "checkbox" },
    { key: "createdDate", label: "Fecha", width: "85px", type: "date-display", group: "fechahora", cellType: "readonly" },
    { key: "createdTime", label: "Hora", width: "65px", type: "time-display", group: "fechahora", cellType: "readonly" },
    { key: "antiguedadCalc", label: "Antigüedad", width: "100px", cellType: "readonly" },
    { key: "tipo", label: "Tipo", width: "120px", type: "tipo-select", cellType: "dropdown" },
    { key: "name", label: "Desarrollador", width: "150px", cellType: "input" },
    { key: "razonSocial", label: "Razón Social", width: "180px", cellType: "input" },
    { key: "rfc", label: "RFC", width: "100px", type: "rfc", cellType: "input" },
    { key: "domicilio", label: "Domicilio", width: "180px", cellType: "input" },
    { key: "tipos", label: "Tipos", width: "140px", type: "multiselect", cellType: "dropdown" },
    { key: "contratos", label: "Contratos", width: "140px", type: "multiselect", cellType: "dropdown" },
    { key: "representante", label: "Representante", width: "130px", cellType: "input" },
    { key: "contactName", label: "Ventas", width: "130px", cellType: "input" },
    { key: "contactPhone", label: "Teléfono", width: "110px", cellType: "input" },
    { key: "contactEmail", label: "Correo", width: "160px", cellType: "input" },
    { key: "legales", label: "Legales", width: "80px", type: "folder-link", cellType: "actions" },
    { key: "actions", label: "", width: "60px", type: "actions", cellType: "actions" },
  ];

  const columns = useMemo(() => {
    let cols = allColumns.filter(col => {
      if (col.group === 'fechahora') return fechaHoraExpanded;
      if (col.type === 'index' || col.type === 'actions' || col.type === 'folder-link') return true;
      return canView(col.key);
    });

    if (!fechaHoraExpanded) {
      const actIdx = cols.findIndex(c => c.key === 'active');
      const collapsedCol: ColumnDef = { key: 'fechahora_collapsed', label: '', width: '30px', type: 'fechahora-collapsed', cellType: 'readonly' };
      cols.splice(actIdx + 1, 0, collapsedCol);
    }

    return cols;
  }, [canView, fechaHoraExpanded]);

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
  } = useColumnFilters(developers, columns);

  const hasActiveFilters = Object.keys(filterConfigs).length > 0 || sortConfig.direction !== null;

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

  const handleCellBlur = useCallback((id: string, field: string) => {
    if (!editingCell || editingCell.id !== id || editingCell.field !== field) return;
    
    const developer = developers.find(d => d.id === id);
    if (!developer) return;
    
    let valueToSave = editValue;
    
    // RFC validation: enforce uppercase and validate length
    if (field === 'rfc' && valueToSave) {
      valueToSave = valueToSave.toUpperCase();
      const validation = validateRFC(valueToSave);
      if (!validation.isValid) {
        toast({ title: validation.message, variant: "destructive" });
        setEditingCell(null);
        return;
      }
    }
    
    const currentValue = String(developer[field as keyof Developer] ?? "");
    if (valueToSave !== currentValue) {
      updateMutation.mutate({ id, data: { [field]: valueToSave } });
    }
    setEditingCell(null);
  }, [editingCell, editValue, developers, updateMutation, toast]);

  const handleMultiselectChange = useCallback((id: string, field: string, selectedValues: string[]) => {
    updateMutation.mutate({ id, data: { [field]: selectedValues } });
  }, [updateMutation]);

  const handleDateChange = useCallback((id: string, field: string, value: string) => {
    const dateValue = value ? new Date(value) : null;
    updateMutation.mutate({ id, data: { [field]: dateValue } });
  }, [updateMutation]);

  const handleActiveToggle = useCallback((id: string, newValue: boolean) => {
    updateMutation.mutate({ id, data: { active: newValue } });
  }, [updateMutation]);

  const handleCreateNew = () => {
    // Generate unique name with random suffix to avoid duplicate key errors
    const uniqueSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    createMutation.mutate({
      name: `Nuevo Desarrollador ${uniqueSuffix}`,
      active: true,
    });
  };

  useEffect(() => {
    const updateWidth = () => {
      if (contentScrollRef.current) {
        const width = contentScrollRef.current.scrollWidth;
        if (width > 0) setContentWidth(width);
      }
    };
    const timer = setTimeout(updateWidth, 100);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (contentScrollRef.current) observer.observe(contentScrollRef.current);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [columns]);

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
          {hasFullAccess && (
            <Button size="sm" onClick={handleCreateNew} disabled={createMutation.isPending} data-testid="button-add-developer">
              <Plus className="w-4 h-4 mr-1" />
              Nuevo
            </Button>
          )}
        </div>
      </div>
      
      <div 
        ref={topScrollRef}
        onScroll={syncScrollFromTop}
        className="overflow-x-scroll overflow-y-hidden border-b bg-muted/20 scrollbar-thin"
        style={{ height: "16px", minHeight: "16px" }}
      >
        <div style={{ width: contentWidth || 2000, height: "1px" }} />
      </div>

      <div ref={contentScrollRef} onScroll={syncScrollFromContent} className="flex-1 overflow-auto spreadsheet-scroll">
        <div className="min-w-max text-xs">
          {/* Header: Two-row structure */}
          <div className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800">
            {/* Row 1: Group headers */}
            <div className="flex border-b">
              {(() => {
                const groupHeaders: { key: string; label: string; width: number; bgClass: string; isGroup: boolean; colSpan: number }[] = [];
                let i = 0;
                while (i < columns.length) {
                  const col = columns[i];
                  if (col.group === 'fechahora') {
                    let count = 0;
                    let totalWidth = 0;
                    while (i + count < columns.length && columns[i + count].group === 'fechahora') {
                      totalWidth += parseInt(columns[i + count].width);
                      count++;
                    }
                    groupHeaders.push({ key: 'fechahora', label: 'FECHA/HORA', width: totalWidth, bgClass: 'bg-teal-600 dark:bg-teal-700 text-white', isGroup: true, colSpan: count });
                    i += count;
                  } else {
                    groupHeaders.push({ key: col.key, label: '', width: parseInt(col.width), bgClass: '', isGroup: false, colSpan: 1 });
                    i++;
                  }
                }
                return groupHeaders.map((gh, idx) => {
                  if (!gh.isGroup) {
                    const col = columns.find(c => c.key === gh.key)!;
                    if (col.key === 'fechahora_collapsed') {
                      return (
                        <div
                          key={`group-${gh.key}-${idx}`}
                          className="border-r bg-teal-600 dark:bg-teal-700 text-white cursor-pointer flex items-center justify-center flex-shrink-0"
                          style={{ width: '30px', minWidth: '30px', height: '68px' }}
                          onClick={() => setFechaHoraExpanded(true)}
                          data-testid="toggle-fechahora-expand"
                        >
                          <Plus className="w-3 h-3" />
                        </div>
                      );
                    }
                    return (
                      <div
                        key={`group-${gh.key}-${idx}`}
                        className={cn(
                          "border-r border-gray-200 dark:border-gray-700 px-2 font-medium text-xs tracking-wide flex items-center flex-shrink-0",
                          col.type === 'index' ? 'justify-center' : 'justify-start'
                        )}
                        style={{ width: col.width, minWidth: col.width, height: '68px' }}
                      >
                        {col.type === 'index' || col.type === 'actions' || col.type === 'folder-link' ? (
                          <span className="truncate">{col.label}</span>
                        ) : (
                          <ColumnFilter
                            columnKey={col.key}
                            columnLabel={col.label}
                            columnType={col.type === 'toggle' ? 'boolean' : col.type === 'date' ? 'text' : 'text'}
                            uniqueValues={uniqueValuesMap[col.key] || []}
                            availableValues={availableValuesMap[col.key]}
                            sortDirection={sortConfig.key === col.key ? sortConfig.direction : null}
                            filterState={filterConfigs[col.key] || { search: "", selectedValues: new Set() }}
                            onSort={(dir) => handleSort(col.key, dir)}
                            onFilter={(state) => handleFilter(col.key, state)}
                            onClear={() => handleClearFilter(col.key)}
                          />
                        )}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={`group-${gh.key}-${idx}`}
                      className={cn("border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0", gh.bgClass)}
                      style={{ width: gh.width, minWidth: gh.width }}
                    >
                      <div className="flex items-center justify-center gap-1 h-9 px-2 font-bold text-xs uppercase tracking-wide">
                        <span>{gh.label}</span>
                        {gh.key === 'fechahora' && (
                          <button
                            onClick={() => setFechaHoraExpanded(false)}
                            className="ml-1 hover:opacity-80"
                            data-testid="toggle-fechahora-collapse"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="flex border-t border-gray-200/30">
                        {columns.filter(c => c.group === 'fechahora').map((subCol) => (
                          <div
                            key={subCol.key}
                            className="border-r last:border-r-0 border-gray-200/30 px-2 font-medium text-xs tracking-wide flex items-center h-8"
                            style={{ width: subCol.width, minWidth: subCol.width }}
                          >
                            <span className="truncate">{subCol.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Data rows */}
          {filteredAndSortedData.map((dev, index) => (
            <div
              key={dev.id}
              className={cn(
                "flex border-b hover:bg-muted/30 group",
                index % 2 === 0 ? "bg-background" : "bg-muted/10"
              )}
              style={{ height: '32px', maxHeight: '32px' }}
              data-testid={`row-developer-${dev.id}`}
            >
              {columns.map((col) => {
                const field = col.key;
                const fieldCanEdit = canEdit(field);
                const isEditing = editingCell?.id === dev.id && editingCell?.field === field;
                const cellType = col.cellType || getCellTypeFromColumnType(col.type);
                
                if (col.type === 'index') {
                  return (
                    <div 
                      key={field} 
                      className={cn("spreadsheet-cell flex-shrink-0 justify-center", getCellStyle({ type: "index", disabled: false }))}
                      style={{ width: col.width, minWidth: col.width }}
                      title={dev.id}
                    >
                      <span className="font-mono">{index + 1}</span>
                    </div>
                  );
                }
                
                if (col.type === 'date-display') {
                  return (
                    <div key={field} className={cn("spreadsheet-cell flex-shrink-0 px-1", getCellStyle({ type: "readonly" }))} style={{ width: col.width, minWidth: col.width }} data-testid={`cell-${field}-${dev.id}`}>
                      <span className="text-xs text-muted-foreground">{formatDate(dev.createdAt)}</span>
                    </div>
                  );
                }

                if (col.type === 'time-display') {
                  return (
                    <div key={field} className={cn("spreadsheet-cell flex-shrink-0 px-1", getCellStyle({ type: "readonly" }))} style={{ width: col.width, minWidth: col.width }} data-testid={`cell-${field}-${dev.id}`}>
                      <span className="text-xs text-muted-foreground">{formatTime(dev.createdAt)}</span>
                    </div>
                  );
                }

                if (col.type === 'fechahora-collapsed') {
                  return (
                    <div key="fechahora_collapsed" className="spreadsheet-cell flex-shrink-0 bg-teal-50 dark:bg-teal-900/20" style={{ width: '30px', minWidth: '30px' }} />
                  );
                }

                if (col.type === 'toggle') {
                  const isActive = dev.active ?? false;
                  const cellBgColor = isActive ? '#dcfce7' : '#fee2e2';
                  const textColorClass = isActive ? 'text-green-700' : 'text-red-600';
                  return (
                    <div 
                      key={field} 
                      className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "dropdown", disabled: !fieldCanEdit }))}
                      style={{ width: col.width, minWidth: col.width, backgroundColor: cellBgColor }}
                    >
                      {fieldCanEdit ? (
                        <Select
                          value={isActive ? "si" : "no"}
                          onValueChange={(v) => handleActiveToggle(dev.id, v === "si")}
                        >
                          <SelectTrigger 
                            className={`h-6 text-xs border-0 bg-transparent px-2 font-medium ${textColorClass}`}
                            data-testid={`toggle-active-${dev.id}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="si" className="text-green-700 font-medium">Sí</SelectItem>
                            <SelectItem value="no" className="text-red-600 font-medium">No</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className={`flex items-center gap-1 px-2 py-1 font-medium ${textColorClass}`}>
                          <span>{isActive ? 'Sí' : 'No'}</span>
                          <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />
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
                      style={{ width: col.width, minWidth: col.width }}
                      data-testid={`cell-${field}-${dev.id}`}
                    >
                      {fieldCanEdit ? (
                        <Select
                          value={tipoValue || "__empty__"}
                          onValueChange={(v) => {
                            const val = v === "__empty__" ? "" : v;
                            updateMutation.mutate({ id: dev.id, data: { tipo: val } });
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
                          <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />
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
                      style={{ width: col.width, minWidth: col.width }}
                      data-testid={`cell-${field}-${dev.id}`}
                    >
                      <span className="text-xs text-muted-foreground">{calculated}</span>
                    </div>
                  );
                }

                if (col.type === 'folder-link') {
                  return (
                    <div key={field} className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: "actions" }))} style={{ width: col.width, minWidth: col.width }}>
                      <a
                        href={`/admin/documentos?developerId=${dev.id}&sectionType=legales`}
                        className="inline-flex items-center gap-1.5 text-primary hover:underline text-xs"
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
                          <Lock className="w-3 h-3 text-muted-foreground opacity-50 flex-shrink-0" />
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
                      style={{ width: col.width, minWidth: col.width }}
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
                          <Lock className="w-3 h-3 text-muted-foreground opacity-50 flex-shrink-0" />
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
                      style={{ width: col.width, minWidth: col.width }}
                      onClick={() => fieldCanEdit && handleCellClick(dev.id, field, value)}
                      data-testid={`cell-${field}-${dev.id}`}
                    >
                      {isEditing && fieldCanEdit ? (
                        <Input
                          value={editValue.toUpperCase()}
                          onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                          onBlur={() => handleCellBlur(dev.id, field)}
                          onKeyDown={(e) => e.key === "Enter" && handleCellBlur(dev.id, field)}
                          autoFocus
                          maxLength={13}
                          placeholder="12-13 dígitos"
                          className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent uppercase"
                          data-testid={`input-${field}-${dev.id}`}
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="truncate uppercase">{value || ''}</span>
                          {!fieldCanEdit && <Lock className="w-3 h-3 text-muted-foreground opacity-50 flex-shrink-0" />}
                        </div>
                      )}
                    </div>
                  );
                }
                
                const value = dev[field as keyof Developer] as string;

                return (
                  <div
                    key={field}
                    className={cn("spreadsheet-cell flex-shrink-0", getCellStyle({ type: cellType, disabled: !fieldCanEdit, isEditing }))}
                    style={{ width: col.width, minWidth: col.width }}
                    onClick={() => fieldCanEdit && handleCellClick(dev.id, field, value)}
                    data-testid={`cell-${field}-${dev.id}`}
                  >
                    {isEditing && fieldCanEdit ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellBlur(dev.id, field)}
                        onKeyDown={(e) => e.key === "Enter" && handleCellBlur(dev.id, field)}
                        autoFocus
                        className="h-6 text-xs border-0 p-0 focus-visible:ring-0 bg-transparent"
                        data-testid={`input-${field}-${dev.id}`}
                      />
                    ) : (
                      <div className="flex items-center gap-1">
                        <span
                          className="truncate"
                          onMouseEnter={(e) => {
                            if (LONG_TEXT_FIELDS.includes(field)) {
                              const el = e.currentTarget;
                              if (el.scrollWidth > el.clientWidth && value) {
                                el.setAttribute('title', String(value));
                              } else {
                                el.removeAttribute('title');
                              }
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.removeAttribute('title');
                          }}
                        >
                          {value || ''}
                        </span>
                        {!fieldCanEdit && <Lock className="w-3 h-3 text-muted-foreground opacity-50 flex-shrink-0" />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
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
