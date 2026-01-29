import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Database, Plus, Trash2, Loader2, MapPin, Building, Home, Sparkles, Users, Layers, Grid3X3, DoorOpen, Bath, Car, Wrench, Paintbrush, Eye, LayoutGrid, Tag, UserCircle, Target, Activity, CreditCard, ThumbsUp, ThumbsDown, Factory, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CatalogCity, CatalogZone } from "@shared/schema";

type CatalogItem = {
  id: string;
  name: string;
  active?: boolean;
  order?: number;
  color?: string;
  valor?: number;
  cityId?: string;
};

export default function AdminCatalogos() {
  const [activeTab, setActiveTab] = useState("ubicacion");
  
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
            <TabsTrigger value="ubicacion" className="gap-2" data-testid="tab-ubicacion">
              <MapPin className="w-4 h-4" />
              Ubicación
            </TabsTrigger>
            <TabsTrigger value="desarrollos" className="gap-2" data-testid="tab-desarrollos">
              <Building className="w-4 h-4" />
              Desarrollos
            </TabsTrigger>
            <TabsTrigger value="tipologias" className="gap-2" data-testid="tab-tipologias">
              <Home className="w-4 h-4" />
              Tipologías
            </TabsTrigger>
            <TabsTrigger value="caracteristicas" className="gap-2" data-testid="tab-caracteristicas">
              <Sparkles className="w-4 h-4" />
              Características
            </TabsTrigger>
            <TabsTrigger value="prospectos" className="gap-2" data-testid="tab-prospectos">
              <Users className="w-4 h-4" />
              Prospectos
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="ubicacion">
            <UbicacionCatalogs />
          </TabsContent>
          <TabsContent value="desarrollos">
            <DesarrollosCatalogs />
          </TabsContent>
          <TabsContent value="tipologias">
            <TipologiasCatalogs />
          </TabsContent>
          <TabsContent value="caracteristicas">
            <CaracteristicasCatalogs />
          </TabsContent>
          <TabsContent value="prospectos">
            <ProspectosCatalogs />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function UbicacionCatalogs() {
  const [subTab, setSubTab] = useState("cities");
  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="h-auto gap-1">
          <TabsTrigger value="cities" className="gap-2"><MapPin className="w-4 h-4" />Ciudades</TabsTrigger>
          <TabsTrigger value="zones" className="gap-2"><MapPin className="w-4 h-4" />Zonas</TabsTrigger>
        </TabsList>
        <TabsContent value="cities"><CitiesTable /></TabsContent>
        <TabsContent value="zones"><ZonesTable /></TabsContent>
      </Tabs>
    </div>
  );
}

