import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, RotateCcw, Loader2 } from "lucide-react";

interface RecycleBinConfig {
  entityLabel: string;
  deletedEndpoint: string;
  restoreEndpoint: (id: string) => string;
  invalidateKeys: string[];
  getItemLabel: (item: any) => string;
  getItemSubLabel?: (item: any) => string;
}

export function RecycleBinDrawer({ config }: { config: RecycleBinConfig }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: deletedItems = [], isLoading } = useQuery<any[]>({
    queryKey: [config.deletedEndpoint],
    enabled: open,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", config.restoreEndpoint(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.deletedEndpoint] });
      for (const key of config.invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      toast({ title: "Registro restaurado" });
    },
    onError: () => {
      toast({ title: "Error al restaurar", variant: "destructive" });
    },
  });

  const count = deletedItems.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 bg-background border rounded-md shadow-md px-2.5 py-1.5 text-xs hover:bg-muted transition-colors"
          data-testid="button-recycle-bin"
        >
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          {count > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
              {count}
            </Badge>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[380px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Papelera — {config.entityLabel}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2 overflow-y-auto max-h-[calc(100vh-120px)]">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : deletedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              La papelera está vacía
            </p>
          ) : (
            deletedItems.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between border rounded-md px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{config.getItemLabel(item)}</p>
                  {config.getItemSubLabel && (
                    <p className="text-xs text-muted-foreground truncate">{config.getItemSubLabel(item)}</p>
                  )}
                  {item.deletedAt && (
                    <p className="text-[10px] text-muted-foreground">
                      Eliminado: {new Date(item.deletedAt).toLocaleDateString('es-MX')}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2 flex-shrink-0"
                  onClick={() => restoreMutation.mutate(item.id)}
                  disabled={restoreMutation.isPending}
                  data-testid={`button-restore-${item.id}`}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Restaurar
                </Button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
