import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MessageCircle, X, Send, Loader2, User, Phone, Mail } from "lucide-react";

export function FloatingContactForm() {
  const [isOpen, setIsOpen] = useState(true);
  const { toast } = useToast();
  const [contactForm, setContactForm] = useState({
    name: "",
    phone: "",
    email: "",
    interest: "",
  });

  const contactMutation = useMutation({
    mutationFn: async (data: typeof contactForm) => {
      const res = await apiRequest("POST", "/api/contact", data);
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Error al enviar" }));
        throw new Error(error.message || "Error al enviar");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "¡Gracias por contactarnos!",
        description: "Un asesor te contactará pronto.",
      });
      setContactForm({ name: "", phone: "", email: "", interest: "" });
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No pudimos enviar tu información. Intenta de nuevo.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.phone) {
      toast({
        title: "Campos requeridos",
        description: "Por favor ingresa tu nombre y teléfono.",
        variant: "destructive",
      });
      return;
    }
    contactMutation.mutate(contactForm);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50" data-testid="floating-contact">
      {!isOpen ? (
        <Button
          size="lg"
          onClick={() => setIsOpen(true)}
          className="rounded-full shadow-lg gap-2 px-6"
          data-testid="button-open-contact"
        >
          <MessageCircle className="w-5 h-5" />
          Asesoría Gratis
        </Button>
      ) : (
        <Card className="w-72 shadow-2xl border-0 animate-in slide-in-from-bottom-4" data-testid="card-floating-contact">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" data-testid="text-floating-title">Asesoría Gratuita</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsOpen(false)}
                data-testid="button-close-contact"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="float-name" className="text-xs">Nombre *</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="float-name"
                    placeholder="Tu nombre"
                    value={contactForm.name}
                    onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                    className="pl-8 h-9 text-sm"
                    required
                    data-testid="input-float-name"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="float-phone" className="text-xs">Teléfono *</Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="float-phone"
                    type="tel"
                    placeholder="10 dígitos"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="pl-8 h-9 text-sm"
                    required
                    data-testid="input-float-phone"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="float-email" className="text-xs">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="float-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={contactForm.email}
                    onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-8 h-9 text-sm"
                    data-testid="input-float-email"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="float-interest" className="text-xs">Objetivo</Label>
                <Select
                  value={contactForm.interest}
                  onValueChange={(value) => setContactForm(prev => ({ ...prev, interest: value }))}
                >
                  <SelectTrigger className="h-9 text-sm" data-testid="select-float-interest">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inversion">Inversión</SelectItem>
                    <SelectItem value="vivienda">Vivienda propia</SelectItem>
                    <SelectItem value="renta">Renta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                size="sm"
                className="w-full"
                disabled={contactMutation.isPending}
                data-testid="button-float-submit"
              >
                {contactMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-1" />
                )}
                Enviar
              </Button>

              <p className="text-[10px] text-center text-muted-foreground">
                Sin compromiso. Aviso de privacidad.
              </p>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
