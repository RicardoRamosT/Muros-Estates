import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
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
  Loader2
} from "lucide-react";
import { DOCUMENT_CATEGORIES } from "@shared/constants";
import { DEVELOPERS, DEVELOPMENTS } from "@shared/constants";
import type { Document } from "@shared/schema";

type CategoryKey = keyof typeof DOCUMENT_CATEGORIES;

interface BreadcrumbItem {
  label: string;
  path: string[];
}

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

export default function AdminDocuments() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    name: "",
    category: "",
    subcategory: "",
    folder: "",
    subfolder: "",
    developerId: "",
    developmentId: "",
    description: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
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
      setUploadForm({
        name: "",
        category: "",
        subcategory: "",
        folder: "",
        subfolder: "",
        developerId: "",
        developmentId: "",
        description: "",
      });
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

  const handleUpload = () => {
    if (!selectedFile || !uploadForm.category) {
      toast({ title: "Selecciona un archivo y categoría", variant: "destructive" });
      return;
    }
    
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("name", uploadForm.name || selectedFile.name);
    formData.append("category", uploadForm.category);
    if (uploadForm.subcategory) formData.append("subcategory", uploadForm.subcategory);
    if (uploadForm.folder) formData.append("folder", uploadForm.folder);
    if (uploadForm.subfolder) formData.append("subfolder", uploadForm.subfolder);
    if (uploadForm.developerId) formData.append("developerId", uploadForm.developerId);
    if (uploadForm.developmentId) formData.append("developmentId", uploadForm.developmentId);
    if (uploadForm.description) formData.append("description", uploadForm.description);
    
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

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [{ label: "Documentos", path: [] }];
    
    if (currentPath.length > 0) {
      const category = DOCUMENT_CATEGORIES[currentPath[0] as CategoryKey];
      if (category) {
        items.push({ label: category.label, path: [currentPath[0]] });
      }
    }
    
    if (currentPath.length > 1) {
      items.push({ label: currentPath[1], path: [currentPath[0], currentPath[1]] });
    }
    
    if (currentPath.length > 2) {
      items.push({ label: currentPath[2], path: [currentPath[0], currentPath[1], currentPath[2]] });
    }
    
    return items;
  };

  const getFolderContents = () => {
    if (currentPath.length === 0) {
      return Object.entries(DOCUMENT_CATEGORIES).map(([key, value]) => ({
        type: "folder" as const,
        id: key,
        name: value.label,
        icon: value.icon,
      }));
    }
    
    const categoryKey = currentPath[0] as CategoryKey;
    const category = DOCUMENT_CATEGORIES[categoryKey];
    
    if (!category) return [];
    
    if (currentPath.length === 1) {
      if (categoryKey === "clientes") {
        return Object.entries(category.folders).map(([key, value]) => ({
          type: "folder" as const,
          id: key,
          name: value.label,
          icon: "Folder",
        }));
      } else if (categoryKey === "desarrolladores") {
        return DEVELOPERS.map(dev => ({
          type: "folder" as const,
          id: dev,
          name: dev,
          icon: "Building2",
        }));
      } else if (categoryKey === "upload") {
        return DEVELOPERS.map(dev => ({
          type: "folder" as const,
          id: dev,
          name: dev,
          icon: "Building2",
        }));
      }
    }
    
    if (currentPath.length === 2) {
      if (categoryKey === "desarrolladores" || categoryKey === "upload") {
        return DEVELOPMENTS.map(dev => ({
          type: "folder" as const,
          id: dev,
          name: dev,
          icon: "FolderOpen",
        }));
      }
    }
    
    if (currentPath.length === 3 && categoryKey === "upload") {
      const uploadCategory = DOCUMENT_CATEGORIES.upload;
      return Object.entries(uploadCategory.folders).map(([key, value]) => ({
        type: "folder" as const,
        id: key,
        name: value.label,
        icon: "Folder",
      }));
    }
    
    return [];
  };

  const getFilteredDocuments = () => {
    let filtered = documents;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.name.toLowerCase().includes(query) ||
        doc.originalName.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query)
      );
    } else if (currentPath.length > 0) {
      const [category, second, third, fourth] = currentPath;
      filtered = filtered.filter(doc => {
        if (doc.category !== category) return false;
        if (category === "clientes" && second && doc.subcategory !== second) return false;
        if ((category === "desarrolladores" || category === "upload") && second && doc.developerId !== second) return false;
        if (third && doc.developmentId !== third) return false;
        if (fourth && doc.folder !== fourth) return false;
        return true;
      });
    }
    
    return filtered;
  };

  const folders = getFolderContents();
  const filteredDocs = getFilteredDocuments();
  const breadcrumbs = getBreadcrumbs();
  const showDocuments = currentPath.length >= 2 || searchQuery;

  const getFolderIcon = (iconName: string) => {
    switch (iconName) {
      case "Users": return <Users className="w-8 h-8 text-blue-500" />;
      case "Building2": return <Building2 className="w-8 h-8 text-amber-500" />;
      case "Upload": return <Upload className="w-8 h-8 text-green-500" />;
      case "FolderOpen": return <FolderOpen className="w-8 h-8 text-amber-400" />;
      default: return <Folder className="w-8 h-8 text-amber-500" />;
    }
  };

  return (
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
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-upload">
                <Plus className="w-4 h-4" />
                Subir Documento
              </Button>
            </DialogTrigger>
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
                    value={uploadForm.category}
                    onValueChange={(v) => setUploadForm({ ...uploadForm, category: v, subcategory: "", folder: "" })}
                  >
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOCUMENT_CATEGORIES).map(([key, value]) => (
                        <SelectItem key={key} value={key}>{value.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {(uploadForm.category === "desarrolladores" || uploadForm.category === "upload") && (
                  <>
                    <div>
                      <Label>Desarrollador</Label>
                      <Select
                        value={uploadForm.developerId}
                        onValueChange={(v) => setUploadForm({ ...uploadForm, developerId: v })}
                      >
                        <SelectTrigger data-testid="select-developer">
                          <SelectValue placeholder="Seleccionar desarrollador" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEVELOPERS.map((dev) => (
                            <SelectItem key={dev} value={dev}>{dev}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Desarrollo</Label>
                      <Select
                        value={uploadForm.developmentId}
                        onValueChange={(v) => setUploadForm({ ...uploadForm, developmentId: v })}
                      >
                        <SelectTrigger data-testid="select-development">
                          <SelectValue placeholder="Seleccionar desarrollo" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEVELOPMENTS.map((dev) => (
                            <SelectItem key={dev} value={dev}>{dev}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                {uploadForm.category === "clientes" && (
                  <div>
                    <Label>Subcategoría</Label>
                    <Select
                      value={uploadForm.subcategory}
                      onValueChange={(v) => setUploadForm({ ...uploadForm, subcategory: v })}
                    >
                      <SelectTrigger data-testid="select-subcategory">
                        <SelectValue placeholder="Seleccionar subcategoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DOCUMENT_CATEGORIES.clientes.folders).map(([key, value]) => (
                          <SelectItem key={key} value={key}>{value.label}</SelectItem>
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
                    data-testid="input-doc-description"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button 
                  onClick={handleUpload} 
                  disabled={uploadMutation.isPending || !selectedFile}
                  data-testid="button-submit-upload"
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Subir
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {!canView && (
        <div className="text-center py-12 text-muted-foreground">
          No tienes permiso para ver documentos
        </div>
      )}
      
      {canView && (
        <>
          <div className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <button
                  onClick={() => setCurrentPath(item.path)}
                  className={`hover:text-primary ${
                    index === breadcrumbs.length - 1 ? "font-medium" : "text-muted-foreground"
                  }`}
                  data-testid={`breadcrumb-${index}`}
                >
                  {index === 0 && <Home className="w-4 h-4 inline mr-1" />}
                  {item.label}
                </button>
              </div>
            ))}
          </div>
      
          {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {folders.map((folder) => (
            <Card
              key={folder.id}
              className="hover-elevate cursor-pointer"
              onClick={() => setCurrentPath([...currentPath, folder.id])}
              data-testid={`folder-${folder.id}`}
            >
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                {getFolderIcon(folder.icon)}
                <span className="text-sm font-medium line-clamp-2">{folder.name}</span>
              </CardContent>
            </Card>
          ))}
          
          {showDocuments && filteredDocs.map((doc) => (
            <Card key={doc.id} className="group" data-testid={`document-${doc.id}`}>
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center relative">
                {getFileIcon(doc.mimeType)}
                <span className="text-sm font-medium line-clamp-2">{doc.name}</span>
                <span className="text-xs text-muted-foreground">{formatFileSize(doc.fileSize)}</span>
                
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(doc);
                    }}
                    data-testid={`download-${doc.id}`}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {canEdit && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("¿Eliminar este documento?")) {
                        deleteMutation.mutate(doc.id);
                      }
                    }}
                    data-testid={`delete-${doc.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {showDocuments && filteredDocs.length === 0 && folders.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No hay documentos en esta ubicación
            </div>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
}
