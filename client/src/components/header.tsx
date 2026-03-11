import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Building2, Building, Users, TableProperties, LogOut, ChevronDown, FileText, Briefcase, UserPlus, UserCheck, Database, Menu } from "lucide-react";
import logoPath from "@assets/logo_1768784773871.png";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notification-bell";

export function Header() {
  const [location] = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const isAdmin = location.toLowerCase().startsWith("/admin");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const adminLinks = [
{ href: "/admin/desarrolladores", label: "Desarrolladores", icon: Briefcase, roles: ["admin", "actualizador"] },
    { href: "/admin/desarrollos", label: "Desarrollos", icon: Building, roles: ["admin", "actualizador"] },
    { href: "/admin/tipologias", label: "Tipologías", icon: TableProperties, roles: ["admin", "actualizador"] },
    { href: "/admin/prospectos", label: "Prospectos", icon: UserPlus, roles: ["admin", "perfilador", "asesor"] },
    { href: "/admin/clientes", label: "Clientes", icon: UserCheck, roles: ["admin", "perfilador", "asesor"] },
    { href: "/admin/documentos", label: "Documentos", icon: FileText, roles: ["admin", "actualizador", "asesor", "perfilador"] },
    { href: "/admin/catalogos", label: "Catálogos", icon: Database, roles: ["admin", "actualizador"] },
    { href: "/admin/users", label: "Usuarios", icon: Users, roles: ["admin"] },
  ];

  const visibleLinks = adminLinks.filter(link =>
    user && link.roles.includes(user.role)
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="w-full flex h-16 items-center px-4">
        {/* Left column — Logo + hamburger (mobile) */}
        <div className="flex items-center gap-2">
          {isAuthenticated && isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden flex-shrink-0"
              onClick={() => setMobileMenuOpen(true)}
              data-testid="button-mobile-menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <Link href="/">
            <div className="flex items-center gap-3 hover-elevate rounded-md px-2 py-1 cursor-pointer flex-shrink-0" data-testid="link-home">
              <img src={logoPath} alt="Muros" className="h-10 object-contain" />
            </div>
          </Link>
        </div>

        {/* Center column — Nav links (desktop only) */}
        {isAuthenticated && isAdmin && (
          <nav className="hidden md:flex flex-1 items-center justify-center gap-1">
            {visibleLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location === link.href ||
                (link.href !== "/admin" && location.startsWith(link.href));

              return (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn("gap-2 whitespace-nowrap", isActive && "bg-primary/10")}
                    data-testid={`nav-${link.label.toLowerCase()}`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right column — User profile */}
        <div className="flex items-center justify-end gap-1">
          {isAuthenticated && isAdmin && (
            <>
              <NotificationBell />
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2" data-testid="button-user-menu">
                  <span className="hidden sm:inline">{user?.name}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {user?.email || user?.username}
                </div>
                <DropdownMenuSeparator />

                <Link href="/">
                  <DropdownMenuItem data-testid="menu-home">
                    <Building2 className="w-4 h-4 mr-2" />
                    Ver Sitio
                  </DropdownMenuItem>
                </Link>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={logout} data-testid="button-logout">
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          )}
        </div>

        {/* Mobile nav sheet */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>
                <img src={logoPath} alt="Muros" className="h-8 object-contain" />
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 mt-6">
              {visibleLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location === link.href ||
                  (link.href !== "/admin" && location.startsWith(link.href));

                return (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn("w-full justify-start gap-3", isActive && "bg-primary/10")}
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid={`mobile-nav-${link.label.toLowerCase()}`}
                    >
                      <Icon className="w-4 h-4" />
                      {link.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
