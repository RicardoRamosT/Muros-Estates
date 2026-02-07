import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, FileText, FileImage, Filter, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Client, User, CatalogCity, CatalogZone, Developer, Development } from "@shared/schema";

export default function ProspectosResumen() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [filters, setFilters] = useState<{
    asesorId: string;
    ciudad: string;
    zona: string;
    desarrollador: string;
    desarrollo: string;
    tipologia: string;
    dateFrom: string;
    dateTo: string;
    horaFrom: string;
    horaTo: string;
  }>({
    asesorId: "",
    ciudad: "",
    zona: "",
    desarrollador: "",
    desarrollo: "",
    tipologia: "",
    dateFrom: "",
    dateTo: "",
    horaFrom: "",
    horaTo: "",
  });

  const { data: allClients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: cities = [] } = useQuery<CatalogCity[]>({ queryKey: ["/api/catalog/cities"] });
  const { data: zones = [] } = useQuery<CatalogZone[]>({ queryKey: ["/api/catalog/zones"] });
  const { data: developers = [] } = useQuery<Developer[]>({ queryKey: ["/api/developers"] });
  const { data: developments = [] } = useQuery<Development[]>({ queryKey: ["/api/developments-entity"] });
  const { data: catalogTipologias = [] } = useQuery<any[]>({ queryKey: ["/api/catalog/tipologias"] });

  const allProspects = allClients.filter(c => c.isClient !== true);

  const prospects = useMemo(() => {
    let filtered = allProspects;
    if (filters.asesorId) filtered = filtered.filter(p => (p as any).asesorId === filters.asesorId);
    if (filters.ciudad) filtered = filtered.filter(p => (p as any).ciudad === filters.ciudad);
    if (filters.zona) filtered = filtered.filter(p => (p as any).zona === filters.zona);
    if (filters.desarrollador) filtered = filtered.filter(p => (p as any).desarrollador === filters.desarrollador);
    if (filters.desarrollo) filtered = filtered.filter(p => (p as any).desarrollo === filters.desarrollo);
    if (filters.tipologia) filtered = filtered.filter(p => (p as any).tipologia === filters.tipologia);
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      filtered = filtered.filter(p => p.createdAt && new Date(p.createdAt) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo + "T23:59:59");
      filtered = filtered.filter(p => p.createdAt && new Date(p.createdAt) <= to);
    }
    if (filters.horaFrom) {
      const [hf, mf] = filters.horaFrom.split(':').map(Number);
      filtered = filtered.filter(p => {
        if (!p.createdAt) return false;
        const d = new Date(p.createdAt);
        return d.getHours() * 60 + d.getMinutes() >= hf * 60 + mf;
      });
    }
    if (filters.horaTo) {
      const [ht, mt] = filters.horaTo.split(':').map(Number);
      filtered = filtered.filter(p => {
        if (!p.createdAt) return false;
        const d = new Date(p.createdAt);
        return d.getHours() * 60 + d.getMinutes() <= ht * 60 + mt;
      });
    }
    return filtered;
  }, [allProspects, filters]);

  const asesores = users.filter(u => u.role === "asesor" || u.role === "admin");

  const tipoOptions = [
    { value: "inversionista", label: "Inversionista" },
    { value: "uso_propio", label: "Uso Propio" },
    { value: "revender", label: "Revender" },
  ];

  const perfilOptions = [
    { value: "estudiante", label: "Estudiante" },
    { value: "profesionista", label: "Profesionista" },
    { value: "pareja", label: "Pareja" },
    { value: "familia_joven", label: "Familia Joven" },
    { value: "familia_grande", label: "Familia Grande" },
    { value: "tercera_edad", label: "Tercera Edad" },
  ];

  const fuenteOptions = [
    { value: "instagram_ads", label: "Instagram Ads" },
    { value: "instagram_follower", label: "IG Follower" },
    { value: "facebook_ads", label: "Facebook Ads" },
    { value: "facebook_fan", label: "FB Fan" },
    { value: "landing_page", label: "Landing Page" },
    { value: "grupo_facebook", label: "Grupo FB" },
    { value: "fb_marketplace", label: "FB Market" },
    { value: "broker_externo", label: "Broker Ext." },
    { value: "referido", label: "Referido" },
    { value: "lead_pasado", label: "Lead Pasado" },
    { value: "conocido_asesor", label: "Conocido" },
    { value: "base_datos", label: "Base Datos" },
    { value: "periodico", label: "Periódico" },
    { value: "flyer", label: "Flyer" },
    { value: "rotulo", label: "Rótulo" },
    { value: "google_ads", label: "Google Ads" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "tiktok", label: "TikTok" },
    { value: "twitter", label: "Twitter" },
  ];

  const estatusOptions = [
    { value: "activo", label: "Activo" },
    { value: "en_hold", label: "En Hold" },
    { value: "no_activo", label: "No Activo" },
  ];

  const embudoOptions = [
    { value: "nuevo", label: "Nuevo", color: "#87CEEB" },
    { value: "asignado", label: "Asignado", color: "#90EE90" },
    { value: "no_contesta", label: "No Contesta", color: "#FFD700" },
    { value: "no_le_intereso", label: "No Interesó", color: "#FF6B6B" },
    { value: "validado", label: "Validado", color: "#32CD32" },
    { value: "envio_info", label: "Envío Info", color: "#9370DB" },
    { value: "muestra_interes", label: "Muestra Int.", color: "#FF69B4" },
    { value: "presentacion", label: "Presentación", color: "#FFA500" },
    { value: "showroom", label: "Showroom", color: "#4169E1" },
    { value: "evaluando", label: "Evaluando", color: "#40E0D0" },
    { value: "negociacion", label: "Negociación", color: "#228B22" },
    { value: "cierre_ganado", label: "Cierre Ganado", color: "#00FF00" },
    { value: "cierre_perdido", label: "Cierre Perd.", color: "#DC143C" },
    { value: "separado", label: "Separado", color: "#FF1493" },
    { value: "enganche_firma", label: "Eng. y Firma", color: "#8B008B" },
  ];

  const comoPagaOptions = [
    { value: "enganche_bajo", label: "Enganche Bajo" },
    { value: "enganche_alto", label: "Enganche Alto" },
    { value: "capital_semilla", label: "Capital Semilla" },
  ];

  const positivosOptions = [
    { value: "precio", label: "Precio" },
    { value: "ubicacion", label: "Ubicación" },
    { value: "diseno", label: "Diseño" },
    { value: "tamano", label: "Tamaño" },
    { value: "amenidades", label: "Amenidades" },
    { value: "esquema_pagos", label: "Esq. Pagos" },
  ];

  const negativosOptions = [
    { value: "precio", label: "Precio" },
    { value: "ubicacion", label: "Ubicación" },
    { value: "diseno", label: "Diseño" },
    { value: "tamano", label: "Tamaño" },
    { value: "amenidades", label: "Amenidades" },
    { value: "esquema_pagos", label: "Esq. Pagos" },
    { value: "permisos", label: "Permisos" },
    { value: "desarrollador", label: "Desarrollador" },
    { value: "tiempo_entrega", label: "T. Entrega" },
  ];

  const buildStats = (options: { value: string; label: string; color?: string }[], field: string, isArray = false) => {
    return options.map(opt => ({
      label: opt.label,
      count: prospects.filter(p => {
        const val = (p as any)[field];
        if (isArray) return Array.isArray(val) && val.includes(opt.value);
        return val === opt.value;
      }).length,
      color: opt.color,
    }));
  };

  const tipoStats = buildStats(tipoOptions, "tipofil");
  const perfilStats = buildStats(perfilOptions, "perfil");
  const fuenteStats = buildStats(fuenteOptions, "comoLlega");
  const brokerStats = [
    { label: "Sí", count: prospects.filter(p => (p as any).brokerExterno === "si").length },
    { label: "No", count: prospects.filter(p => (p as any).brokerExterno === "no").length },
  ];
  const estatusStats = buildStats(estatusOptions, "estatus");
  const embudoStats = buildStats(embudoOptions, "embudo");
  const comoPagaStats = buildStats(comoPagaOptions, "comoPaga");
  const positivosStats = buildStats(positivosOptions, "positivos", true);
  const negativosStats = buildStats(negativosOptions, "negativos", true);

  const getDateRange = () => {
    const dates = prospects.filter(p => p.createdAt).map(p => new Date(p.createdAt!));
    if (dates.length === 0) return "Sin fechas";
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    const fmt = (d: Date) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${fmt(min)} - ${fmt(max)}`;
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== "");

  const clearFilters = () => {
    setFilters({ asesorId: "", ciudad: "", zona: "", desarrollador: "", desarrollo: "", tipologia: "", dateFrom: "", dateTo: "", horaFrom: "", horaTo: "" });
  };

  const BarChart = ({ items, maxItems }: { items: { label: string; count: number; color?: string }[]; maxItems?: number }) => {
    const displayItems = maxItems ? items.slice(0, maxItems) : items;
    const maxCount = Math.max(...displayItems.map(i => i.count), 1);
    const total = prospects.length;

    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '60px', marginTop: '4px' }}>
        {displayItems.map((item, idx) => {
          const heightPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
          const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '7px', color: '#6b7280', marginBottom: '1px' }}>
                {item.count > 0 ? `${item.count}` : ''}
              </span>
              <div
                style={{
                  width: '100%',
                  maxWidth: '24px',
                  height: `${Math.max(heightPercent, 3)}%`,
                  backgroundColor: item.color || 'hsl(var(--primary))',
                  borderRadius: '2px 2px 0 0',
                  minHeight: '2px',
                  opacity: item.count > 0 ? 1 : 0.2,
                }}
              />
              <span style={{ fontSize: '6px', color: '#9ca3af', marginTop: '1px', textAlign: 'center', lineHeight: '7px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const ReportCard = ({ title, items, maxItems }: { title: string; items: { label: string; count: number; color?: string }[]; maxItems?: number }) => {
    const total = prospects.length;
    const withData = items.filter(i => i.count > 0);
    return (
      <div style={{
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        padding: '6px 8px',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px', borderBottom: '1px solid #e5e7eb', paddingBottom: '3px' }}>
          {title}
          <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: '4px', fontSize: '8px' }}>({withData.length}/{items.length})</span>
        </div>
        <BarChart items={items} maxItems={maxItems} />
      </div>
    );
  };

  const captureElement = async () => {
    const element = document.getElementById('summary-content');
    if (!element) return null;

    const origWidth = element.style.width;
    const origHeight = element.style.height;
    const origMaxWidth = element.style.maxWidth;
    const origOverflow = element.style.overflow;
    element.style.width = '1056px';
    element.style.height = '816px';
    element.style.maxWidth = '1056px';
    element.style.overflow = 'hidden';

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        width: 1056,
        height: 816,
        windowWidth: 1056,
        windowHeight: 816,
      });
      return canvas;
    } finally {
      element.style.width = origWidth;
      element.style.height = origHeight;
      element.style.maxWidth = origMaxWidth;
      element.style.overflow = origOverflow;
    }
  };

  const handleDownloadJPG = async () => {
    try {
      const canvas = await captureElement();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `resumen-prospectos-${new Date().toISOString().split('T')[0]}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
      toast({ title: "JPG descargado" });
    } catch (err) {
      toast({ title: "Error al descargar", variant: "destructive" });
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const canvas = await captureElement();
      if (!canvas) return;
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: 'letter' });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, 11, 8.5);
      pdf.save(`resumen-prospectos-${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "PDF descargado" });
    } catch (err) {
      toast({ title: "Error al descargar", variant: "destructive" });
    }
  };

  const filteredZones = filters.ciudad
    ? zones.filter(z => {
        const city = cities.find(c => c.name === filters.ciudad);
        return city ? (z as any).cityId === city.id : true;
      })
    : zones;

  const filteredDevelopments = filters.desarrollador
    ? developments.filter(d => {
        const dev = developers.find(dv => dv.name === filters.desarrollador);
        return dev ? d.developerId === dev.id : true;
      })
    : developments;

  const uniqueDevNames = Array.from(new Set(filteredDevelopments.map(d => d.name))).sort();
  const uniqueTipologias = catalogTipologias.map((t: any) => t.name).filter(Boolean).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm print:hidden">
        <div className="max-w-full mx-auto px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/prospectos")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Volver
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h1 className="text-sm font-semibold">Resumen de Prospectos</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadJPG} data-testid="button-download-jpg">
              <FileImage className="w-4 h-4 mr-1" />
              JPG
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} data-testid="button-download-pdf">
              <Download className="w-4 h-4 mr-1" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="print:hidden px-4 py-2 bg-white border-b">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <div className="flex items-center gap-1.5 flex-wrap">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
              className="h-7 text-xs border rounded px-1.5 bg-white"
              data-testid="filter-date-from"
            />
            <span className="text-xs text-gray-400">a</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
              className="h-7 text-xs border rounded px-1.5 bg-white"
              data-testid="filter-date-to"
            />
            <span className="text-xs text-gray-400 ml-1">Hora:</span>
            <input
              type="time"
              value={filters.horaFrom}
              onChange={e => setFilters(f => ({ ...f, horaFrom: e.target.value }))}
              className="h-7 text-xs border rounded px-1.5 bg-white w-[80px]"
              data-testid="filter-hora-from"
            />
            <span className="text-xs text-gray-400">a</span>
            <input
              type="time"
              value={filters.horaTo}
              onChange={e => setFilters(f => ({ ...f, horaTo: e.target.value }))}
              className="h-7 text-xs border rounded px-1.5 bg-white w-[80px]"
              data-testid="filter-hora-to"
            />

            <Select value={filters.asesorId || "all"} onValueChange={v => setFilters(f => ({ ...f, asesorId: v === "all" ? "" : v }))}>
              <SelectTrigger className="h-7 text-xs w-[110px]" data-testid="filter-asesor">
                <SelectValue placeholder="Asesor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Asesores</SelectItem>
                {asesores.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name || u.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.ciudad || "all"} onValueChange={v => setFilters(f => ({ ...f, ciudad: v === "all" ? "" : v, zona: "" }))}>
              <SelectTrigger className="h-7 text-xs w-[100px]" data-testid="filter-ciudad">
                <SelectValue placeholder="Ciudad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Ciudades</SelectItem>
                {cities.map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.zona || "all"} onValueChange={v => setFilters(f => ({ ...f, zona: v === "all" ? "" : v }))}>
              <SelectTrigger className="h-7 text-xs w-[110px]" data-testid="filter-zona">
                <SelectValue placeholder="Zona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Zonas</SelectItem>
                {Array.from(new Set(filteredZones.map(z => z.name))).sort().map((name, idx) => (
                  <SelectItem key={idx} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.desarrollador || "all"} onValueChange={v => setFilters(f => ({ ...f, desarrollador: v === "all" ? "" : v, desarrollo: "" }))}>
              <SelectTrigger className="h-7 text-xs w-[120px]" data-testid="filter-desarrollador">
                <SelectValue placeholder="Desarrollador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Desarrolladores</SelectItem>
                {developers.map(d => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.desarrollo || "all"} onValueChange={v => setFilters(f => ({ ...f, desarrollo: v === "all" ? "" : v }))}>
              <SelectTrigger className="h-7 text-xs w-[110px]" data-testid="filter-desarrollo">
                <SelectValue placeholder="Desarrollo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Desarrollos</SelectItem>
                {uniqueDevNames.map((name, idx) => (
                  <SelectItem key={idx} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.tipologia || "all"} onValueChange={v => setFilters(f => ({ ...f, tipologia: v === "all" ? "" : v }))}>
              <SelectTrigger className="h-7 text-xs w-[100px]" data-testid="filter-tipologia">
                <SelectValue placeholder="Tipología" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Tipologías</SelectItem>
                {uniqueTipologias.map((name: string, idx: number) => (
                  <SelectItem key={idx} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs px-2" data-testid="button-clear-filters">
                <X className="w-3 h-3 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 print:py-0">
        <div
          id="summary-content"
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            boxSizing: 'border-box',
            fontFamily: 'Inter, system-ui, sans-serif',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #e5e7eb', paddingBottom: '6px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', backgroundColor: 'hsl(var(--primary))', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '12px' }}>
                M
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>MUROS</div>
                <div style={{ fontSize: '8px', color: '#6b7280' }}>Plataforma Inmobiliaria</div>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>Reporte de Filtración de Prospectos</div>
              <div style={{ fontSize: '9px', color: '#6b7280' }}>
                {getDateRange()}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>
                Total: {prospects.length} prospectos
              </div>
              <div style={{ fontSize: '8px', color: '#9ca3af' }}>
                {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
            marginBottom: '10px',
          }}>
            <ReportCard title="Tipo" items={tipoStats} />
            <ReportCard title="Perfil" items={perfilStats} />
            <ReportCard title="Fuente" items={fuenteStats} />
            <ReportCard title="Asesor Externo" items={brokerStats} />
            <ReportCard title="Estatus" items={estatusStats} />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            marginBottom: '10px',
          }}>
            <ReportCard title="Etapa de Embudo" items={embudoStats} />
            <ReportCard title="Cómo Paga" items={comoPagaStats} />
            <ReportCard title="Positivos" items={positivosStats} />
            <ReportCard title="Negativos" items={negativosStats} />
          </div>

          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            padding: '6px 10px',
            backgroundColor: '#fffbeb',
          }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', borderBottom: '1px solid #fde68a', paddingBottom: '3px' }}>
              Información de Contacto
              <span style={{ fontWeight: 400, color: '#b45309', marginLeft: '4px', fontSize: '8px' }}>({prospects.length} prospectos)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px', fontSize: '8px', fontWeight: 600, color: '#78350f', borderBottom: '1px solid #fde68a', paddingBottom: '2px', marginBottom: '2px' }}>
              <span>Nombre</span>
              <span>Apellido</span>
              <span>Teléfono</span>
              <span>Correo</span>
            </div>
            <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
              {prospects.length === 0 ? (
                <div style={{ fontSize: '8px', color: '#92400e', textAlign: 'center', padding: '8px' }}>Sin prospectos con los filtros seleccionados</div>
              ) : (
                prospects.map((p, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px', fontSize: '8px', color: '#78350f', borderBottom: '1px solid #fef3c7', padding: '1px 0' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(p as any).nombre || '-'}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(p as any).apellido || '-'}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(p as any).telefono || '-'}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(p as any).correo || '-'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
