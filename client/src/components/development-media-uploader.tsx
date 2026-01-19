import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { DevelopmentMedia, Typology } from "@shared/schema";
import { 
  Upload, 
  Image, 
  Video, 
  Trash2, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Search,
  MapPin,
  Building2,
  ArrowLeft,
  Home
} from "lucide-react";

interface TypologyInfo {
  id: string;
  rowNumber: number;
  developer: string;
  development: string;
  city: string;
  zone: string;
  bedrooms: number | string | null;
  size: number | string | null;
  mediaCount: number;
}

export function DevelopmentMediaUploader() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTypology, setSelectedTypology] = useState<TypologyInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allMedia = [], isLoading: isLoadingMedia } = useQuery<DevelopmentMedia[]>({
    queryKey: ["/api/development-media"],
  });

  const { data: typologies = [] } = useQuery<Typology[]>({
    queryKey: ["/api/typologies"],
  });

  const typologyList = useMemo(() => {
    const sortedTypologies = [...typologies].sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return aDate - bDate;
    });
    
    return sortedTypologies.map((t, index): TypologyInfo => {
      const mediaCount = allMedia.filter(m => m.typologyId === t.id).length;
      return {
        id: t.id,
        rowNumber: index + 1,
        developer: t.developer || "",
        development: t.development || "",
        city: t.city || "",
        zone: t.zone || "",
        bedrooms: t.bedrooms,
        size: t.size,
        mediaCount,
      };
    });
  }, [typologies, allMedia]);

  const filteredTypologies = useMemo(() => {
    if (!searchTerm) return typologyList;
    const term = searchTerm.toLowerCase();
    return typologyList.filter(t => 
      t.development.toLowerCase().includes(term) ||
      t.developer.toLowerCase().includes(term) ||
      t.city.toLowerCase().includes(term) ||
      t.zone.toLowerCase().includes(term) ||
      t.rowNumber.toString().includes(term)
    );
  }, [typologyList, searchTerm]);

  const selectedMedia = selectedTypology
    ? allMedia.filter(m => m.typologyId === selectedTypology.id)
    : [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/development-media/${id}`);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/development-media"] });
      toast({ title: "Archivo eliminado" });
    },
    onError: () => {
      toast({ title: "Error al eliminar", variant: "destructive" });
    },
  });


  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!selectedTypology) {
      toast({
        title: "Selecciona una tipología",
        description: "Debes seleccionar una tipología antes de subir archivos",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("typologyId", selectedTypology.id);
    
    Array.from(files).forEach(file => {
      formData.append("files", file);
    });

    try {
      const res = await fetch("/api/development-media", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("muros_session")}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Error al subir archivos");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/development-media"] });
      toast({
        title: "Archivos subidos",
        description: `${files.length} archivo(s) subidos exitosamente`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron subir los archivos",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader 
        className="cursor-pointer py-3 px-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="w-4 h-4 text-primary" />
            Imágenes y Videos por Tipología
            <Badge variant="secondary" className="ml-2">{allMedia.length}</Badge>
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {selectedTypology ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTypology(null)}
                  className="gap-2"
                  data-testid="button-back-to-list"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al listado
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  data-testid="input-file-upload"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-2"
                  data-testid="button-upload"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Subir Archivos
                </Button>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    #{selectedTypology.rowNumber}
                  </Badge>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedTypology.development}</h3>
                    <p className="text-sm text-muted-foreground">{selectedTypology.developer}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedTypology.city}
                  </span>
                  <span>{selectedTypology.zone}</span>
                  {selectedTypology.bedrooms && (
                    <span className="flex items-center gap-1">
                      <Home className="w-3 h-3" />
                      {selectedTypology.bedrooms} rec
                    </span>
                  )}
                  {selectedTypology.size && (
                    <span>{selectedTypology.size} m²</span>
                  )}
                </div>
              </div>

              {selectedMedia.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay archivos para esta tipología. Sube imágenes o videos.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {selectedMedia.map(media => (
                    <div
                      key={media.id}
                      className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
                    >
                      {media.type === "video" ? (
                        <video
                          src={media.url}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={media.url}
                          alt={`Tipología ${selectedTypology.rowNumber}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                      
                      {media.type === "video" && (
                        <div className="absolute top-1 left-1">
                          <Badge variant="secondary" className="h-5 px-1.5">
                            <Video className="w-3 h-3" />
                          </Badge>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deleteMutation.mutate(media.id)}
                          data-testid={`button-delete-${media.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por #, desarrollo, desarrollador, ciudad o zona..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>

              {isLoadingMedia ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTypologies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron tipologías
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-center px-2 py-2 font-medium w-12">#</th>
                        <th className="text-left px-4 py-2 font-medium">Ciudad</th>
                        <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Zona</th>
                        <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Desarrollador</th>
                        <th className="text-left px-4 py-2 font-medium">Desarrollo</th>
                        <th className="text-center px-4 py-2 font-medium w-20 hidden lg:table-cell">Recámaras</th>
                        <th className="text-center px-4 py-2 font-medium w-24">Medios</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTypologies.map((typ) => (
                        <tr
                          key={typ.id}
                          className="border-t hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedTypology(typ)}
                          data-testid={`row-typology-${typ.rowNumber}`}
                        >
                          <td className="px-2 py-3 text-center text-muted-foreground text-sm">
                            {typ.rowNumber}
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              {typ.city}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                            {typ.zone}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                            {typ.developer}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-primary shrink-0" />
                              <span className="font-medium">{typ.development}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center hidden lg:table-cell">
                            {typ.bedrooms || "-"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={typ.mediaCount > 0 ? "default" : "secondary"}>
                              {typ.mediaCount}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