function DesarrollosCatalogs() {
  const [subTab, setSubTab] = useState("development-types");
  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="h-auto gap-1 flex-wrap">
          <TabsTrigger value="development-types" className="gap-2"><Building className="w-4 h-4" />Tipos</TabsTrigger>
          <TabsTrigger value="comercializadoras" className="gap-2"><Factory className="w-4 h-4" />Comercializadoras</TabsTrigger>
          <TabsTrigger value="arquitectura" className="gap-2"><Pencil className="w-4 h-4" />Arquitectura</TabsTrigger>
        </TabsList>
        <TabsContent value="development-types">
          <SimpleTable title="Tipos de Desarrollo" endpoint="/api/catalog/development-types" queryKey="/api/catalog/development-types" icon={Building} />
        </TabsContent>
        <TabsContent value="comercializadoras">
          <SimpleTable title="Comercializadoras" endpoint="/api/catalog/comercializadoras" queryKey="/api/catalog/comercializadoras" icon={Factory} />
        </TabsContent>
        <TabsContent value="arquitectura">
          <SimpleTable title="Arquitectura" endpoint="/api/catalog/arquitectura" queryKey="/api/catalog/arquitectura" icon={Pencil} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TipologiasCatalogs() {
  const [subTab, setSubTab] = useState("niveles");
  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="h-auto gap-1 flex-wrap">
          <TabsTrigger value="niveles" className="gap-2"><Layers className="w-4 h-4" />Niveles</TabsTrigger>
          <TabsTrigger value="torres" className="gap-2"><Grid3X3 className="w-4 h-4" />Torres</TabsTrigger>
          <TabsTrigger value="recamaras" className="gap-2"><DoorOpen className="w-4 h-4" />Recámaras</TabsTrigger>
          <TabsTrigger value="banos" className="gap-2"><Bath className="w-4 h-4" />Baños</TabsTrigger>
          <TabsTrigger value="cajones" className="gap-2"><Car className="w-4 h-4" />Cajones</TabsTrigger>
          <TabsTrigger value="nivel-mant" className="gap-2"><Wrench className="w-4 h-4" />Nivel Mant.</TabsTrigger>
          <TabsTrigger value="acabados" className="gap-2"><Paintbrush className="w-4 h-4" />Acabados</TabsTrigger>
          <TabsTrigger value="vistas" className="gap-2"><Eye className="w-4 h-4" />Vistas</TabsTrigger>
          <TabsTrigger value="areas" className="gap-2"><LayoutGrid className="w-4 h-4" />Áreas</TabsTrigger>
          <TabsTrigger value="tipologias" className="gap-2"><Tag className="w-4 h-4" />Tipologías</TabsTrigger>
        </TabsList>
        <TabsContent value="niveles">
          <SimpleTable title="Niveles" endpoint="/api/catalog/niveles" queryKey="/api/catalog/niveles" icon={Layers} />
        </TabsContent>
        <TabsContent value="torres">
          <SimpleTable title="Torres" endpoint="/api/catalog/torres" queryKey="/api/catalog/torres" icon={Grid3X3} />
        </TabsContent>
        <TabsContent value="recamaras">
          <SimpleTable title="Recámaras" endpoint="/api/catalog/recamaras" queryKey="/api/catalog/recamaras" icon={DoorOpen} />
        </TabsContent>
        <TabsContent value="banos">
          <SimpleTable title="Baños" endpoint="/api/catalog/banos" queryKey="/api/catalog/banos" icon={Bath} />
        </TabsContent>
        <TabsContent value="cajones">
          <SimpleTable title="Cajones" endpoint="/api/catalog/cajones" queryKey="/api/catalog/cajones" icon={Car} />
        </TabsContent>
        <TabsContent value="nivel-mant">
          <NivelMantenimientoTable />
        </TabsContent>
        <TabsContent value="acabados">
          <SimpleTable title="Acabados" endpoint="/api/catalog/acabados" queryKey="/api/catalog/acabados" icon={Paintbrush} />
        </TabsContent>
        <TabsContent value="vistas">
          <SimpleTable title="Vistas" endpoint="/api/catalog/vistas" queryKey="/api/catalog/vistas" icon={Eye} />
        </TabsContent>
        <TabsContent value="areas">
          <SimpleTable title="Áreas" endpoint="/api/catalog/areas" queryKey="/api/catalog/areas" icon={LayoutGrid} />
        </TabsContent>
        <TabsContent value="tipologias">
          <SimpleTable title="Tipologías" endpoint="/api/catalog/tipologias" queryKey="/api/catalog/tipologias" icon={Tag} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CaracteristicasCatalogs() {
  const [subTab, setSubTab] = useState("amenities");
  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="h-auto gap-1">
          <TabsTrigger value="amenities" className="gap-2"><Sparkles className="w-4 h-4" />Amenidades</TabsTrigger>
          <TabsTrigger value="efficiency" className="gap-2"><Activity className="w-4 h-4" />Eficiencia</TabsTrigger>
          <TabsTrigger value="other" className="gap-2"><Tag className="w-4 h-4" />Otras</TabsTrigger>
        </TabsList>
        <TabsContent value="amenities">
          <SimpleTable title="Amenidades" endpoint="/api/catalog/amenities" queryKey="/api/catalog/amenities" hasIcon icon={Sparkles} />
        </TabsContent>
        <TabsContent value="efficiency">
          <SimpleTable title="Eficiencia" endpoint="/api/catalog/efficiency-features" queryKey="/api/catalog/efficiency-features" icon={Activity} />
        </TabsContent>
        <TabsContent value="other">
          <SimpleTable title="Otras Características" endpoint="/api/catalog/other-features" queryKey="/api/catalog/other-features" icon={Tag} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProspectosCatalogs() {
  const [subTab, setSubTab] = useState("tipo-cliente");
  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="h-auto gap-1 flex-wrap">
          <TabsTrigger value="tipo-cliente" className="gap-2"><UserCircle className="w-4 h-4" />Tipo Cliente</TabsTrigger>
          <TabsTrigger value="perfil" className="gap-2"><Users className="w-4 h-4" />Perfil</TabsTrigger>
          <TabsTrigger value="fuente" className="gap-2"><Target className="w-4 h-4" />Fuente</TabsTrigger>
          <TabsTrigger value="status" className="gap-2"><Activity className="w-4 h-4" />Status</TabsTrigger>
          <TabsTrigger value="etapa" className="gap-2"><Target className="w-4 h-4" />Etapa Embudo</TabsTrigger>
          <TabsTrigger value="como-paga" className="gap-2"><CreditCard className="w-4 h-4" />Cómo Paga</TabsTrigger>
          <TabsTrigger value="positivos" className="gap-2"><ThumbsUp className="w-4 h-4" />Positivos</TabsTrigger>
          <TabsTrigger value="negativos" className="gap-2"><ThumbsDown className="w-4 h-4" />Negativos</TabsTrigger>
        </TabsList>
        <TabsContent value="tipo-cliente">
          <ColoredCatalogTable title="Tipo Cliente" endpoint="/api/catalog/tipo-cliente" queryKey="/api/catalog/tipo-cliente" icon={UserCircle} />
        </TabsContent>
        <TabsContent value="perfil">
          <ColoredCatalogTable title="Perfil" endpoint="/api/catalog/perfil" queryKey="/api/catalog/perfil" icon={Users} />
        </TabsContent>
        <TabsContent value="fuente">
          <ColoredCatalogTable title="Fuente" endpoint="/api/catalog/fuente" queryKey="/api/catalog/fuente" icon={Target} />
        </TabsContent>
        <TabsContent value="status">
          <ColoredCatalogTable title="Status" endpoint="/api/catalog/status-prospecto" queryKey="/api/catalog/status-prospecto" icon={Activity} />
        </TabsContent>
        <TabsContent value="etapa">
          <ColoredCatalogTable title="Etapa Embudo" endpoint="/api/catalog/etapa-embudo" queryKey="/api/catalog/etapa-embudo" icon={Target} />
        </TabsContent>
        <TabsContent value="como-paga">
          <SimpleTable title="Cómo Paga" endpoint="/api/catalog/como-paga" queryKey="/api/catalog/como-paga" icon={CreditCard} />
        </TabsContent>
        <TabsContent value="positivos">
          <SimpleTable title="Positivos" endpoint="/api/catalog/positivos" queryKey="/api/catalog/positivos" icon={ThumbsUp} />
        </TabsContent>
        <TabsContent value="negativos">
          <SimpleTable title="Negativos" endpoint="/api/catalog/negativos" queryKey="/api/catalog/negativos" icon={ThumbsDown} />
        </TabsContent>
      </Tabs>
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
                    onClick={() => updateMutation.mutate({ id: city.id, data: { active: !city.active } })}
                  >
                    {city.active ? "Sí" : "No"}
                  </Badge>
                </td>
                <td className="border-b border-r px-3 py-2">
                  {editingCell?.id === city.id && editingCell?.field === "name" ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => { updateMutation.mutate({ id: city.id, data: { name: editValue } }); setEditingCell(null); }}
                      onKeyDown={(e) => e.key === "Enter" && (updateMutation.mutate({ id: city.id, data: { name: editValue } }), setEditingCell(null))}
                      autoFocus
                      className="h-7 text-sm"
                    />
                  ) : (
                    <span 
                      className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded block w-full transition-colors" 
                      onClick={() => { setEditingCell({ id: city.id, field: "name" }); setEditValue(city.name); }}
                    >
                      {city.name || ""}
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
                      autoFocus
                      className="h-7 w-16 text-sm"
                    />
                  ) : (
                    <span 
                      className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded block text-center transition-colors" 
                      onClick={() => { setEditingCell({ id: city.id, field: "order" }); setEditValue(String(city.order ?? 0)); }}
                    >
                      {city.order ?? 0}
                    </span>
                  )}
                </td>
                <td className="border-b px-2 py-2">
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(city.id)}>
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

  const getCityName = (cityId: string | null) => cities.find(c => c.id === cityId)?.name || "";

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
        <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || cities.length === 0}>
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
              <tr key={zone.id} className="hover:bg-muted/30">
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
                      autoFocus
                      className="h-7 text-sm"
                    />
                  ) : (
                    <span 
                      className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded block w-full transition-colors" 
                      onClick={() => { setEditingCell({ id: zone.id, field: "name" }); setEditValue(zone.name); }}
                    >
                      {zone.name || ""}
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

  const { data: items = [], isLoading } = useQuery<CatalogItem[]>({ queryKey: [queryKey] });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", endpoint, { name: `Nuevo`, active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast({ title: `${title} creado` });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CatalogItem> }) => apiRequest("PUT", `${endpoint}/${id}`, data),
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
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          {IconComponent && <IconComponent className="w-5 h-5 text-primary" />}
          <span className="font-medium">{items.length} {title}</span>
        </div>
        <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
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
              <tr key={item.id} className="hover:bg-muted/30">
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
                      autoFocus
                      className="h-7 text-sm"
                    />
                  ) : (
                    <span 
                      className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded block w-full transition-colors" 
                      onClick={() => { setEditingCell({ id: item.id, field: "name" }); setEditValue(item.name); }}
                    >
                      {item.name || ""}
                    </span>
                  )}
                </td>
                {hasIcon && (
                  <td className="border-b border-r px-3 py-2">
                    {editingCell?.id === item.id && editingCell?.field === "icon" ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => { updateMutation.mutate({ id: item.id, data: { icon: editValue } as any }); setEditingCell(null); }}
                        autoFocus
                        className="h-7 text-sm"
                      />
                    ) : (
                      <span 
                        className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded block transition-colors text-muted-foreground" 
                        onClick={() => { setEditingCell({ id: item.id, field: "icon" }); setEditValue((item as any).icon || ""); }}
                      >
                        {(item as any).icon || ""}
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

function ColoredCatalogTable({ 
  title, 
  endpoint, 
  queryKey,
  icon: IconComponent
}: { 
  title: string; 
  endpoint: string; 
  queryKey: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery<CatalogItem[]>({ queryKey: [queryKey] });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", endpoint, { name: `Nuevo`, active: true, color: "#6366f1" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast({ title: `${title} creado` });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CatalogItem> }) => apiRequest("PUT", `${endpoint}/${id}`, data),
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
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          {IconComponent && <IconComponent className="w-5 h-5 text-primary" />}
          <span className="font-medium">{items.length} {title}</span>
        </div>
        <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
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
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ width: "100px" }}>Color</th>
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ width: "120px" }}>Vista Previa</th>
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ width: "80px" }}>Orden</th>
              <th className="border-b px-3 py-2 font-medium text-muted-foreground" style={{ width: "60px" }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className="hover:bg-muted/30">
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
                      autoFocus
                      className="h-7 text-sm"
                    />
                  ) : (
                    <span 
                      className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded block w-full transition-colors" 
                      onClick={() => { setEditingCell({ id: item.id, field: "name" }); setEditValue(item.name); }}
                    >
                      {item.name || ""}
                    </span>
                  )}
                </td>
                <td className="border-b border-r px-3 py-2">
                  <input
                    type="color"
                    value={item.color || "#6366f1"}
                    onChange={(e) => updateMutation.mutate({ id: item.id, data: { color: e.target.value } })}
                    className="w-8 h-7 rounded cursor-pointer border-0"
                    style={{ padding: 0 }}
                  />
                </td>
                <td className="border-b border-r px-3 py-2">
                  <Badge 
                    style={{ 
                      backgroundColor: `${item.color || "#6366f1"}20`,
                      color: item.color || "#6366f1",
                      borderColor: item.color || "#6366f1"
                    }}
                    className="border"
                  >
                    {item.name || "Ejemplo"}
                  </Badge>
                </td>
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

