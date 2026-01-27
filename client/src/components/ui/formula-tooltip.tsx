import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calculator } from "lucide-react";
import { getFormulaTooltip } from "@/lib/spreadsheet-utils";
import { cn } from "@/lib/utils";

interface FormulaTooltipProps {
  field: string;
  children: React.ReactNode;
  className?: string;
}

export function FormulaTooltip({ field, children, className }: FormulaTooltipProps) {
  const formula = getFormulaTooltip(field);
  
  if (!formula) {
    return <>{children}</>;
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("relative inline-flex items-center gap-1", className)}>
          {children}
          <Calculator className="h-3 w-3 text-blue-500 dark:text-blue-400 flex-shrink-0" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <div className="font-semibold text-sm">{formula.label}</div>
          <div className="font-mono text-xs bg-muted px-2 py-1 rounded">
            {formula.formula}
          </div>
          <div className="text-xs text-muted-foreground">
            {formula.description}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface CalculatedCellProps {
  field: string;
  value: string | number | null | undefined;
  format?: "currency" | "percent" | "number" | "area";
  className?: string;
}

export function CalculatedCell({ field, value, format, className }: CalculatedCellProps) {
  const formula = getFormulaTooltip(field);
  
  let displayValue = "-";
  if (value !== null && value !== undefined && value !== "") {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (!isNaN(num)) {
      switch (format) {
        case "currency":
          displayValue = new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(num);
          break;
        case "percent":
          displayValue = `${num.toFixed(2)}%`;
          break;
        case "area":
          displayValue = `${num.toFixed(2)} m²`;
          break;
        default:
          displayValue = new Intl.NumberFormat("es-MX").format(num);
      }
    }
  }
  
  if (!formula) {
    return <span className={className}>{displayValue}</span>;
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn(
          "cursor-help inline-flex items-center gap-1",
          className
        )}>
          {displayValue}
          <Calculator className="h-3 w-3 text-blue-500 dark:text-blue-400 opacity-60" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <div className="font-semibold text-sm">{formula.label}</div>
          <div className="font-mono text-xs bg-muted px-2 py-1 rounded">
            = {formula.formula}
          </div>
          <div className="text-xs text-muted-foreground">
            {formula.description}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
