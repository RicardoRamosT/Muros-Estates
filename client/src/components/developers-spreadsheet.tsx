import { useState, useCallback, useMemo } from "react";
import { TextDetailModal } from "@/components/ui/text-detail-modal";
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
import { Plus, Trash2, Building2, Loader2, Lock, Eye, FolderOpen, X, ChevronDown, Check } from "lucide-react";
import { getCellStyle, getCellTypeFromColumnType, formatDate, type CellType } from "@/lib/spreadsheet-utils";
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
  type?: 'index' | 'toggle' | 'text' | 'actions' | 'folder-link' | 'date' | 'multiselect' | 'rfc' | 'tipo-select';
  autoField?: boolean;
  group?: string;
  cellType?: CellType;
}

export function DevelopersSpreadsheet() {
  const { toast } = useToast();
  const { canView, canEdit, hasFullAccess, role, canAccess } = useFieldPermissions('desarrolladores');
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [textDetail, setTextDetail] = useState<{title: string, value: string, editable: boolean, onSave?: (v: string) => void} | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: developers = [], isLoading } = useQuery<Developer[]>({
    queryKey: ["/api/developers"],
  });

  const allColumns: ColumnDef[] = [
    { key: "id", label: "ID", width: "75px", type: "index", autoField: true, cellType: "index" },
    { key: "tipo", label: "Tipo", width: "120px", type: "tipo-select", cellType: "dropdown" },
    { key: "active", label: "Act.", width: "55px", type: "toggle", autoField: true, cellType: "checkbox" },
    { key: "name", label: "Desarrollador", width: "150px", cellType: "input" },
    { key: "razonSocial", label: "Razón Social", width: "180px", cellType: "input" },
    { key: "rfc", label: "RFC", width: "100px", type: "rfc", cellType: "input" },
    { key: "domicilio", label: "Domicilio", width: "180px", cellType: "input" },
    { key: "fechaAntiguedad", label: "Fecha", width: "100px", type: "date", group: "antiguedad", cellType: "date" },
    { key: "antiguedadCalc", label: "Antigüedad", width: "100px", group: "antiguedad", cellType: "readonly" },
    { key: "tipos", label: "Tipos", width: "140px", type: "multiselect", cellType: "dropdown" },
    { key: "contratos", label: "Contratos", width: "120px", cellType: "input" },
    { key: "representante", label: "Representante", width: "130px", cellType: "input" },
    { key: "contactName", label: "Ventas", width: "130px", cellType: "input" },
    { key: "contactPhone", label: "Teléfono", width: "110px", cellType: "input" },
    { key: "contactEmail", label: "Correo", width: "160px", cellType: "input" },
    { key: "legales", label: "Legales", width: "80px", type: "folder-link", cellType: "actions" },
    { key: "actions", label: "", width: "60px", type: "actions", cellType: "actions" },
  ];

  const columns = useMemo(() => {
    return allColumns.filter(col => {
      if (col.type === 'index' || col.type === 'actions' || col.type === 'folder-link') return true;
      return canView(col.key);
    });
  }, [canView]);

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

  const handleTiposChange = useCallback((id: string, selectedTipos: string[]) => {
    updateMutation.mutate({ id, data: { tipos: selectedTipos } });
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
          {hasFullAccess && (
            <Button size="sm" onClick={handleCreateNew} disabled={createMutation.isPending} data-testid="button-add-developer">
              <Plus className="w-4 h-4 mr-1" />
              Nuevo
            </Button>
          )}
          <span className="text-xs text-muted-foreground">{filteredAndSortedData.length} registros</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto spreadsheet-scroll">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
            {/* Group header row */}
            <tr>
              {(() => {
                const groupHeaders: { key: string; label: string; colSpan: number; bgClass: string; isGroup: boolean }[] = [];
                let i = 0;
                while (i < columns.length) {
                  const col = columns[i];
                  if (col.group === 'antiguedad') {
                    let count = 0;
                    while (i + count < columns.length && columns[i + count].group === 'antiguedad') count++;
                    groupHeaders.push({ key: 'antiguedad', label: 'ANTIGÜEDAD', colSpan: count, bgClass: 'bg-purple-600 dark:bg-purple-700 text-white', isGroup: true });
                    i += count;
                  } else {
                    groupHeaders.push({ key: col.key, label: '', colSpan: 1, bgClass: '', isGroup: false });
                    i++;
                  }
                }
                return groupHeaders.map((gh, idx) => {
                  if (!gh.isGroup) {
                    const col = columns.find(c => c.key === gh.key)!;
                    return (
                      <th
                        key={`group-${gh.key}-${idx}`}
                        rowSpan={2}
                        className={cn(
                          "border-b border-r border-gray-200 dark:border-gray-700 px-2 font-medium text-xs tracking-wide align-middle",
                          col.type === 'index' ? 'text-center' : 'text-left'
                        )}
                        style={{ width: col.width, minWidth: col.width, height: '68px' }}
                      >
                        {col.type === 'index' || col.type === 'actions' || col.type === 'folder-link' ? (
                          <div className={`flex items-center ${col.type === 'index' ? 'justify-center' : 'justify-start'}`}>
                            <span className="truncate">{col.label}</span>
                          </div>
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
                      </th>
                    );
                  }
                  return (
                    <th
                      key={`group-${gh.key}-${idx}`}
                      colSpan={gh.colSpan}
                      className={cn("border-b border-r border-gray-200 dark:border-gray-700 px-2 text-center font-bold text-xs uppercase tracking-wide h-9", gh.bgClass)}
                    >
                      {gh.label}
                    </th>
                  );
                });
              })()}
            </tr>
            {/* Sub-column headers (only for grouped columns) */}
            <tr>
              {columns.filter(col => col.group === 'antiguedad').map((col) => (
                <th
                  key={col.key}
                  className={`border-b border-r border-gray-200 dark:border-gray-700 px-2 font-medium text-xs tracking-wide h-8 text-left`}
                  style={{ width: col.width, minWidth: col.width }}
                >
                  {col.key === 'antiguedadCalc' ? (
                    <div className="flex items-center justify-start">
                      <span className="truncate">{col.label}</span>
                    </div>
                  ) : (
                    <ColumnFilter
                      columnKey={col.key}
                      columnLabel={col.label || (col.key === 'fechaAntiguedad' ? 'Fecha' : 'Antigüedad Declarada')}
                      columnType={col.type === 'date' ? 'text' : 'text'}
                      uniqueValues={uniqueValuesMap[col.key] || []}
                      availableValues={availableValuesMap[col.key]}
                      sortDirection={sortConfig.key === col.key ? sortConfig.direction : null}
                      filterState={filterConfigs[col.key] || { search: "", selectedValues: new Set() }}
                      onSort={(dir) => handleSort(col.key, dir)}
                      onFilter={(state) => handleFilter(col.key, state)}
                      onClear={() => handleClearFilter(col.key)}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedData.map((dev, index) => (
              <tr key={dev.id} className="group" data-testid={`row-developer-${dev.id}`}>
                {columns.map((col) => {
                  const field = col.key;
                  const fieldCanEdit = canEdit(field);
                  const isEditing = editingCell?.id === dev.id && editingCell?.field === field;
                  const cellType = col.cellType || getCellTypeFromColumnType(col.type);
                  
                  if (col.type === 'index') {
                    return (
                      <td 
                        key={field} 
                        className={getCellStyle({ type: "index", disabled: false })}
                        title={dev.id}
                      >
                        <span className="font-mono">{index + 1}</span>
                      </td>
                    );
                  }
                  
                  if (col.type === 'toggle') {
                    // Boolean dropdown: Sí/No with colored cell background
                    const isActive = dev.active ?? false;
                    const cellBgColor = isActive ? '#dcfce7' : '#fee2e2'; // green-100 or red-100
                    const textColorClass = isActive ? 'text-green-700' : 'text-red-600';
                    return (
                      <td 
                        key={field} 
                        className={getCellStyle({ type: "dropdown", disabled: !fieldCanEdit })}
                        style={{ backgroundColor: cellBgColor }}
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
                      </td>
                    );
                  }
                  
                  if (col.type === 'tipo-select') {
                    const tipoValue = dev.tipo || '';
                    return (
                      <td
                        key={field}
                        className={getCellStyle({ type: "dropdown", disabled: !fieldCanEdit })}
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
                      </td>
                    );
                  }

                  if (col.key === 'antiguedadCalc') {
                    const fechaValue = dev.fechaAntiguedad;
                    const calculated = calcAntiguedad(fechaValue);
                    return (
                      <td
                        key={field}
                        className={getCellStyle({ type: "readonly" })}
                        data-testid={`cell-${field}-${dev.id}`}
                      >
                        <span className="text-xs text-muted-foreground px-2">{calculated}</span>
                      </td>
                    );
                  }

                  if (col.type === 'folder-link') {
                    return (
                      <td key={field} className={getCellStyle({ type: "actions" })}>
                        <a
                          href={`/admin/documentos?developerId=${dev.id}&sectionType=legales`}
                          className="inline-flex items-center gap-1.5 text-primary hover:underline text-xs"
                          data-testid={`link-legales-${dev.id}`}
                        >
                          <FolderOpen className="w-4 h-4" />
                          <span>Ver</span>
                        </a>
                      </td>
                    );
                  }
                  
                  if (col.type === 'actions') {
                    return (
                      <td key={field} className={getCellStyle({ type: "actions" })}>
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
                      </td>
                    );
                  }

                  // Date field - fechaAntiguedad
                  if (col.type === 'date') {
                    const dateValue = dev[field as keyof Developer] as Date | string | null;
                    const formattedDate = dateValue ? new Date(dateValue).toISOString().split('T')[0] : '';
                    return (
                      <td
                        key={field}
                        className={getCellStyle({ type: "date", disabled: !fieldCanEdit })}
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
                      </td>
                    );
                  }

                  // Multiselect dropdown - tipos
                  if (col.type === 'multiselect') {
                    const tiposValue = (dev.tipos as string[] | null) || [];
                    const displayValue = tiposValue.length > 0 
                      ? `${tiposValue.length} seleccionados`
                      : '';
                    
                    return (
                      <td
                        key={field}
                        className={getCellStyle({ type: "dropdown", disabled: !fieldCanEdit })}
                        data-testid={`cell-${field}-${dev.id}`}
                      >
                        {fieldCanEdit ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-6 w-full justify-between px-1 text-left font-normal text-sm"
                                data-testid={`select-tipos-${dev.id}`}
                              >
                                <span className="truncate">{displayValue || 'Seleccionar...'}</span>
                                <ChevronDown className="h-3 w-3 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2" align="start">
                              <div className="space-y-1">
                                {DESARROLLO_TIPOS.map((tipo) => (
                                  <label
                                    key={tipo.value}
                                    className="flex items-center gap-2 px-2 py-1 hover:bg-muted rounded cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={tiposValue.includes(tipo.value)}
                                      onCheckedChange={(checked) => {
                                        const newTipos = checked
                                          ? [...tiposValue, tipo.value]
                                          : tiposValue.filter(t => t !== tipo.value);
                                        handleTiposChange(dev.id, newTipos);
                                      }}
                                      data-testid={`checkbox-tipo-${tipo.value}-${dev.id}`}
                                    />
                                    <span className="text-xs">{tipo.label}</span>
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
                      </td>
                    );
                  }

                  // RFC field - with uppercase enforcement
                  if (col.type === 'rfc') {
                    const value = dev[field as keyof Developer] as string;
                    return (
                      <td
                        key={field}
                        className={getCellStyle({ 
                          type: cellType, 
                          disabled: !fieldCanEdit,
                          isEditing 
                        })}
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
                          <div
                          className="flex items-center gap-1 cursor-pointer"
                          onClick={() => !fieldCanEdit && value && setTextDetail({ title: col.label, value: String(value), editable: false })}
                        >
                            <span className="truncate uppercase">
                              {value || ''}
                            </span>
                            {!fieldCanEdit && <Lock className="w-3 h-3 text-muted-foreground opacity-50 flex-shrink-0" />}
                          </div>
                        )}
                      </td>
                    );
                  }
                  
                  const value = dev[field as keyof Developer] as string;
                  const isLongText = ['razonSocial', 'domicilio', 'contratos', 'representante', 'contactName', 'contactEmail'].includes(field);

                  if (isLongText) {
                    return (
                      <td
                        key={field}
                        className={getCellStyle({ type: cellType, disabled: !fieldCanEdit })}
                        data-testid={`cell-${field}-${dev.id}`}
                      >
                        <div
                          className="flex items-center gap-1 cursor-pointer"
                          onClick={() => {
                            if (fieldCanEdit) {
                              setTextDetail({
                                title: col.label,
                                value: String(value || ''),
                                editable: true,
                                onSave: (newVal) => updateMutation.mutate({ id: dev.id, data: { [field]: newVal || null } }),
                              });
                            } else {
                              setTextDetail({ title: col.label, value: String(value || ''), editable: false });
                            }
                          }}
                        >
                          <span className="truncate">{value || ''}</span>
                          {!fieldCanEdit && <Lock className="w-3 h-3 text-muted-foreground opacity-50 flex-shrink-0" />}
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={field}
                      className={getCellStyle({ 
                        type: cellType, 
                        disabled: !fieldCanEdit,
                        isEditing 
                      })}
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
                        <div
                          className="flex items-center gap-1 cursor-pointer"
                          onClick={() => !fieldCanEdit && value && setTextDetail({ title: col.label, value: String(value), editable: false })}
                        >
                          <span className="truncate">
                            {value || ''}
                          </span>
                          {!fieldCanEdit && <Lock className="w-3 h-3 text-muted-foreground opacity-50 flex-shrink-0" />}
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
                  {developers.length === 0 
                    ? 'No hay desarrolladores. Haz clic en "Agregar" para crear uno.'
                    : 'No se encontraron resultados con los filtros aplicados.'}
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
        editable={textDetail?.editable}
        onSave={textDetail?.onSave}
      />
    </div>
  );
}
