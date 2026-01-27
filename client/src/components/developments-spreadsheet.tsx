import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFieldPermissions } from "@/hooks/use-field-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ColumnFilter, useColumnFilters } from "@/components/ui/column-filter";
import { Plus, Trash2, Building, Loader2, Lock, AlertCircle, FolderOpen, X } from "lucide-react";
import { Link } from "wouter";
import type { Development, Developer } from "@shared/schema";
import { CITIES, ZONES_MONTERREY, ZONES_CDMX, DEVELOPMENT_TYPES } from "@shared/constants";
import { getCellStyle, type CellType } from "@/lib/spreadsheet-utils";

interface ColumnDef {
  key: string;
  label: string;
  group: string;
  type?: 'text' | 'number' | 'boolean' | 'select' | 'city-select' | 'zone-select' | 'type-select' | 'developer-select' | 'array' | 'folder-link' | 'actions';
  width: string;
  folderSection?: string;
  cellType?: CellType;
}

interface ColumnGroup {
  key: string;
  label: string;
  color?: string;
}

const columnGroups: ColumnGroup[] = [
  { key: 'basic', label: '' },
  { key: 'location', label: '' },
  { key: 'structure', label: '' },
  { key: 'tamano', label: 'TAMAÑO', color: '#6b5b95' },
  { key: 'noheader1', label: '' },
  { key: 'rec', label: 'REC', color: '#88b04b' },
  { key: 'noheader2', label: '' },
  { key: 'unidadesM2', label: 'UNIDADES Y METROS CUADRADOS', color: '#f7cac9' },
  { key: 'noheader3', label: '' },
  { key: 'depas', label: 'DEPAS', color: '#92a8d1' },
  { key: 'locales', label: 'LOCALES', color: '#955251' },
  { key: 'oficinas', label: 'OFICINAS', color: '#b565a7' },
  { key: 'salud', label: 'SALUD', color: '#009b77' },
  { key: 'inicio', label: 'INICIO', color: '#dd4124' },
  { key: 'entrega', label: 'ENTREGA', color: '#d65076' },
  { key: 'ventas', label: 'VENTAS', color: '#45b8ac' },
  { key: 'pagos', label: 'PAGOS', color: '#efc050' },
  { key: 'noheader4', label: '' },
  { key: 'actions', label: '' },
];

