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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Building, Loader2 } from "lucide-react";
import type { Development, Developer } from "@shared/schema";
import { CITIES, ZONES_MONTERREY, ZONES_CDMX, DEVELOPMENT_TYPES } from "@shared/constants";

export function DevelopmentsSpreadsheet() {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: developments = [], isLoading } = useQuery<Development[]>({
    queryKey: ["/api/developments-entity"],
  });

  const { data: developers = [] } = useQuery<Developer[]>({
    queryKey: ["/api/developers"],
  });

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

  const handleCellClick = useCallback((id: string, field: string, currentValue: string | boolean | null) => {
    setEditingCell({ id, field });
    setEditValue(String(currentValue ?? ""));
  }, []);

  const handleCellBlur = useCallback((id: string, field: string) => {
    if (!editingCell || editingCell.id !== id || editingCell.field !== field) return;
    
    const development = developments.find(d => d.id === id);
    if (!development) return;
    
    const currentValue = String(development[field as keyof Development] ?? "");
    if (editValue !== currentValue) {
      updateMutation.mutate({ id, data: { [field]: editValue } });
    }
    setEditingCell(null);
  }, [editingCell, editValue, developments, updateMutation]);

  const handleActiveToggle = useCallback((id: string, currentValue: boolean) => {
    updateMutation.mutate({ id, data: { active: !currentValue } });
  }, [updateMutation]);

  const handleSelectChange = useCallback((id: string, field: string, value: string) => {
    updateMutation.mutate({ id, data: { [field]: value } });
    setEditingCell(null);
  }, [updateMutation]);

  const handleCreateNew = () => {
    createMutation.mutate({
      name: "Nuevo Desarrollo",
      active: true,
    });
  };

  const getZonesForCity = (city: string | null): readonly string[] => {
    if (city === "Monterrey") return ZONES_MONTERREY;
    if (city === "CDMX") return ZONES_CDMX;
    return [];
  };

  const getDeveloperName = (developerId: string | null) => {
    const dev = developers.find(d => d.id === developerId);
    return dev?.name || "-";
  };

  const columns = [
    { key: "#", label: "#", width: "50px" },
    { key: "active", label: "Activo", width: "80px" },
    { key: "developerId", label: "Desarrollador", width: "150px", type: "developer-select" },
    { key: "name", label: "Nombre", width: "180px" },
    { key: "city", label: "Ciudad", width: "120px", type: "city-select" },
    { key: "zone", label: "Zona", width: "150px", type: "zone-select" },
    { key: "type", label: "Tipo", width: "180px", type: "type-select" },
    { key: "deliveryDate", label: "Entrega", width: "130px" },
    { key: "address", label: "Dirección", width: "200px" },
    { key: "latitude", label: "Lat", width: "100px" },
    { key: "longitude", label: "Long", width: "100px" },
    { key: "notes", label: "Notas", width: "200px" },
    { key: "actions", label: "", width: "60px" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="developments-spreadsheet">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Building className="w-5 h-5 text-primary" />
          <span className="font-medium">{developments.length} Desarrollos</span>
        </div>
        <Button size="sm" onClick={handleCreateNew} disabled={createMutation.isPending} data-testid="button-add-development">
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
            {developments.map((dev, index) => (
              <tr key={dev.id} className="hover:bg-muted/30" data-testid={`row-development-${dev.id}`}>
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
                <td className="border-b border-r px-3 py-2">
                  {editingCell?.id === dev.id && editingCell?.field === "developerId" ? (
                    <Select 
                      value={dev.developerId || ""} 
                      onValueChange={(v) => handleSelectChange(dev.id, "developerId", v)}
                    >
                      <SelectTrigger className="h-7 text-sm">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {developers.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={() => setEditingCell({ id: dev.id, field: "developerId" })}
                      data-testid={`cell-developer-${dev.id}`}
                    >
                      {getDeveloperName(dev.developerId)}
                    </span>
                  )}
                </td>
                <td
                  className="border-b border-r px-3 py-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleCellClick(dev.id, "name", dev.name)}
                  data-testid={`cell-name-${dev.id}`}
                >
                  {editingCell?.id === dev.id && editingCell?.field === "name" ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleCellBlur(dev.id, "name")}
                      onKeyDown={(e) => e.key === "Enter" && handleCellBlur(dev.id, "name")}
                      autoFocus
                      className="h-7 text-sm"
                    />
                  ) : (
                    <span className="truncate block">{dev.name || "-"}</span>
                  )}
                </td>
                <td className="border-b border-r px-3 py-2">
                  {editingCell?.id === dev.id && editingCell?.field === "city" ? (
                    <Select value={dev.city || ""} onValueChange={(v) => handleSelectChange(dev.id, "city", v)}>
                      <SelectTrigger className="h-7 text-sm">
                        <SelectValue placeholder="Ciudad" />
                      </SelectTrigger>
                      <SelectContent>
                        {CITIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={() => setEditingCell({ id: dev.id, field: "city" })}
                    >
                      {dev.city || "-"}
                    </span>
                  )}
                </td>
                <td className="border-b border-r px-3 py-2">
                  {editingCell?.id === dev.id && editingCell?.field === "zone" ? (
                    <Select value={dev.zone || ""} onValueChange={(v) => handleSelectChange(dev.id, "zone", v)}>
                      <SelectTrigger className="h-7 text-sm">
                        <SelectValue placeholder="Zona" />
                      </SelectTrigger>
                      <SelectContent>
                        {getZonesForCity(dev.city).map((z) => (
                          <SelectItem key={z} value={z}>{z}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={() => setEditingCell({ id: dev.id, field: "zone" })}
                    >
                      {dev.zone || "-"}
                    </span>
                  )}
                </td>
                <td className="border-b border-r px-3 py-2">
                  {editingCell?.id === dev.id && editingCell?.field === "type" ? (
                    <Select value={dev.type || ""} onValueChange={(v) => handleSelectChange(dev.id, "type", v)}>
                      <SelectTrigger className="h-7 text-sm">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEVELOPMENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={() => setEditingCell({ id: dev.id, field: "type" })}
                    >
                      {dev.type || "-"}
                    </span>
                  )}
                </td>
                {["deliveryDate", "address", "latitude", "longitude", "notes"].map((field) => (
                  <td
                    key={field}
                    className="border-b border-r px-3 py-2 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleCellClick(dev.id, field, dev[field as keyof Development] as string)}
                  >
                    {editingCell?.id === dev.id && editingCell?.field === field ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellBlur(dev.id, field)}
                        onKeyDown={(e) => e.key === "Enter" && handleCellBlur(dev.id, field)}
                        autoFocus
                        className="h-7 text-sm"
                      />
                    ) : (
                      <span className="truncate block max-w-[180px]">
                        {dev[field as keyof Development] as string || "-"}
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
                        <DialogTitle>Eliminar Desarrollo</DialogTitle>
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
            {developments.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  No hay desarrollos. Haz clic en "Agregar" para crear uno.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
