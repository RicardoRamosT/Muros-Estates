import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Download, Upload, FileText, Image, Video, AlertTriangle, CheckCircle, File, LockOpen, Circle, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SharedDocument {
  id: string;
  name: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  section: string;
  createdAt: string;
}

interface SharedLinkData {
  link: {
    id: string;
    canView: boolean;
    canUpload: boolean;
    targetType: "document" | "folder";
    section: string | null;
    requestedDocuments: string[] | null;
  };
  documents: SharedDocument[];
}

const SECTION_LABELS: Record<string, string> = {
  identidad: "Documentos de Identidad",
  corporativo: "Documentos Corporativos",
  convenios: "Convenios",
  inmueble: "Documentos del Inmueble",
  comite: "Comité",
  ofertaContrato: "Oferta y Contrato",
  ejercicios: "Ejercicios Financieros",
  imagenes: "Imágenes",
  videos: "Videos",
  renders: "Renders",
  planos: "Planos",
  fichas: "Fichas Técnicas",
  cotizaciones: "Cotizaciones",
  documentosIdentidad: "Documentos de Identidad",
  reciboSeparacion: "Recibo de Separación",
  cartas: "Cartas",
  checklists: "Checklists",
  productos: "Productos",
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image className="w-8 h-8 text-blue-500" />;
  if (mimeType.startsWith("video/")) return <Video className="w-8 h-8 text-purple-500" />;
  if (mimeType === "application/pdf") return <FileText className="w-8 h-8 text-red-500" />;
  return <File className="w-8 h-8 text-gray-500" />;
}

