import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TextDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: string;
}

export function TextDetailModal({ open, onOpenChange, title, value }: TextDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="text-detail-modal">
        <DialogHeader>
          <DialogTitle className="text-sm">{title}</DialogTitle>
        </DialogHeader>
        <div className="text-sm whitespace-pre-wrap break-words py-2" data-testid="text-detail-content">
          {value || <span className="text-muted-foreground italic">Sin contenido</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
