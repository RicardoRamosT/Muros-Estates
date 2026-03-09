import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { 
  Folder, 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  ChevronRight, 
  Home, 
  Search,
  Plus,
  Users,
  Building2,
  FolderOpen,
  File,
  Image,
  FileSpreadsheet,
  FileVideo,
  Loader2,
  Share2,
  Briefcase,
  ArrowLeft,
  Link,
  Copy,
  Eye,
  ExternalLink,
  Clock,
  CheckCircle,
  Info,
  Pencil,
  Check,
  X
} from "lucide-react";
import { DOCUMENT_SECTIONS, getFieldPermission } from "@shared/schema";
import type { Document, Developer, Development, Typology, Client, SharedLink } from "@shared/schema";

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="w-8 h-8 text-muted-foreground" />;
  if (mimeType.startsWith("image/")) return <Image className="w-8 h-8 text-blue-500" />;
  if (mimeType.startsWith("video/")) return <FileVideo className="w-8 h-8 text-purple-500" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
  if (mimeType.includes("pdf")) return <FileText className="w-8 h-8 text-red-500" />;
  return <FileText className="w-8 h-8 text-muted-foreground" />;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const SECTION_LABELS: Record<string, string> = {
  identidad: "Identidad",
  corporativo: "Corporativo",
  convenios: "Convenios",
  permisos: "Permisos",
  fideicomiso: "Fideicomiso",
  ofertaContrato: "Oferta/Contrato",
  imagenes: "Imágenes",
  videos: "Videos",
  brochuresFlyers: "Brochures/Flyers",
  promociones: "Promociones",
  acabadosEquipamiento: "Acabados/Equipamiento",
  listasPrecios: "Listas de Precios",
  ejercicios: "Ejercicios",
  documentosIdentidad: "Documentos de Identidad",
  cotizaciones: "Cotizaciones",
  reciboSeparacion: "Recibo de Separación",
  cartas: "Cartas",
  checklists: "Checklists",
  productos: "Productos",
};

const SECTION_DESCRIPTIONS: Record<string, string[]> = {
  identidad: [
    "Acta Constitutiva",
    "Constancia de Situación Fiscal",
    "Opinión de Cumplimiento",
    "Identificación Representante Legal",
    "Comprobante de Domicilio",
    "Otros"
  ],
  corporativo: [
    "Currículum",
    "Presentación"
  ],
  convenios: [
    "Convenios y Contratos de Intermediación"
  ],
  permisos: [
    "Factibilidad de Agua",
    "Manifiesto de Impacto Ambiental",
    "Factibilidad de CFE",
    "Otras Factibilidades",
    "Licencia de Uso de Suelo",
    "Licencia de Construcción"
  ],
  fideicomiso: [
    "Documentos de Fideicomiso"
  ],
  ofertaContrato: [
    "Oferta de Compra",
    "Contrato de Inversión",
    "Contrato de Promesa de Compraventa"
  ],
};

