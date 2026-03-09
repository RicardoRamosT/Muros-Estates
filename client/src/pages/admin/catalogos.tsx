import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Database, Plus, Trash2, Loader2, MapPin, Building, Sparkles, Activity, CreditCard, ThumbsUp, ThumbsDown, UserCircle, Target, Users, DoorOpen, Bath, Car, Wrench, Paintbrush, LayoutGrid, Tag, FileText, Scale, Presentation, Factory, Pencil, Package, ToggleLeft, ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCellStyle } from "@/lib/spreadsheet-utils";
import type { CatalogCity, CatalogZone, CatalogAviso } from "@shared/schema";

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

const SECTION_HEADER = "text-white text-sm font-bold px-3 py-1.5 bg-[rgb(11,120,180)] uppercase tracking-wide";
const CARD_HEADER = "flex items-center justify-between px-2 py-1 bg-[rgb(13,149,225)] text-white";
const TH = "sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 border-r border-b border-gray-300 dark:border-gray-600 font-semibold text-[10px] uppercase tracking-wide px-1.5 py-1 text-center whitespace-nowrap";
const ROW_HEIGHT = 24;
const VISIBLE_ROWS = 5;
const BODY_HEIGHT = `${ROW_HEIGHT * VISIBLE_ROWS}px`;
const BODY_HEIGHT_WITH_HEADER = `${ROW_HEIGHT * (VISIBLE_ROWS + 1)}px`;

function CollapsibleSection({ title, testId, children }: { title: string; testId: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <section>
      <button
        className={`${SECTION_HEADER} w-full flex items-center gap-2 cursor-pointer select-none`}
        onClick={() => setCollapsed(!collapsed)}
        data-testid={testId}
      >
        {collapsed ? <ChevronRight className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
        <span>{title}</span>
      </button>
      {!collapsed && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 mt-2">
          {children}
        </div>
      )}
    </section>
  );
}

export default function AdminCatalogos() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-between px-3 py-1.5 border-b">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-bold" data-testid="text-page-title">Catálogos</h1>
        </div>
      </div>
      <main className="px-4 py-3">
        <div className="space-y-4">
          <CollapsibleSection title="GENERAL" testId="section-general">
            <CompactList title="Tipos de Desarrollos" endpoint="/api/catalog/development-types" queryKey="/api/catalog/development-types" ordered />
            <CompactList title="Tipo de Contrato" endpoint="/api/catalog/tipo-contrato" queryKey="/api/catalog/tipo-contrato" ordered />
            <CompactList title="Presentación" endpoint="/api/catalog/presentacion" queryKey="/api/catalog/presentacion" ordered />
            <CompactList title="Tipo de Proveedor" endpoint="/api/catalog/tipo-proveedor" queryKey="/api/catalog/tipo-proveedor" ordered />
            <GlobalRatesMini />
            <CitiesMini />
            <ZonesMini />
            <AvisosMini />
          </CollapsibleSection>

          <CollapsibleSection title="DESARROLLOS" testId="section-desarrollos">
            <CompactList title="Recámaras" endpoint="/api/catalog/recamaras" queryKey="/api/catalog/recamaras" ordered />
            <CompactList title="Baños" endpoint="/api/catalog/banos" queryKey="/api/catalog/banos" ordered />
            <CompactList title="Áreas" endpoint="/api/catalog/areas" queryKey="/api/catalog/areas" ordered />
            <CompactList title="Cajones" endpoint="/api/catalog/cajones" queryKey="/api/catalog/cajones" ordered />
            <CompactList title="Incluye" endpoint="/api/catalog/incluye" queryKey="/api/catalog/incluye" ordered />
            <CompactList title="Amenidades" endpoint="/api/catalog/amenities" queryKey="/api/catalog/amenities" ordered />
            <CompactList title="Como Se Entregan" endpoint="/api/catalog/acabados" queryKey="/api/catalog/acabados" ordered />
            <CompactList title="Eficiencia" endpoint="/api/catalog/efficiency-features" queryKey="/api/catalog/efficiency-features" ordered />
            <CompactList title="Seguridad" endpoint="/api/catalog/other-features" queryKey="/api/catalog/other-features" ordered />
            <NivelMini />
          </CollapsibleSection>

          <CollapsibleSection title="PROSPECTOS Y CLIENTES" testId="section-prospectos">
            <ColoredList title="Tipo" endpoint="/api/catalog/tipo-cliente" queryKey="/api/catalog/tipo-cliente" ordered />
            <ColoredList title="Perfil" endpoint="/api/catalog/perfil" queryKey="/api/catalog/perfil" ordered />
            <ColoredList title="Fuente" endpoint="/api/catalog/fuente" queryKey="/api/catalog/fuente" ordered />
            <CompactList title="Asesor Externo" endpoint="/api/catalog/broker-externo" queryKey="/api/catalog/broker-externo" ordered />
            <ColoredList title="Estatus" endpoint="/api/catalog/status-prospecto" queryKey="/api/catalog/status-prospecto" ordered />
            <ColoredList title="Etapa" endpoint="/api/catalog/etapa-embudo" queryKey="/api/catalog/etapa-embudo" ordered />
            <CompactList title="Como Paga" endpoint="/api/catalog/como-paga" queryKey="/api/catalog/como-paga" ordered />
            <CompactList title="Positivos" endpoint="/api/catalog/positivos" queryKey="/api/catalog/positivos" ordered />
            <CompactList title="Negativos" endpoint="/api/catalog/negativos" queryKey="/api/catalog/negativos" ordered />
            <ColoredList title="Etapa Clientes" endpoint="/api/catalog/etapa-clientes" queryKey="/api/catalog/etapa-clientes" ordered />
          </CollapsibleSection>
        </div>
      </main>
    </div>
  );
}

