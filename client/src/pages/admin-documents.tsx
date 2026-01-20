import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  CheckCircle
} from "lucide-react";
import { DOCUMENT_SECTIONS } from "@shared/schema";
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
    shareable: false,
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

  // Shared links state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareForm, setShareForm] = useState({
    canView: true,
    canUpload: false,
    isPermanent: false,
    expiresInDays: 7,
    description: "",
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
      return apiRequest("POST", "/api/shared-links", data);
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

  const handleCreateShareLink = () => {
    const linkData: any = {
      targetType: "folder",
      rootCategory: activeTab,
      canView: shareForm.canView,
      canUpload: shareForm.canUpload,
      isPermanent: shareForm.isPermanent,
      description: shareForm.description || undefined,
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
      shareable: false,
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

  // Reset navigation when changing tabs
  useEffect(() => {
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

  // Open upload dialog with context
  const openUploadDialog = () => {
    setUploadForm({
      ...uploadForm,
      rootCategory: activeTab,
      developerId: selectedDeveloperId || "",
      developmentId: selectedDevelopmentId || "",
      typologyId: selectedTypologyId || "",
      clientId: selectedClientId || "",
      section: selectedSection || "",
    });
    setUploadDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Documentos</h1>
            <p className="text-muted-foreground">Gestiona los documentos para asesores y clientes</p>
          </div>
        
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
                <Button className="gap-2" onClick={openUploadDialog} data-testid="button-upload">
                  <Plus className="w-4 h-4" />
                  Subir Documento
                </Button>
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
                    });
                    setShareDialogOpen(true);
                  }}
                  data-testid="button-share"
                >
                  <Share2 className="w-4 h-4" />
                  Compartir
                </Button>
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
                  
                  {uploadForm.developerId && (
                    <div>
                      <Label>Desarrollo</Label>
                      <Select 
                        value={uploadForm.developmentId} 
                        onValueChange={(v) => setUploadForm({ ...uploadForm, developmentId: v, typologyId: "" })}
                      >
                        <SelectTrigger data-testid="select-development">
                          <SelectValue placeholder="Selecciona desarrollo" />
                        </SelectTrigger>
                        <SelectContent>
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
                          {(() => {
                            const devName = developments.find(d => d.id === uploadForm.developmentId)?.name;
                            return typologies.filter(t => t.development === devName).map(typ => (
                              <SelectItem key={typ.id} value={typ.id}>{`Tipo ${typ.type || typ.id}`}</SelectItem>
                            ));
                          })()}
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
                        <SelectItem value="" disabled>-- Legales --</SelectItem>
                        {DOCUMENT_SECTIONS.developmentLegales.map(s => (
                          <SelectItem key={s} value={s}>{SECTION_LABELS[s]}</SelectItem>
                        ))}
                        <SelectItem value="" disabled>-- Venta --</SelectItem>
                        {DOCUMENT_SECTIONS.developmentVenta.map(s => (
                          <SelectItem key={s} value={s}>{SECTION_LABELS[s]}</SelectItem>
                        ))}
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
                      onCheckedChange={(v) => setShareForm({ ...shareForm, canUpload: v })}
                      data-testid="switch-can-upload"
                    />
                  </div>

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
}: DesarrolladoresViewProps) {
  
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
              onClick={() => onSelectSectionType("legales")}
              data-testid="folder-developer-legales"
            >
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <FileText className="w-12 h-12 text-green-600" />
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
  
  // Developer legales subsections (no development selected)
  if (selectedDeveloperId && !selectedDevelopmentId && sectionType === "legales" && !selectedSection) {
    const developerLegalesSections = ["identidad", "corporativo", "convenios"];
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {developerLegalesSections.map(section => (
          <Card 
            key={section} 
            className="cursor-pointer hover-elevate"
            onClick={() => onSelectSection(section)}
            data-testid={`folder-section-${section}`}
          >
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <Folder className="w-12 h-12 text-emerald-500" />
              <span className="font-medium capitalize">{section}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  // Developer legales - show documents for specific section
  if (selectedDeveloperId && !selectedDevelopmentId && sectionType === "legales" && selectedSection) {
    const sectionDocs = documents.filter(d => 
      d.developerId === selectedDeveloperId && 
      !d.developmentId && 
      d.section === selectedSection
    );
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      );
    }
    
    if (sectionDocs.length === 0) {
      return (
        <Card className="p-8">
          <p className="text-center text-muted-foreground">
            No hay documentos en {selectedSection}
          </p>
        </Card>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectionDocs.map(doc => (
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
              onClick={() => onSelectSectionType("legales")}
              data-testid="folder-legales"
            >
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <FileText className="w-12 h-12 text-green-600" />
                <span className="font-medium">Legales</span>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover-elevate"
              onClick={() => onSelectSectionType("venta")}
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
                  onClick={() => onSelectTypology(typ.id)}
                  data-testid={`folder-typology-${typ.id}`}
                >
                  <CardContent className="p-4 flex flex-col items-center gap-2">
                    <Folder className="w-12 h-12 text-amber-400" />
                    <span className="font-medium text-center">{`Tipo ${typ.type || typ.id}`}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // If typology selected, show Venta section only
  if (selectedTypologyId && !sectionType) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className="cursor-pointer hover-elevate"
          onClick={() => onSelectSectionType("venta")}
          data-testid="folder-typology-venta"
        >
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <FileText className="w-12 h-12 text-purple-600" />
            <span className="font-medium">Venta</span>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Level 4: Show subsections (Legales or Venta sections)
  if (sectionType && !selectedSection) {
    const sections = sectionType === "legales" 
      ? (selectedTypologyId ? [] : DOCUMENT_SECTIONS.developmentLegales)
      : (selectedTypologyId ? DOCUMENT_SECTIONS.typologyVenta : DOCUMENT_SECTIONS.developmentVenta);
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sections.map(section => (
          <Card 
            key={section} 
            className="cursor-pointer hover-elevate"
            onClick={() => onSelectSection(section)}
            data-testid={`folder-section-${section}`}
          >
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <Folder className="w-12 h-12 text-amber-500" />
              <span className="font-medium text-center">{SECTION_LABELS[section]}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  // Level 5: Show documents
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
  
  // Level 2: Show client sections
  if (!selectedSection) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {DOCUMENT_SECTIONS.clientSections.map(section => (
          <Card 
            key={section} 
            className="cursor-pointer hover-elevate"
            onClick={() => onSelectSection(section)}
            data-testid={`folder-client-section-${section}`}
          >
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <Folder className="w-12 h-12 text-amber-500" />
              <span className="font-medium text-center">{SECTION_LABELS[section]}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  // Level 3: Show documents
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

// De Trabajo view component
interface TrabajoViewProps {
  documents: Document[];
  selectedSection: string | null;
  onSelectSection: (section: string) => void;
  onDownload: (doc: Document) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
  isLoading: boolean;
}

function TrabajoView({
  documents,
  selectedSection,
  onSelectSection,
  onDownload,
  onDelete,
  canEdit,
  isLoading,
}: TrabajoViewProps) {
  // Level 1: Show work folders
  if (!selectedSection) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {DOCUMENT_SECTIONS.workFolders.map(section => (
          <Card 
            key={section} 
            className="cursor-pointer hover-elevate"
            onClick={() => onSelectSection(section)}
            data-testid={`folder-work-${section}`}
          >
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <Briefcase className="w-12 h-12 text-slate-600" />
              <span className="font-medium text-center">{SECTION_LABELS[section]}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  // Level 2: Show documents
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