export default function AdminDocuments() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("desarrolladores");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    name: "",
    rootCategory: "",
    section: "",
    developerId: "",
    developmentId: "",
    typologyId: "",
    clientId: "",
    description: "",
    shareable: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Navigation state for hierarchical browsing
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<string | null>(null);
  const [selectedDevelopmentId, setSelectedDevelopmentId] = useState<string | null>(null);
  const [selectedTypologyId, setSelectedTypologyId] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [sectionType, setSectionType] = useState<"legales" | "venta" | null>(null);
  
  // State for clients tab
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  
  // Read URL query params for deep linking
  const [location, setLocation] = useLocation();
  const deepLinkProcessedRef = useRef(false);
  // Store URL params for later processing after data loads
  const [pendingDeepLink, setPendingDeepLink] = useState<{developmentId?: string, section?: string} | null>(null);
  
  useEffect(() => {
    // Only process deep link params once per page load
    if (deepLinkProcessedRef.current) return;
    
    const params = new URLSearchParams(window.location.search);
    const developerId = params.get("developerId");
    const developmentId = params.get("developmentId");
    const section = params.get("sectionType");
    
    if (developerId) {
      deepLinkProcessedRef.current = true;
      // First set the tab, then the developer, then the section type
      setActiveTab("desarrolladores");
      setSelectedDeveloperId(developerId);
      // Reset intermediate selections
      setSelectedDevelopmentId(null);
      setSelectedTypologyId(null);
      setSelectedSection(null);
      if (section === "legales" || section === "venta") {
        setSectionType(section);
      }
      // Clear query params after reading
      window.history.replaceState({}, '', '/admin/documentos');
    } else if (developmentId) {
      // Store for processing after developments load
      setPendingDeepLink({ developmentId, section: section || undefined });
      // Clear query params after reading
      window.history.replaceState({}, '', '/admin/documentos');
    }
  }, []);

  // Shared links state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareForm, setShareForm] = useState({
    canView: true,
    canUpload: false,
    isPermanent: false,
    expiresInDays: 7,
    description: "",
    requestedDocuments: [] as string[],
  });
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [sharedLinksViewOpen, setSharedLinksViewOpen] = useState(false);

  const hasViewPermission = () => {
    if (!user) return false;
    if (user.role === "admin") return true;
    const permissions = user.permissions as Record<string, any> | null;
    return permissions?.documentos?.view === true;
  };

  const hasEditPermission = () => {
    if (!user) return false;
    if (user.role === "admin") return true;
    const permissions = user.permissions as Record<string, any> | null;
    return permissions?.documentos?.edit === true;
  };

  const canView = hasViewPermission();
  const canEdit = hasEditPermission();

  // Fetch data
  const { data: documents = [], isLoading: loadingDocs } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });
  
  const { data: developers = [] } = useQuery<Developer[]>({
    queryKey: ["/api/developers"],
  });
  
  const { data: developments = [] } = useQuery<Development[]>({
    queryKey: ["/api/developments-entity"],
  });
  
  // Process pending deep link when developments are loaded
  useEffect(() => {
    if (pendingDeepLink && developments.length > 0 && !deepLinkProcessedRef.current) {
      deepLinkProcessedRef.current = true;
      const { developmentId, section } = pendingDeepLink;
      setActiveTab("desarrolladores");
      // Find the developer for this development
      const development = developments.find(d => d.id === developmentId);
      if (development?.developerId) {
        setSelectedDeveloperId(development.developerId);
      }
      setSelectedDevelopmentId(developmentId || null);
      setSelectedTypologyId(null);
      setSelectedSection(null);
      if (section === "legales" || section === "venta") {
        setSectionType(section);
      }
      setPendingDeepLink(null);
    }
  }, [developments, pendingDeepLink]);
  
  const { data: typologies = [] } = useQuery<Typology[]>({
    queryKey: ["/api/typologies"],
  });
  
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("muros_session")}`,
        },
        body: formData,
      });
      if (!response.ok) throw new Error("Error al subir documento");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Documento subido correctamente" });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      resetUploadForm();
    },
    onError: () => {
      toast({ title: "Error al subir documento", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Documento eliminado" });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: () => {
      toast({ title: "Error al eliminar documento", variant: "destructive" });
    },
  });

  const { data: sharedLinks = [] } = useQuery<SharedLink[]>({
    queryKey: ["/api/shared-links"],
    enabled: canEdit,
  });

  const createShareLinkMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/shared-links", data);
      return response.json();
    },
    onSuccess: (result: any) => {
      const shareUrl = `${window.location.origin}/s/${result.token}`;
      setGeneratedLink(shareUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/shared-links"] });
      toast({ title: "Link de compartir creado" });
    },
    onError: () => {
      toast({ title: "Error al crear link", variant: "destructive" });
    },
  });

  const deleteShareLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/shared-links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shared-links"] });
      toast({ title: "Link eliminado" });
    },
    onError: () => {
      toast({ title: "Error al eliminar link", variant: "destructive" });
    },
  });

  const updateTypologyNameMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: string }) => {
      return apiRequest("PATCH", `/api/typologies/${id}`, { type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/typologies"] });
      toast({ title: "Nombre de tipología actualizado" });
    },
    onError: () => {
      toast({ title: "Error al actualizar nombre", variant: "destructive" });
    },
  });

  const handleCreateShareLink = () => {
    const linkData: any = {
      targetType: "folder",
      rootCategory: activeTab,
      canView: shareForm.canView,
      canUpload: shareForm.canUpload,
      isPermanent: shareForm.isPermanent,
      description: shareForm.description || undefined,
      requestedDocuments: shareForm.requestedDocuments.length > 0 ? shareForm.requestedDocuments : undefined,
    };
    
    if (!shareForm.isPermanent) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + shareForm.expiresInDays);
      linkData.expiresAt = expiresAt.toISOString();
    }
    
    if (activeTab === "desarrolladores") {
      if (selectedDeveloperId) linkData.developerId = selectedDeveloperId;
      if (selectedDevelopmentId) linkData.developmentId = selectedDevelopmentId;
      if (selectedTypologyId) linkData.typologyId = selectedTypologyId;
      if (selectedSection) linkData.section = selectedSection;
    } else if (activeTab === "clientes") {
      if (selectedClientId) linkData.clientId = selectedClientId;
      if (selectedSection) linkData.section = selectedSection;
    } else if (activeTab === "trabajo") {
      if (selectedSection) linkData.section = selectedSection;
    }
    
    createShareLinkMutation.mutate(linkData);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Link copiado al portapapeles" });
  };

  const resetUploadForm = () => {
    setUploadForm({
      name: "",
      rootCategory: "",
      section: "",
      developerId: "",
      developmentId: "",
      typologyId: "",
      clientId: "",
      description: "",
      shareable: true,
    });
  };

  const handleUpload = () => {
    if (!selectedFile || !uploadForm.rootCategory) {
      toast({ title: "Selecciona un archivo y categoría", variant: "destructive" });
      return;
    }
    
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("name", uploadForm.name || selectedFile.name);
    formData.append("rootCategory", uploadForm.rootCategory);
    if (uploadForm.section) formData.append("section", uploadForm.section);
    if (uploadForm.developerId) formData.append("developerId", uploadForm.developerId);
    if (uploadForm.developmentId) formData.append("developmentId", uploadForm.developmentId);
    if (uploadForm.typologyId) formData.append("typologyId", uploadForm.typologyId);
    if (uploadForm.clientId) formData.append("clientId", uploadForm.clientId);
    if (uploadForm.description) formData.append("description", uploadForm.description);
    formData.append("shareable", String(uploadForm.shareable));
    
    uploadMutation.mutate(formData);
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/download`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("muros_session")}`,
        },
      });
      if (!response.ok) throw new Error("Error al descargar");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast({ title: "Error al descargar documento", variant: "destructive" });
    }
  };

  // Reset navigation when changing tabs (but not on initial deep link)
  const isInitialMount = useRef(true);
  useEffect(() => {
    // Skip reset on initial mount (for deep linking)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setSelectedDeveloperId(null);
    setSelectedDevelopmentId(null);
    setSelectedTypologyId(null);
    setSelectedSection(null);
    setSectionType(null);
    setSelectedClientId(null);
  }, [activeTab]);

  // Filter documents for current view
  const getFilteredDocuments = () => {
    let filtered = documents.filter(doc => doc.rootCategory === activeTab);
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return documents.filter(doc => 
        doc.name.toLowerCase().includes(query) ||
        doc.originalName.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query)
      );
    }
    
    if (activeTab === "desarrolladores") {
      if (selectedDeveloperId) {
        filtered = filtered.filter(d => d.developerId === selectedDeveloperId);
      }
      if (selectedDevelopmentId) {
        filtered = filtered.filter(d => d.developmentId === selectedDevelopmentId);
      }
      if (selectedTypologyId) {
        filtered = filtered.filter(d => d.typologyId === selectedTypologyId);
      }
      if (selectedSection) {
        filtered = filtered.filter(d => d.section === selectedSection);
      }
    } else if (activeTab === "clientes") {
      if (selectedClientId) {
        filtered = filtered.filter(d => d.clientId === selectedClientId);
      }
      if (selectedSection) {
        filtered = filtered.filter(d => d.section === selectedSection);
      }
    } else if (activeTab === "trabajo") {
      if (selectedSection) {
        filtered = filtered.filter(d => d.section === selectedSection);
      }
    }
    
    return filtered;
  };

  const goBack = () => {
    if (activeTab === "desarrolladores") {
      if (selectedSection) {
        setSelectedSection(null);
      } else if (sectionType) {
        setSectionType(null);
      } else if (selectedTypologyId) {
        setSelectedTypologyId(null);
      } else if (selectedDevelopmentId) {
        setSelectedDevelopmentId(null);
      } else if (selectedDeveloperId) {
        setSelectedDeveloperId(null);
      }
    } else if (activeTab === "clientes") {
      if (selectedSection) {
        setSelectedSection(null);
      } else if (selectedClientId) {
        setSelectedClientId(null);
      }
    } else if (activeTab === "trabajo") {
      if (selectedSection) {
        setSelectedSection(null);
      }
    }
  };

  const getBreadcrumb = () => {
    const parts: string[] = [];
    
    if (activeTab === "desarrolladores") {
      if (selectedDeveloperId) {
        const dev = developers.find(d => d.id === selectedDeveloperId);
        parts.push(dev?.name || "Desarrollador");
      }
      if (selectedDevelopmentId) {
        const dev = developments.find(d => d.id === selectedDevelopmentId);
        parts.push(dev?.name || "Desarrollo");
      }
      if (selectedTypologyId) {
        const typ = typologies.find(t => t.id === selectedTypologyId);
        parts.push(typ ? `Tipo ${typ.type || typ.id}` : "Tipología");
      }
      if (sectionType) {
        parts.push(sectionType === "legales" ? "Legales" : "Venta");
      }
      if (selectedSection) {
        parts.push(SECTION_LABELS[selectedSection] || selectedSection);
      }
    } else if (activeTab === "clientes") {
      if (selectedClientId) {
        const client = clients.find(c => c.id === selectedClientId);
        parts.push(client?.name || "Cliente");
      }
      if (selectedSection) {
        parts.push(SECTION_LABELS[selectedSection] || selectedSection);
      }
    } else if (activeTab === "trabajo") {
      if (selectedSection) {
        parts.push(SECTION_LABELS[selectedSection] || selectedSection);
      }
    }
    
    return parts;
  };

  const hasNavigation = () => {
    if (activeTab === "desarrolladores") {
      return selectedDeveloperId || selectedDevelopmentId || selectedTypologyId || sectionType || selectedSection;
    } else if (activeTab === "clientes") {
      return selectedClientId || selectedSection;
    } else if (activeTab === "trabajo") {
      return selectedSection;
    }
    return false;
  };

  const filteredDocs = getFilteredDocuments();
  const breadcrumb = getBreadcrumb();
  const showBackButton = hasNavigation();

  // Get relevant developments for selected developer
  const filteredDevelopments = selectedDeveloperId 
    ? developments.filter(d => d.developerId === selectedDeveloperId)
    : developments;
    
  // Get relevant typologies for selected development - typologies use 'development' (name) not 'developmentId'
  const selectedDevelopmentName = developments.find(d => d.id === selectedDevelopmentId)?.name;
  const filteredTypologies = selectedDevelopmentName
    ? typologies.filter(t => t.development === selectedDevelopmentName)
    : typologies;

  // Open upload dialog with context - pre-fill based on current navigation
  const openUploadDialog = () => {
    // Determine the current section based on navigation context
    let currentSection = selectedSection || "";
    
    // If we're in a tab view without explicit section selection, use first tab as default
    if (activeTab === "desarrolladores") {
      if (selectedDeveloperId && !selectedDevelopmentId && sectionType === "legales" && !currentSection) {
        currentSection = DOCUMENT_SECTIONS.developerLegales[0]; // identidad
      } else if (selectedDevelopmentId && !selectedTypologyId && sectionType === "legales" && !currentSection) {
        currentSection = DOCUMENT_SECTIONS.developmentLegales[0]; // identidad
      } else if (selectedDevelopmentId && !selectedTypologyId && sectionType === "venta" && !currentSection) {
        currentSection = DOCUMENT_SECTIONS.developmentVenta[0]; // imagenes
      } else if (selectedDevelopmentId && !selectedTypologyId && !sectionType && !currentSection) {
        // At development level without section type selected - default to first development legales
        currentSection = DOCUMENT_SECTIONS.developmentLegales[0];
      } else if (selectedTypologyId && !currentSection) {
        currentSection = DOCUMENT_SECTIONS.typologyVenta[0]; // imagenes
      }
    } else if (activeTab === "clientes" && selectedClientId && !currentSection) {
      currentSection = DOCUMENT_SECTIONS.clientSections[0]; // documentosIdentidad
    } else if (activeTab === "trabajo" && !currentSection) {
      currentSection = DOCUMENT_SECTIONS.workFolders[0]; // reciboSeparacion
    }
    
    setUploadForm({
      name: "",
      rootCategory: activeTab,
      developerId: selectedDeveloperId || "",
      developmentId: selectedDevelopmentId || "",
      typologyId: selectedTypologyId || "",
      clientId: selectedClientId || "",
      section: currentSection,
      description: "",
      shareable: true,
    });
    setUploadDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-between px-3 py-1.5 border-b">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-bold" data-testid="text-page-title">Documentos</h1>
        </div>
      </div>
      <div className="container mx-auto px-4 py-3 space-y-3">
        <div className="flex items-center justify-end gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
                data-testid="input-search"
              />
            </div>
            
            {canEdit && (
              <>
                {(sectionType || selectedTypologyId || (activeTab === "clientes" && selectedClientId) || activeTab === "trabajo") && (
                  <Button 
                    variant="outline" 
                    className="gap-2" 
                    onClick={() => {
                      setGeneratedLink(null);
                      setShareForm({
                        canView: true,
                        canUpload: false,
                        isPermanent: false,
                        expiresInDays: 7,
                        description: "",
                        requestedDocuments: [],
                      });
                      setShareDialogOpen(true);
                    }}
                    data-testid="button-share"
                  >
                    <Share2 className="w-4 h-4" />
                    Compartir
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSharedLinksViewOpen(true)}
                  data-testid="button-view-links"
                >
                  <Link className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="desarrolladores" className="gap-2" data-testid="tab-desarrolladores">
              <Building2 className="w-4 h-4" />
              Desarrolladores
            </TabsTrigger>
            <TabsTrigger value="clientes" className="gap-2" data-testid="tab-clientes">
              <Users className="w-4 h-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="trabajo" className="gap-2" data-testid="tab-trabajo">
              <Briefcase className="w-4 h-4" />
              De Trabajo
            </TabsTrigger>
          </TabsList>

          {/* Breadcrumb and back button */}
          {showBackButton && (
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={goBack} data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Atrás
              </Button>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Home className="w-4 h-4" />
                {breadcrumb.map((item, index) => (
                  <span key={index} className="flex items-center">
                    <ChevronRight className="w-4 h-4 mx-1" />
                    <span className={index === breadcrumb.length - 1 ? "font-medium text-foreground" : ""}>
                      {item}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Desarrolladores Tab */}
          <TabsContent value="desarrolladores">
            <DesarrolladoresView
              developers={developers}
              developments={filteredDevelopments}
              typologies={filteredTypologies}
              documents={filteredDocs}
              selectedDeveloperId={selectedDeveloperId}
              selectedDevelopmentId={selectedDevelopmentId}
              selectedTypologyId={selectedTypologyId}
              sectionType={sectionType}
              selectedSection={selectedSection}
              onSelectDeveloper={setSelectedDeveloperId}
              onSelectDevelopment={setSelectedDevelopmentId}
              onSelectTypology={setSelectedTypologyId}
              onSelectSectionType={setSectionType}
              onSelectSection={setSelectedSection}
              onDownload={handleDownload}
              onDelete={deleteMutation.mutate}
              canEdit={canEdit}
              isLoading={loadingDocs}
              onUpload={openUploadDialog}
              onUpdateTypologyName={(id, name) => updateTypologyNameMutation.mutate({ id, type: name })}
              userRole={user?.role || ''}
            />
          </TabsContent>

          {/* Clientes Tab */}
          <TabsContent value="clientes">
            <ClientesView
              clients={clients}
              documents={filteredDocs}
              selectedClientId={selectedClientId}
              selectedSection={selectedSection}
              onSelectClient={setSelectedClientId}
              onSelectSection={setSelectedSection}
              onDownload={handleDownload}
              onDelete={deleteMutation.mutate}
              canEdit={canEdit}
              isLoading={loadingDocs}
              user={user}
              onUpload={openUploadDialog}
            />
          </TabsContent>

          {/* De Trabajo Tab */}
          <TabsContent value="trabajo">
            <TrabajoView
              documents={filteredDocs}
              selectedSection={selectedSection}
              onSelectSection={setSelectedSection}
              onDownload={handleDownload}
              onDelete={deleteMutation.mutate}
              canEdit={canEdit}
              isLoading={loadingDocs}
              onUpload={openUploadDialog}
            />
          </TabsContent>
        </Tabs>

        {/* Upload Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Subir Documento</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Archivo</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-1"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-select-file"
                >
                  {selectedFile ? selectedFile.name : "Seleccionar archivo"}
                </Button>
              </div>
              
              <div>
                <Label>Nombre (opcional)</Label>
                <Input
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  placeholder="Nombre personalizado"
                  data-testid="input-doc-name"
                />
              </div>
              
              <div>
                <Label>Categoría</Label>
                <Select 
                  value={uploadForm.rootCategory} 
                  onValueChange={(v) => setUploadForm({ ...uploadForm, rootCategory: v })}
                >
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desarrolladores">Desarrolladores</SelectItem>
                    <SelectItem value="clientes">Clientes</SelectItem>
                    <SelectItem value="trabajo">De Trabajo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {uploadForm.rootCategory === "desarrolladores" && (
                <>
                  <div>
                    <Label>Desarrollador</Label>
                    <Select 
                      value={uploadForm.developerId} 
                      onValueChange={(v) => setUploadForm({ ...uploadForm, developerId: v, developmentId: "", typologyId: "" })}
                    >
                      <SelectTrigger data-testid="select-developer">
                        <SelectValue placeholder="Selecciona desarrollador" />
                      </SelectTrigger>
                      <SelectContent>
                        {developers.map(dev => (
                          <SelectItem key={dev.id} value={dev.id}>{dev.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Show development selector - hide only when explicitly in developer legales context (no developmentId and section is developer legal) */}
                  {uploadForm.developerId && (
                    <div>
                      <Label>Desarrollo (opcional para documentos del desarrollador)</Label>
                      <Select 
                        value={uploadForm.developmentId} 
                        onValueChange={(v) => {
                          // When selecting a development, reset section to development section
                          const newSection = v ? DOCUMENT_SECTIONS.developmentLegales[0] : uploadForm.section;
                          setUploadForm({ ...uploadForm, developmentId: v, typologyId: "", section: newSection });
                        }}
                      >
                        <SelectTrigger data-testid="select-development">
                          <SelectValue placeholder="Ninguno (documentos del desarrollador)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Ninguno (documentos del desarrollador)</SelectItem>
                          {developments.filter(d => d.developerId === uploadForm.developerId).map(dev => (
                            <SelectItem key={dev.id} value={dev.id}>{dev.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {uploadForm.developmentId && (
                    <div>
                      <Label>Tipología (opcional)</Label>
                      <Select 
                        value={uploadForm.typologyId} 
                        onValueChange={(v) => setUploadForm({ ...uploadForm, typologyId: v })}
                      >
                        <SelectTrigger data-testid="select-typology">
                          <SelectValue placeholder="Todas las tipologías" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Ninguna (nivel desarrollo)</SelectItem>
                          {typologies
                            .filter(t => t.development === developments.find(d => d.id === uploadForm.developmentId)?.name)
                            .map(typ => (
                              <SelectItem key={typ.id} value={typ.id}>{`Tipo ${typ.type || typ.id}`}</SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div>
                    <Label>Sección</Label>
                    <Select 
                      value={uploadForm.section} 
                      onValueChange={(v) => setUploadForm({ ...uploadForm, section: v })}
                    >
                      <SelectTrigger data-testid="select-section">
                        <SelectValue placeholder="Selecciona sección" />
                      </SelectTrigger>
                      <SelectContent>
                        {uploadForm.typologyId && DOCUMENT_SECTIONS.typologyVenta.map(s => (
                          <SelectItem key={`typ-${s}`} value={s}>{SECTION_LABELS[s]}</SelectItem>
                        ))}
                        {uploadForm.developmentId && !uploadForm.typologyId && [
                          ...DOCUMENT_SECTIONS.developmentLegales.map(s => (
                            <SelectItem key={`dev-leg-${s}`} value={s}>{SECTION_LABELS[s]}</SelectItem>
                          )),
                          ...DOCUMENT_SECTIONS.developmentVenta.map(s => (
                            <SelectItem key={`dev-ven-${s}`} value={s}>{SECTION_LABELS[s]}</SelectItem>
                          ))
                        ]}
                        {uploadForm.developerId && !uploadForm.developmentId && DOCUMENT_SECTIONS.developerLegales.map(s => (
                          <SelectItem key={`devr-${s}`} value={s}>{SECTION_LABELS[s]}</SelectItem>
                        ))}
                        {!uploadForm.developerId && !uploadForm.typologyId && [
                          ...DOCUMENT_SECTIONS.developmentLegales.map(s => (
                            <SelectItem key={`all-leg-${s}`} value={s}>{SECTION_LABELS[s]}</SelectItem>
                          )),
                          ...DOCUMENT_SECTIONS.developmentVenta.map(s => (
                            <SelectItem key={`all-ven-${s}`} value={s}>{SECTION_LABELS[s]}</SelectItem>
                          ))
                        ]}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              {uploadForm.rootCategory === "clientes" && (
                <>
                  <div>
                    <Label>Cliente</Label>
                    <Select 
                      value={uploadForm.clientId} 
                      onValueChange={(v) => setUploadForm({ ...uploadForm, clientId: v })}
                    >
                      <SelectTrigger data-testid="select-client">
                        <SelectValue placeholder="Selecciona cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Sección</Label>
                    <Select 
                      value={uploadForm.section} 
                      onValueChange={(v) => setUploadForm({ ...uploadForm, section: v })}
                    >
                      <SelectTrigger data-testid="select-client-section">
                        <SelectValue placeholder="Selecciona sección" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_SECTIONS.clientSections.map(s => (
                          <SelectItem key={s} value={s}>{SECTION_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              {uploadForm.rootCategory === "trabajo" && (
                <div>
                  <Label>Carpeta</Label>
                  <Select 
                    value={uploadForm.section} 
                    onValueChange={(v) => setUploadForm({ ...uploadForm, section: v })}
                  >
                    <SelectTrigger data-testid="select-work-folder">
                      <SelectValue placeholder="Selecciona carpeta" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_SECTIONS.workFolders.map(s => (
                        <SelectItem key={s} value={s}>{SECTION_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Descripción (opcional)</Label>
                <Input
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Descripción del documento"
                  data-testid="input-description"
                />
              </div>

              {(uploadForm.rootCategory === "desarrolladores" && 
                (uploadForm.section === "imagenes" || uploadForm.section === "videos")) && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={uploadForm.shareable}
                    onCheckedChange={(v) => setUploadForm({ ...uploadForm, shareable: v })}
                    data-testid="switch-shareable"
                  />
                  <Label className="flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Compartir con clientes (Com.)
                  </Label>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!selectedFile || !uploadForm.rootCategory || uploadMutation.isPending}
                data-testid="button-confirm-upload"
              >
                {uploadMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Subir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Share Link Dialog */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Crear Link de Compartir
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {!generatedLink ? (
                <>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    <p className="font-medium mb-1">Ubicación a compartir:</p>
                    <p className="text-muted-foreground">
                      {activeTab === "desarrolladores" && (
                        <>
                          {selectedDeveloperId ? developers.find(d => d.id === selectedDeveloperId)?.name : "Todos los desarrolladores"}
                          {selectedDevelopmentId && ` > ${developments.find(d => d.id === selectedDevelopmentId)?.name}`}
                          {selectedTypologyId && ` > Tipología`}
                          {selectedSection && ` > ${SECTION_LABELS[selectedSection]}`}
                        </>
                      )}
                      {activeTab === "clientes" && (
                        <>
                          {selectedClientId ? clients.find(c => c.id === selectedClientId)?.name : "Todos los clientes"}
                          {selectedSection && ` > ${SECTION_LABELS[selectedSection]}`}
                        </>
                      )}
                      {activeTab === "trabajo" && "Carpeta de trabajo"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      <Label>Permitir ver documentos</Label>
                    </div>
                    <Switch
                      checked={shareForm.canView}
                      onCheckedChange={(v) => setShareForm({ ...shareForm, canView: v })}
                      data-testid="switch-can-view"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <Label>Permitir subir documentos</Label>
                    </div>
                    <Switch
                      checked={shareForm.canUpload}
                      onCheckedChange={(v) => setShareForm({ 
                        ...shareForm, 
                        canUpload: v,
                        requestedDocuments: v ? shareForm.requestedDocuments : []
                      })}
                      data-testid="switch-can-upload"
                    />
                  </div>

                  {/* Show document selection based on permissions */}
                  {(() => {
                    // Get existing documents in current location
                    const existingDocsInSection = documents.filter(d => {
                      if (activeTab === "desarrolladores") {
                        if (selectedTypologyId) {
                          return d.typologyId === selectedTypologyId && d.section === selectedSection;
                        } else if (selectedDevelopmentId) {
                          return d.developmentId === selectedDevelopmentId && !d.typologyId && d.section === selectedSection;
                        } else if (selectedDeveloperId) {
                          return d.developerId === selectedDeveloperId && !d.developmentId && d.section === selectedSection;
                        }
                      } else if (activeTab === "clientes") {
                        return d.clientId === selectedClientId && d.section === selectedSection;
                      }
                      return false;
                    });
                    
                    const existingDocTypes = [...new Set(existingDocsInSection.map(d => d.name))];
                    const allDocTypes = SECTION_DESCRIPTIONS[selectedSection] || [];
                    
                    // For canView: show only existing documents
                    // For canUpload only: show all possible document types to request
                    const docTypesToShow = shareForm.canView ? existingDocTypes : allDocTypes;
                    
                    if (!selectedSection || docTypesToShow.length === 0) {
                      if (shareForm.canView && selectedSection) {
                        return (
                          <div className="p-3 bg-muted/50 rounded-md">
                            <p className="text-sm text-muted-foreground">
                              No hay documentos subidos en esta sección para compartir.
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }
                    
                    return (
                      <div className="p-3 bg-muted/50 rounded-md space-y-3">
                        <Label className="text-sm font-medium">
                          {shareForm.canView 
                            ? `Documentos disponibles en ${SECTION_LABELS[selectedSection]}:`
                            : `Documentos a solicitar en ${SECTION_LABELS[selectedSection]}:`
                          }
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {shareForm.canView && shareForm.canUpload 
                            ? "Selecciona los documentos que el cliente podrá ver (y subir nuevos)"
                            : shareForm.canView 
                            ? "Selecciona los documentos que el cliente podrá ver"
                            : "Selecciona los documentos que el cliente debe subir"
                          }
                        </p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {docTypesToShow.map((docType) => (
                            <div key={docType} className="flex items-center gap-2">
                              <Checkbox
                                id={`req-${docType}`}
                                checked={shareForm.requestedDocuments.includes(docType)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setShareForm({
                                      ...shareForm,
                                      requestedDocuments: [...shareForm.requestedDocuments, docType]
                                    });
                                  } else {
                                    setShareForm({
                                      ...shareForm,
                                      requestedDocuments: shareForm.requestedDocuments.filter(d => d !== docType)
                                    });
                                  }
                                }}
                                data-testid={`checkbox-req-${docType}`}
                              />
                              <Label htmlFor={`req-${docType}`} className="text-sm cursor-pointer">
                                {docType}
                              </Label>
                            </div>
                          ))}
                        </div>
                        {shareForm.requestedDocuments.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground mb-1">
                              Seleccionados ({shareForm.requestedDocuments.length}):
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {shareForm.requestedDocuments.map(doc => (
                                <Badge key={doc} variant="secondary" className="text-xs">
                                  {doc}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <Label>Link permanente</Label>
                    </div>
                    <Switch
                      checked={shareForm.isPermanent}
                      onCheckedChange={(v) => setShareForm({ ...shareForm, isPermanent: v })}
                      data-testid="switch-permanent"
                    />
                  </div>

                  {!shareForm.isPermanent && (
                    <div>
                      <Label>Expira en (días)</Label>
                      <Select 
                        value={String(shareForm.expiresInDays)} 
                        onValueChange={(v) => setShareForm({ ...shareForm, expiresInDays: parseInt(v) })}
                      >
                        <SelectTrigger data-testid="select-expiry">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 día</SelectItem>
                          <SelectItem value="7">7 días</SelectItem>
                          <SelectItem value="30">30 días</SelectItem>
                          <SelectItem value="90">90 días</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label>Descripción (opcional)</Label>
                    <Input
                      value={shareForm.description}
                      onChange={(e) => setShareForm({ ...shareForm, description: e.target.value })}
                      placeholder="Nota para identificar este link"
                      data-testid="input-share-description"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Link creado exitosamente</span>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground mb-2">Link de acceso:</p>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={generatedLink} 
                        readOnly 
                        className="text-sm"
                        data-testid="input-generated-link"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => copyToClipboard(generatedLink)}
                        data-testid="button-copy-link"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => window.open(generatedLink, "_blank")}
                    data-testid="button-open-link"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir link
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              {!generatedLink ? (
                <>
                  <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateShareLink}
                    disabled={createShareLinkMutation.isPending || (!shareForm.canView && !shareForm.canUpload)}
                    data-testid="button-create-link"
                  >
                    {createShareLinkMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Crear Link
                  </Button>
                </>
              ) : (
                <Button onClick={() => setShareDialogOpen(false)}>
                  Cerrar
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Shared Links Dialog */}
        <Dialog open={sharedLinksViewOpen} onOpenChange={setSharedLinksViewOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link className="w-5 h-5" />
                Links Compartidos
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {sharedLinks.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No hay links compartidos creados.
                </p>
              ) : (
                <div className="divide-y">
                  {sharedLinks.map(link => (
                    <div 
                      key={link.id} 
                      className="py-4 space-y-2"
                      data-testid={`shared-link-${link.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {`Link ${link.token.substring(0, 8)}...`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {link.isPermanent ? (
                              <span className="text-green-600">Permanente</span>
                            ) : (
                              <>Expira: {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString("es-MX") : "N/A"}</>
                            )}
                            {" • "}Accesos: {link.accessCount || 0}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {link.canView && (
                              <Badge variant="outline" className="text-xs">
                                <Eye className="w-3 h-3 mr-1" />
                                Ver
                              </Badge>
                            )}
                            {link.canUpload && (
                              <Badge variant="outline" className="text-xs">
                                <Upload className="w-3 h-3 mr-1" />
                                Subir
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(`${window.location.origin}/s/${link.token}`)}
                            data-testid={`button-copy-${link.id}`}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(`/s/${link.token}`, "_blank")}
                            data-testid={`button-open-${link.id}`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("¿Eliminar este link?")) {
                                deleteShareLinkMutation.mutate(link.id);
                              }
                            }}
                            data-testid={`button-delete-${link.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setSharedLinksViewOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Desarrolladores hierarchical view component
interface DesarrolladoresViewProps {
  developers: Developer[];
  developments: Development[];
  typologies: Typology[];
  documents: Document[];
  selectedDeveloperId: string | null;
  selectedDevelopmentId: string | null;
  selectedTypologyId: string | null;
  sectionType: "legales" | "venta" | null;
  selectedSection: string | null;
  onSelectDeveloper: (id: string) => void;
  onSelectDevelopment: (id: string) => void;
  onSelectTypology: (id: string) => void;
  onSelectSectionType: (type: "legales" | "venta") => void;
  onSelectSection: (section: string) => void;
  onDownload: (doc: Document) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
  isLoading: boolean;
  onUpload: () => void;
  onUpdateTypologyName: (id: string, name: string) => void;
  userRole: string;
}

function DesarrolladoresView({
  developers,
  developments,
  typologies,
  documents,
  selectedDeveloperId,
  selectedDevelopmentId,
  selectedTypologyId,
  sectionType,
  selectedSection,
  onSelectDeveloper,
  onSelectDevelopment,
  onSelectTypology,
  onSelectSectionType,
  onSelectSection,
  onDownload,
  onDelete,
  canEdit,
  isLoading,
  onUpload,
  onUpdateTypologyName,
  userRole,
}: DesarrolladoresViewProps) {
  const [editingTypologyId, setEditingTypologyId] = useState<string | null>(null);
  const [editingTypologyName, setEditingTypologyName] = useState("");
  
  const startEditingTypology = (typ: Typology, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTypologyId(typ.id);
    setEditingTypologyName(typ.type || "");
  };
  
  const saveTypologyName = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingTypologyId && editingTypologyName.trim()) {
      onUpdateTypologyName(editingTypologyId, editingTypologyName.trim());
    }
    setEditingTypologyId(null);
    setEditingTypologyName("");
  };
  
  const cancelEditingTypology = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTypologyId(null);
    setEditingTypologyName("");
  };
  
  // Level 1: Show developers
  if (!selectedDeveloperId) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {developers.map(dev => (
          <Card 
            key={dev.id} 
            className="cursor-pointer hover-elevate"
            onClick={() => onSelectDeveloper(dev.id)}
            data-testid={`folder-developer-${dev.id}`}
          >
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <Building2 className="w-12 h-12 text-amber-500" />
              <span className="font-medium text-center">{dev.name}</span>
            </CardContent>
          </Card>
        ))}
        {developers.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-8">
            No hay desarrolladores registrados
          </p>
        )}
      </div>
    );
  }
  
  // Level 2: Show developer legales folder + developments
  if (!selectedDevelopmentId && !sectionType) {
    return (
      <div className="space-y-6">
        {/* Legales section at developer level */}
        <div>
          <h3 className="text-lg font-medium mb-3">Documentos del Desarrollador</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card 
              className="cursor-pointer hover-elevate"
              onClick={() => {
                onSelectSectionType("legales");
                onSelectSection("identidad");
              }}
              data-testid="folder-developer-legales"
            >
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <FileText className="w-12 h-12 text-primary" />
                <span className="font-medium">Legales</span>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Developments list */}
        <div>
          <h3 className="text-lg font-medium mb-3">Desarrollos</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {developments.map(dev => (
              <Card 
                key={dev.id} 
                className="cursor-pointer hover-elevate"
                onClick={() => onSelectDevelopment(dev.id)}
                data-testid={`folder-development-${dev.id}`}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <FolderOpen className="w-12 h-12 text-blue-500" />
                  <span className="font-medium text-center">{dev.name}</span>
                </CardContent>
              </Card>
            ))}
            {developments.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-8">
                No hay desarrollos para este desarrollador
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Developer legales - show tabbed view with all subsections
  if (selectedDeveloperId && !selectedDevelopmentId && sectionType === "legales") {
    // Filtrar secciones según permisos del rol (finanzas y asesor no ven convenios)
    const allSections = ["identidad", "corporativo", "convenios"];
    const developerLegalesSections = allSections.filter(section => {
      const permission = getFieldPermission('documentosLegalesDesarrollador', section, userRole);
      return permission !== 'none';
    });
    const activeSection = selectedSection || developerLegalesSections[0];
    
    return (
      <Tabs value={activeSection} onValueChange={onSelectSection} className="w-full">
        <TabsList className="mb-4">
          {developerLegalesSections.map(section => (
            <TabsTrigger 
              key={section} 
              value={section}
              className="capitalize relative pr-6"
              data-testid={`tab-${section}`}
            >
              {SECTION_LABELS[section] || section}
              {SECTION_DESCRIPTIONS[section] && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="absolute top-0 right-0 w-0 h-0 border-t-[12px] border-t-red-500 border-l-[12px] border-l-transparent cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-medium mb-1">Documentos que se suben aquí:</p>
                    <ul className="text-xs space-y-0.5">
                      {SECTION_DESCRIPTIONS[section].map((item, idx) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {developerLegalesSections.map(section => {
          const sectionDocs = documents.filter(d => 
            d.developerId === selectedDeveloperId && 
            !d.developmentId && 
            d.section === section
          );
          
          return (
            <TabsContent key={section} value={section}>
              <SectionDocumentGrid 
                documents={sectionDocs}
                onDownload={onDownload}
                onDelete={onDelete}
                canEdit={canEdit}
                isLoading={isLoading}
                emptyMessage={`No hay documentos en ${section}`}
                onUpload={onUpload}
                sectionDescription={SECTION_DESCRIPTIONS[section]}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    );
  }
  
  // Level 3: Show typologies + Legales/Venta sections for development
  if (!selectedTypologyId && !sectionType) {
    return (
      <div className="space-y-6">
        {/* Legales and Venta sections for development level */}
        <div>
          <h3 className="text-lg font-medium mb-3">Documentos del Desarrollo</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card 
              className="cursor-pointer hover-elevate"
              onClick={() => {
                onSelectSectionType("legales");
                onSelectSection("identidad");
              }}
              data-testid="folder-legales"
            >
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <FileText className="w-12 h-12 text-primary" />
                <span className="font-medium">Legales</span>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover-elevate"
              onClick={() => {
                onSelectSectionType("venta");
                onSelectSection("imagenes");
              }}
              data-testid="folder-venta"
            >
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <FileText className="w-12 h-12 text-purple-600" />
                <span className="font-medium">Venta</span>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Typologies */}
        {typologies.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-3">Tipologías</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {typologies.map(typ => (
                <Card 
                  key={typ.id} 
                  className="cursor-pointer hover-elevate"
                  onClick={() => {
                    if (editingTypologyId !== typ.id) {
                      onSelectTypology(typ.id);
                      onSelectSection("imagenes");
                    }
                  }}
                  data-testid={`folder-typology-${typ.id}`}
                >
                  <CardContent className="p-4 flex flex-col items-center gap-2">
                    <Folder className="w-12 h-12 text-amber-400" />
                    {editingTypologyId === typ.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editingTypologyName}
                          onChange={(e) => setEditingTypologyName(e.target.value)}
                          className="h-7 w-24 text-sm text-center"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveTypologyName(e as any);
                            if (e.key === "Escape") cancelEditingTypology(e as any);
                          }}
                          data-testid={`input-typology-name-${typ.id}`}
                        />
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveTypologyName} data-testid={`button-save-typology-${typ.id}`}>
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEditingTypology} data-testid={`button-cancel-typology-${typ.id}`}>
                          <X className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-center">{`Tipo ${typ.type || typ.id.substring(0, 8)}...`}</span>
                        {canEdit && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6"
                            onClick={(e) => startEditingTypology(typ, e)}
                            data-testid={`button-edit-typology-${typ.id}`}
                          >
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Typology selected - show Venta tabs directly (Imágenes, Videos)
  if (selectedTypologyId) {
    const typologySections = DOCUMENT_SECTIONS.typologyVenta;
    const activeSection = selectedSection || typologySections[0];
    
    return (
      <Tabs value={activeSection} onValueChange={onSelectSection} className="w-full">
        <TabsList className="mb-4">
          {typologySections.map(section => (
            <TabsTrigger key={section} value={section} data-testid={`tab-${section}`}>
              {SECTION_LABELS[section]}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {typologySections.map(section => {
          const sectionDocs = documents.filter(d => 
            d.typologyId === selectedTypologyId && d.section === section
          );
          
          return (
            <TabsContent key={section} value={section}>
              <SectionDocumentGrid 
                documents={sectionDocs}
                onDownload={onDownload}
                onDelete={onDelete}
                canEdit={canEdit}
                isLoading={isLoading}
                emptyMessage={`No hay ${SECTION_LABELS[section].toLowerCase()} en esta tipología`}
                onUpload={onUpload}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    );
  }
  
  // Development Legales - show tabbed view
  if (sectionType === "legales") {
    const developmentLegalesSections = DOCUMENT_SECTIONS.developmentLegales;
    const activeSection = selectedSection || developmentLegalesSections[0];
    
    return (
      <Tabs value={activeSection} onValueChange={onSelectSection} className="w-full">
        <TabsList className="mb-4 flex-wrap">
          {developmentLegalesSections.map(section => (
            <TabsTrigger key={section} value={section} className="relative pr-6" data-testid={`tab-${section}`}>
              {SECTION_LABELS[section]}
              {SECTION_DESCRIPTIONS[section] && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="absolute top-0 right-0 w-0 h-0 border-t-[12px] border-t-red-500 border-l-[12px] border-l-transparent cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-medium mb-1">Documentos que se suben aquí:</p>
                    <ul className="text-xs space-y-0.5">
                      {SECTION_DESCRIPTIONS[section].map((item, idx) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {developmentLegalesSections.map(section => {
          const sectionDocs = documents.filter(d => 
            d.developmentId === selectedDevelopmentId && d.section === section
          );
          
          return (
            <TabsContent key={section} value={section}>
              <SectionDocumentGrid 
                documents={sectionDocs}
                onDownload={onDownload}
                onDelete={onDelete}
                canEdit={canEdit}
                isLoading={isLoading}
                emptyMessage={`No hay documentos en ${SECTION_LABELS[section]}`}
                onUpload={onUpload}
                sectionDescription={SECTION_DESCRIPTIONS[section]}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    );
  }
  
  // Development Venta - show tabbed view
  if (sectionType === "venta") {
    const developmentVentaSections = DOCUMENT_SECTIONS.developmentVenta;
    const activeSection = selectedSection || developmentVentaSections[0];
    
    return (
      <Tabs value={activeSection} onValueChange={onSelectSection} className="w-full">
        <TabsList className="mb-4 flex-wrap">
          {developmentVentaSections.map(section => (
            <TabsTrigger key={section} value={section} data-testid={`tab-${section}`}>
              {SECTION_LABELS[section]}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {developmentVentaSections.map(section => {
          const sectionDocs = documents.filter(d => 
            d.developmentId === selectedDevelopmentId && d.section === section
          );
          
          return (
            <TabsContent key={section} value={section}>
              <SectionDocumentGrid 
                documents={sectionDocs}
                onDownload={onDownload}
                onDelete={onDelete}
                canEdit={canEdit}
                isLoading={isLoading}
                emptyMessage={`No hay ${SECTION_LABELS[section].toLowerCase()}`}
                onUpload={onUpload}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    );
  }
  
  // Fallback
  return (
    <DocumentsList 
      documents={documents} 
      onDownload={onDownload} 
      onDelete={onDelete}
      canEdit={canEdit}
      isLoading={isLoading}
    />
  );
}

// Reusable component for section document grids
function SectionDocumentGrid({
  documents,
  onDownload,
  onDelete,
  canEdit,
  isLoading,
  emptyMessage,
  onUpload,
  sectionDescription,
}: {
  documents: Document[];
  onDownload: (doc: Document) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
  isLoading: boolean;
  emptyMessage: string;
  onUpload?: () => void;
  sectionDescription?: string[];
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  
  if (documents.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{emptyMessage}</p>
          {canEdit && onUpload && (
            <Button onClick={onUpload} className="gap-2" data-testid="button-upload-section">
              <Plus className="w-4 h-4" />
              Subir Archivo
            </Button>
          )}
        </div>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {canEdit && onUpload && (
        <div className="flex justify-end">
          <Button onClick={onUpload} className="gap-2" data-testid="button-upload-section">
            <Plus className="w-4 h-4" />
            Subir Archivo
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map(doc => (
        <Card key={doc.id} className="overflow-hidden" data-testid={`document-${doc.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {getFileIcon(doc.mimeType)}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{doc.name}</h4>
                <p className="text-xs text-muted-foreground truncate">{doc.originalName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(doc.fileSize)}
                  </span>
                  {doc.shareable && (
                    <Badge variant="outline" className="text-xs">
                      <Share2 className="w-3 h-3 mr-1" />
                      Com.
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => onDownload(doc)}
                data-testid={`button-download-${doc.id}`}
              >
                <Download className="w-4 h-4 mr-1" />
                Descargar
              </Button>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(doc.id)}
                  data-testid={`button-delete-${doc.id}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      </div>
    </div>
  );
}

// Clientes view component
interface ClientesViewProps {
  clients: Client[];
  documents: Document[];
  selectedClientId: string | null;
  selectedSection: string | null;
  onSelectClient: (id: string) => void;
  onSelectSection: (section: string) => void;
  onDownload: (doc: Document) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
  isLoading: boolean;
  user: any;
  onUpload: () => void;
}

function ClientesView({
  clients,
  documents,
  selectedClientId,
  selectedSection,
  onSelectClient,
  onSelectSection,
  onDownload,
  onDelete,
  canEdit,
  isLoading,
  user,
  onUpload,
}: ClientesViewProps) {
  // Filter clients by asesor if not admin
  const visibleClients = user?.role === "admin" 
    ? clients 
    : clients.filter(c => c.assignedTo === user?.id);
  
  // Level 1: Show clients
  if (!selectedClientId) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {visibleClients.map(client => (
          <Card 
            key={client.id} 
            className="cursor-pointer hover-elevate"
            onClick={() => onSelectClient(client.id)}
            data-testid={`folder-client-${client.id}`}
          >
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <Users className="w-12 h-12 text-blue-500" />
              <span className="font-medium text-center">{client.name}</span>
              {client.email && (
                <span className="text-xs text-muted-foreground">{client.email}</span>
              )}
            </CardContent>
          </Card>
        ))}
        {visibleClients.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-8">
            No hay clientes {user?.role !== "admin" && "asignados"}
          </p>
        )}
      </div>
    );
  }
  
  // Show client sections as tabs
  const clientSections = DOCUMENT_SECTIONS.clientSections;
  const activeSection = selectedSection || clientSections[0];
  
  return (
    <Tabs value={activeSection} onValueChange={onSelectSection} className="w-full">
      <TabsList className="mb-4 flex-wrap">
        {clientSections.map(section => (
          <TabsTrigger key={section} value={section} data-testid={`tab-client-${section}`}>
            {SECTION_LABELS[section]}
          </TabsTrigger>
        ))}
      </TabsList>
      
      {clientSections.map(section => {
        const sectionDocs = documents.filter(d => 
          d.clientId === selectedClientId && d.section === section
        );
        
        return (
          <TabsContent key={section} value={section}>
            <SectionDocumentGrid 
              documents={sectionDocs}
              onDownload={onDownload}
              onDelete={onDelete}
              canEdit={canEdit}
              isLoading={isLoading}
              emptyMessage={`No hay ${SECTION_LABELS[section].toLowerCase()}`}
              onUpload={onUpload}
            />
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

// De Trabajo view component
interface TrabajoViewProps {
  documents: Document[];
  selectedSection: string | null;
  onSelectSection: (section: string) => void;
  onDownload: (doc: Document) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
  isLoading: boolean;
  onUpload: () => void;
}

function TrabajoView({
  documents,
  selectedSection,
  onSelectSection,
  onDownload,
  onDelete,
  canEdit,
  isLoading,
  onUpload,
}: TrabajoViewProps) {
  // Show work folders as tabs
  const workSections = DOCUMENT_SECTIONS.workFolders;
  const activeSection = selectedSection || workSections[0];
  
  return (
    <Tabs value={activeSection} onValueChange={onSelectSection} className="w-full">
      <TabsList className="mb-4 flex-wrap">
        {workSections.map(section => (
          <TabsTrigger key={section} value={section} data-testid={`tab-work-${section}`}>
            {SECTION_LABELS[section]}
          </TabsTrigger>
        ))}
      </TabsList>
      
      {workSections.map(section => {
        const sectionDocs = documents.filter(d => 
          d.rootCategory === "trabajo" && d.section === section
        );
        
        return (
          <TabsContent key={section} value={section}>
            <SectionDocumentGrid 
              documents={sectionDocs}
              onDownload={onDownload}
              onDelete={onDelete}
              canEdit={canEdit}
              isLoading={isLoading}
              emptyMessage={`No hay documentos en ${SECTION_LABELS[section]}`}
              onUpload={onUpload}
            />
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

// Documents list component
interface DocumentsListProps {
  documents: Document[];
  onDownload: (doc: Document) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
  isLoading: boolean;
}

function DocumentsList({ documents, onDownload, onDelete, canEdit, isLoading }: DocumentsListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No hay documentos en esta ubicación</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map(doc => (
        <Card key={doc.id} className="overflow-hidden" data-testid={`document-${doc.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {getFileIcon(doc.mimeType)}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{doc.name}</h4>
                <p className="text-xs text-muted-foreground truncate">{doc.originalName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(doc.fileSize)}
                  </span>
                  {doc.shareable && (
                    <Badge variant="outline" className="text-xs">
                      <Share2 className="w-3 h-3 mr-1" />
                      Com.
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => onDownload(doc)}
                data-testid={`button-download-${doc.id}`}
              >
                <Download className="w-4 h-4 mr-1" />
                Descargar
              </Button>
              {canEdit && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onDelete(doc.id)}
                  data-testid={`button-delete-${doc.id}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
