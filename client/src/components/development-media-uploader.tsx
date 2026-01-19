import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DEVELOPERS, DEVELOPMENTS } from "@shared/constants";
import type { DevelopmentMedia } from "@shared/schema";
import { 
  Upload, 
  Image, 
  Video, 
  Trash2, 
  Star, 
  Loader2,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export function DevelopmentMediaUploader() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDeveloper, setSelectedDeveloper] = useState<string>("");
  const [selectedDevelopment, setSelectedDevelopment] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allMedia = [], isLoading } = useQuery<DevelopmentMedia[]>({
    queryKey: ["/api/development-media"],
  });

  const filteredMedia = selectedDevelopment
    ? allMedia.filter(m => m.development === selectedDevelopment)
    : allMedia;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/development-media/${id}`);
      if (!res.ok) throw new Error("Error al eliminar");
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

  const setPrimaryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PUT", `/api/development-media/${id}`, { isPrimary: true });
      if (!res.ok) throw new Error("Error al actualizar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/development-media"] });
      toast({ title: "Imagen principal actualizada" });
    },
    onError: () => {
      toast({ title: "Error al actualizar", variant: "destructive" });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!selectedDeveloper || !selectedDevelopment) {
      toast({
        title: "Selecciona desarrollador y desarrollo",
        description: "Debes seleccionar un desarrollador y desarrollo antes de subir archivos",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("developer", selectedDeveloper);
    formData.append("development", selectedDevelopment);
    
    Array.from(files).forEach(file => {
      formData.append("files", file);
    });

    try {
      const res = await fetch("/api/development-media", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionToken")}`,
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

  const developmentsByDeveloper = DEVELOPMENTS.filter(dev => {
    if (!selectedDeveloper) return true;
    const developerMapping: Record<string, string[]> = {
      "IDEI": ["Kyo Constella"],
      "PLATE": ["ALTO"],
      "Create": ["Novus"],
      "Proyectos 9": ["Alura"],
      "Grupo Verzache": ["Kori"],
      "Hines": ["Moca Verde"],
      "Xoma": ["SoHo"],
      "CIGO": ["Arena Fundidora"],
      "Koinox": ["Avalon"],
      "Soluciones Urbanas": ["Vertik"],
    };
    return developerMapping[selectedDeveloper]?.includes(dev) || true;
  });

  return (
    <Card className="mb-6">
      <CardHeader 
        className="cursor-pointer py-3 px-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="w-4 h-4 text-primary" />
            Imágenes y Videos por Desarrollo
            <Badge variant="secondary" className="ml-2">{allMedia.length}</Badge>
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Desarrollador</Label>
              <Select value={selectedDeveloper} onValueChange={setSelectedDeveloper}>
                <SelectTrigger data-testid="select-developer">
                  <SelectValue placeholder="Seleccionar desarrollador" />
                </SelectTrigger>
                <SelectContent>
                  {DEVELOPERS.map(dev => (
                    <SelectItem key={dev} value={dev}>{dev}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Desarrollo</Label>
              <Select value={selectedDevelopment} onValueChange={setSelectedDevelopment}>
                <SelectTrigger data-testid="select-development">
                  <SelectValue placeholder="Seleccionar desarrollo" />
                </SelectTrigger>
                <SelectContent>
                  {developmentsByDeveloper.map(dev => (
                    <SelectItem key={dev} value={dev}>{dev}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
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
                disabled={!selectedDeveloper || !selectedDevelopment || isUploading}
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
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {selectedDevelopment 
                ? "No hay archivos para este desarrollo"
                : "Selecciona un desarrollo para ver sus archivos o subir nuevos"
              }
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredMedia.map(media => (
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
                      alt={media.development}
                      className="w-full h-full object-cover"
                    />
                  )}
                  
                  <div className="absolute top-1 left-1">
                    {media.type === "video" ? (
                      <Badge variant="secondary" className="h-5 px-1.5">
                        <Video className="w-3 h-3" />
                      </Badge>
                    ) : media.isPrimary ? (
                      <Badge className="h-5 px-1.5 bg-yellow-500">
                        <Star className="w-3 h-3 fill-current" />
                      </Badge>
                    ) : null}
                  </div>

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {media.type === "image" && !media.isPrimary && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPrimaryMutation.mutate(media.id)}
                        title="Marcar como principal"
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
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

                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 py-1 text-[10px] text-white truncate">
                    {media.development}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
