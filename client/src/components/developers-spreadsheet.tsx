import { useState, useCallback, useMemo } from "react";
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

// Tipos de desarrollos disponibles
const DEVELOPER_TIPOS = [
  { value: "residencial", label: "Residencial" },
  { value: "comercial", label: "Comercial" },
  { value: "oficina", label: "Oficina" },
  { value: "salud", label: "Salud" },
];

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
  type?: 'index' | 'toggle' | 'text' | 'actions' | 'folder-link' | 'date' | 'multiselect' | 'rfc';
  autoField?: boolean;
  group?: string;
  cellType?: CellType;
}

export function DevelopersSpreadsheet() {
  const { toast } = useToast();
  const { canView, canEdit, hasFullAccess, role, canAccess } = useFieldPermissions('desarrolladores');
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: developers = [], isLoading } = useQuery<Developer[]>({
    queryKey: ["/api/developers"],
  });

  const allColumns: ColumnDef[] = [
    { key: "id", label: "#", width: "50px", type: "index", autoField: true, cellType: "index" },
    { key: "tipo", label: "Tipo", width: "100px", autoField: true, cellType: "readonly" },
    { key: "active", label: "Activo", width: "80px", type: "toggle", autoField: true, cellType: "checkbox" },
    { key: "name", label: "Desarrollador", width: "180px", cellType: "input" },
    { key: "razonSocial", label: "Razón Social", width: "180px", cellType: "input" },
    { key: "rfc", label: "RFC", width: "140px", type: "rfc", cellType: "input" },
    { key: "domicilio", label: "Domicilio", width: "200px", cellType: "input" },
    // Antigüedad group - 2 columns under same header
    { key: "fechaAntiguedad", label: "Fecha", width: "120px", type: "date", group: "antiguedad", cellType: "date" },
    { key: "antiguedadDeclarada", label: "Antigüedad Declarada", width: "150px", group: "antiguedad", cellType: "input" },
    // Tipos - multiselect dropdown
    { key: "tipos", label: "Tipos", width: "180px", type: "multiselect", cellType: "dropdown" },
    { key: "contratos", label: "Contratos", width: "150px", cellType: "input" },
    { key: "representante", label: "Representante", width: "160px", cellType: "input" },
    // Contacto group - renamed "Nombre" to "Gerente Comercial"
    { key: "contactName", label: "Gerente Comercial", width: "150px", group: "contacto", cellType: "input" },
    { key: "contactPhone", label: "Teléfono", width: "140px", group: "contacto", cellType: "input" },
    { key: "contactEmail", label: "Correo", width: "180px", group: "contacto", cellType: "input" },
    { key: "legales", label: "Legales", width: "100px", type: "folder-link", cellType: "actions" },
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
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-primary" />
          <span className="font-medium">{filteredAndSortedData.length} Desarrolladores</span>
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
              className="h-6 text-xs"
              onClick={clearAllFilters}
            >
              <X className="h-3 w-3 mr-1" />
              Limpiar filtros
            </Button>
          )}
        </div>
        {hasFullAccess && (
          <Button size="sm" onClick={handleCreateNew} disabled={createMutation.isPending} data-testid="button-add-developer">
            <Plus className="w-4 h-4 mr-2" />
            Agregar
          </Button>
        )}
      </div>
      
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
            {/* Group header row */}
            <tr>
              {(() => {
                const groupHeaders: { key: string; label: string; colSpan: number; bgClass: string }[] = [];
                let i = 0;
                while (i < columns.length) {
                  const col = columns[i];
                  if (col.group === 'antiguedad') {
                    let count = 0;
                    while (i + count < columns.length && columns[i + count].group === 'antiguedad') count++;
                    groupHeaders.push({ key: 'antiguedad', label: 'ANTIGÜEDAD', colSpan: count, bgClass: 'bg-purple-600 dark:bg-purple-700 text-white' });
                    i += count;
                  } else if (col.group === 'contacto') {
                    let count = 0;
                    while (i + count < columns.length && columns[i + count].group === 'contacto') count++;
                    groupHeaders.push({ key: 'contacto', label: 'CONTACTO', colSpan: count, bgClass: 'bg-green-600 dark:bg-green-700 text-white' });
                    i += count;
                  } else {
                    groupHeaders.push({ key: col.key, label: '', colSpan: 1, bgClass: '' });
                    i++;
                  }
                }
                return groupHeaders.map((gh, idx) => (
                  <th
                    key={`group-${gh.key}-${idx}`}
                    colSpan={gh.colSpan}
                    className={cn("border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1 text-center font-bold text-xs uppercase tracking-wide", gh.bgClass)}
                  >
                    {gh.label}
                  </th>
                ));
              })()}
            </tr>
            {/* Individual column headers */}
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left font-semibold text-xs uppercase tracking-wide"
                  style={{ width: col.width, minWidth: col.width }}
                >
                  <div className="flex items-center">
                    <span className="truncate">{col.label}</span>
                    {col.type !== 'index' && col.type !== 'actions' && col.type !== 'folder-link' && (
                      <ColumnFilter
                        columnKey={col.key}
                        columnLabel={col.label || (col.group === 'antiguedad' ? (col.key === 'fechaAntiguedad' ? 'Fecha' : 'Antigüedad Declarada') : col.key)}
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
                      >
                        {index + 1}
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
                              className={`h-6 text-sm border-0 bg-transparent px-2 font-medium ${textColorClass}`}
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
                            className="h-6 text-sm border-0 p-0 focus-visible:ring-0 bg-transparent"
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
                      ? tiposValue.map(t => DEVELOPER_TIPOS.find(dt => dt.value === t)?.label || t).join(', ')
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
                                {DEVELOPER_TIPOS.map((tipo) => (
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
                                    <span className="text-sm">{tipo.label}</span>
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
                            className="h-6 text-sm border-0 p-0 focus-visible:ring-0 bg-transparent uppercase"
                            data-testid={`input-${field}-${dev.id}`}
                          />
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="truncate block max-w-[180px] uppercase">
                              {value || ''}
                            </span>
                            {!fieldCanEdit && <Lock className="w-3 h-3 text-muted-foreground opacity-50 flex-shrink-0" />}
                          </div>
                        )}
                      </td>
                    );
                  }
                  
                  // Default text field
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
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleCellBlur(dev.id, field)}
                          onKeyDown={(e) => e.key === "Enter" && handleCellBlur(dev.id, field)}
                          autoFocus
                          className="h-6 text-sm border-0 p-0 focus-visible:ring-0 bg-transparent"
                          data-testid={`input-${field}-${dev.id}`}
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="truncate block max-w-[180px]">
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
    </div>
  );
}
