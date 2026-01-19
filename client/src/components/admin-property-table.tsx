import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Property } from "@shared/schema";
import { Edit, MoreHorizontal, Trash2, Eye, Loader2, Bed, Bath, Maximize, Car, MapPin, Building, Calendar, X } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { AMENITIES } from "@shared/constants";

interface AdminPropertyTableProps {
  properties: Property[];
  isLoading?: boolean;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function AdminPropertyTable({ properties, isLoading, onDelete, isDeleting }: AdminPropertyTableProps) {
  const [previewProperty, setPreviewProperty] = useState<Property | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const formatPrice = (price: string | number) => {
    const num = typeof price === "string" ? parseFloat(price) : price;
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    available: { label: "Disponible", variant: "default" },
    reserved: { label: "Reservado", variant: "secondary" },
    sold: { label: "Vendido", variant: "destructive" },
  };

  const openPreview = (property: Property) => {
    setPreviewProperty(property);
    setCurrentImageIndex(0);
  };

  const closePreview = () => {
    setPreviewProperty(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando propiedades...</p>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-muted/30">
        <h3 className="text-lg font-semibold mb-2">No hay propiedades</h3>
        <p className="text-muted-foreground mb-4">Comienza agregando tu primera propiedad.</p>
        <Link href="/admin/properties/new">
          <Button data-testid="button-add-first-property">Agregar Propiedad</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-16">Imagen</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-center">Recámaras</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((property) => {
              const status = statusLabels[property.status] || statusLabels.available;
              return (
                <TableRow key={property.id} className="hover-elevate" data-testid={`row-property-${property.id}`}>
                  <TableCell>
                    {property.images && property.images.length > 0 ? (
                      <img
                        src={property.images[0]}
                        alt={property.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        N/A
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium line-clamp-1" data-testid={`text-title-${property.id}`}>{property.title}</p>
                      {property.developmentName && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{property.developmentName}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm line-clamp-1">{property.zone}, {property.city}</p>
                  </TableCell>
                  <TableCell className="text-right font-medium" data-testid={`text-price-${property.id}`}>
                    {formatPrice(property.price)}
                  </TableCell>
                  <TableCell className="text-center">{property.bedrooms}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={status.variant} data-testid={`badge-status-${property.id}`}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-actions-${property.id}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          className="cursor-pointer" 
                          onClick={() => openPreview(property)}
                          data-testid={`action-view-${property.id}`}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver
                        </DropdownMenuItem>
                        <Link href={`/admin/properties/${property.id}`}>
                          <DropdownMenuItem className="cursor-pointer" data-testid={`action-edit-${property.id}`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem 
                          className="cursor-pointer text-destructive focus:text-destructive"
                          onClick={() => onDelete(property.id)}
                          disabled={isDeleting}
                          data-testid={`action-delete-${property.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!previewProperty} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {previewProperty && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{previewProperty.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {previewProperty.images && previewProperty.images.length > 0 && (
                  <div className="space-y-3">
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                      <img
                        src={previewProperty.images[currentImageIndex]}
                        alt={`${previewProperty.title} - Imagen ${currentImageIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {previewProperty.images.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-sm">
                          {currentImageIndex + 1} / {previewProperty.images.length}
                        </div>
                      )}
                    </div>
                    {previewProperty.images.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {previewProperty.images.map((img, index) => (
                          <img
                            key={index}
                            src={img}
                            alt={`Miniatura ${index + 1}`}
                            className={`w-16 h-16 object-cover rounded cursor-pointer transition-all ${
                              index === currentImageIndex ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100"
                            }`}
                            onClick={() => setCurrentImageIndex(index)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-2xl font-bold text-primary">{formatPrice(previewProperty.price)}</span>
                  <Badge variant={statusLabels[previewProperty.status]?.variant || "default"}>
                    {statusLabels[previewProperty.status]?.label || previewProperty.status}
                  </Badge>
                  {previewProperty.featured && <Badge variant="secondary">Destacado</Badge>}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Bed className="w-4 h-4 text-muted-foreground" />
                    <span>{previewProperty.bedrooms} Recámaras</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Bath className="w-4 h-4 text-muted-foreground" />
                    <span>{previewProperty.bathrooms} Baños</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Maximize className="w-4 h-4 text-muted-foreground" />
                    <span>{previewProperty.area} m²</span>
                  </div>
                  {previewProperty.parking && previewProperty.parking > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Car className="w-4 h-4 text-muted-foreground" />
                      <span>{previewProperty.parking} Estac.</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{previewProperty.address}, {previewProperty.zone}, {previewProperty.city}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <span>{previewProperty.developer} - {previewProperty.developmentName}</span>
                  </div>
                  {previewProperty.deliveryDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>Entrega: {previewProperty.deliveryDate}</span>
                    </div>
                  )}
                </div>

                {previewProperty.value && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium text-primary">{previewProperty.value}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2">Descripción</h4>
                  <p className="text-sm text-muted-foreground">{previewProperty.description}</p>
                </div>

                {previewProperty.amenities && previewProperty.amenities.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Amenidades</h4>
                    <div className="flex flex-wrap gap-2">
                      {previewProperty.amenities.map((amenityId) => {
                        const amenity = AMENITIES.find(a => a.id === amenityId);
                        return amenity ? (
                          <div key={amenityId} className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm">
                            <img src={amenity.icon} alt={amenity.name} className="w-4 h-4" />
                            <span>{amenity.name}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {previewProperty.videos && previewProperty.videos.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Videos</h4>
                    <div className="grid gap-4">
                      {previewProperty.videos.map((video, index) => (
                        <video
                          key={index}
                          src={video}
                          controls
                          className="w-full rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={closePreview}>
                    Cerrar
                  </Button>
                  <Link href={`/admin/properties/${previewProperty.id}`}>
                    <Button onClick={closePreview}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
