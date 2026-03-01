import { Header } from "@/components/header";
import { DevelopmentsSpreadsheet } from "@/components/developments-spreadsheet";

export default function AdminDesarrollos() {
  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        <DevelopmentsSpreadsheet />
      </main>
    </div>
  );
}
