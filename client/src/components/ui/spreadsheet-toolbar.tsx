import { Button } from "@/components/ui/button";
import { Plus, Loader2, X, Save, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpreadsheetToolbarProps {
  title: string;
  entityCount: number;
  entityLabel: string;
  // Collapse controls
  hasCollapsedItems: boolean;
  onExpandAll: () => void;
  // Filter controls
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  // Save controls
  pendingRowCount: number;
  isSaving: boolean;
  saveFlash: boolean;
  onSave: () => void;
  saveTestId?: string;
  // Create controls (optional — e.g. Clientes view hides this)
  onCreateNew?: () => void;
  createDisabled?: boolean;
  createTestId?: string;
  createLabel?: string;
  // Extra buttons slot (e.g. Prospectos "Resumen" button)
  extraButtons?: React.ReactNode;
}

export function SpreadsheetToolbar({
  title,
  entityCount,
  entityLabel,
  hasCollapsedItems,
  onExpandAll,
  hasActiveFilters,
  onClearFilters,
  pendingRowCount,
  isSaving,
  saveFlash,
  onSave,
  saveTestId = "button-save-row",
  onCreateNew,
  createDisabled = false,
  createTestId = "button-add-row",
  createLabel = "Nuevo",
  extraButtons,
}: SpreadsheetToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b bg-background sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-bold" data-testid="text-page-title">{title}</h1>
        {hasCollapsedItems && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onExpandAll}
            title="Descolapsar todo"
            data-testid="button-expand-all"
          >
            <Maximize2 className="w-3 h-3 mr-1" />
            Descolapsar
          </Button>
        )}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            data-testid="button-clear-all-filters"
          >
            <X className="w-3 h-3 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {extraButtons}
        <span className="text-xs text-muted-foreground">{entityCount} {entityLabel}</span>
        <Button
          onClick={onSave}
          size="sm"
          disabled={pendingRowCount === 0 || isSaving}
          className={cn(
            "transition-all duration-300",
            pendingRowCount > 0 && !isSaving && "save-electric-btn",
            saveFlash
              ? "text-white shadow-lg scale-105"
              : "text-white"
          )}
          style={saveFlash ? { backgroundColor: "rgb(255, 181, 73)", borderColor: "rgb(255, 181, 73)" } : undefined}
          data-testid={saveTestId}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          Guardar{pendingRowCount > 1 ? ` (${pendingRowCount})` : ""}
        </Button>
        {onCreateNew && (
          <Button
            size="sm"
            onClick={onCreateNew}
            disabled={createDisabled}
            data-testid={createTestId}
          >
            <Plus className="w-4 h-4 mr-1" />
            {createLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