function NivelMantenimientoTable() {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery<CatalogItem[]>({ queryKey: ["/api/catalog/nivel-mantenimiento"] });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/catalog/nivel-mantenimiento", { name: "Nuevo", valor: 50, active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/nivel-mantenimiento"] });
      toast({ title: "Nivel de mantenimiento creado" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CatalogItem> }) => 
      apiRequest("PUT", `/api/catalog/nivel-mantenimiento/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/catalog/nivel-mantenimiento"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/catalog/nivel-mantenimiento/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/nivel-mantenimiento"] });
      toast({ title: "Nivel de mantenimiento eliminado" });
      setDeleteId(null);
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <Wrench className="w-5 h-5 text-primary" />
          <span className="font-medium">{items.length} Niveles de Mantenimiento</span>
        </div>
        <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
          <Plus className="w-4 h-4 mr-2" />Agregar
        </Button>
      </div>
      <div className="overflow-auto max-h-[500px]">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
            <tr>
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ width: "60px" }}>#</th>
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ width: "80px" }}>Activo</th>
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ minWidth: "120px" }}>Nombre</th>
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ width: "100px" }}>Valor ($/m²)</th>
              <th className="border-b border-r px-3 py-2 text-left font-medium text-muted-foreground" style={{ width: "80px" }}>Orden</th>
              <th className="border-b px-3 py-2 font-medium text-muted-foreground" style={{ width: "60px" }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className="hover:bg-muted/30">
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
                      autoFocus
                      className="h-7 text-sm"
                    />
                  ) : (
                    <span 
                      className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded block w-full transition-colors font-medium" 
                      onClick={() => { setEditingCell({ id: item.id, field: "name" }); setEditValue(item.name); }}
                    >
                      {item.name || ""}
                    </span>
                  )}
                </td>
                <td className="border-b border-r px-3 py-2">
                  {editingCell?.id === item.id && editingCell?.field === "valor" ? (
                    <Input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => { updateMutation.mutate({ id: item.id, data: { valor: parseInt(editValue) || 0 } }); setEditingCell(null); }}
                      autoFocus
                      className="h-7 w-20 text-sm"
                    />
                  ) : (
                    <span 
                      className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded block text-center transition-colors" 
                      onClick={() => { setEditingCell({ id: item.id, field: "valor" }); setEditValue(String(item.valor ?? 0)); }}
                    >
                      ${item.valor ?? 0}
                    </span>
                  )}
                </td>
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
            <AlertDialogTitle>Eliminar nivel de mantenimiento</AlertDialogTitle>
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
