import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Plus, Trash2, Building2, Loader2 } from "lucide-react";
import type { Developer } from "@shared/schema";

export function DevelopersSpreadsheet() {
  const { toast } = useToast();
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

  const columns = [
    { key: "#", label: "#", width: "50px", editable: false },
    { key: "active", label: "Activo", width: "80px", editable: false, type: "toggle" },
    { key: "name", label: "Nombre", width: "200px", editable: true },
    { key: "logo", label: "Logo URL", width: "150px", editable: true },
    { key: "contactName", label: "Contacto", width: "150px", editable: true },
    { key: "contactPhone", label: "Teléfono", width: "130px", editable: true },
    { key: "contactEmail", label: "Email", width: "180px", editable: true },
    { key: "website", label: "Sitio Web", width: "180px", editable: true },
    { key: "notes", label: "Notas", width: "200px", editable: true },
    { key: "actions", label: "", width: "60px", editable: false },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="developers-spreadsheet">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-primary" />
          <span className="font-medium">{developers.length} Desarrolladores</span>
        </div>
        <Button size="sm" onClick={handleCreateNew} disabled={createMutation.isPending} data-testid="button-add-developer">
          <Plus className="w-4 h-4 mr-2" />
          Agregar
        </Button>
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
                <td className="border-b border-r px-3 py-2 text-muted-foreground">{index + 1}</td>
                <td className="border-b border-r px-3 py-2">
                  <Badge
                    variant={dev.active ? "default" : "outline"}
                    className={`cursor-pointer ${dev.active ? "bg-green-500/20 text-green-700 hover:bg-green-500/30" : ""}`}
                    onClick={() => handleActiveToggle(dev.id, dev.active ?? false)}
                    data-testid={`toggle-active-${dev.id}`}
                  >
                    {dev.active ? "Sí" : "No"}
                  </Badge>
                </td>
                {["name", "logo", "contactName", "contactPhone", "contactEmail", "website", "notes"].map((field) => (
                  <td
                    key={field}
                    className="border-b border-r px-3 py-2 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleCellClick(dev.id, field, dev[field as keyof Developer] as string)}
                    data-testid={`cell-${field}-${dev.id}`}
                  >
                    {editingCell?.id === dev.id && editingCell?.field === field ? (
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
                      <span className="truncate block max-w-[200px]">
                        {dev[field as keyof Developer] as string || "-"}
                      </span>
                    )}
                  </td>
                ))}
                <td className="border-b border-r px-2 py-2">
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
                </td>
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
