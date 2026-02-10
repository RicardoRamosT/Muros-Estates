import { cn } from "@/lib/utils";

export type CellType = 
  | "input"      // White - editable text/number input
  | "dropdown"   // Gray - select/menu
  | "checkbox"   // Gray - boolean toggle
  | "calculated" // Light tone - formula result
  | "readonly"   // Light gray - non-editable
  | "index"      // Light gray - row number
  | "date"       // White - date input
  | "currency"   // White - money input
  | "percent"    // White - percentage input
  | "actions";   // No background - action buttons

export interface CellStyleConfig {
  type: CellType;
  disabled?: boolean;
  isEditing?: boolean;
}

export function getCellStyle(config: CellStyleConfig): string {
  const { type, disabled = false, isEditing = false } = config;
  
  const baseStyles = "border-r border-b border-gray-200 dark:border-gray-700 px-1.5 py-0.5 text-xs h-8 max-h-8 overflow-hidden";
  
  if (disabled) {
    return cn(baseStyles, "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed");
  }
  
  if (isEditing) {
    return cn(baseStyles, "bg-white dark:bg-gray-900 ring-2 ring-primary ring-inset");
  }
  
  switch (type) {
    case "input":
    case "date":
    case "currency":
    case "percent":
      return cn(baseStyles, "bg-white dark:bg-gray-900 cursor-text hover:bg-gray-50 dark:hover:bg-gray-800");
    
    case "dropdown":
    case "checkbox":
      return cn(baseStyles, "bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700");
    
    case "calculated":
      return cn(baseStyles, "bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 cursor-default font-medium");
    
    case "readonly":
      return cn(baseStyles, "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-default");
    
    case "index":
      return cn(baseStyles, "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-default text-center");
    
    case "actions":
      return cn(baseStyles, "bg-transparent");
    
    default:
      return cn(baseStyles, "bg-white dark:bg-gray-900");
  }
}

