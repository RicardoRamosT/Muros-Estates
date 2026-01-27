import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Database, Plus, Trash2, Loader2, Check, X, MapPin, Building, Sparkles, Zap, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CatalogCity, CatalogZone, CatalogDevelopmentType, CatalogAmenity, CatalogEfficiencyFeature, CatalogOtherFeature } from "@shared/schema";

export default function AdminCatalogos() {
  const [activeTab, setActiveTab] = useState("cities");
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Catálogos</h1>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="cities" className="gap-2" data-testid="tab-cities">
              <MapPin className="w-4 h-4" />
              Ciudades
            </TabsTrigger>
            <TabsTrigger value="zones" className="gap-2" data-testid="tab-zones">
              <MapPin className="w-4 h-4" />
              Zonas
            </TabsTrigger>
            <TabsTrigger value="development-types" className="gap-2" data-testid="tab-development-types">
              <Building className="w-4 h-4" />
              Tipos de Desarrollo
            </TabsTrigger>
            <TabsTrigger value="amenities" className="gap-2" data-testid="tab-amenities">
              <Sparkles className="w-4 h-4" />
              Amenidades
            </TabsTrigger>
            <TabsTrigger value="efficiency-features" className="gap-2" data-testid="tab-efficiency-features">
              <Zap className="w-4 h-4" />
              Eficiencia
            </TabsTrigger>
            <TabsTrigger value="other-features" className="gap-2" data-testid="tab-other-features">
              <Shield className="w-4 h-4" />
              Otras
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="cities">
            <CitiesTable />
          </TabsContent>
          <TabsContent value="zones">
            <ZonesTable />
          </TabsContent>
          <TabsContent value="development-types">
            <DevelopmentTypesTable />
          </TabsContent>
          <TabsContent value="amenities">
            <AmenitiesTable />
          </TabsContent>
          <TabsContent value="efficiency-features">
            <EfficiencyFeaturesTable />
          </TabsContent>
          <TabsContent value="other-features">
            <OtherFeaturesTable />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function CitiesTable() {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: cities = [], isLoading } = useQuery<CatalogCity[]>({
    queryKey: ["/api/catalog/cities"],
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/catalog/cities", { name: "Nueva Ciudad", active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/cities"] });
      toast({ title: "Ciudad creada" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CatalogCity> }) =>
      apiRequest("PUT", `/api/catalog/cities/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/catalog/cities"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/catalog/cities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/cities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/zones"] });
      toast({ title: "Ciudad eliminada" });
      setDeleteId(null);
    },
  });

  const handleCellClick = useCallback((id: string, field: string, value: string) => {
    setEditingCell({ id, field });
    setEditValue(value);
  }, []);

  const handleCellBlur = useCallback((id: string, field: string) => {
    if (!editingCell || editingCell.id !== id || editingCell.field !== field) return;
    const city = cities.find(c => c.id === id);
    if (city && editValue !== String(city[field as keyof CatalogCity] ?? "")) {
      updateMutation.mutate({ id, data: { [field]: editValue } });
    }
    setEditingCell(null);
  }, [editingCell, editValue, cities, updateMutation]);

  const handleActiveToggle = useCallback((id: string, currentValue: boolean) => {
    updateMutation.mutate({ id, data: { active: !currentValue } });
  }, [updateMutation]);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="border rounded-lg overflow-hidden" data-testid="catalog-cities-table">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-primary" />
          <span className="font-medium">{cities.length} Ciudades</span>
        </div>
        <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending} data-testid="button-add-city">
          <Plus className="w-4 h-4 mr-2" />Agregar
        </Button>
      </div>
      <div className="overflow-auto max-h-[500px]">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
            <tr>
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ width: "60px" }}>#</th>
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ width: "80px" }}>Activo</th>
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ minWidth: "200px" }}>Nombre</th>
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ width: "80px" }}>Orden</th>
              <th className="border-b px-3 py-2 font-medium text-muted-foreground" style={{ width: "60px" }}></th>
            </tr>
          </thead>
          <tbody>
            {cities.map((city, idx) => (
              <tr key={city.id} className="hover:bg-muted/30" data-testid={`row-city-${city.id}`}>
                <td className="border-b border-r px-3 py-2 text-muted-foreground">{idx + 1}</td>
                <td className="border-b border-r px-3 py-2">
                  <Badge
                    variant={city.active ? "default" : "outline"}
                    className={`cursor-pointer ${city.active ? "bg-green-500/20 text-green-700 dark:text-green-400" : ""}`}
                    onClick={() => handleActiveToggle(city.id, city.active ?? true)}
                    data-testid={`toggle-active-${city.id}`}
                  >
                    {city.active ? "Sí" : "No"}
                  </Badge>
                </td>
                <td className="border-b border-r px-3 py-2">
                  {editingCell?.id === city.id && editingCell?.field === "name" ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleCellBlur(city.id, "name")}
                      onKeyDown={(e) => e.key === "Enter" && handleCellBlur(city.id, "name")}
                      autoFocus
                      className="h-7 text-sm"
                      data-testid={`input-name-${city.id}`}
                    />
                  ) : (
                    <span 
                      className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded block w-full transition-colors" 
                      onClick={() => handleCellClick(city.id, "name", city.name)} 
                      data-testid={`cell-name-${city.id}`}
                    >
                      {city.name || <span className="text-muted-foreground">-</span>}
                    </span>
                  )}
                </td>
                <td className="border-b border-r px-3 py-2">
                  {editingCell?.id === city.id && editingCell?.field === "order" ? (
                    <Input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => { updateMutation.mutate({ id: city.id, data: { order: parseInt(editValue) || 0 } }); setEditingCell(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { updateMutation.mutate({ id: city.id, data: { order: parseInt(editValue) || 0 } }); setEditingCell(null); }}}
                      autoFocus
                      className="h-7 w-16 text-sm"
                    />
                  ) : (
                    <span 
                      className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded block text-center transition-colors" 
                      onClick={() => handleCellClick(city.id, "order", String(city.order ?? 0))}
                    >
                      {city.order ?? 0}
                    </span>
                  )}
                </td>
                <td className="border-b px-2 py-2">
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(city.id)} data-testid={`button-delete-${city.id}`}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar ciudad</AlertDialogTitle>
            <AlertDialogDescription>Esta acción también eliminará todas las zonas asociadas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ZonesTable() {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterCityId, setFilterCityId] = useState<string | "all">("all");

  const { data: cities = [] } = useQuery<CatalogCity[]>({ queryKey: ["/api/catalog/cities"] });
  const { data: zones = [], isLoading } = useQuery<CatalogZone[]>({ queryKey: ["/api/catalog/zones"] });

  const filteredZones = filterCityId === "all" ? zones : zones.filter(z => z.cityId === filterCityId);

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/catalog/zones", { name: "Nueva Zona", active: true, cityId: filterCityId !== "all" ? filterCityId : cities[0]?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/zones"] });
      toast({ title: "Zona creada" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CatalogZone> }) =>
      apiRequest("PUT", `/api/catalog/zones/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/catalog/zones"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/catalog/zones/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/zones"] });
      toast({ title: "Zona eliminada" });
      setDeleteId(null);
    },
  });

  const getCityName = (cityId: string | null) => cities.find(c => c.id === cityId)?.name || "-";

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="border rounded-lg overflow-hidden" data-testid="catalog-zones-table">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-primary" />
          <span className="font-medium">{filteredZones.length} Zonas</span>
          <Select value={filterCityId} onValueChange={setFilterCityId}>
            <SelectTrigger className="w-40 h-8">
              <SelectValue placeholder="Filtrar por ciudad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ciudades</SelectItem>
              {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || cities.length === 0} data-testid="button-add-zone">
          <Plus className="w-4 h-4 mr-2" />Agregar
        </Button>
      </div>
      <div className="overflow-auto max-h-[500px]">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
            <tr>
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ width: "60px" }}>#</th>
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ width: "80px" }}>Activo</th>
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ minWidth: "180px" }}>Nombre</th>
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ width: "150px" }}>Ciudad</th>
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ width: "80px" }}>Orden</th>
              <th className="border-b px-3 py-2 font-medium text-muted-foreground" style={{ width: "60px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredZones.map((zone, idx) => (
              <tr key={zone.id} className="hover:bg-muted/30" data-testid={`row-zone-${zone.id}`}>
                <td className="border-b border-r px-3 py-2 text-muted-foreground">{idx + 1}</td>
                <td className="border-b border-r px-3 py-2">
                  <Badge
                    variant={zone.active ? "default" : "outline"}
                    className={`cursor-pointer ${zone.active ? "bg-green-500/20 text-green-700 dark:text-green-400" : ""}`}
                    onClick={() => updateMutation.mutate({ id: zone.id, data: { active: !zone.active } })}
                  >
                    {zone.active ? "Sí" : "No"}
                  </Badge>
                </td>
                <td className="border-b border-r px-3 py-2">
                  {editingCell?.id === zone.id && editingCell?.field === "name" ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => { updateMutation.mutate({ id: zone.id, data: { name: editValue } }); setEditingCell(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { updateMutation.mutate({ id: zone.id, data: { name: editValue } }); setEditingCell(null); }}}
                      autoFocus
                      className="h-7 text-sm"
                    />
                  ) : (
                    <span 
                      className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded block w-full transition-colors" 
                      onClick={() => { setEditingCell({ id: zone.id, field: "name" }); setEditValue(zone.name); }}
                    >
                      {zone.name || <span className="text-muted-foreground">-</span>}
                    </span>
                  )}
                </td>
                <td className="border-b border-r px-3 py-2">
                  <Select value={zone.cityId || ""} onValueChange={(v) => updateMutation.mutate({ id: zone.id, data: { cityId: v } })}>
                    <SelectTrigger className="h-7 w-full text-sm">
                      <SelectValue>{getCityName(zone.cityId)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border-b border-r px-3 py-2">
                  {editingCell?.id === zone.id && editingCell?.field === "order" ? (
                    <Input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => { updateMutation.mutate({ id: zone.id, data: { order: parseInt(editValue) || 0 } }); setEditingCell(null); }}
                      autoFocus
                      className="h-7 w-16 text-sm"
                    />
                  ) : (
                    <span 
                      className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded block text-center transition-colors" 
                      onClick={() => { setEditingCell({ id: zone.id, field: "order" }); setEditValue(String(zone.order ?? 0)); }}
                    >
                      {zone.order ?? 0}
                    </span>
                  )}
                </td>
                <td className="border-b px-2 py-2">
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(zone.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar zona</AlertDialogTitle>
            <AlertDialogDescription>¿Estás seguro de eliminar esta zona?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SimpleTable({ 
  title, 
  endpoint, 
  queryKey,
  hasIcon = false,
  icon: IconComponent
}: { 
  title: string; 
  endpoint: string; 
  queryKey: string;
  hasIcon?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery<any[]>({ queryKey: [queryKey] });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", endpoint, { name: `Nuevo ${title}`, active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast({ title: `${title} creado` });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `${endpoint}/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `${endpoint}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast({ title: `${title} eliminado` });
      setDeleteId(null);
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="border rounded-lg overflow-hidden" data-testid={`catalog-${title.toLowerCase().replace(/\s+/g, '-')}-table`}>
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          {IconComponent && <IconComponent className="w-5 h-5 text-primary" />}
          <span className="font-medium">{items.length} {title}</span>
        </div>
        <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending} data-testid={`button-add-${title.toLowerCase()}`}>
          <Plus className="w-4 h-4 mr-2" />Agregar
        </Button>
      </div>
      <div className="overflow-auto max-h-[500px]">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
            <tr>
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ width: "60px" }}>#</th>
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ width: "80px" }}>Activo</th>
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ minWidth: "200px" }}>Nombre</th>
              {hasIcon && <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ width: "120px" }}>Icono</th>}
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ width: "80px" }}>Orden</th>
              <th className="border-b px-3 py-2 font-medium text-muted-foreground" style={{ width: "60px" }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className="hover:bg-muted/30" data-testid={`row-item-${item.id}`}>
                <td className="border-b border-r px-3 py-2 text-muted-foreground">{idx + 1}</td>
                <td className="border-b border-r px-3 py-2">
                  <Badge
                    variant={item.active ? "default" : "outline"}
                    className={`cursor-pointer ${item.active ? "bg-green-500/20 text-green-700 dark:text-green-400" : ""}`}
                    onClick={() => updateMutation.mutate({ id: item.id, data: { active: !item.active } })}
                  >
                    {item.active ? "Sí" : "No"}
                  </Badge>
                </td>
                <td className="border-b border-r px-3 py-2">
                  {editingCell?.id === item.id && editingCell?.field === "name" ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => { updateMutation.mutate({ id: item.id, data: { name: editValue } }); setEditingCell(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { updateMutation.mutate({ id: item.id, data: { name: editValue } }); setEditingCell(null); }}}
                      autoFocus
                      className="h-7 text-sm"
                    />
                  ) : (
                    <span 
                      className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded block w-full transition-colors" 
                      onClick={() => { setEditingCell({ id: item.id, field: "name" }); setEditValue(item.name); }}
                    >
                      {item.name || <span className="text-muted-foreground">-</span>}
                    </span>
                  )}
                </td>
                {hasIcon && (
                  <td className="border-b border-r px-3 py-2">
                    {editingCell?.id === item.id && editingCell?.field === "icon" ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => { updateMutation.mutate({ id: item.id, data: { icon: editValue } }); setEditingCell(null); }}
                        autoFocus
                        className="h-7 text-sm"
                      />
                    ) : (
                      <span 
                        className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded block transition-colors text-muted-foreground" 
                        onClick={() => { setEditingCell({ id: item.id, field: "icon" }); setEditValue(item.icon || ""); }}
                      >
                        {item.icon || "-"}
                      </span>
                    )}
                  </td>
                )}
                <td className="border-b border-r px-3 py-2">
                  {editingCell?.id === item.id && editingCell?.field === "order" ? (
                    <Input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => { updateMutation.mutate({ id: item.id, data: { order: parseInt(editValue) || 0 } }); setEditingCell(null); }}
                      autoFocus
                      className="h-7 w-16 text-sm"
                    />
                  ) : (
                    <span 
                      className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded block text-center transition-colors" 
                      onClick={() => { setEditingCell({ id: item.id, field: "order" }); setEditValue(String(item.order ?? 0)); }}
                    >
                      {item.order ?? 0}
                    </span>
                  )}
                </td>
                <td className="border-b px-2 py-2">
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar {title.toLowerCase()}</AlertDialogTitle>
            <AlertDialogDescription>¿Estás seguro de eliminar este elemento?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DevelopmentTypesTable() {
  return <SimpleTable title="Tipos de Desarrollo" endpoint="/api/catalog/development-types" queryKey="/api/catalog/development-types" icon={Building} />;
}

function AmenitiesTable() {
  return <SimpleTable title="Amenidades" endpoint="/api/catalog/amenities" queryKey="/api/catalog/amenities" hasIcon icon={Sparkles} />;
}

function EfficiencyFeaturesTable() {
  return <SimpleTable title="Características de Eficiencia" endpoint="/api/catalog/efficiency-features" queryKey="/api/catalog/efficiency-features" icon={Zap} />;
}

function OtherFeaturesTable() {
  return <SimpleTable title="Otras Características" endpoint="/api/catalog/other-features" queryKey="/api/catalog/other-features" icon={Shield} />;
}
