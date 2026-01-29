import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFieldPermissions } from "@/hooks/use-field-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Plus, Trash2, Users, Loader2, Lock, Eye, Calendar, Clock, X } from "lucide-react";
import { getCellStyle, type CellType } from "@/lib/spreadsheet-utils";
import type { Client, User } from "@shared/schema";

interface ProspectsSpreadsheetProps {
  isClientView?: boolean;
}

export function ProspectsSpreadsheet({ isClientView = false }: ProspectsSpreadsheetProps) {
  const { toast } = useToast();
  const pageName = isClientView ? 'clientes' : 'prospectos';
  const { canView, canEdit, hasFullAccess, role, canAccess, isLoading: authLoading } = useFieldPermissions(pageName as any);
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
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
    
    const currentValue = String((prospect as any)[field] ?? "");
    if (editValue !== currentValue) {
      updateMutation.mutate({ id, data: { [field]: editValue || null } });
    }
    setEditingCell(null);
  }, [editingCell, editValue, prospects, updateMutation]);

  const handleSelectChange = useCallback((id: string, field: string, value: string) => {
    // Convert special unassigned value to null for database
    const actualValue = value === '__unassigned__' ? null : (value || null);
    updateMutation.mutate({ id, data: { [field]: actualValue } });
  }, [updateMutation]);

  const handleCreateNew = () => {
    createMutation.mutate({
      nombre: "Nuevo Prospecto",
      telefono: "",
      estatus: "nuevo",
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
    { key: "index", label: "#", width: "50px", type: "index" },
    { key: "fecha", label: "Fecha", width: "100px", type: "date", field: "createdAt" },
    { key: "hora", label: "Hora", width: "80px", type: "time", field: "createdAt" },
    { key: "asesorId", label: "Asesor", width: "140px", type: "select" },
    { key: "ciudad", label: "Ciudad", width: "120px" },
    { key: "zona", label: "Zona", width: "120px" },
    { key: "desarrollador", label: "Desarrollador", width: "150px" },
    { key: "desarrollo", label: "Desarrollo", width: "150px" },
    { key: "tipologia", label: "Tipología", width: "120px" },
    { key: "nombre", label: "Nombre", width: "140px" },
    { key: "apellido", label: "Apellido", width: "140px" },
    { key: "telefono", label: "Teléfono", width: "130px" },
    { key: "correo", label: "Correo", width: "180px" },
    { key: "tipofil", label: "Tipo", width: "100px" },
    { key: "perfil", label: "Perfil", width: "120px" },
    { key: "comoLlega", label: "Cómo Llega", width: "120px", type: "select" },
    { key: "brokerExterno", label: "Broker Externo", width: "140px" },
    { key: "estatus", label: "Estatus", width: "120px", type: "select" },
    { key: "embudo", label: "Embudo", width: "100px" },
    { key: "comoPaga", label: "Cómo Paga", width: "120px" },
    { key: "positivos", label: "Positivos", width: "150px" },
    { key: "negativos", label: "Negativos", width: "150px" },
    { key: "comentarios", label: "Comentarios", width: "200px" },
    { key: "actions", label: "", width: "60px", type: "actions" },
  ];

  // Columns for Clientes (15 fields - focused on purchase/financial data)
  const clientColumns = [
    { key: "index", label: "#", width: "50px", type: "index" },
    { key: "fecha", label: "Fecha", width: "100px", type: "date", field: "createdAt" },
    { key: "hora", label: "Hora", width: "80px", type: "time", field: "createdAt" },
    { key: "asesorId", label: "Asesor", width: "140px", type: "select" },
    { key: "nombre", label: "Nombre", width: "140px" },
    { key: "apellido", label: "Apellido", width: "140px" },
    { key: "telefono", label: "Teléfono", width: "130px" },
    { key: "correo", label: "Correo", width: "180px" },
    { key: "desarrollador", label: "Desarrollador", width: "150px" },
    { key: "desarrollo", label: "Desarrollo", width: "150px" },
    { key: "tipologia", label: "Tipología", width: "120px" },
    { key: "precioFinal", label: "Precio Final", width: "130px", type: "currency" },
    { key: "separacion", label: "Separación", width: "120px", type: "currency" },
    { key: "fechaSeparacion", label: "Fecha Separación", width: "140px", type: "date" },
    { key: "enganche", label: "Enganche", width: "120px", type: "currency" },
    { key: "fechaEnganche", label: "Fecha Enganche", width: "140px", type: "date" },
    { key: "actions", label: "", width: "60px", type: "actions" },
  ];

  const allColumns = isClientView ? clientColumns : prospectColumns;

  const estatusOptions = [
    { value: "nuevo", label: "Nuevo" },
    { value: "contactado", label: "Contactado" },
    { value: "interesado", label: "Interesado" },
    { value: "cita_agendada", label: "Cita Agendada" },
    { value: "negociacion", label: "Negociación" },
    { value: "cerrado", label: "Cerrado" },
    { value: "no_interesado", label: "No Interesado" },
  ];

  const comoLlegaOptions = [
    { value: "web", label: "Web" },
    { value: "referido", label: "Referido" },
    { value: "redes_sociales", label: "Redes Sociales" },
    { value: "llamada", label: "Llamada" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "evento", label: "Evento" },
    { value: "otro", label: "Otro" },
  ];

  const columns = useMemo(() => {
    return allColumns.filter(col => {
      if (col.type === 'index' || col.type === 'actions') return true;
      // Use col.key for permission check (fecha, hora are defined in permissions, not createdAt)
      return canView(col.key);
    });
  }, [allColumns, canView]);

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
  } = useColumnFilters(prospects, columns);

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
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-medium">{filteredAndSortedData.length} {isClientView ? "Clientes" : "Prospectos"}</span>
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
              className="h-6 text-xs"
              onClick={clearAllFilters}
            >
              <X className="h-3 w-3 mr-1" />
              Limpiar filtros
            </Button>
          )}
        </div>
        {hasFullAccess && (
          <Button size="sm" onClick={handleCreateNew} disabled={createMutation.isPending} data-testid="button-add-prospect">
            <Plus className="w-4 h-4 mr-2" />
            Agregar
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10" data-testid="prospects-table-header">
            <tr className="bg-gray-100 dark:bg-gray-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-2 text-left font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
                  style={{ minWidth: col.width }}
                  data-testid={`column-header-${col.key}`}
                >
                  <div className="flex items-center">
                    <span className="truncate">{col.label}</span>
                    {col.type !== 'actions' && col.type !== 'index' && (
                      <ColumnFilter
                        columnKey={col.key}
                        columnLabel={col.label}
                        columnType={
                          col.type === 'currency' ? 'number' : 
                          col.type === 'date' || col.type === 'time' ? 'date' :
                          col.type === 'select' ? 'select' : 'text'
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
            {filteredAndSortedData.map((prospect, index) => (
              <tr key={prospect.id} className="group" data-testid={`row-prospect-${prospect.id}`}>
                {columns.map((col) => {
                  const field = col.field || col.key;
                  const fieldCanEdit = canEdit(col.key);
                  const isEditing = editingCell?.id === prospect.id && editingCell?.field === col.key;

                  if (col.type === 'index') {
                    return (
                      <td key={col.key} className={getCellStyle({ type: "index" })}>
                        <span className="text-xs">{index + 1}</span>
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
                            className="h-6 text-sm border-0 p-0 focus-visible:ring-0 bg-transparent"
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
                            className="h-6 text-sm border-0 p-0 focus-visible:ring-0 bg-transparent"
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
                    return (
                      <td key={col.key} className={getCellStyle({ type: "dropdown", disabled: !fieldCanEdit })}>
                        {fieldCanEdit ? (
                          <Select
                            value={value || "__unassigned__"}
                            onValueChange={(v) => handleSelectChange(prospect.id, 'asesorId', v)}
                          >
                            <SelectTrigger className="h-6 text-sm border-0 bg-transparent">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__unassigned__">Sin asignar</SelectItem>
                              {users.filter(u => u.role === 'asesor' || u.role === 'admin').map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>{getAsesorName(value)}</span>
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
                            <SelectTrigger className="h-6 text-sm border-0 bg-transparent">
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

                  if (col.key === 'comoLlega') {
                    const value = (prospect as any).comoLlega || (prospect as any).source || 'web';
                    return (
                      <td key={col.key} className={getCellStyle({ type: "dropdown", disabled: !fieldCanEdit })}>
                        {fieldCanEdit ? (
                          <Select
                            value={value}
                            onValueChange={(v) => handleSelectChange(prospect.id, 'comoLlega', v)}
                          >
                            <SelectTrigger className="h-6 text-sm border-0 bg-transparent">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {comoLlegaOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>{comoLlegaOptions.find(o => o.value === value)?.label || value}</span>
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
                            className="h-6 text-sm border-0 p-0 focus-visible:ring-0 bg-transparent"
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
                            className="h-6 text-sm border-0 p-0 focus-visible:ring-0 bg-transparent"
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
                          className="h-6 text-sm border-0 p-0 focus-visible:ring-0 bg-transparent"
                          data-testid={`input-${col.key}-${prospect.id}`}
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="truncate max-w-[180px]">
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
    </div>
  );
}