export function getCellTypeFromColumnType(columnType?: string): CellType {
  if (!columnType) return "input";
  
  switch (columnType) {
    case "select":
    case "city-select":
    case "zone-select":
    case "type-select":
    case "developer-select":
      return "dropdown";
    
    case "boolean":
    case "toggle":
      return "checkbox";
    
    case "index":
      return "index";
    
    case "actions":
    case "folder-link":
      return "actions";
    
    case "date":
    case "time":
      return "date";
    
    case "currency":
      return "currency";
    
    case "number":
    case "decimal":
      return "input";
    
    default:
      return "input";
  }
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatNumber(value: number | string | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "";
  return `${num.toFixed(2)}%`;
}

export function formatArea(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "";
  return `${num.toFixed(2)} m²`;
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatTime(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// Empty value display - use this for text cells instead of "-"
export function formatEmptyValue(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return value;
}

export interface FormulaDefinition {
  field: string;
  label: string;
  formula: string;
  description: string;
}

export const TYPOLOGY_FORMULAS: FormulaDefinition[] = [
  { 
    field: "finalPrice", 
    label: "Precio Final", 
    formula: "Precio - Monto Descuento",
    description: "Si hay bono: Precio - Monto Descuento. Si no hay bono: Precio"
  },
  { 
    field: "pricePerM2", 
    label: "Precio/M²", 
    formula: "Precio Final ÷ Tamaño Final",
    description: "Precio Final dividido entre el tamaño final del inmueble"
  },
  { 
    field: "discountAmount", 
    label: "Monto Descuento", 
    formula: "Precio × (% Descuento ÷ 100)",
    description: "Calculado desde el porcentaje de descuento, o ingresado manualmente"
  },
  { 
    field: "discountPercent", 
    label: "% Descuento", 
    formula: "(Monto Descuento ÷ Precio) × 100",
    description: "Calculado desde el monto de descuento, o ingresado manualmente"
  },
  { 
    field: "initialAmount", 
    label: "Monto Inicial", 
    formula: "Precio Final × (% Inicial ÷ 100)",
    description: "Porcentaje inicial aplicado al precio final"
  },
  { 
    field: "duringConstructionAmount", 
    label: "Durante Construcción", 
    formula: "Precio Final × (% Durante Construcción ÷ 100)",
    description: "Porcentaje durante construcción aplicado al precio final"
  },
  { 
    field: "monthlyPayment", 
    label: "Pago Mensual", 
    formula: "Durante Construcción ÷ Meses de Pago",
    description: "Monto durante construcción dividido entre los meses"
  },
  { 
    field: "totalEnganche", 
    label: "Total Enganche", 
    formula: "Monto Inicial + Durante Construcción",
    description: "Suma del monto inicial más el monto durante construcción"
  },
  { 
    field: "remainingPercent", 
    label: "% Restante", 
    formula: "100 - % Inicial - % Durante Construcción",
    description: "Porcentaje restante después de inicial y construcción"
  },
  { 
    field: "totalPostDeliveryCosts", 
    label: "Costos Post-Entrega", 
    formula: "ISA + Notaría + Equipamiento + Mobiliario",
    description: "Suma de todos los costos adicionales después de entrega"
  },
  { 
    field: "mortgageMonthlyPayment", 
    label: "Pago Mensual Hipoteca", 
    formula: "Fórmula de amortización estándar",
    description: "Calculado con monto, tasa de interés y plazo"
  },
  { 
    field: "mortgageTotal", 
    label: "Total Hipoteca", 
    formula: "Pago Mensual × Meses",
    description: "Total a pagar por la hipoteca"
  },
  { 
    field: "maintenanceTotal", 
    label: "Total Mantenimiento", 
    formula: "Mantenimiento Mensual × Meses",
    description: "Costo total de mantenimiento en el periodo"
  },
  { 
    field: "rentTotal", 
    label: "Total Renta", 
    formula: "Suma de rentas mensuales",
    description: "Ingreso total por rentas en el periodo"
  },
  { 
    field: "investmentTotal", 
    label: "Inversión Total", 
    formula: "Precio Final + Costos Post-Entrega",
    description: "Total invertido incluyendo todos los costos"
  },
  { 
    field: "investmentNet", 
    label: "Inversión Neta", 
    formula: "Total Renta - Total Mantenimiento - Total Hipoteca",
    description: "Ganancia neta después de gastos"
  },
  { 
    field: "investmentRate", 
    label: "Tasa de Retorno", 
    formula: "(Inversión Neta ÷ Inversión Total) × 100",
    description: "Porcentaje de retorno sobre la inversión"
  },
  { 
    field: "appreciationTotal", 
    label: "Plusvalía Total", 
    formula: "Valor Final - Precio Final",
    description: "Ganancia por apreciación del inmueble"
  },
  { 
    field: "finalValue", 
    label: "Valor Final", 
    formula: "Precio Final × (1 + Tasa Plusvalía)^Años",
    description: "Valor proyectado con plusvalía"
  },
];

export function getFormulaTooltip(field: string): FormulaDefinition | undefined {
  return TYPOLOGY_FORMULAS.find(f => f.field === field);
}

export const HEADER_STYLE = "sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 font-semibold text-xs uppercase tracking-wide";

export const SECTION_HEADER_COLORS: Record<string, string> = {
  basico: "bg-gray-50 dark:bg-gray-900/20",
  ubicacion: "bg-gray-100 dark:bg-gray-900/30",
  generales: "bg-blue-100 dark:bg-blue-900/30",
  precio: "bg-green-100 dark:bg-green-900/30",
  distribucion: "bg-purple-100 dark:bg-purple-900/30",
  cajones: "bg-amber-100 dark:bg-amber-900/30",
  bodega: "bg-amber-50 dark:bg-amber-900/20",
  pago: "bg-yellow-100 dark:bg-yellow-900/30",
  credito: "bg-orange-100 dark:bg-orange-900/30",
  mantenimiento: "bg-teal-100 dark:bg-teal-900/30",
  renta: "bg-cyan-100 dark:bg-cyan-900/30",
  inversion: "bg-indigo-100 dark:bg-indigo-900/30",
  plusvalia: "bg-rose-100 dark:bg-rose-900/30",
};
