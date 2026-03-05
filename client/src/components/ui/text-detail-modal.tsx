import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { type InputFilterType, createInputFilter, createPasteFilter } from "@/lib/spreadsheet-utils";

interface TextDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: string;
  editable?: boolean;
  onSave?: (newValue: string) => void;
  inputFilterType?: InputFilterType;
}

export function TextDetailModal({ open, onOpenChange, title, value, editable = false, onSave, inputFilterType }: TextDetailModalProps) {
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value, open]);

  const handleSave = () => {
    if (onSave && editValue !== value) {
      onSave(editValue);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="text-detail-modal">
        <DialogHeader>
          <DialogTitle className="text-sm">{title}</DialogTitle>
        </DialogHeader>
        {editable ? (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={inputFilterType ? createInputFilter(inputFilterType) : undefined}
            onPaste={inputFilterType ? createPasteFilter(inputFilterType) : undefined}
            className="min-h-[120px] text-sm"
            data-testid="text-detail-input"
          />
        ) : (
          <div className="text-sm whitespace-pre-wrap break-words py-2" data-testid="text-detail-content">
            {value || <span className="text-muted-foreground italic">Sin contenido</span>}
          </div>
        )}
        {editable && (
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} data-testid="button-save-text">
              Guardar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
