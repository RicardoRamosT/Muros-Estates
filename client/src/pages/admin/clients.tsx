import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { ProspectsSpreadsheet } from "@/components/prospects-spreadsheet";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminClients() {
  const [location] = useLocation();
  const isClientView = location.toLowerCase().includes("/clientes");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-2 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ProspectsSpreadsheet isClientView={isClientView} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
