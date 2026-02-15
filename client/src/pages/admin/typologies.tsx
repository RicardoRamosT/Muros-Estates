import { Header } from "@/components/header";
import { TypologySpreadsheet } from "@/components/typology-spreadsheet";
import { DevelopmentMediaUploader } from "@/components/development-media-uploader";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminTypologies() {
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header />
      <DevelopmentMediaUploader />
      
      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        <TypologySpreadsheet />
      </main>
    </div>
  );
}
