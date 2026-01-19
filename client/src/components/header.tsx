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
import { Building2, Users, TableProperties, LogOut, ChevronDown, LayoutDashboard } from "lucide-react";
import logoPath from "@assets/logo_1768784773871.png";
import { cn } from "@/lib/utils";

export function Header() {
  const [location] = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const isAdmin = location.startsWith("/admin");
  
  const adminLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "actualizador", "asesor", "perfilador"] },
    { href: "/admin/tipologias", label: "Tipologías", icon: TableProperties, roles: ["admin", "actualizador"] },
    { href: "/admin/users", label: "Usuarios", icon: Users, roles: ["admin"] },
  ];
  
  const visibleLinks = adminLinks.filter(link => 
    user && link.roles.includes(user.role)
  );
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link href="/">
            <div className="flex items-center gap-3 hover-elevate rounded-md px-2 py-1 cursor-pointer" data-testid="link-home">
              <img src={logoPath} alt="Muros" className="h-10 object-contain" />
            </div>
          </Link>
          
          {isAuthenticated && isAdmin && (
            <nav className="hidden md:flex items-center gap-1">
              {visibleLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location === link.href || 
                  (link.href !== "/admin" && location.startsWith(link.href));
                
                return (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className={cn("gap-2", isActive && "bg-primary/10")}
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
        </div>
        
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
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
                
                {!isAdmin && (
                  <Link href="/admin">
                    <DropdownMenuItem data-testid="menu-admin">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Administración
                    </DropdownMenuItem>
                  </Link>
                )}
                
                <div className="md:hidden">
                  {isAdmin && visibleLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link key={link.href} href={link.href}>
                        <DropdownMenuItem data-testid={`menu-${link.label.toLowerCase()}`}>
                          <Icon className="w-4 h-4 mr-2" />
                          {link.label}
                        </DropdownMenuItem>
                      </Link>
                    );
                  })}
                  {isAdmin && <DropdownMenuSeparator />}
                </div>
                
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
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm" data-testid="button-login">
                Iniciar sesión
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
