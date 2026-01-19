import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Properties from "@/pages/properties";
import PropertyDetail from "@/pages/property-detail";
import TypologyDetail from "@/pages/typology-detail";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin/dashboard";
import PropertyEdit from "@/pages/admin/property-edit";
import AdminUsers from "@/pages/admin/users";
import AdminUserNew from "@/pages/admin/user-new";
import AdminUserEdit from "@/pages/admin/user-edit";
import AdminTypologies from "@/pages/admin/typologies";
import AdminDocuments from "@/pages/admin-documents";
import AdminClients from "@/pages/admin/clients";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ component: Component, allowedRoles }: { component: React.ComponentType; allowedRoles?: string[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Redirect to="/admin" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/propiedades" component={Properties} />
      <Route path="/tipologia/:id" component={TypologyDetail} />
      <Route path="/property/:id" component={PropertyDetail} />
      <Route path="/login" component={Login} />
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminDashboard} />}
      </Route>
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
      <Route path="/admin/tipologias">
        {() => <ProtectedRoute component={AdminTypologies} allowedRoles={["admin", "actualizador"]} />}
      </Route>
      <Route path="/admin/clientes">
        {() => <ProtectedRoute component={AdminClients} allowedRoles={["admin", "perfilador", "asesor"]} />}
      </Route>
      <Route path="/admin/documentos">
        {() => <ProtectedRoute component={AdminDocuments} allowedRoles={["admin", "actualizador", "asesor", "perfilador"]} />}
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
