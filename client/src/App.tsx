import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";

// Public pages — eagerly loaded
import Home from "@/pages/home";
import Properties from "@/pages/properties";
import PropertyDetail from "@/pages/property-detail";
import TypologyDetail from "@/pages/typology-detail";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import PublicShare from "@/pages/public-share";

// Admin pages — lazy loaded (only downloaded when needed)
const PropertyEdit = React.lazy(() => import("@/pages/admin/property-edit"));
const AdminUsers = React.lazy(() => import("@/pages/admin/users"));
const AdminUserNew = React.lazy(() => import("@/pages/admin/user-new"));
const AdminUserEdit = React.lazy(() => import("@/pages/admin/user-edit"));
const AdminTypologies = React.lazy(() => import("@/pages/admin/typologies"));
const AdminDesarrolladores = React.lazy(() => import("@/pages/admin/desarrolladores"));
const AdminDesarrollos = React.lazy(() => import("@/pages/admin/desarrollos"));
const AdminDocuments = React.lazy(() => import("@/pages/admin-documents"));
const AdminClients = React.lazy(() => import("@/pages/admin/clients"));
const AdminCatalogos = React.lazy(() => import("@/pages/admin/catalogos"));
const ProspectosResumen = React.lazy(() => import("@/pages/admin/prospectos-resumen"));

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoute({ component: Component, allowedRoles }: { component: React.ComponentType; allowedRoles?: string[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Redirect to="/admin" />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Component />
    </Suspense>
  );
}

function AdminRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  const role = user?.role;
  if (role === "admin" || role === "actualizador") return <Redirect to="/admin/desarrolladores" />;
  if (role === "perfilador" || role === "asesor") return <Redirect to="/admin/prospectos" />;
  if (role === "finanzas" || role === "desarrollador") return <Redirect to="/admin/tipologias" />;
  return <Redirect to="/admin/desarrolladores" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/propiedades" component={Properties} />
      <Route path="/tipologia/:id" component={TypologyDetail} />
      <Route path="/property/:id" component={PropertyDetail} />
      <Route path="/login" component={Login} />
      <Route path="/s/:token" component={PublicShare} />
      <Route path="/admin/properties/:id">
        {() => <ProtectedRoute component={PropertyEdit} allowedRoles={["admin", "actualizador"]} />}
      </Route>
      <Route path="/admin/users/new">
        {() => <ProtectedRoute component={AdminUserNew} allowedRoles={["admin"]} />}
      </Route>
      <Route path="/admin/users/:id">
        {() => <ProtectedRoute component={AdminUserEdit} allowedRoles={["admin"]} />}
      </Route>
      <Route path="/admin/users">
        {() => <ProtectedRoute component={AdminUsers} allowedRoles={["admin"]} />}
      </Route>
      <Route path="/admin/desarrolladores">
        {() => <ProtectedRoute component={AdminDesarrolladores} allowedRoles={["admin", "actualizador", "perfilador", "finanzas", "asesor", "desarrollador"]} />}
      </Route>
      <Route path="/admin/desarrollos">
        {() => <ProtectedRoute component={AdminDesarrollos} allowedRoles={["admin", "actualizador", "perfilador", "finanzas", "asesor", "desarrollador"]} />}
      </Route>
      <Route path="/admin/tipologias">
        {() => <ProtectedRoute component={AdminTypologies} allowedRoles={["admin", "actualizador", "perfilador", "finanzas", "asesor", "desarrollador"]} />}
      </Route>
      <Route path="/admin/prospectos/resumen">
        {() => <ProtectedRoute component={ProspectosResumen} allowedRoles={["admin", "perfilador", "asesor"]} />}
      </Route>
      <Route path="/admin/prospectos">
        {() => <ProtectedRoute component={AdminClients} allowedRoles={["admin", "perfilador", "asesor", "finanzas", "desarrollador"]} />}
      </Route>
      <Route path="/admin/clientes">
        {() => <ProtectedRoute component={AdminClients} allowedRoles={["admin", "perfilador", "asesor", "finanzas", "desarrollador"]} />}
      </Route>
      <Route path="/admin/documentos">
        {() => <ProtectedRoute component={AdminDocuments} allowedRoles={["admin", "actualizador", "perfilador", "finanzas", "asesor", "desarrollador"]} />}
      </Route>
      <Route path="/admin/catalogos">
        {() => <ProtectedRoute component={AdminCatalogos} allowedRoles={["admin", "actualizador"]} />}
      </Route>
      <Route path="/admin">
        {() => <AdminRedirect />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