function CompactList({ title, endpoint, queryKey, ordered = false }: { title: string; endpoint: string; queryKey: string; ordered?: boolean }) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: rawItems = [], isLoading } = useQuery<CatalogItem[]>({ queryKey: [queryKey] });
  const items = ordered
    ? [...rawItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [...rawItems].sort((a, b) => a.name.localeCompare(b.name, "es"));

  const createMutation = useMutation({
    mutationFn: () => {
      const nextOrder = rawItems.length > 0 ? Math.max(...rawItems.map(i => i.order ?? 0)) + 1 : 1;
      return apiRequest("POST", endpoint, { name: "Nuevo", active: true, order: nextOrder });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [queryKey] }); toast({ title: `${title} creado` }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CatalogItem> }) => apiRequest("PUT", `${endpoint}/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });

  const swapMutation = useMutation({
    mutationFn: async ({ idA, orderA, idB, orderB }: { idA: string; orderA: number; idB: string; orderB: number }) => {
      await Promise.all([
        apiRequest("PUT", `${endpoint}/${idA}`, { order: orderA }),
        apiRequest("PUT", `${endpoint}/${idB}`, { order: orderB }),
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `${endpoint}/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [queryKey] }); toast({ title: `Eliminado` }); setDeleteId(null); },
  });

  const swapOrder = (idx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const a = items[idx];
    const b = items[targetIdx];
    swapMutation.mutate({ idA: a.id, orderA: b.order ?? targetIdx + 1, idB: b.id, orderB: a.order ?? idx + 1 });
  };

  return (
    <div className="border border-gray-300 dark:border-gray-600 overflow-hidden flex flex-col" data-testid={`catalog-${queryKey.split('/').pop()}`}>
      <div className={CARD_HEADER}>
        <span className="font-semibold text-xs uppercase tracking-wide truncate" title={title}>{title}</span>
        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-white/80" onClick={() => createMutation.mutate()} disabled={createMutation.isPending} data-testid={`button-add-${queryKey.split('/').pop()}`}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      <div className="overflow-auto" style={{ height: BODY_HEIGHT }}>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-3">Sin datos</div>
        ) : (
          <table className="w-full border-collapse text-xs">
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className="group border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  {ordered && (
                    <td className="w-7 text-center text-muted-foreground border-r border-gray-200 dark:border-gray-700 py-0.5 bg-gray-50 dark:bg-gray-800/50">{idx + 1}</td>
                  )}
                  <td className="px-1.5 py-0.5 max-w-0">
                    {editingId === item.id ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => { updateMutation.mutate({ id: item.id, data: { name: editValue } }); setEditingId(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { updateMutation.mutate({ id: item.id, data: { name: editValue } }); setEditingId(null); } if (e.key === "Escape") setEditingId(null); }}
                        autoFocus
                        className="h-5 text-xs border-0 p-0 focus-visible:ring-0"
                      />
                    ) : (
                      <span
                        className="block w-full cursor-text truncate"
                        title={item.name}
                        onClick={() => { setEditingId(item.id); setEditValue(item.name); }}
                      >{item.name}</span>
                    )}
                  </td>
                  {ordered && (
                    <td className="w-10 text-center whitespace-nowrap">
                      <button className="inline-flex p-0 border-0 bg-transparent cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-default" disabled={idx === 0} onClick={() => swapOrder(idx, "up")}>
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button className="inline-flex p-0 border-0 bg-transparent cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-default" disabled={idx === items.length - 1} onClick={() => swapOrder(idx, "down")}>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </td>
                  )}
                  <td className="w-6 text-center">
                    <button className="text-red-400 hover:text-red-600" onClick={() => setDeleteId(item.id)} data-testid={`button-delete-${item.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar</AlertDialogTitle><AlertDialogDescription>¿Estás seguro de eliminar este elemento?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ColoredList({ title, endpoint, queryKey, ordered = false }: { title: string; endpoint: string; queryKey: string; ordered?: boolean }) {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: rawItems = [], isLoading } = useQuery<CatalogItem[]>({ queryKey: [queryKey] });
  const items = ordered
    ? [...rawItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [...rawItems].sort((a, b) => a.name.localeCompare(b.name, "es"));

  const createMutation = useMutation({
    mutationFn: () => {
      const nextOrder = rawItems.length > 0 ? Math.max(...rawItems.map(i => i.order ?? 0)) + 1 : 1;
      return apiRequest("POST", endpoint, { name: "Nuevo", active: true, color: "#6366f1", order: nextOrder });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [queryKey] }); toast({ title: `${title} creado` }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CatalogItem> }) => apiRequest("PUT", `${endpoint}/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });

  const swapMutation = useMutation({
    mutationFn: async ({ idA, orderA, idB, orderB }: { idA: string; orderA: number; idB: string; orderB: number }) => {
      await Promise.all([
        apiRequest("PUT", `${endpoint}/${idA}`, { order: orderA }),
        apiRequest("PUT", `${endpoint}/${idB}`, { order: orderB }),
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `${endpoint}/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [queryKey] }); toast({ title: `Eliminado` }); setDeleteId(null); },
  });

  const swapOrder = (idx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const a = items[idx];
    const b = items[targetIdx];
    swapMutation.mutate({ idA: a.id, orderA: b.order ?? targetIdx + 1, idB: b.id, orderB: a.order ?? idx + 1 });
  };

  return (
    <div className="border border-gray-300 dark:border-gray-600 overflow-hidden flex flex-col" data-testid={`catalog-${queryKey.split('/').pop()}`}>
      <div className={CARD_HEADER}>
        <span className="font-semibold text-xs uppercase tracking-wide truncate" title={title}>{title}</span>
        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-white/80" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      <div className="overflow-auto" style={{ height: BODY_HEIGHT }}>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-3">Sin datos</div>
        ) : (
          <table className="w-full border-collapse text-xs">
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className="group border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  {ordered && (
                    <td className="w-7 text-center text-muted-foreground border-r border-gray-200 dark:border-gray-700 py-0.5 bg-gray-50 dark:bg-gray-800/50">{idx + 1}</td>
                  )}
                  <td className="w-8 text-center py-0.5 border-r border-gray-200 dark:border-gray-700">
                    <input type="color" defaultValue={item.color || "#6366f1"} onChange={(e) => updateMutation.mutate({ id: item.id, data: { color: e.target.value } })} className="w-5 h-4 cursor-pointer border-0 p-0" />
                  </td>
                  <td className="px-1.5 py-0.5 max-w-0">
                    {editingCell?.id === item.id && editingCell?.field === "name" ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => { updateMutation.mutate({ id: item.id, data: { name: editValue } }); setEditingCell(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { updateMutation.mutate({ id: item.id, data: { name: editValue } }); setEditingCell(null); } if (e.key === "Escape") setEditingCell(null); }}
                        autoFocus
                        className="h-5 text-xs border-0 p-0 focus-visible:ring-0"
                      />
                    ) : (
                      <span className="block w-full cursor-text truncate" title={item.name} onClick={() => { setEditingCell({ id: item.id, field: "name" }); setEditValue(item.name); }}>{item.name}</span>
                    )}
                  </td>
                  {ordered && (
                    <td className="w-10 text-center whitespace-nowrap">
                      <button className="inline-flex p-0 border-0 bg-transparent cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-default" disabled={idx === 0} onClick={() => swapOrder(idx, "up")}>
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button className="inline-flex p-0 border-0 bg-transparent cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-default" disabled={idx === items.length - 1} onClick={() => swapOrder(idx, "down")}>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </td>
                  )}
                  <td className="w-6 text-center">
                    <button className="text-red-400 hover:text-red-600" onClick={() => setDeleteId(item.id)}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar</AlertDialogTitle><AlertDialogDescription>¿Estás seguro de eliminar este elemento?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CitiesMini() {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: rawCities = [], isLoading } = useQuery<CatalogCity[]>({ queryKey: ["/api/catalog/cities"] });
  const cities = [...rawCities].sort((a, b) => a.name.localeCompare(b.name, "es"));

  const createMutation = useMutation({
    mutationFn: () => {
      const nextOrder = rawCities.length > 0 ? Math.max(...rawCities.map(c => c.order ?? 0)) + 1 : 1;
      return apiRequest("POST", "/api/catalog/cities", { name: "Nueva Ciudad", active: true, order: nextOrder });
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

  return (
    <div className="border border-gray-300 dark:border-gray-600 overflow-hidden flex flex-col" data-testid="catalog-cities">
      <div className={CARD_HEADER}>
        <span className="font-semibold text-xs uppercase tracking-wide truncate" title="Ciudades">Ciudades</span>
        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-white/80" onClick={() => createMutation.mutate()} disabled={createMutation.isPending} data-testid="button-add-city">
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      <div className="overflow-auto" style={{ height: BODY_HEIGHT_WITH_HEADER }}>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className={TH}>Ciudad</th>
                <th className={TH} style={{ width: "55px" }}>ISAI</th>
                <th className={TH} style={{ width: "65px" }}>Notario</th>
                <th className={TH} style={{ width: "24px" }}></th>
              </tr>
            </thead>
            <tbody>
              {cities.map((city) => (
                <tr key={city.id} className="border-b border-gray-200 dark:border-gray-700">
                  <td className="px-1.5 py-0.5">
                    {editingCell?.id === city.id && editingCell?.field === "name" ? (
                      <Input value={editValue} onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => { updateMutation.mutate({ id: city.id, data: { name: editValue } }); setEditingCell(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { updateMutation.mutate({ id: city.id, data: { name: editValue } }); setEditingCell(null); } }}
                        autoFocus className="h-5 text-xs border-0 p-0 focus-visible:ring-0" />
                    ) : (
                      <span className="block cursor-text font-medium truncate" onClick={() => { setEditingCell({ id: city.id, field: "name" }); setEditValue(city.name); }}>{city.name}</span>
                    )}
                  </td>
                  <td className="text-center py-0.5 border-l border-gray-200 dark:border-gray-700">
                    {editingCell?.id === city.id && editingCell?.field === "isaiPercent" ? (
                      <Input type="number" step="0.1" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => { updateMutation.mutate({ id: city.id, data: { isaiPercent: editValue } }); setEditingCell(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { updateMutation.mutate({ id: city.id, data: { isaiPercent: editValue } }); setEditingCell(null); } }}
                        autoFocus className="h-5 text-xs border-0 p-0 focus-visible:ring-0 text-center w-12" />
                    ) : (
                      <span className="block cursor-text text-center" onClick={() => { setEditingCell({ id: city.id, field: "isaiPercent" }); setEditValue(city.isaiPercent ?? "3.0"); }}>{city.isaiPercent ?? "3.0"}%</span>
                    )}
                  </td>
                  <td className="text-center py-0.5 border-l border-gray-200 dark:border-gray-700">
                    {editingCell?.id === city.id && editingCell?.field === "notariaPercent" ? (
                      <Input type="number" step="0.1" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => { updateMutation.mutate({ id: city.id, data: { notariaPercent: editValue } }); setEditingCell(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { updateMutation.mutate({ id: city.id, data: { notariaPercent: editValue } }); setEditingCell(null); } }}
                        autoFocus className="h-5 text-xs border-0 p-0 focus-visible:ring-0 text-center w-12" />
                    ) : (
                      <span className="block cursor-text text-center" onClick={() => { setEditingCell({ id: city.id, field: "notariaPercent" }); setEditValue(city.notariaPercent ?? "2.5"); }}>{city.notariaPercent ?? "2.5"}%</span>
                    )}
                  </td>
                  <td className="w-6 text-center">
                    <button className="text-red-400 hover:text-red-600" onClick={() => setDeleteId(city.id)}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar ciudad</AlertDialogTitle><AlertDialogDescription>Esta acción también eliminará todas las zonas asociadas.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ZonesMini() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: cities = [] } = useQuery<CatalogCity[]>({ queryKey: ["/api/catalog/cities"] });
  const { data: rawZones = [], isLoading } = useQuery<CatalogZone[]>({ queryKey: ["/api/catalog/zones"] });
  const zones = [...rawZones].sort((a, b) => {
    if (!a.name && b.name) return 1;
    if (a.name && !b.name) return -1;
    if (!a.name && !b.name) return 0;
    return a.name.localeCompare(b.name, "es");
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const nextOrder = rawZones.length > 0 ? Math.max(...rawZones.map(z => z.order ?? 0)) + 1 : 1;
      return apiRequest("POST", "/api/catalog/zones", { name: "", active: true, order: nextOrder, cityId: null });
    },
    onSuccess: async (res) => {
      const newZone = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/catalog/zones"] });
      setEditingId(newZone.id);
      setEditValue("");
      toast({ title: "Zona creada" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/catalog/zones/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/catalog/zones"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/catalog/zones/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/catalog/zones"] }); toast({ title: "Zona eliminada" }); setDeleteId(null); },
  });

  const getCityName = (cityId: string | null | undefined) => {
    if (!cityId) return "";
    return cities.find(c => c.id === cityId)?.name || "";
  };

  return (
    <div className="border border-gray-300 dark:border-gray-600 overflow-hidden flex flex-col" data-testid="catalog-zones">
      <div className={CARD_HEADER}>
        <span className="font-semibold text-xs uppercase tracking-wide truncate" title="Zonas">Zonas</span>
        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-white/80" onClick={() => createMutation.mutate()} disabled={createMutation.isPending} data-testid="button-add-zone">
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      <div className="overflow-auto" style={{ height: BODY_HEIGHT_WITH_HEADER }}>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className={TH}>Ciudad</th>
                <th className={TH}>Zona</th>
                <th className={TH} style={{ width: "24px" }}></th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr key={zone.id} className="border-b border-gray-200 dark:border-gray-700">
                  <td className="px-1.5 py-0.5 border-r border-gray-200 dark:border-gray-700">
                    <Select value={zone.cityId || ""} onValueChange={(val) => updateMutation.mutate({ id: zone.id, data: { cityId: val } })}>
                      <SelectTrigger className="h-5 text-xs border-0 p-0 px-1 focus:ring-0 shadow-none bg-transparent [&_svg]:h-2.5 [&_svg]:w-2.5">
                        <span className="truncate">{getCityName(zone.cityId)}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-1.5 py-0.5">
                    {editingId === zone.id ? (
                      <Input value={editValue} onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => { updateMutation.mutate({ id: zone.id, data: { name: editValue } }); setEditingId(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { updateMutation.mutate({ id: zone.id, data: { name: editValue } }); setEditingId(null); } }}
                        autoFocus className="h-5 text-xs border-0 p-0 focus-visible:ring-0" />
                    ) : (
                      <span className="block cursor-text truncate min-h-[20px]" onClick={() => { setEditingId(zone.id); setEditValue(zone.name); }}>{zone.name || "\u00A0"}</span>
                    )}
                  </td>
                  <td className="w-6 text-center">
                    <button className="text-red-400 hover:text-red-600" onClick={() => setDeleteId(zone.id)}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar zona</AlertDialogTitle><AlertDialogDescription>¿Estás seguro?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GlobalRatesMini() {
  const { toast } = useToast();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: settings = [], isLoading } = useQuery<{ id: string; key: string; value: string; label: string | null }[]>({ queryKey: ["/api/global-settings"] });

  const updateMutation = useMutation({
    mutationFn: ({ key, value, label }: { key: string; value: string; label?: string }) =>
      apiRequest("PUT", `/api/global-settings/${key}`, { value, label }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/global-settings"] });
      toast({ title: "Actualizado" });
    },
  });

  const RATES = [
    { key: "mortgageInterestPercent", label: "Tasa Crédito", defaultValue: "10.5", suffix: "%" },
    { key: "mortgageYears", label: "Años Crédito", defaultValue: "15", suffix: "" },
    { key: "rentRatePercent", label: "Tasa INPC", defaultValue: "7.0", suffix: "%" },
    { key: "rentMonths", label: "Meses de Renta", defaultValue: "11", suffix: "" },
    { key: "appreciationRate", label: "Tasa de Plusvalía", defaultValue: "7.0", suffix: "%" },
  ];

  const getValue = (key: string, defaultValue: string) => {
    const s = settings.find(s => s.key === key);
    return s?.value ?? defaultValue;
  };

  return (
    <div className="border border-gray-300 dark:border-gray-600 overflow-hidden flex flex-col" data-testid="catalog-global-rates">
      <div className={CARD_HEADER}>
        <span className="font-semibold text-xs uppercase tracking-wide truncate" title="Parámetros de Rendimiento">Parámetros de Rendimiento</span>
        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-white/80 invisible" tabIndex={-1} aria-hidden>
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      <div className="overflow-auto" style={{ height: BODY_HEIGHT }}>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
        ) : (
          <table className="w-full border-collapse text-xs">
            <tbody>
              {RATES.map((rate) => {
                const currentValue = getValue(rate.key, rate.defaultValue);
                return (
                  <tr key={rate.key} className="border-b border-gray-200 dark:border-gray-700" style={{ height: `${ROW_HEIGHT}px` }}>
                    <td className="px-1.5 py-0.5">{rate.label}</td>
                    <td className="text-center py-0.5 border-l border-gray-200 dark:border-gray-700" style={{ width: "80px" }}>
                      {editingKey === rate.key ? (
                        <Input
                          type="number"
                          step="0.1"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => { updateMutation.mutate({ key: rate.key, value: editValue }); setEditingKey(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { updateMutation.mutate({ key: rate.key, value: editValue }); setEditingKey(null); } }}
                          autoFocus
                          className="h-5 text-xs border-0 p-0 focus-visible:ring-0 text-center w-16"
                        />
                      ) : (
                        <span className="block cursor-text text-center" onClick={() => { setEditingKey(rate.key); setEditValue(currentValue); }}>
                          {currentValue}{rate.suffix}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function NivelMini() {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: rawItems = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/catalog/nivel-mantenimiento"] });
  const items = [...rawItems].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

  const createMutation = useMutation({
    mutationFn: () => {
      const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.order ?? 0)) + 1 : 1;
      return apiRequest("POST", "/api/catalog/nivel-mantenimiento", { name: "Nuevo", valor: 50, active: true, order: nextOrder });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/catalog/nivel-mantenimiento"] }); toast({ title: "Nivel creado" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/catalog/nivel-mantenimiento/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/catalog/nivel-mantenimiento"] }),
  });

  const swapMutation = useMutation({
    mutationFn: async ({ idA, orderA, idB, orderB }: { idA: string; orderA: number; idB: string; orderB: number }) => {
      await Promise.all([
        apiRequest("PUT", `/api/catalog/nivel-mantenimiento/${idA}`, { order: orderA }),
        apiRequest("PUT", `/api/catalog/nivel-mantenimiento/${idB}`, { order: orderB }),
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/catalog/nivel-mantenimiento"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/catalog/nivel-mantenimiento/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/catalog/nivel-mantenimiento"] }); toast({ title: "Eliminado" }); setDeleteId(null); },
  });

  const swapOrder = (idx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const a = items[idx];
    const b = items[targetIdx];
    swapMutation.mutate({ idA: a.id, orderA: b.order ?? targetIdx + 1, idB: b.id, orderB: a.order ?? idx + 1 });
  };

  return (
    <div className="border border-gray-300 dark:border-gray-600 overflow-hidden flex flex-col" data-testid="catalog-nivel-mantenimiento">
      <div className={CARD_HEADER}>
        <span className="font-semibold text-xs uppercase tracking-wide truncate" title="Nivel">Nivel</span>
        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-white/80" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      <div className="overflow-auto" style={{ height: BODY_HEIGHT_WITH_HEADER }}>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className={TH} style={{ width: "28px" }}>#</th>
                <th className={TH}>Nivel</th>
                <th className={TH} style={{ width: "55px" }}>Mtto.</th>
                <th className={TH} style={{ width: "65px" }}>Equipo</th>
                <th className={TH} style={{ width: "65px" }}>Muebles</th>
                <th className={TH} style={{ width: "40px" }}></th>
                <th className={TH} style={{ width: "24px" }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => (
                <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700">
                  <td className="w-7 text-center text-muted-foreground border-r border-gray-200 dark:border-gray-700 py-0.5 bg-gray-50 dark:bg-gray-800/50 text-xs">{idx + 1}</td>
                  <td className="px-1.5 py-0.5 font-medium">
                    {editingCell?.id === item.id && editingCell?.field === "name" ? (
                      <Input value={editValue} onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => { updateMutation.mutate({ id: item.id, data: { name: editValue } }); setEditingCell(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { updateMutation.mutate({ id: item.id, data: { name: editValue } }); setEditingCell(null); } }}
                        autoFocus className="h-5 text-xs border-0 p-0 focus-visible:ring-0 font-medium" />
                    ) : (
                      <span className="block cursor-text" onClick={() => { setEditingCell({ id: item.id, field: "name" }); setEditValue(item.name); }}>{item.name}</span>
                    )}
                  </td>
                  <td className="text-center py-0.5 border-l border-gray-200 dark:border-gray-700">
                    {editingCell?.id === item.id && editingCell?.field === "valor" ? (
                      <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => { updateMutation.mutate({ id: item.id, data: { valor: parseInt(editValue) || 0 } }); setEditingCell(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { updateMutation.mutate({ id: item.id, data: { valor: parseInt(editValue) || 0 } }); setEditingCell(null); } }}
                        autoFocus className="h-5 text-xs border-0 p-0 focus-visible:ring-0 text-center w-12" />
                    ) : (
                      <span className="block cursor-text text-center" onClick={() => { setEditingCell({ id: item.id, field: "valor" }); setEditValue(String(item.valor ?? 0)); }}>${item.valor ?? 0}</span>
                    )}
                  </td>
                  <td className="text-center py-0.5 border-l border-gray-200 dark:border-gray-700">
                    {editingCell?.id === item.id && editingCell?.field === "equipo" ? (
                      <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => { updateMutation.mutate({ id: item.id, data: { equipo: parseInt(editValue) || 0 } }); setEditingCell(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { updateMutation.mutate({ id: item.id, data: { equipo: parseInt(editValue) || 0 } }); setEditingCell(null); } }}
                        autoFocus className="h-5 text-xs border-0 p-0 focus-visible:ring-0 text-center w-12" />
                    ) : (
                      <span className="block cursor-text text-center" onClick={() => { setEditingCell({ id: item.id, field: "equipo" }); setEditValue(String(item.equipo ?? 0)); }}>${(item.equipo ?? 0).toLocaleString()}</span>
                    )}
                  </td>
                  <td className="text-center py-0.5 border-l border-gray-200 dark:border-gray-700">
                    {editingCell?.id === item.id && editingCell?.field === "muebles" ? (
                      <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => { updateMutation.mutate({ id: item.id, data: { muebles: parseInt(editValue) || 0 } }); setEditingCell(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { updateMutation.mutate({ id: item.id, data: { muebles: parseInt(editValue) || 0 } }); setEditingCell(null); } }}
                        autoFocus className="h-5 text-xs border-0 p-0 focus-visible:ring-0 text-center w-12" />
                    ) : (
                      <span className="block cursor-text text-center" onClick={() => { setEditingCell({ id: item.id, field: "muebles" }); setEditValue(String(item.muebles ?? 0)); }}>${(item.muebles ?? 0).toLocaleString()}</span>
                    )}
                  </td>
                  <td className="w-10 text-center whitespace-nowrap">
                    <button className="inline-flex p-0 border-0 bg-transparent cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-default" disabled={idx === 0} onClick={() => swapOrder(idx, "up")}>
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button className="inline-flex p-0 border-0 bg-transparent cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-default" disabled={idx === items.length - 1} onClick={() => swapOrder(idx, "down")}>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </td>
                  <td className="w-6 text-center">
                    <button className="text-red-400 hover:text-red-600" onClick={() => setDeleteId(item.id)}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar</AlertDialogTitle><AlertDialogDescription>¿Estás seguro?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AvisosMini() {
  const { data: items = [], isLoading } = useQuery<CatalogAviso[]>({ queryKey: ["/api/catalog/avisos"] });
  const { toast } = useToast();
  const [localMin, setLocalMin] = useState<string>("");

  const mediosAviso = items.find(a => a.field === "media");
  const mediosMinStr = String(mediosAviso?.minQuantity ?? 1);
  useEffect(() => { setLocalMin(mediosMinStr); }, [mediosMinStr]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CatalogAviso> }) => apiRequest("PUT", `/api/catalog/avisos/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/catalog/avisos"] }),
    onError: () => { toast({ title: "Error al actualizar aviso", variant: "destructive" }); },
  });

  return (
    <div className="border border-gray-300 dark:border-gray-600 overflow-hidden flex flex-col" data-testid="catalog-avisos">
      <div className={CARD_HEADER}>
        <span className="font-semibold text-xs uppercase tracking-wide truncate" title="Avisos">Avisos</span>
      </div>
      <div className="overflow-auto" style={{ height: BODY_HEIGHT_WITH_HEADER }}>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
        ) : !mediosAviso ? (
          <div className="text-xs text-muted-foreground text-center py-3">Cargando aviso de medios...</div>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className={TH}>Aviso</th>
                <th className={TH}>Mín.</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 dark:border-gray-700" style={{ height: `${ROW_HEIGHT}px` }}>
                <td className="px-1.5 py-0.5 border-r border-gray-200 dark:border-gray-700">
                  <span className="text-xs">Medios mínimos</span>
                </td>
                <td className="px-1.5 py-0.5 text-center">
                  <Input
                    type="number"
                    min={1}
                    value={localMin}
                    onChange={(e) => setLocalMin(e.target.value)}
                    onBlur={() => {
                      const val = parseInt(localMin) || 1;
                      setLocalMin(String(val));
                      if (val !== mediosAviso.minQuantity) updateMutation.mutate({ id: mediosAviso.id, data: { minQuantity: val } });
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    className="h-5 text-xs border-0 p-0 text-center focus-visible:ring-0 w-full"
                    data-testid="input-aviso-medios-min"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
