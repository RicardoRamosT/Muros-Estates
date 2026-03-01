import { Header } from "@/components/header";
import { DevelopersSpreadsheet } from "@/components/developers-spreadsheet";

export default function AdminDesarrolladores() {
  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        <DevelopersSpreadsheet />
      </main>
    </div>
  );
}
