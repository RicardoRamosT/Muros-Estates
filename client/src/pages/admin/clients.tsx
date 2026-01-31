import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Users, UserCheck } from "lucide-react";
import { ProspectsSpreadsheet } from "@/components/prospects-spreadsheet";

export default function AdminClients() {
  const [location] = useLocation();
  const isClientView = location.toLowerCase().includes("/clientes");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            {isClientView ? <UserCheck className="w-6 h-6 text-primary" /> : <Users className="w-6 h-6 text-primary" />}
            <div>
              <h1 className="text-xl font-bold" data-testid="text-page-title">
                {isClientView ? "Clientes" : "Prospectos"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isClientView 
                  ? "Clientes confirmados que han realizado compras" 
                  : "Gestiona los contactos y leads potenciales"
                }
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 border-t">
          <ProspectsSpreadsheet isClientView={isClientView} />
        </div>
      </main>
    </div>
  );
}
