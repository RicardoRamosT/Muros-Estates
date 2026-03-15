import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { LoadingState } from "@/components/ui/loading-state";
import { FloatingContactForm } from "@/components/floating-contact-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Typology } from "@shared/schema";
import { 
  ArrowLeft, 
  MapPin, 
  Bed, 
  Bath, 
  Maximize, 
  Car, 
  Building2, 
  Calendar,
  Percent,
  Home,
  Loader2,
  Play,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface TypologyWithImages extends Typology {
  images?: string[] | null;
}

export default function TypologyDetail() {
  const [, params] = useRoute("/tipologia/:id");
  const typologyId = params?.id;
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { data: allTypologies = [], isLoading: isLoadingAll } = useQuery<TypologyWithImages[]>({
    queryKey: ["/api/public/typologies"],
  });

  const typology = allTypologies.find(t => t.id === typologyId);
  const isLoading = isLoadingAll;
  const notFound = !isLoading && !typology;

  const images = typology?.images || [];

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [typologyId]);

  const safeSelectedIndex = Math.min(selectedImageIndex, Math.max(0, images.length - 1));
  const currentImage = images[safeSelectedIndex];
  
  const isVideo = (url: string) => {
    return url.match(/\.(mp4|webm|ogg|mov)$/i) !== null;
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingState />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center" data-testid="not-found-state">
          <Building2 className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2" data-testid="text-not-found-title">Departamento no encontrado</h1>
          <p className="text-muted-foreground mb-6">
            El departamento que buscas no existe o ya no está disponible.
          </p>
          <Link href="/propiedades">
            <Button data-testid="button-view-all">Ver todos los departamentos</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!typology) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingState />
      </div>
    );
  }

  const title = typology.type 
    ? `${typology.development} - Tipo ${typology.type}`
    : typology.development;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="bg-primary py-6">
        <div className="container mx-auto px-4">
          <Link href="/propiedades">
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white gap-2 mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Volver a departamentos
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white" data-testid="text-title">
            {title}
          </h1>
          <p className="text-white/70 mt-1">{typology.developer}</p>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-3">
              <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg overflow-hidden group">
                {currentImage ? (
                  isVideo(currentImage) ? (
                    <video
                      src={currentImage}
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={currentImage}
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-24 h-24 text-primary/30" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <Badge variant="default">Disponible</Badge>
                </div>
                
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center transition-colors"
                      onClick={() => setSelectedImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
                      data-testid="button-prev-image"
                    >
                      <ChevronLeft className="w-6 h-6 text-gray-700" />
                    </button>
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center transition-colors"
                      onClick={() => setSelectedImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1)}
                      data-testid="button-next-image"
                    >
                      <ChevronRight className="w-6 h-6 text-gray-700" />
                    </button>
                    <div className="absolute bottom-4 right-4 z-20 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                      {safeSelectedIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {images.map((imageUrl, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`aspect-square rounded-md overflow-hidden border-2 transition-all relative ${
                        safeSelectedIndex === index
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent hover:border-muted-foreground/20"
                      }`}
                    >
                      {isVideo(imageUrl) ? (
                        <>
                          <video src={imageUrl} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Play className="w-4 h-4 text-white" />
                          </div>
                        </>
                      ) : (
                        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Características
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="characteristics-grid">
                  {typology.bedrooms !== null && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg" data-testid="feature-bedrooms">
                      <Bed className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Recámaras</p>
                        <p className="font-semibold">{typology.bedrooms}</p>
                      </div>
                    </div>
                  )}
                  {typology.bathrooms !== null && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg" data-testid="feature-bathrooms">
                      <Bath className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Baños</p>
                        <p className="font-semibold">{typology.bathrooms}</p>
                      </div>
                    </div>
                  )}
                  {typology.size && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg" data-testid="feature-size">
                      <Maximize className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Tamaño</p>
                        <p className="font-semibold">{formatArea(typology.size)}</p>
                      </div>
                    </div>
                  )}
                  {typology.parkingSpots !== null && typology.parkingSpots > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Car className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Estacionamiento</p>
                        <p className="font-semibold">{typology.parkingSpots} lugares</p>
                      </div>
                    </div>
                  )}
                  {typology.level !== null && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Building2 className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Nivel</p>
                        <p className="font-semibold">Piso {typology.level}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Ubicación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold text-lg" data-testid="text-zone">{typology.zone}</p>
                  <p className="text-muted-foreground" data-testid="text-city">{typology.city}</p>
                </div>
              </CardContent>
            </Card>

            {(typology.livingRoom || typology.diningRoom || typology.kitchen || typology.balcony || typology.terrace || typology.laundry || typology.serviceRoom || typology.storage) && (
              <Card>
                <CardHeader>
                  <CardTitle>Distribución</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {typology.livingRoom && <Badge variant="outline">Sala</Badge>}
                    {typology.diningRoom && <Badge variant="outline">Comedor</Badge>}
                    {typology.kitchen && <Badge variant="outline">Cocina</Badge>}
                    {typology.balcony && <Badge variant="outline">Balcón</Badge>}
                    {typology.terrace && <Badge variant="outline">Terraza</Badge>}
                    {typology.laundry && <Badge variant="outline">Cuarto de lavado</Badge>}
                    {typology.serviceRoom && <Badge variant="outline">Cuarto de servicio</Badge>}
                    {typology.storage && <Badge variant="outline">Bodega</Badge>}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="sticky top-4">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Precio</p>
                    <p className="text-3xl font-bold text-primary" data-testid="text-price">
                      {formatPrice(typology.finalPrice || typology.price)}
                    </p>
                    {typology.hasDiscount && typology.price && typology.finalPrice && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm line-through text-muted-foreground">
                          {formatPrice(typology.price)}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          -{typology.discountPercent}%
                        </Badge>
                      </div>
                    )}
                    {typology.pricePerM2 && (
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(typology.pricePerM2)} / m²
                      </p>
                    )}
                  </div>

                  {typology.downPaymentPercent && (
                    <div className="flex items-center gap-2 text-sm">
                      <Percent className="w-4 h-4 text-primary" />
                      <span>Enganche desde {typology.downPaymentPercent}%</span>
                    </div>
                  )}

                  {typology.deliveryDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>Entrega: {typology.deliveryDate}</span>
                    </div>
                  )}

                  {(typology.lockOff) && (
                    <Badge variant="secondary" className="text-xs">Lock-Off disponible</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Desarrollo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-semibold">{typology.development}</p>
                <p className="text-sm text-muted-foreground">Por {typology.developer}</p>
              </CardContent>
            </Card>

            {(typology.initialPercent || typology.duringConstructionPercent || typology.remainingPercent) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Esquema de Pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {typology.initialPercent && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Inicial</span>
                      <span className="font-medium">{typology.initialPercent}%</span>
                    </div>
                  )}
                  {typology.duringConstructionPercent && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Durante construcción</span>
                      <span className="font-medium">{typology.duringConstructionPercent}%</span>
                    </div>
                  )}
                  {typology.paymentMonths && typology.monthlyPayment && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Mensualidad ({typology.paymentMonths} meses)</span>
                      <span className="font-medium">{formatPrice(typology.monthlyPayment)}</span>
                    </div>
                  )}
                  {typology.remainingPercent && (
                    <div className="flex justify-between gap-2 border-t pt-2">
                      <span className="text-muted-foreground">Contra entrega</span>
                      <span className="font-medium">{typology.remainingPercent}%</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {(typology.isaPercent || typology.notaryPercent) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Costos Adicionales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {typology.isaPercent && typology.isaAmount && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">ISAI ({typology.isaPercent}%)</span>
                      <span className="font-medium">{formatPrice(typology.isaAmount)}</span>
                    </div>
                  )}
                  {typology.notaryPercent && typology.notaryAmount && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Notario ({typology.notaryPercent}%)</span>
                      <span className="font-medium">{formatPrice(typology.notaryAmount)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <FloatingContactForm 
        showInterestButton={true}
        propertyInterest={{
          title: title,
          developmentName: `${typology.developer} - ${typology.zone}, ${typology.city}`,
          typologyId: typology.id,
          desarrollador: typology.developer || undefined,
          desarrollo: typology.development || undefined,
          ciudad: typology.city || undefined,
          zona: typology.zone || undefined,
        }}
      />
    </div>
  );
}