const columns: ColumnDef[] = [
  { key: 'id', label: 'ID', group: 'basic', width: '80px' },
  { key: 'active', label: 'Activo', group: 'basic', type: 'boolean', width: '70px' },
  { key: 'developerId', label: 'Desarrollador', group: 'basic', type: 'developer-select', width: '160px' },
  { key: 'name', label: 'Desarrollo', group: 'basic', width: '160px' },
  { key: 'city', label: 'Ciudad', group: 'location', type: 'city-select', width: '110px' },
  { key: 'zone', label: 'Zona 1', group: 'location', type: 'zone-select', width: '120px' },
  { key: 'zone2', label: 'Zona 2', group: 'location', width: '100px' },
  { key: 'zone3', label: 'Zona 3', group: 'location', width: '100px' },
  { key: 'type', label: 'Tipo', group: 'structure', type: 'type-select', width: '130px' },
  { key: 'nivel', label: 'Nivel', group: 'structure', width: '80px' },
  { key: 'torres', label: 'Torres', group: 'structure', type: 'number', width: '70px' },
  { key: 'niveles', label: 'Niveles', group: 'structure', type: 'number', width: '80px' },
  { key: 'amenities', label: 'Amenidades', group: 'structure', type: 'array', width: '100px' },
  { key: 'efficiency', label: 'Eficiencia', group: 'structure', type: 'array', width: '90px' },
  { key: 'otherFeatures', label: 'Otros', group: 'structure', type: 'array', width: '80px' },
  { key: 'tamanoDesde', label: 'Desde', group: 'tamano', type: 'number', width: '80px' },
  { key: 'tamanoHasta', label: 'Hasta', group: 'tamano', type: 'number', width: '80px' },
  { key: 'lockOff', label: 'Lock Off', group: 'noheader1', type: 'boolean', width: '80px' },
  { key: 'recDesde', label: 'Desde', group: 'rec', type: 'number', width: '80px' },
  { key: 'recHasta', label: 'Hasta', group: 'rec', type: 'number', width: '80px' },
  { key: 'acabados', label: 'Acabados', group: 'noheader2', width: '100px' },
  { key: 'depasM2', label: 'Depas M²', group: 'unidadesM2', type: 'number', width: '90px' },
  { key: 'localesM2', label: 'Locales M²', group: 'unidadesM2', type: 'number', width: '90px' },
  { key: 'oficinasM2', label: 'Oficinas M²', group: 'unidadesM2', type: 'number', width: '95px' },
  { key: 'saludM2', label: 'Salud M²', group: 'unidadesM2', type: 'number', width: '90px' },
  { key: 'inicioPreventa', label: 'Inicio Preventa', group: 'noheader3', width: '110px' },
  { key: 'tiempoTransc', label: 'Tiempo Transc.', group: 'noheader3', width: '110px' },
  { key: 'depasUnidades', label: 'Unidades', group: 'depas', type: 'number', width: '85px' },
  { key: 'depasVendidas', label: 'Vendidas', group: 'depas', type: 'number', width: '80px' },
  { key: 'depasPorcentaje', label: '%', group: 'depas', type: 'number', width: '60px' },
  { key: 'localesUnidades', label: 'Unidades', group: 'locales', type: 'number', width: '85px' },
  { key: 'localesVendidas', label: 'Vendidas', group: 'locales', type: 'number', width: '80px' },
  { key: 'localesPorcentaje', label: '%', group: 'locales', type: 'number', width: '60px' },
  { key: 'oficinasUnidades', label: 'Unidades', group: 'oficinas', type: 'number', width: '85px' },
  { key: 'oficinasVendidas', label: 'Vendidas', group: 'oficinas', type: 'number', width: '80px' },
  { key: 'oficinasPorcentaje', label: '%', group: 'oficinas', type: 'number', width: '60px' },
  { key: 'saludUnidades', label: 'Unidades', group: 'salud', type: 'number', width: '85px' },
  { key: 'saludVendidas', label: 'Vendidas', group: 'salud', type: 'number', width: '80px' },
  { key: 'saludPorcentaje', label: '%', group: 'salud', type: 'number', width: '60px' },
  { key: 'inicioProyectado', label: 'Proyectado', group: 'inicio', width: '100px' },
  { key: 'inicioReal', label: 'Real', group: 'inicio', width: '100px' },
  { key: 'entregaProyectada', label: 'Proyectada', group: 'entrega', width: '100px' },
  { key: 'entregaActualizada', label: 'Actualizada', group: 'entrega', width: '100px' },
  { key: 'ventasNombre', label: 'Nombre', group: 'ventas', width: '120px' },
  { key: 'ventasTelefono', label: 'Teléfono', group: 'ventas', width: '100px' },
  { key: 'ventasCorreo', label: 'Correo', group: 'ventas', width: '150px' },
  { key: 'pagosNombre', label: 'Nombre', group: 'pagos', width: '120px' },
  { key: 'pagosTelefono', label: 'Teléfono', group: 'pagos', width: '100px' },
  { key: 'pagosCorreo', label: 'Correo', group: 'pagos', width: '150px' },
  { key: 'comercializacion', label: 'Comercializadora', group: 'noheader4', width: '130px' },
  { key: 'arquitectura', label: 'Arquitectura', group: 'noheader4', width: '100px' },
  { key: 'location', label: 'Location', group: 'noheader4', width: '100px' },
  { key: 'legalesFolder', label: 'Legales', group: 'noheader4', type: 'folder-link', folderSection: 'legales', width: '100px' },
  { key: 'ventaFolder', label: 'Venta', group: 'noheader4', type: 'folder-link', folderSection: 'venta', width: '100px' },
  { key: 'actions', label: '', group: 'actions', type: 'actions', width: '60px' },
];

