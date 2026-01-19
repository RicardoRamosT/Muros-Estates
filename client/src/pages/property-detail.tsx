import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Header } from "@/components/header";
import { FloatingContactForm } from "@/components/floating-contact-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Property } from "@shared/schema";
import { AMENITIES, getAmenityById } from "@shared/constants";
import { 
  ArrowLeft, 
  MapPin, 
  Bed, 
  Bath, 
  Maximize, 
  Car, 
  Calendar,
  Building2,
  Layers,
  Share2,
  Heart,
  Loader2,
  Zap,
  Shield
} from "lucide-react";
import { useState } from "react";

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const [selectedImage, setSelectedImage] = useState(0);

  const { data: property, isLoading, error } = useQuery<Property>({
    queryKey: [`/api/properties/${id}`],
    enabled: !!id,
  });

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

  const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    available: { label: "Disponible", variant: "default" },
    reserved: { label: "Reservado", variant: "secondary" },
    sold: { label: "Vendido", variant: "destructive" },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Cargando propiedad...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Propiedad no encontrada</h1>
          <p className="text-muted-foreground mb-6">
            La propiedad que buscas no existe o ha sido eliminada.
          </p>
          <Link href="/">
            <Button data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const status = statusLabels[property.status] || statusLabels.available;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-6">
        <Link href="/">
          <Button variant="ghost" className="mb-4" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a propiedades
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              {property.images && property.images.length > 0 ? (
                <>
                  <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-muted">
                    <img
                      src={property.images[selectedImage]}
                      alt={property.title}
                      className="w-full h-full object-cover"
                      data-testid="img-main"
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <Badge variant={status.variant} className="text-sm">
                        {status.label}
                      </Badge>
                      {property.featured && (
                        <Badge className="bg-primary text-primary-foreground text-sm">
                          Destacado
                        </Badge>
                      )}
                    </div>
                  </div>

                  {property.images.length > 1 && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {property.images.map((img, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImage(index)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            selectedImage === index
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-transparent hover:border-muted-foreground/20"
                          }`}
                          data-testid={`button-thumbnail-${index}`}
                        >
                          <img
                            src={img}
                            alt={`Vista ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-[16/9] rounded-lg bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">Sin imágenes disponibles</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2" data-testid="text-title">
                    {property.title}
                  </h1>
                  <p className="text-lg text-muted-foreground mb-2">
                    {property.developmentName} por {property.developer}
                  </p>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-5 h-5" />
                    <span data-testid="text-location">
                      {property.address}, {property.zone}, {property.city}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary" data-testid="text-price">
                    {formatPrice(property.price)}
                  </p>
                  <p className="text-sm text-muted-foreground">MXN</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <Button variant="outline" size="sm" data-testid="button-share">
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartir
                </Button>
                <Button variant="outline" size="sm" data-testid="button-favorite">
                  <Heart className="w-4 h-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Características</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Bed className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-bold" data-testid="text-bedrooms">{property.bedrooms}</p>
                      <p className="text-xs text-muted-foreground">Recámaras</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Bath className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-bold" data-testid="text-bathrooms">{property.bathrooms}</p>
                      <p className="text-xs text-muted-foreground">Baños</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Maximize className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-bold" data-testid="text-area">{formatArea(property.area)}</p>
                      <p className="text-xs text-muted-foreground">Superficie</p>
                    </div>
                  </div>
                  {property.parking !== null && property.parking > 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Car className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xl font-bold" data-testid="text-parking">{property.parking}</p>
                        <p className="text-xs text-muted-foreground">Estac.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t my-6" />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <Building2 className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Tipo</p>
                      <p className="font-medium text-sm truncate">{property.developmentType}</p>
                    </div>
                  </div>
                  {property.floor && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <Layers className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Piso</p>
                        <p className="font-medium text-sm">{property.floor}</p>
                      </div>
                    </div>
                  )}
                  {property.deliveryDate && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Entrega</p>
                        <p className="font-medium text-sm">{property.deliveryDate}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Descripción</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap" data-testid="text-description">
                  {property.description}
                </p>
                {property.value && (
                  <div className="mt-4 p-3 bg-secondary/20 rounded-lg border border-secondary/30">
                    <p className="text-sm font-medium text-secondary-foreground">
                      {property.value}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {property.amenities && property.amenities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Amenidades del Desarrollo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {property.amenities.map((amenityId, index) => {
                      const amenity = getAmenityById(amenityId);
                      if (!amenity) return null;
                      return (
                        <div
                          key={index}
                          className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50 text-center"
                          data-testid={`amenity-${amenityId}`}
                        >
                          <img 
                            src={amenity.icon} 
                            alt={amenity.name}
                            className="w-10 h-10 object-contain"
                          />
                          <span className="text-xs font-medium">{amenity.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {property.efficiency && property.efficiency.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-secondary" />
                    Eficiencia del Desarrollo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {property.efficiency.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded-lg bg-secondary/10 border border-secondary/20"
                        data-testid={`efficiency-${index}`}
                      >
                        <Zap className="w-4 h-4 text-secondary shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {property.otherFeatures && property.otherFeatures.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Seguridad y Otras Características
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {property.otherFeatures.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20"
                        data-testid={`other-feature-${index}`}
                      >
                        <Shield className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Información del Desarrollo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Desarrollador</p>
                  <p className="font-medium">{property.developer}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Desarrollo</p>
                  <p className="font-medium">{property.developmentName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Desarrollo</p>
                  <p className="font-medium">{property.developmentType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ubicación</p>
                  <p className="font-medium">{property.zone}, {property.city}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {property && (
        <FloatingContactForm 
          propertyInterest={{
            title: property.title,
            developmentName: property.developmentName
          }}
          showInterestButton={true}
        />
      )}
    </div>
  );
}
