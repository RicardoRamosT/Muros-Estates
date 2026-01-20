import { Header } from "@/components/header";
import { DevelopmentsSpreadsheet } from "@/components/developments-spreadsheet";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminDesarrollos() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Desarrollos</h1>
            <p className="text-muted-foreground text-sm">
              Gestión de proyectos inmobiliarios (Kyo Constella, Novus, ALTO, etc.)
            </p>
          </div>
        </div>
        
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="p-0 flex-1 overflow-hidden">
            <DevelopmentsSpreadsheet />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
