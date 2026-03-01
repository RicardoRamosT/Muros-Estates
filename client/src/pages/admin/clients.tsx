import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { ProspectsSpreadsheet } from "@/components/prospects-spreadsheet";

export default function AdminClients() {
  const [location] = useLocation();
  const isClientView = location.toLowerCase().includes("/clientes");

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        <ProspectsSpreadsheet isClientView={isClientView} />
      </main>
    </div>
  );
}
