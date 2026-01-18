import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Property } from "@shared/schema";
import { MapPin, Bed, Bath, Maximize, Car } from "lucide-react";
import { Link } from "wouter";

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const formatPrice = (price: string | number) => {
    const num = typeof price === "string" ? parseFloat(price) : price;
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatArea = (area: string | number) => {
    const num = typeof area === "string" ? parseFloat(area) : area;
    return `${num.toLocaleString("es-MX")} m²`;
  };

  const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    available: { label: "Disponible", variant: "default" },
    reserved: { label: "Reservado", variant: "secondary" },
    sold: { label: "Vendido", variant: "destructive" },
  };

  const status = statusLabels[property.status] || statusLabels.available;

  return (
    <Link href={`/property/${property.id}`}>
      <Card 
        className="overflow-hidden cursor-pointer group hover-elevate active-elevate-2 transition-all duration-300"
        data-testid={`card-property-${property.id}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          {property.images && property.images.length > 0 ? (
            <img
              src={property.images[0]}
              alt={property.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Sin imagen</span>
            </div>
          )}
          
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge variant={status.variant} data-testid={`badge-status-${property.id}`}>
              {status.label}
            </Badge>
            {property.featured && (
              <Badge className="bg-primary text-primary-foreground" data-testid={`badge-featured-${property.id}`}>
                Destacado
              </Badge>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <p className="text-white font-bold text-xl" data-testid={`text-price-${property.id}`}>
              {formatPrice(property.price)}
            </p>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors" data-testid={`text-title-${property.id}`}>
              {property.title}
            </h3>
            {property.developmentName && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {property.developmentName}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="line-clamp-1" data-testid={`text-location-${property.id}`}>
              {property.location}, {property.city}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1.5" data-testid={`text-bedrooms-${property.id}`}>
              <Bed className="w-4 h-4" />
              <span>{property.bedrooms} Rec.</span>
            </div>
            <div className="flex items-center gap-1.5" data-testid={`text-bathrooms-${property.id}`}>
              <Bath className="w-4 h-4" />
              <span>{property.bathrooms} Baños</span>
            </div>
            <div className="flex items-center gap-1.5" data-testid={`text-area-${property.id}`}>
              <Maximize className="w-4 h-4" />
              <span>{formatArea(property.area)}</span>
            </div>
            {property.parking && property.parking > 0 && (
              <div className="flex items-center gap-1.5" data-testid={`text-parking-${property.id}`}>
                <Car className="w-4 h-4" />
                <span>{property.parking}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
