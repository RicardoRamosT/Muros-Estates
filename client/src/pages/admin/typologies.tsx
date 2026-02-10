import { Header } from "@/components/header";
import { TypologySpreadsheet } from "@/components/typology-spreadsheet";
import { DevelopmentMediaUploader } from "@/components/development-media-uploader";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminTypologies() {
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-2 flex flex-col overflow-hidden">
        <DevelopmentMediaUploader />
        
        <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
          <CardContent className="p-0 flex-1 flex flex-col overflow-hidden min-h-0">
            <TypologySpreadsheet />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
