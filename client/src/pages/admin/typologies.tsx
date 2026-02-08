import { Header } from "@/components/header";
import { TypologySpreadsheet } from "@/components/typology-spreadsheet";
import { DevelopmentMediaUploader } from "@/components/development-media-uploader";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminTypologies() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-2 flex flex-col">
        <DevelopmentMediaUploader />
        
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="p-0 flex-1 overflow-hidden">
            <TypologySpreadsheet />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
