import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFieldPermissions } from "@/hooks/use-field-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, Trash2, Building2, Loader2, Lock, Eye } from "lucide-react";
import type { Developer } from "@shared/schema";

export function DevelopersSpreadsheet() {
  const { toast } = useToast();
  const { canView, canEdit, hasFullAccess, role, canAccess } = useFieldPermissions('desarrolladores');
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: developers = [], isLoading } = useQuery<Developer[]>({
    queryKey: ["/api/developers"],
  });

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

  const allColumns = [
    { key: "id", label: "ID", width: "50px", type: "index", autoField: true },
    { key: "tipo", label: "Tipo", width: "100px", autoField: true },
    { key: "active", label: "Activo", width: "80px", type: "toggle", autoField: true },
    { key: "name", label: "Desarrollador", width: "180px" },
    { key: "razonSocial", label: "Razón Social", width: "180px" },
    { key: "rfc", label: "RFC", width: "140px" },
    { key: "domicilio", label: "Domicilio", width: "200px" },
    { key: "antiguedad", label: "Antigüedad", width: "120px" },
    { key: "tipos", label: "Tipos", width: "150px" },
    { key: "representante", label: "Representante", width: "160px" },
    { key: "contactName", label: "Contacto Nombre", width: "150px", group: "contacto" },
    { key: "contactPhone", label: "Contacto Teléfono", width: "140px", group: "contacto" },
    { key: "contactEmail", label: "Contacto Correo", width: "180px", group: "contacto" },
    { key: "legales", label: "Legales", width: "150px" },
    { key: "actions", label: "", width: "60px", type: "actions" },
  ];

  const columns = useMemo(() => {
    return allColumns.filter(col => {
      if (col.type === 'index' || col.type === 'actions') return true;
      return canView(col.key);
    });
  }, [canView]);

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
          <span className="font-medium">{developers.length} Desarrolladores</span>
          {!hasFullAccess && (
            <Badge variant="outline" className="text-xs">
              <Eye className="w-3 h-3 mr-1" />
              Solo lectura
            </Badge>
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
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground"
                  style={{ width: col.width, minWidth: col.width }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {developers.map((dev, index) => (
              <tr key={dev.id} className="hover:bg-muted/30" data-testid={`row-developer-${dev.id}`}>
                {columns.map((col) => {
                  const field = col.key;
                  const fieldCanEdit = canEdit(field);
                  
                  if (col.type === 'index') {
                    return (
                      <td key={field} className="border-b border-r px-3 py-2 text-muted-foreground">
                        {index + 1}
                      </td>
                    );
                  }
                  
                  if (col.type === 'toggle') {
                    return (
                      <td key={field} className="border-b border-r px-3 py-2">
                        <Badge
                          variant={dev.active ? "default" : "outline"}
                          className={`${fieldCanEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'} ${dev.active ? "bg-green-500/20 text-green-700 hover:bg-green-500/30" : ""}`}
                          onClick={() => fieldCanEdit && handleActiveToggle(dev.id, dev.active ?? false)}
                          data-testid={`toggle-active-${dev.id}`}
                        >
                          {dev.active ? "Sí" : "No"}
                          {!fieldCanEdit && <Eye className="w-3 h-3 ml-1 opacity-50" />}
                        </Badge>
                      </td>
                    );
                  }
                  
                  if (col.type === 'actions') {
                    return (
                      <td key={field} className="border-b border-r px-2 py-2">
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
                      className={`border-b border-r px-3 py-2 ${fieldCanEdit ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default'}`}
                      onClick={() => fieldCanEdit && handleCellClick(dev.id, field, value)}
                      data-testid={`cell-${field}-${dev.id}`}
                    >
                      {editingCell?.id === dev.id && editingCell?.field === field && fieldCanEdit ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleCellBlur(dev.id, field)}
                          onKeyDown={(e) => e.key === "Enter" && handleCellBlur(dev.id, field)}
                          autoFocus
                          className="h-7 text-sm"
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
            {developers.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  No hay desarrolladores. Haz clic en "Agregar" para crear uno.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
