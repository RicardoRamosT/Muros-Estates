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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ColumnFilter, useColumnFilters, type SortDirection, type FilterState } from "@/components/ui/column-filter";
import { Plus, Trash2, Building2, Loader2, Lock, Eye, FolderOpen, X } from "lucide-react";
import { getCellStyle, getCellTypeFromColumnType, type CellType } from "@/lib/spreadsheet-utils";
import type { Developer } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ColumnDef {
  key: string;
  label: string;
  width: string;
  type?: 'index' | 'toggle' | 'text' | 'actions' | 'folder-link';
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
    { key: "rfc", label: "RFC", width: "140px", cellType: "input" },
    { key: "domicilio", label: "Domicilio", width: "200px", cellType: "input" },
    { key: "antiguedad", label: "Antigüedad", width: "120px", cellType: "input" },
    { key: "tipos", label: "Tipos", width: "150px", cellType: "input" },
    { key: "representante", label: "Representante", width: "160px", cellType: "input" },
    { key: "contactName", label: "Nombre", width: "150px", group: "contacto", cellType: "input" },
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
    
    const currentValue = String(developer[field as keyof Developer] ?? "");
    if (editValue !== currentValue) {
      updateMutation.mutate({ id, data: { [field]: editValue } });
    }
    setEditingCell(null);
  }, [editingCell, editValue, developers, updateMutation]);

  const handleActiveToggle = useCallback((id: string, currentValue: boolean) => {
    updateMutation.mutate({ id, data: { active: !currentValue } });
  }, [updateMutation]);

  const handleCreateNew = () => {
    createMutation.mutate({
      name: "Nuevo Desarrollador",
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
      <div className="flex items-center justify-between px-4 py-3 border-b">
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
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-2 text-left font-semibold text-xs uppercase tracking-wide"
                  style={{ width: col.width, minWidth: col.width }}
                >
                  <div className="flex items-center">
                    <span className="truncate">{col.label}</span>
                    {col.type !== 'index' && col.type !== 'actions' && col.type !== 'folder-link' && (
                      <ColumnFilter
                        columnKey={col.key}
                        columnLabel={col.label}
                        columnType={col.type === 'toggle' ? 'boolean' : 'text'}
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
                    return (
                      <td 
                        key={field} 
                        className={getCellStyle({ type: "checkbox", disabled: !fieldCanEdit })}
                      >
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={dev.active ?? false}
                            onCheckedChange={() => fieldCanEdit && handleActiveToggle(dev.id, dev.active ?? false)}
                            disabled={!fieldCanEdit}
                            data-testid={`toggle-active-${dev.id}`}
                          />
                        </div>
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
                            {value || "-"}
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
