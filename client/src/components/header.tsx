import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import logoPath from "@assets/generated_images/muros_logo_transparent_background.png";

export function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link href="/">
          <div className="flex items-center gap-3 hover-elevate rounded-md px-2 py-1 cursor-pointer" data-testid="link-home">
            <img src={logoPath} alt="Muros" className="h-10 object-contain" />
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link href="/">
            <Button 
              variant={location === "/" ? "secondary" : "ghost"} 
              data-testid="nav-search"
            >
              Buscar Propiedades
            </Button>
          </Link>
        </nav>

        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          data-testid="button-mobile-menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-card px-4 py-4 space-y-2">
          <Link href="/">
            <Button 
              variant={location === "/" ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="mobile-nav-search"
            >
              Buscar Propiedades
            </Button>
          </Link>
        </div>
      )}
    </header>
  );
}
