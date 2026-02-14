import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Database, Plus, Trash2, Loader2, MapPin, Building, Home, Sparkles, Users, Layers, Grid3X3, DoorOpen, Bath, Car, Wrench, Paintbrush, Eye, LayoutGrid, Tag, UserCircle, Target, Activity, CreditCard, ThumbsUp, ThumbsDown, Factory, Pencil, FileText, Scale, Presentation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCellStyle } from "@/lib/spreadsheet-utils";
import type { CatalogCity, CatalogZone } from "@shared/schema";

type CatalogItem = {
  id: string;
  name: string;
  active?: boolean;
  order?: number;
  color?: string;
  valor?: number;
  cityId?: string;
  icon?: string;
};

const HEADER_STYLE = "sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 border-r border-b-2 border-gray-300 dark:border-gray-600 font-semibold text-xs uppercase tracking-wide px-2 py-2 text-center";

export default function AdminCatalogos() {
  const [activeTab, setActiveTab] = useState("ubicacion");
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-bold" data-testid="text-page-title">Catálogos</h1>
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
          
          <TabsContent value="ubicacion"><UbicacionCatalogs /></TabsContent>
          <TabsContent value="desarrollos"><DesarrollosCatalogs /></TabsContent>
          <TabsContent value="tipologias"><TipologiasCatalogs /></TabsContent>
          <TabsContent value="caracteristicas"><CaracteristicasCatalogs /></TabsContent>
          <TabsContent value="prospectos"><ProspectosCatalogs /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function UbicacionCatalogs() {
  const [subTab, setSubTab] = useState("cities");
  return (
    <Tabs value={subTab} onValueChange={setSubTab}>
      <TabsList className="h-auto gap-1 mb-4">
        <TabsTrigger value="cities" className="gap-2"><MapPin className="w-4 h-4" />Ciudades</TabsTrigger>
        <TabsTrigger value="zones" className="gap-2"><MapPin className="w-4 h-4" />Zonas</TabsTrigger>
      </TabsList>
      <TabsContent value="cities"><CitiesTable /></TabsContent>
      <TabsContent value="zones"><ZonesTable /></TabsContent>
    </Tabs>
  );
}

function DesarrollosCatalogs() {
  const [subTab, setSubTab] = useState("development-types");
  return (
    <Tabs value={subTab} onValueChange={setSubTab}>
      <TabsList className="h-auto gap-1 flex-wrap mb-4">
        <TabsTrigger value="development-types" className="gap-2"><Building className="w-4 h-4" />Tipos</TabsTrigger>
        <TabsTrigger value="comercializadoras" className="gap-2"><Factory className="w-4 h-4" />Comercializadoras</TabsTrigger>
        <TabsTrigger value="arquitectura" className="gap-2"><Pencil className="w-4 h-4" />Arquitectura</TabsTrigger>
        <TabsTrigger value="tipo-contrato" className="gap-2"><FileText className="w-4 h-4" />Tipo Contrato</TabsTrigger>
        <TabsTrigger value="cesion-derechos" className="gap-2"><Scale className="w-4 h-4" />Cesión</TabsTrigger>
        <TabsTrigger value="presentacion" className="gap-2"><Presentation className="w-4 h-4" />Presentación</TabsTrigger>
      </TabsList>
      <TabsContent value="development-types">
        <ExcelTable title="Tipos de Desarrollo" endpoint="/api/catalog/development-types" queryKey="/api/catalog/development-types" icon={Building} />
      </TabsContent>
      <TabsContent value="comercializadoras">
        <ExcelTable title="Comercializadoras" endpoint="/api/catalog/comercializadoras" queryKey="/api/catalog/comercializadoras" icon={Factory} />
      </TabsContent>
      <TabsContent value="arquitectura">
        <ExcelTable title="Arquitectura" endpoint="/api/catalog/arquitectura" queryKey="/api/catalog/arquitectura" icon={Pencil} />
      </TabsContent>
      <TabsContent value="tipo-contrato">
        <ExcelTable title="Tipo de Contrato" endpoint="/api/catalog/tipo-contrato" queryKey="/api/catalog/tipo-contrato" icon={FileText} />
      </TabsContent>
      <TabsContent value="cesion-derechos">
        <ExcelTable title="Cesión de Derechos" endpoint="/api/catalog/cesion-derechos" queryKey="/api/catalog/cesion-derechos" icon={Scale} />
      </TabsContent>
      <TabsContent value="presentacion">
        <ExcelTable title="Presentación" endpoint="/api/catalog/presentacion" queryKey="/api/catalog/presentacion" icon={Presentation} />
      </TabsContent>
    </Tabs>
  );
}

function TipologiasCatalogs() {
  const [subTab, setSubTab] = useState("tasas");
  return (
    <Tabs value={subTab} onValueChange={setSubTab}>
      <TabsList className="h-auto gap-1 flex-wrap mb-4">
        <TabsTrigger value="tasas" className="gap-2"><CreditCard className="w-4 h-4" />Tasas Globales</TabsTrigger>
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
      <TabsContent value="tasas"><GlobalRatesTable /></TabsContent>
      <TabsContent value="niveles"><ExcelTable title="Niveles" endpoint="/api/catalog/niveles" queryKey="/api/catalog/niveles" icon={Layers} /></TabsContent>
      <TabsContent value="torres"><ExcelTable title="Torres" endpoint="/api/catalog/torres" queryKey="/api/catalog/torres" icon={Grid3X3} /></TabsContent>
      <TabsContent value="recamaras"><ExcelTable title="Recámaras" endpoint="/api/catalog/recamaras" queryKey="/api/catalog/recamaras" icon={DoorOpen} /></TabsContent>
      <TabsContent value="banos"><ExcelTable title="Baños" endpoint="/api/catalog/banos" queryKey="/api/catalog/banos" icon={Bath} /></TabsContent>
      <TabsContent value="cajones"><ExcelTable title="Cajones" endpoint="/api/catalog/cajones" queryKey="/api/catalog/cajones" icon={Car} /></TabsContent>
      <TabsContent value="nivel-mant"><NivelMantenimientoTable /></TabsContent>
      <TabsContent value="acabados"><ExcelTable title="Acabados" endpoint="/api/catalog/acabados" queryKey="/api/catalog/acabados" icon={Paintbrush} /></TabsContent>
      <TabsContent value="vistas"><ExcelTable title="Vistas" endpoint="/api/catalog/vistas" queryKey="/api/catalog/vistas" icon={Eye} /></TabsContent>
      <TabsContent value="areas"><ExcelTable title="Áreas" endpoint="/api/catalog/areas" queryKey="/api/catalog/areas" icon={LayoutGrid} /></TabsContent>
      <TabsContent value="tipologias"><ExcelTable title="Tipologías" endpoint="/api/catalog/tipologias" queryKey="/api/catalog/tipologias" icon={Tag} /></TabsContent>
    </Tabs>
  );
}

function CaracteristicasCatalogs() {
  const [subTab, setSubTab] = useState("amenities");
  return (
    <Tabs value={subTab} onValueChange={setSubTab}>
      <TabsList className="h-auto gap-1 mb-4">
        <TabsTrigger value="amenities" className="gap-2"><Sparkles className="w-4 h-4" />Amenidades</TabsTrigger>
        <TabsTrigger value="efficiency" className="gap-2"><Activity className="w-4 h-4" />Eficiencia</TabsTrigger>
        <TabsTrigger value="other" className="gap-2"><Tag className="w-4 h-4" />Otras</TabsTrigger>
      </TabsList>
      <TabsContent value="amenities"><ExcelTable title="Amenidades" endpoint="/api/catalog/amenities" queryKey="/api/catalog/amenities" hasIcon icon={Sparkles} /></TabsContent>
      <TabsContent value="efficiency"><ExcelTable title="Eficiencia" endpoint="/api/catalog/efficiency-features" queryKey="/api/catalog/efficiency-features" icon={Activity} /></TabsContent>
      <TabsContent value="other"><ExcelTable title="Otras Características" endpoint="/api/catalog/other-features" queryKey="/api/catalog/other-features" icon={Tag} /></TabsContent>
    </Tabs>
  );
}

function ProspectosCatalogs() {
  const [subTab, setSubTab] = useState("tipo-cliente");
  return (
    <Tabs value={subTab} onValueChange={setSubTab}>
      <TabsList className="h-auto gap-1 flex-wrap mb-4">
        <TabsTrigger value="tipo-cliente" className="gap-2"><UserCircle className="w-4 h-4" />Tipo Cliente</TabsTrigger>
        <TabsTrigger value="perfil" className="gap-2"><Users className="w-4 h-4" />Perfil</TabsTrigger>
        <TabsTrigger value="fuente" className="gap-2"><Target className="w-4 h-4" />Fuente</TabsTrigger>
        <TabsTrigger value="asesor" className="gap-2"><UserCircle className="w-4 h-4" />Asesor</TabsTrigger>
        <TabsTrigger value="broker-externo" className="gap-2"><Users className="w-4 h-4" />Broker Externo</TabsTrigger>
        <TabsTrigger value="status" className="gap-2"><Activity className="w-4 h-4" />Status</TabsTrigger>
        <TabsTrigger value="etapa" className="gap-2"><Target className="w-4 h-4" />Etapa Embudo</TabsTrigger>
        <TabsTrigger value="como-paga" className="gap-2"><CreditCard className="w-4 h-4" />Cómo Paga</TabsTrigger>
        <TabsTrigger value="positivos" className="gap-2"><ThumbsUp className="w-4 h-4" />Positivos</TabsTrigger>
        <TabsTrigger value="negativos" className="gap-2"><ThumbsDown className="w-4 h-4" />Negativos</TabsTrigger>
      </TabsList>
      <TabsContent value="tipo-cliente"><ColoredExcelTable title="Tipo Cliente" endpoint="/api/catalog/tipo-cliente" queryKey="/api/catalog/tipo-cliente" icon={UserCircle} /></TabsContent>
      <TabsContent value="perfil"><ColoredExcelTable title="Perfil" endpoint="/api/catalog/perfil" queryKey="/api/catalog/perfil" icon={Users} /></TabsContent>
      <TabsContent value="fuente"><ColoredExcelTable title="Fuente" endpoint="/api/catalog/fuente" queryKey="/api/catalog/fuente" icon={Target} /></TabsContent>
      <TabsContent value="asesor"><ExcelTable title="Asesor" endpoint="/api/catalog/asesor" queryKey="/api/catalog/asesor" icon={UserCircle} /></TabsContent>
      <TabsContent value="broker-externo"><ExcelTable title="Broker Externo" endpoint="/api/catalog/broker-externo" queryKey="/api/catalog/broker-externo" icon={Users} /></TabsContent>
      <TabsContent value="status"><ColoredExcelTable title="Status" endpoint="/api/catalog/status-prospecto" queryKey="/api/catalog/status-prospecto" icon={Activity} /></TabsContent>
      <TabsContent value="etapa"><ColoredExcelTable title="Etapa Embudo" endpoint="/api/catalog/etapa-embudo" queryKey="/api/catalog/etapa-embudo" icon={Target} /></TabsContent>
      <TabsContent value="como-paga"><ExcelTable title="Cómo Paga" endpoint="/api/catalog/como-paga" queryKey="/api/catalog/como-paga" icon={CreditCard} /></TabsContent>
      <TabsContent value="positivos"><ExcelTable title="Positivos" endpoint="/api/catalog/positivos" queryKey="/api/catalog/positivos" icon={ThumbsUp} /></TabsContent>
      <TabsContent value="negativos"><ExcelTable title="Negativos" endpoint="/api/catalog/negativos" queryKey="/api/catalog/negativos" icon={ThumbsDown} /></TabsContent>
    </Tabs>
  );
}

function GlobalRatesTable() {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<{ key: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: settings = [], isLoading } = useQuery<{ id: string; key: string; value: string; label: string | null }[]>({ queryKey: ["/api/global-settings"] });

  const updateMutation = useMutation({
    mutationFn: ({ key, value, label }: { key: string; value: string; label?: string }) =>
      apiRequest("PUT", `/api/global-settings/${key}`, { value, label }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/global-settings"] });
      toast({ title: "Tasa actualizada" });
    },
  });

  const RATE_CONFIGS = [
    { key: "mortgageInterestPercent", label: "Tasa C.H.", defaultValue: "10.5", suffix: "%", step: "0.1" },
    { key: "mortgageYears", label: "Años", defaultValue: "15", suffix: "", step: "1" },
    { key: "rentRatePercent", label: "Tasa Renta", defaultValue: "7.0", suffix: "%", step: "0.1" },
    { key: "rentMonths", label: "Meses", defaultValue: "11", suffix: "", step: "1" },
    { key: "appreciationRate", label: "Tasa Plusvalía", defaultValue: "7.0", suffix: "%", step: "0.1" },
  ];

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const getValue = (key: string, defaultValue: string) => {
    const setting = settings.find(s => s.key === key);
    return setting?.value ?? defaultValue;
  };

  const getLabel = (key: string, defaultLabel: string) => {
    const setting = settings.find(s => s.key === key);
    return setting?.label ?? defaultLabel;
  };

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden" data-testid="global-rates-table">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">{RATE_CONFIGS.length} Tasas y Parámetros Globales</span>
        </div>
      </div>
      <div className="overflow-auto max-h-[600px]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={HEADER_STYLE} style={{ width: "50px" }}>#</th>
              <th className={HEADER_STYLE} style={{ minWidth: "200px" }}>Parámetro</th>
              <th className={HEADER_STYLE} style={{ width: "120px" }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {RATE_CONFIGS.map((config, idx) => {
              const currentValue = getValue(config.key, config.defaultValue);
              const currentLabel = getLabel(config.key, config.label);
              const isEditingLabel = editingCell?.key === config.key && editingCell?.field === "label";
              const isEditingValue = editingCell?.key === config.key && editingCell?.field === "value";
              return (
                <tr key={config.key} data-testid={`row-rate-${config.key}`}>
                  <td className={getCellStyle({ type: "index" })}>{idx + 1}</td>
                  <td className={getCellStyle({ type: "input", isEditing: isEditingLabel })}>
                    {isEditingLabel ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => { updateMutation.mutate({ key: config.key, value: currentValue, label: editValue }); setEditingCell(null); }}
                        onKeyDown={(e) => e.key === "Enter" && (updateMutation.mutate({ key: config.key, value: currentValue, label: editValue }), setEditingCell(null))}
                        autoFocus
                        className="h-6 text-sm border-0 p-0 focus-visible:ring-0"
                      />
                    ) : (
                      <span className="block w-full cursor-text" onClick={() => { setEditingCell({ key: config.key, field: "label" }); setEditValue(currentLabel); }}>{currentLabel}</span>
                    )}
                  </td>
                  <td className={getCellStyle({ type: "input", isEditing: isEditingValue })}>
                    {isEditingValue ? (
                      <Input
                        type="number"
                        step={config.step}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => { updateMutation.mutate({ key: config.key, value: editValue, label: currentLabel }); setEditingCell(null); }}
                        onKeyDown={(e) => e.key === "Enter" && (updateMutation.mutate({ key: config.key, value: editValue, label: currentLabel }), setEditingCell(null))}
                        autoFocus
                        className="h-6 text-sm border-0 p-0 focus-visible:ring-0 text-center"
                      />
                    ) : (
                      <span className="block w-full cursor-text text-center" onClick={() => { setEditingCell({ key: config.key, field: "value" }); setEditValue(currentValue); }}>{currentValue}{config.suffix}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CitiesTable() {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: cities = [], isLoading } = useQuery<CatalogCity[]>({ queryKey: ["/api/catalog/cities"] });

  const createMutation = useMutation({
    mutationFn: () => {
      const nextOrder = cities.length > 0 ? Math.max(...cities.map(c => c.order ?? 0)) + 1 : 1;
      let baseName = "Nueva Ciudad";
      let counter = 1;
      let uniqueName = baseName;
      while (cities.some(c => c.name === uniqueName)) {
        counter++;
        uniqueName = `${baseName} ${counter}`;
      }
      return apiRequest("POST", "/api/catalog/cities", { name: uniqueName, active: true, order: nextOrder });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/catalog/cities"] }); toast({ title: "Ciudad creada" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CatalogCity> }) => apiRequest("PUT", `/api/catalog/cities/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/catalog/cities"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/catalog/cities/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/catalog/cities"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/zones"] }); toast({ title: "Ciudad eliminada" }); setDeleteId(null); },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden" data-testid="catalog-cities-table">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">{cities.length} Ciudades</span>
        </div>
        <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending} data-testid="button-add-city">
          <Plus className="w-4 h-4 mr-1" />Agregar
        </Button>
      </div>
      <div className="overflow-auto max-h-[600px]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={HEADER_STYLE} style={{ width: "50px" }}>#</th>
              <th className={HEADER_STYLE} style={{ width: "70px" }}>Activo</th>
              <th className={HEADER_STYLE} style={{ minWidth: "200px" }}>Nombre</th>
              <th className={HEADER_STYLE} style={{ width: "90px" }}>ISAI %</th>
              <th className={HEADER_STYLE} style={{ width: "90px" }}>Notaría %</th>
              <th className={HEADER_STYLE} style={{ width: "70px" }}>Orden</th>
              <th className={HEADER_STYLE} style={{ width: "50px" }}></th>
            </tr>
          </thead>
          <tbody>
            {cities.map((city, idx) => (
              <tr key={city.id} data-testid={`row-city-${city.id}`}>
                <td className={getCellStyle({ type: "index" })}>{idx + 1}</td>
                <td className={getCellStyle({ type: "checkbox" })} onClick={() => updateMutation.mutate({ id: city.id, data: { active: !city.active } })}>
                  <div className="flex justify-center">
                    <input type="checkbox" checked={city.active ?? false} readOnly className="w-4 h-4 cursor-pointer" />
                  </div>
                </td>
                <td className={getCellStyle({ type: "input", isEditing: editingCell?.id === city.id && editingCell?.field === "name" })}>
                  {editingCell?.id === city.id && editingCell?.field === "name" ? (
                    <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => { updateMutation.mutate({ id: city.id, data: { name: editValue } }); setEditingCell(null); }} onKeyDown={(e) => e.key === "Enter" && (updateMutation.mutate({ id: city.id, data: { name: editValue } }), setEditingCell(null))} autoFocus className="h-6 text-sm border-0 p-0 focus-visible:ring-0" />
                  ) : (
                    <span className="block w-full cursor-text" onClick={() => { setEditingCell({ id: city.id, field: "name" }); setEditValue(city.name); }}>{city.name || ""}</span>
                  )}
                </td>
                <td className={getCellStyle({ type: "input", isEditing: editingCell?.id === city.id && editingCell?.field === "isaiPercent" })}>
                  {editingCell?.id === city.id && editingCell?.field === "isaiPercent" ? (
                    <Input type="number" step="0.01" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => { updateMutation.mutate({ id: city.id, data: { isaiPercent: editValue } }); setEditingCell(null); }} onKeyDown={(e) => e.key === "Enter" && (updateMutation.mutate({ id: city.id, data: { isaiPercent: editValue } }), setEditingCell(null))} autoFocus className="h-6 text-sm border-0 p-0 focus-visible:ring-0 text-center" />
                  ) : (
                    <span className="block w-full cursor-text text-center" onClick={() => { setEditingCell({ id: city.id, field: "isaiPercent" }); setEditValue(city.isaiPercent ?? "3.0"); }}>{city.isaiPercent ?? "3.0"}%</span>
                  )}
                </td>
                <td className={getCellStyle({ type: "input", isEditing: editingCell?.id === city.id && editingCell?.field === "notariaPercent" })}>
                  {editingCell?.id === city.id && editingCell?.field === "notariaPercent" ? (
                    <Input type="number" step="0.01" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => { updateMutation.mutate({ id: city.id, data: { notariaPercent: editValue } }); setEditingCell(null); }} onKeyDown={(e) => e.key === "Enter" && (updateMutation.mutate({ id: city.id, data: { notariaPercent: editValue } }), setEditingCell(null))} autoFocus className="h-6 text-sm border-0 p-0 focus-visible:ring-0 text-center" />
                  ) : (
                    <span className="block w-full cursor-text text-center" onClick={() => { setEditingCell({ id: city.id, field: "notariaPercent" }); setEditValue(city.notariaPercent ?? "2.0"); }}>{city.notariaPercent ?? "2.0"}%</span>
                  )}
                </td>
                <td className={getCellStyle({ type: "input", isEditing: editingCell?.id === city.id && editingCell?.field === "order" })}>
                  {editingCell?.id === city.id && editingCell?.field === "order" ? (
                    <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => { updateMutation.mutate({ id: city.id, data: { order: parseInt(editValue) || 0 } }); setEditingCell(null); }} autoFocus className="h-6 text-sm border-0 p-0 focus-visible:ring-0 text-center" />
                  ) : (
                    <span className="block w-full cursor-text text-center" onClick={() => { setEditingCell({ id: city.id, field: "order" }); setEditValue(String(city.order ?? 0)); }}>{city.order ?? 0}</span>
                  )}
                </td>
                <td className={getCellStyle({ type: "actions" })}>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteId(city.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Eliminar ciudad</AlertDialogTitle><AlertDialogDescription>Esta acción también eliminará todas las zonas asociadas.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</AlertDialogAction></AlertDialogFooter>
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
  const [filterCityId, setFilterCityId] = useState<string>("all");

  const { data: cities = [] } = useQuery<CatalogCity[]>({ queryKey: ["/api/catalog/cities"] });
  const { data: zones = [], isLoading } = useQuery<CatalogZone[]>({ queryKey: ["/api/catalog/zones"] });

  const filteredZones = filterCityId === "all" ? zones : zones.filter(z => z.cityId === filterCityId);

  const createMutation = useMutation({
    mutationFn: () => {
      const nextOrder = zones.length > 0 ? Math.max(...zones.map(z => z.order ?? 0)) + 1 : 1;
      let baseName = "Nueva Zona";
      let counter = 1;
      let uniqueName = baseName;
      while (zones.some(z => z.name === uniqueName)) {
        counter++;
        uniqueName = `${baseName} ${counter}`;
      }
      return apiRequest("POST", "/api/catalog/zones", { name: uniqueName, active: true, order: nextOrder, cityId: filterCityId !== "all" ? filterCityId : cities[0]?.id });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/catalog/zones"] }); toast({ title: "Zona creada" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CatalogZone> }) => apiRequest("PUT", `/api/catalog/zones/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/catalog/zones"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/catalog/zones/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/catalog/zones"] }); toast({ title: "Zona eliminada" }); setDeleteId(null); },
  });

  const getCityName = (cityId: string | null) => cities.find(c => c.id === cityId)?.name || "";

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden" data-testid="catalog-zones-table">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">{filteredZones.length} Zonas</span>
          <Select value={filterCityId} onValueChange={setFilterCityId}>
            <SelectTrigger className="w-36 h-7 text-xs"><SelectValue placeholder="Filtrar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || cities.length === 0}><Plus className="w-4 h-4 mr-1" />Agregar</Button>
      </div>
      <div className="overflow-auto max-h-[600px]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={HEADER_STYLE} style={{ width: "50px" }}>#</th>
              <th className={HEADER_STYLE} style={{ width: "70px" }}>Activo</th>
              <th className={HEADER_STYLE} style={{ minWidth: "180px" }}>Nombre</th>
              <th className={HEADER_STYLE} style={{ width: "140px" }}>Ciudad</th>
              <th className={HEADER_STYLE} style={{ width: "70px" }}>Orden</th>
              <th className={HEADER_STYLE} style={{ width: "50px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredZones.map((zone, idx) => (
              <tr key={zone.id}>
                <td className={getCellStyle({ type: "index" })}>{idx + 1}</td>
                <td className={getCellStyle({ type: "checkbox" })} onClick={() => updateMutation.mutate({ id: zone.id, data: { active: !zone.active } })}>
                  <div className="flex justify-center"><input type="checkbox" checked={zone.active ?? false} readOnly className="w-4 h-4 cursor-pointer" /></div>
                </td>
                <td className={getCellStyle({ type: "input", isEditing: editingCell?.id === zone.id && editingCell?.field === "name" })}>
                  {editingCell?.id === zone.id && editingCell?.field === "name" ? (
                    <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => { updateMutation.mutate({ id: zone.id, data: { name: editValue } }); setEditingCell(null); }} autoFocus className="h-6 text-sm border-0 p-0 focus-visible:ring-0" />
                  ) : (
                    <span className="block w-full cursor-text" onClick={() => { setEditingCell({ id: zone.id, field: "name" }); setEditValue(zone.name); }}>{zone.name || ""}</span>
                  )}
                </td>
                <td className={getCellStyle({ type: "dropdown" })}>
                  <Select value={zone.cityId || ""} onValueChange={(v) => updateMutation.mutate({ id: zone.id, data: { cityId: v } })}>
                    <SelectTrigger className="h-6 w-full text-xs border-0 bg-transparent"><SelectValue>{getCityName(zone.cityId)}</SelectValue></SelectTrigger>
                    <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className={getCellStyle({ type: "input", isEditing: editingCell?.id === zone.id && editingCell?.field === "order" })}>
                  {editingCell?.id === zone.id && editingCell?.field === "order" ? (
                    <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => { updateMutation.mutate({ id: zone.id, data: { order: parseInt(editValue) || 0 } }); setEditingCell(null); }} autoFocus className="h-6 text-sm border-0 p-0 focus-visible:ring-0 text-center" />
                  ) : (
                    <span className="block w-full cursor-text text-center" onClick={() => { setEditingCell({ id: zone.id, field: "order" }); setEditValue(String(zone.order ?? 0)); }}>{zone.order ?? 0}</span>
                  )}
                </td>
                <td className={getCellStyle({ type: "actions" })}><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteId(zone.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar zona</AlertDialogTitle><AlertDialogDescription>¿Estás seguro?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ExcelTable({ title, endpoint, queryKey, hasIcon = false, icon: IconComponent }: { title: string; endpoint: string; queryKey: string; hasIcon?: boolean; icon?: React.ComponentType<{ className?: string }> }) {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery<CatalogItem[]>({ queryKey: [queryKey] });

  const createMutation = useMutation({
    mutationFn: () => {
      const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.order ?? 0)) + 1 : 1;
      return apiRequest("POST", endpoint, { name: "Nuevo", active: true, order: nextOrder });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [queryKey] }); toast({ title: `${title} creado` }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CatalogItem> }) => apiRequest("PUT", `${endpoint}/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `${endpoint}/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [queryKey] }); toast({ title: `${title} eliminado` }); setDeleteId(null); },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
        <div className="flex items-center gap-2">
          {IconComponent && <IconComponent className="w-4 h-4 text-primary" />}
          <span className="font-medium text-sm">{items.length} {title}</span>
        </div>
        <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}><Plus className="w-4 h-4 mr-1" />Agregar</Button>
      </div>
      <div className="overflow-auto max-h-[600px]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={HEADER_STYLE} style={{ width: "50px" }}>#</th>
              <th className={HEADER_STYLE} style={{ width: "70px" }}>Activo</th>
              <th className={HEADER_STYLE} style={{ minWidth: "200px" }}>Nombre</th>
              {hasIcon && <th className={HEADER_STYLE} style={{ width: "100px" }}>Icono</th>}
              <th className={HEADER_STYLE} style={{ width: "70px" }}>Orden</th>
              <th className={HEADER_STYLE} style={{ width: "50px" }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id}>
                <td className={getCellStyle({ type: "index" })}>{idx + 1}</td>
                <td className={getCellStyle({ type: "checkbox" })} onClick={() => updateMutation.mutate({ id: item.id, data: { active: !item.active } })}>
                  <div className="flex justify-center"><input type="checkbox" checked={item.active ?? false} readOnly className="w-4 h-4 cursor-pointer" /></div>
                </td>
                <td className={getCellStyle({ type: "input", isEditing: editingCell?.id === item.id && editingCell?.field === "name" })}>
                  {editingCell?.id === item.id && editingCell?.field === "name" ? (
                    <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => { updateMutation.mutate({ id: item.id, data: { name: editValue } }); setEditingCell(null); }} autoFocus className="h-6 text-sm border-0 p-0 focus-visible:ring-0" />
                  ) : (
                    <span className="block w-full cursor-text" onClick={() => { setEditingCell({ id: item.id, field: "name" }); setEditValue(item.name); }}>{item.name || ""}</span>
                  )}
                </td>
                {hasIcon && (
                  <td className={getCellStyle({ type: "input", isEditing: editingCell?.id === item.id && editingCell?.field === "icon" })}>
                    {editingCell?.id === item.id && editingCell?.field === "icon" ? (
                      <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => { updateMutation.mutate({ id: item.id, data: { icon: editValue } as any }); setEditingCell(null); }} autoFocus className="h-6 text-sm border-0 p-0 focus-visible:ring-0" />
                    ) : (
                      <span className="block w-full cursor-text text-muted-foreground" onClick={() => { setEditingCell({ id: item.id, field: "icon" }); setEditValue((item as any).icon || ""); }}>{(item as any).icon || ""}</span>
                    )}
                  </td>
                )}
                <td className={getCellStyle({ type: "input", isEditing: editingCell?.id === item.id && editingCell?.field === "order" })}>
                  {editingCell?.id === item.id && editingCell?.field === "order" ? (
                    <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => { updateMutation.mutate({ id: item.id, data: { order: parseInt(editValue) || 0 } }); setEditingCell(null); }} autoFocus className="h-6 text-sm border-0 p-0 focus-visible:ring-0 text-center" />
                  ) : (
                    <span className="block w-full cursor-text text-center" onClick={() => { setEditingCell({ id: item.id, field: "order" }); setEditValue(String(item.order ?? 0)); }}>{item.order ?? 0}</span>
                  )}
                </td>
                <td className={getCellStyle({ type: "actions" })}><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteId(item.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar</AlertDialogTitle><AlertDialogDescription>¿Estás seguro?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ColoredExcelTable({ title, endpoint, queryKey, icon: IconComponent }: { title: string; endpoint: string; queryKey: string; icon?: React.ComponentType<{ className?: string }> }) {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery<CatalogItem[]>({ queryKey: [queryKey] });

  const createMutation = useMutation({
    mutationFn: () => {
      const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.order ?? 0)) + 1 : 1;
      return apiRequest("POST", endpoint, { name: "Nuevo", active: true, color: "#6366f1", order: nextOrder });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [queryKey] }); toast({ title: `${title} creado` }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CatalogItem> }) => apiRequest("PUT", `${endpoint}/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `${endpoint}/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [queryKey] }); toast({ title: `${title} eliminado` }); setDeleteId(null); },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
        <div className="flex items-center gap-2">
          {IconComponent && <IconComponent className="w-4 h-4 text-primary" />}
          <span className="font-medium text-sm">{items.length} {title}</span>
        </div>
        <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}><Plus className="w-4 h-4 mr-1" />Agregar</Button>
      </div>
      <div className="overflow-auto max-h-[600px]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={HEADER_STYLE} style={{ width: "50px" }}>#</th>
              <th className={HEADER_STYLE} style={{ width: "70px" }}>Activo</th>
              <th className={HEADER_STYLE} style={{ minWidth: "180px" }}>Nombre</th>
              <th className={HEADER_STYLE} style={{ width: "70px" }}>Color</th>
              <th className={HEADER_STYLE} style={{ width: "140px" }}>Vista Previa</th>
              <th className={HEADER_STYLE} style={{ width: "70px" }}>Orden</th>
              <th className={HEADER_STYLE} style={{ width: "50px" }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id}>
                <td className={getCellStyle({ type: "index" })}>{idx + 1}</td>
                <td className={getCellStyle({ type: "checkbox" })} onClick={() => updateMutation.mutate({ id: item.id, data: { active: !item.active } })}>
                  <div className="flex justify-center"><input type="checkbox" checked={item.active ?? false} readOnly className="w-4 h-4 cursor-pointer" /></div>
                </td>
                <td className={getCellStyle({ type: "input", isEditing: editingCell?.id === item.id && editingCell?.field === "name" })}>
                  {editingCell?.id === item.id && editingCell?.field === "name" ? (
                    <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => { updateMutation.mutate({ id: item.id, data: { name: editValue } }); setEditingCell(null); }} autoFocus className="h-6 text-sm border-0 p-0 focus-visible:ring-0" />
                  ) : (
                    <span className="block w-full cursor-text" onClick={() => { setEditingCell({ id: item.id, field: "name" }); setEditValue(item.name); }}>{item.name || ""}</span>
                  )}
                </td>
                <td className={getCellStyle({ type: "input" })}>
                  <div className="flex justify-center">
                    <input type="color" value={item.color || "#6366f1"} onChange={(e) => updateMutation.mutate({ id: item.id, data: { color: e.target.value } })} className="w-7 h-6 rounded cursor-pointer border-0 p-0" />
                  </div>
                </td>
                <td className={getCellStyle({ type: "readonly" })}>
                  <div className="flex justify-center">
                    <Badge style={{ backgroundColor: `${item.color || "#6366f1"}20`, color: item.color || "#6366f1", borderColor: item.color || "#6366f1" }} className="border text-xs">{item.name || "Ejemplo"}</Badge>
                  </div>
                </td>
                <td className={getCellStyle({ type: "input", isEditing: editingCell?.id === item.id && editingCell?.field === "order" })}>
                  {editingCell?.id === item.id && editingCell?.field === "order" ? (
                    <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => { updateMutation.mutate({ id: item.id, data: { order: parseInt(editValue) || 0 } }); setEditingCell(null); }} autoFocus className="h-6 text-sm border-0 p-0 focus-visible:ring-0 text-center" />
                  ) : (
                    <span className="block w-full cursor-text text-center" onClick={() => { setEditingCell({ id: item.id, field: "order" }); setEditValue(String(item.order ?? 0)); }}>{item.order ?? 0}</span>
                  )}
                </td>
                <td className={getCellStyle({ type: "actions" })}><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteId(item.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar</AlertDialogTitle><AlertDialogDescription>¿Estás seguro?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</AlertDialogAction></AlertDialogFooter>
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
    mutationFn: () => {
      const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.order ?? 0)) + 1 : 1;
      return apiRequest("POST", "/api/catalog/nivel-mantenimiento", { name: "Nuevo", valor: 50, active: true, order: nextOrder });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/catalog/nivel-mantenimiento"] }); toast({ title: "Nivel creado" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CatalogItem> }) => apiRequest("PUT", `/api/catalog/nivel-mantenimiento/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/catalog/nivel-mantenimiento"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/catalog/nivel-mantenimiento/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/catalog/nivel-mantenimiento"] }); toast({ title: "Nivel eliminado" }); setDeleteId(null); },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">{items.length} Niveles de Mantenimiento</span>
        </div>
        <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}><Plus className="w-4 h-4 mr-1" />Agregar</Button>
      </div>
      <div className="overflow-auto max-h-[600px]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={HEADER_STYLE} style={{ width: "50px" }}>#</th>
              <th className={HEADER_STYLE} style={{ width: "70px" }}>Activo</th>
              <th className={HEADER_STYLE} style={{ minWidth: "120px" }}>Nombre</th>
              <th className={HEADER_STYLE} style={{ width: "100px" }}>Valor ($/m²)</th>
              <th className={HEADER_STYLE} style={{ width: "70px" }}>Orden</th>
              <th className={HEADER_STYLE} style={{ width: "50px" }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id}>
                <td className={getCellStyle({ type: "index" })}>{idx + 1}</td>
                <td className={getCellStyle({ type: "checkbox" })} onClick={() => updateMutation.mutate({ id: item.id, data: { active: !item.active } })}>
                  <div className="flex justify-center"><input type="checkbox" checked={item.active ?? false} readOnly className="w-4 h-4 cursor-pointer" /></div>
                </td>
                <td className={getCellStyle({ type: "input", isEditing: editingCell?.id === item.id && editingCell?.field === "name" })}>
                  {editingCell?.id === item.id && editingCell?.field === "name" ? (
                    <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => { updateMutation.mutate({ id: item.id, data: { name: editValue } }); setEditingCell(null); }} autoFocus className="h-6 text-sm border-0 p-0 focus-visible:ring-0 font-medium" />
                  ) : (
                    <span className="block w-full cursor-text font-medium" onClick={() => { setEditingCell({ id: item.id, field: "name" }); setEditValue(item.name); }}>{item.name || ""}</span>
                  )}
                </td>
                <td className={getCellStyle({ type: "input", isEditing: editingCell?.id === item.id && editingCell?.field === "valor" })}>
                  {editingCell?.id === item.id && editingCell?.field === "valor" ? (
                    <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => { updateMutation.mutate({ id: item.id, data: { valor: parseInt(editValue) || 0 } }); setEditingCell(null); }} autoFocus className="h-6 text-sm border-0 p-0 focus-visible:ring-0 text-center" />
                  ) : (
                    <span className="block w-full cursor-text text-center" onClick={() => { setEditingCell({ id: item.id, field: "valor" }); setEditValue(String(item.valor ?? 0)); }}>${item.valor ?? 0}</span>
                  )}
                </td>
                <td className={getCellStyle({ type: "input", isEditing: editingCell?.id === item.id && editingCell?.field === "order" })}>
                  {editingCell?.id === item.id && editingCell?.field === "order" ? (
                    <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => { updateMutation.mutate({ id: item.id, data: { order: parseInt(editValue) || 0 } }); setEditingCell(null); }} autoFocus className="h-6 text-sm border-0 p-0 focus-visible:ring-0 text-center" />
                  ) : (
                    <span className="block w-full cursor-text text-center" onClick={() => { setEditingCell({ id: item.id, field: "order" }); setEditValue(String(item.order ?? 0)); }}>{item.order ?? 0}</span>
                  )}
                </td>
                <td className={getCellStyle({ type: "actions" })}><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteId(item.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar</AlertDialogTitle><AlertDialogDescription>¿Estás seguro?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
