import { Header } from "@/components/header";
import { DevelopmentsSpreadsheet } from "@/components/developments-spreadsheet";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminDesarrollos() {
  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-2 flex flex-col min-h-0">
        <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
          <CardContent className="p-0 flex-1 overflow-hidden min-h-0">
            <DevelopmentsSpreadsheet />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
