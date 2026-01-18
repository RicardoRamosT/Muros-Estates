import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Property } from "@shared/schema";
import { Edit, MoreHorizontal, Trash2, Eye, Loader2 } from "lucide-react";
import { Link } from "wouter";

interface AdminPropertyTableProps {
  properties: Property[];
  isLoading?: boolean;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function AdminPropertyTable({ properties, isLoading, onDelete, isDeleting }: AdminPropertyTableProps) {
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
                  <p className="text-sm line-clamp-1">{property.city}, {property.state}</p>
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
                      <Link href={`/property/${property.id}`}>
                        <DropdownMenuItem className="cursor-pointer" data-testid={`action-view-${property.id}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver
                        </DropdownMenuItem>
                      </Link>
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
  );
}
