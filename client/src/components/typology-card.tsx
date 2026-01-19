import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Typology } from "@shared/schema";
import { MapPin, Bed, Bath, Maximize, Car, Building2 } from "lucide-react";
import { Link } from "wouter";

interface TypologyCardProps {
  typology: Typology;
  index: number;
  imageUrl?: string;
}

export function TypologyCard({ typology, index, imageUrl }: TypologyCardProps) {
  const formatPrice = (price: string | number | null) => {
    if (!price) return "Consultar";
    const num = typeof price === "string" ? parseFloat(price) : price;
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatArea = (area: string | number | null) => {
    if (!area) return "N/A";
    const num = typeof area === "string" ? parseFloat(area) : area;
    return `${num.toLocaleString("es-MX")} m²`;
  };

  const title = typology.type 
    ? `${typology.development} - Tipo ${typology.type}`
    : typology.development;

  return (
    <Link href={`/tipologia/${typology.id}`}>
      <Card 
        className="overflow-hidden cursor-pointer group hover-elevate active-elevate-2 transition-all duration-300"
        data-testid={`card-typology-${typology.id}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-16 h-16 text-primary/30" />
            </div>
          )}
          
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge variant="default" data-testid={`badge-available-${typology.id}`}>
              Disponible
            </Badge>
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <p className="text-white font-bold text-xl" data-testid={`text-price-${typology.id}`}>
              {formatPrice(typology.finalPrice || typology.price)}
            </p>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors" data-testid={`text-title-${typology.id}`}>
              {title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {typology.developer}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="line-clamp-1" data-testid={`text-location-${typology.id}`}>
              {typology.zone}, {typology.city}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t flex-wrap">
            {typology.bedrooms !== null && (
              <div className="flex items-center gap-1.5" data-testid={`text-bedrooms-${typology.id}`}>
                <Bed className="w-4 h-4" />
                <span>{typology.bedrooms} Rec.</span>
              </div>
            )}
            {typology.bathrooms !== null && (
              <div className="flex items-center gap-1.5" data-testid={`text-bathrooms-${typology.id}`}>
                <Bath className="w-4 h-4" />
                <span>{typology.bathrooms} Baños</span>
              </div>
            )}
            {typology.size && (
              <div className="flex items-center gap-1.5" data-testid={`text-area-${typology.id}`}>
                <Maximize className="w-4 h-4" />
                <span>{formatArea(typology.size)}</span>
              </div>
            )}
            {typology.parkingSpots && typology.parkingSpots > 0 && (
              <div className="flex items-center gap-1.5" data-testid={`text-parking-${typology.id}`}>
                <Car className="w-4 h-4" />
                <span>{typology.parkingSpots}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