export function DevelopmentsSpreadsheet() {
  const { toast } = useToast();
  const { canView, canEdit, hasFullAccess, role, canAccess, isLoading: authLoading } = useFieldPermissions('desarrollos');
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: developments = [], isLoading: developmentsLoading } = useQuery<Development[]>({
    queryKey: ["/api/developments-entity"],
  });

  const { data: developers = [] } = useQuery<Developer[]>({
    queryKey: ["/api/developers"],
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
      updateMutation.mutate({ id, data: { [field]: valueToSave } });
    }
    setEditingCell(null);
  }, [editingCell, editValue, developments, updateMutation]);

  const handleSelectChange = useCallback((id: string, field: string, value: string) => {
    const actualValue = value === '__unassigned__' ? null : (value || null);
    updateMutation.mutate({ id, data: { [field]: actualValue } });
    setEditingCell(null);
  }, [updateMutation]);

  const handleCheckboxChange = useCallback((id: string, field: string, checked: boolean) => {
    updateMutation.mutate({ id, data: { [field]: checked } });
  }, [updateMutation]);

  const handleCreateNew = () => {
    createMutation.mutate({
      name: "Nuevo Desarrollo",
      active: true,
    });
  };

  const getDeveloperName = useCallback((developerId: string | null) => {
    if (!developerId) return "Sin asignar";
    const dev = developers.find(d => d.id === developerId);
    return dev?.name || "Desconocido";
  }, [developers]);

  const getZonesForCity = (city: string | null): readonly string[] => {
    if (city === "Monterrey") return ZONES_MONTERREY;
    if (city === "CDMX") return ZONES_CDMX;
    return [];
  };

  const visibleColumns = useMemo(() => {
    return columns.filter(col => {
      if (col.type === 'actions') return hasFullAccess;
      if (col.key === 'id') return true;
      const perm = canView(col.key);
      return perm;
    });
  }, [canView, hasFullAccess]);

  const {
    sortConfig,
    filterConfigs,
    uniqueValuesMap,
    filteredAndSortedData,
    handleSort,
    handleFilter,
    handleClearFilter,
    clearAllFilters,
  } = useColumnFilters(developments, visibleColumns);

  const hasActiveFilters = Object.keys(filterConfigs).length > 0 || sortConfig.direction !== null;

  const visibleColumnGroups = useMemo(() => {
    const groupColspans: Record<string, number> = {};
    visibleColumns.forEach(col => {
      if (col.group) {
        groupColspans[col.group] = (groupColspans[col.group] || 0) + 1;
      }
    });
    return columnGroups.filter(g => groupColspans[g.key] > 0).map(g => ({
      ...g,
      colspan: groupColspans[g.key]
    }));
  }, [visibleColumns]);

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
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Building className="w-5 h-5 text-primary" />
          <span className="font-medium">{filteredAndSortedData.length} desarrollos</span>
          {role && (
            <Badge variant="outline" className="text-xs">
              {role}
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
          <Button onClick={handleCreateNew} size="sm" disabled={createMutation.isPending} data-testid="button-add-development">
            <Plus className="w-4 h-4 mr-1" />
            Nuevo
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth: '4500px' }}>
          <thead className="sticky top-0 z-10">
            <tr>
              {visibleColumnGroups.map((group, idx) => (
                <th
                  key={`group-${idx}`}
                  colSpan={group.colspan}
                  className="border-b border-r px-2 py-1.5 text-center font-semibold text-xs uppercase tracking-wide"
                  style={{
                    backgroundColor: group.color || 'transparent',
                    color: group.label ? 'white' : undefined
                  }}
                >
                  {group.label}
                </th>
              ))}
            </tr>
            <tr className="bg-gray-100 dark:bg-gray-800">
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-2 text-left font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
                  style={{ minWidth: col.width, width: col.width }}
                >
                  <div className="flex items-center">
                    <span className="truncate">{col.label}</span>
                    {col.type !== 'actions' && col.type !== 'folder-link' && col.key !== 'id' && (
                      <ColumnFilter
                        columnKey={col.key}
                        columnLabel={col.label}
                        columnType={
                          col.type === 'boolean' ? 'boolean' : 
                          col.type === 'number' ? 'number' : 
                          col.type === 'date' ? 'date' :
                          (col.type?.includes('select') ? 'select' : 'text')
                        }
                        uniqueValues={uniqueValuesMap[col.key] || []}
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
            {filteredAndSortedData.map((dev) => (
              <tr key={dev.id} className="group" data-testid={`row-development-${dev.id}`}>
                {visibleColumns.map((col) => {
                  const fieldCanEdit = canEdit(col.key);
                  const value = (dev as any)[col.key];
                  const isEditing = editingCell?.id === dev.id && editingCell?.field === col.key;

                  if (col.key === 'id') {
                    return (
                      <td key={col.key} className={getCellStyle({ type: "index" })}>
                        <span className="text-xs font-mono">{dev.id.slice(0, 8)}...</span>
                      </td>
                    );
                  }

                  if (col.type === 'boolean') {
                    return (
                      <td key={col.key} className={getCellStyle({ type: "checkbox", disabled: !fieldCanEdit })}>
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={!!value}
                            disabled={!fieldCanEdit}
                            onCheckedChange={(checked) => handleCheckboxChange(dev.id, col.key, !!checked)}
                            data-testid={`checkbox-${col.key}-${dev.id}`}
                          />
                        </div>
                      </td>
                    );
                  }

                  if (col.type === 'developer-select') {
                    return (
                      <td key={col.key} className={getCellStyle({ type: "dropdown", disabled: !fieldCanEdit })}>
                        {fieldCanEdit ? (
                          <Select
                            value={value || "__unassigned__"}
                            onValueChange={(v) => handleSelectChange(dev.id, col.key, v)}
                          >
                            <SelectTrigger className="h-6 text-sm border-0 bg-transparent">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__unassigned__">Sin asignar</SelectItem>
                              {developers.map(d => (
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
                      </td>
                    );
                  }

                  if (col.type === 'city-select') {
                    return (
                      <td key={col.key} className={getCellStyle({ type: "dropdown", disabled: !fieldCanEdit })}>
                        {fieldCanEdit ? (
                          <Select
                            value={value || "__unassigned__"}
                            onValueChange={(v) => handleSelectChange(dev.id, col.key, v)}
                          >
                            <SelectTrigger className="h-6 text-sm border-0 bg-transparent">
                              <SelectValue placeholder="Ciudad" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__unassigned__">Sin asignar</SelectItem>
                              {CITIES.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>{value || "—"}</span>
                            <Lock className="w-3 h-3 opacity-50" />
                          </div>
                        )}
                      </td>
                    );
                  }

                  if (col.type === 'zone-select') {
                    const zones = getZonesForCity(dev.city);
                    return (
                      <td key={col.key} className={getCellStyle({ type: "dropdown", disabled: !fieldCanEdit })}>
                        {fieldCanEdit ? (
                          <Select
                            value={value || "__unassigned__"}
                            onValueChange={(v) => handleSelectChange(dev.id, col.key, v)}
                          >
                            <SelectTrigger className="h-6 text-sm border-0 bg-transparent">
                              <SelectValue placeholder="Zona" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__unassigned__">Sin asignar</SelectItem>
                              {zones.map(z => (
                                <SelectItem key={z} value={z}>{z}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>{value || "—"}</span>
                            <Lock className="w-3 h-3 opacity-50" />
                          </div>
                        )}
                      </td>
                    );
                  }

                  if (col.type === 'type-select') {
                    return (
                      <td key={col.key} className={getCellStyle({ type: "dropdown", disabled: !fieldCanEdit })}>
                        {fieldCanEdit ? (
                          <Select
                            value={value || "__unassigned__"}
                            onValueChange={(v) => handleSelectChange(dev.id, col.key, v)}
                          >
                            <SelectTrigger className="h-6 text-sm border-0 bg-transparent">
                              <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__unassigned__">Sin asignar</SelectItem>
                              {DEVELOPMENT_TYPES.map(t => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>{value || "—"}</span>
                            <Lock className="w-3 h-3 opacity-50" />
                          </div>
                        )}
                      </td>
                    );
                  }

                  if (col.type === 'array') {
                    const arrValue = Array.isArray(value) ? value : [];
                    const count = arrValue.length;
                    return (
                      <td key={col.key} className={getCellStyle({ type: "readonly", disabled: !fieldCanEdit })}>
                        <Badge variant="secondary" className="text-xs">
                          {count} {count === 1 ? 'item' : 'items'}
                        </Badge>
                      </td>
                    );
                  }

                  if (col.type === 'folder-link') {
                    return (
                      <td key={col.key} className={getCellStyle({ type: "actions" })}>
                        <Link
                          href={`/admin/documentos?developmentId=${dev.id}&sectionType=${col.folderSection}`}
                          className="text-primary hover:underline flex items-center gap-1"
                          data-testid={`link-${col.folderSection}-${dev.id}`}
                        >
                          <FolderOpen className="w-4 h-4" />
                        </Link>
                      </td>
                    );
                  }

                  if (col.type === 'actions') {
                    return (
                      <td key={col.key} className={getCellStyle({ type: "actions" })}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(dev.id)}
                          data-testid={`button-delete-${dev.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    );
                  }

                  const displayValue = Array.isArray(value) ? value.join(', ') : String(value ?? '');

                  return (
                    <td 
                      key={col.key} 
                      className={getCellStyle({ 
                        type: col.type === 'number' ? "input" : "input", 
                        disabled: !fieldCanEdit,
                        isEditing 
                      })}
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
                          className="h-6 text-sm border-0 p-0 focus-visible:ring-0 bg-transparent"
                          autoFocus
                          type={col.type === 'number' ? 'number' : 'text'}
                          data-testid={`input-${col.key}-${dev.id}`}
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="truncate">{displayValue || '—'}</span>
                          {!fieldCanEdit && <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {developments.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length} className="text-center py-8 text-muted-foreground">
                  No hay desarrollos. Haz clic en "Nuevo" para crear uno.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