export default function PublicShare() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [documentFiles, setDocumentFiles] = useState<Record<string, File | null>>({});
  const [uploadedDocs, setUploadedDocs] = useState<Set<string>>(new Set());
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<SharedLinkData>({
    queryKey: ["/api/public/share", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/share/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al cargar el contenido");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const results = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        
        const res = await fetch(`/api/public/share/${token}/upload`, {
          method: "POST",
          body: formData,
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error al subir archivo");
        }
        
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/public/share", token] });
      setUploadingFiles([]);
      toast({
        title: "Archivos subidos",
        description: "Los archivos se han subido correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al subir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadSingleDocMutation = useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);
      
      const res = await fetch(`/api/public/share/${token}/upload`, {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al subir archivo");
      }
      
      return res.json();
    },
    onSuccess: async (_, variables) => {
      await queryClient.refetchQueries({ queryKey: ["/api/public/share", token] });
      setUploadedDocs(prev => new Set(Array.from(prev).concat(variables.documentType)));
      setDocumentFiles(prev => ({ ...prev, [variables.documentType]: null }));
      toast({
        title: "Documento subido",
        description: `${variables.documentType} se ha subido correctamente`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al subir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadingFiles(files);
  };

  const handleDocumentFileSelect = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setDocumentFiles(prev => ({ ...prev, [docType]: file }));
  };

  const handleUploadSingleDoc = async (docType: string) => {
    const file = documentFiles[docType];
    if (!file) return;
    
    setUploadingDoc(docType);
    try {
      await uploadSingleDocMutation.mutateAsync({ file, documentType: docType });
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleUpload = async () => {
    if (uploadingFiles.length === 0) return;
    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync(uploadingFiles);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = (doc: SharedDocument) => {
    window.open(`/api/public/share/${token}/document/${doc.id}/download`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Cargando contenido compartido...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="w-16 h-16 mx-auto text-destructive" />
            <h2 className="text-xl font-semibold">Link no disponible</h2>
            <p className="text-muted-foreground">
              {(error as Error)?.message || "Este link ha expirado o no es válido."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { link, documents } = data;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3">
            <LockOpen className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Documentos Compartidos</h1>
              <p className="text-primary-foreground/80">
                {link.canView && link.canUpload
                  ? "Puedes ver y subir documentos"
                  : link.canView
                  ? "Puedes ver documentos"
                  : "Puedes subir documentos"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {link.canView && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documentos disponibles
              </CardTitle>
              {link.section && (
                <CardDescription>
                  Sección: {SECTION_LABELS[link.section] || link.section}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay documentos disponibles en este momento.
                </p>
              ) : (
                <div className="divide-y">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="py-4 flex items-center justify-between gap-4"
                      data-testid={`document-row-${doc.id}`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {getFileIcon(doc.mimeType)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" title={doc.originalName}>
                            {doc.originalName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(doc.fileSize)} • {new Date(doc.createdAt).toLocaleDateString("es-MX")}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        data-testid={`button-download-${doc.id}`}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Descargar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {link.canUpload && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Subir documentos
              </CardTitle>
              <CardDescription>
                {link.requestedDocuments && link.requestedDocuments.length > 0 
                  ? "Por favor sube cada documento en su sección correspondiente."
                  : "Sube tus documentos aquí. Se aceptan archivos PDF, imágenes y videos."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {link.requestedDocuments && link.requestedDocuments.length > 0 ? (
                <div className="space-y-4">
                  {Array.from(new Set(link.requestedDocuments)).map((docType, idx) => {
                    const isUploaded = uploadedDocs.has(docType);
                    const selectedFile = documentFiles[docType];
                    const isCurrentlyUploading = uploadingDoc === docType;
                    
                    return (
                      <div 
                        key={idx}
                        className={`p-4 border rounded-lg transition-colors ${
                          isUploaded 
                            ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700" 
                            : "bg-card border-border"
                        }`}
                        data-testid={`upload-section-${idx}`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`mt-0.5 flex-shrink-0 ${isUploaded ? "text-green-600" : "text-muted-foreground"}`}>
                            {isUploaded ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              <Circle className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium ${isUploaded ? "text-green-700 dark:text-green-400" : ""}`}>
                              {docType}
                            </h4>
                            {isUploaded && (
                              <p className="text-sm text-green-600 dark:text-green-400">
                                Documento subido correctamente
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {!isUploaded && (
                          <div className="ml-8 space-y-3">
                            <div className="flex items-center gap-2">
                              <Input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.gif,.mp4,.mov,.avi"
                                onChange={(e) => handleDocumentFileSelect(docType, e)}
                                className="flex-1"
                                data-testid={`input-file-${idx}`}
                              />
                            </div>
                            
                            {selectedFile && (
                              <div className="flex items-center justify-between gap-2 p-2 bg-muted rounded">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  <span className="text-sm truncate">{selectedFile.name}</span>
                                  <span className="text-xs text-muted-foreground flex-shrink-0">
                                    ({formatFileSize(selectedFile.size)})
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDocumentFiles(prev => ({ ...prev, [docType]: null }))}
                                  data-testid={`button-clear-${idx}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                            
                            <Button
                              onClick={() => handleUploadSingleDoc(docType)}
                              disabled={!selectedFile || isCurrentlyUploading}
                              size="sm"
                              className="w-full"
                              data-testid={`button-upload-${idx}`}
                            >
                              {isCurrentlyUploading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Subiendo...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Subir {docType}
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {uploadedDocs.size === Array.from(new Set(link.requestedDocuments)).length && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-300 dark:border-green-700">
                      <CheckCircle className="w-6 h-6" />
                      <div>
                        <p className="font-medium">Todos los documentos han sido subidos</p>
                        <p className="text-sm text-green-600/80">Gracias por completar la solicitud.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="file-input">Seleccionar archivos</Label>
                    <Input
                      id="file-input"
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.gif,.mp4,.mov,.avi"
                      onChange={handleFileSelect}
                      className="mt-1"
                      data-testid="input-file-upload"
                    />
                  </div>

                  {uploadingFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Archivos seleccionados:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {uploadingFiles.map((file, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            {file.name} ({formatFileSize(file.size)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button
                    onClick={handleUpload}
                    disabled={uploadingFiles.length === 0 || isUploading}
                    className="w-full"
                    data-testid="button-upload-submit"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Subir {uploadingFiles.length > 0 ? `(${uploadingFiles.length} archivos)` : ""}
                      </>
                    )}
                  </Button>

                  {uploadMutation.isSuccess && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md">
                      <CheckCircle className="w-5 h-5" />
                      <span>Archivos subidos correctamente</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <footer className="bg-muted py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Muros - Plataforma Inmobiliaria</p>
        </div>
      </footer>
    </div>
  );
}
