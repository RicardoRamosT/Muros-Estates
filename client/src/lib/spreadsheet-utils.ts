import { cn } from "@/lib/utils";

export const SHEET_COLOR_DARK = "rgb(11,120,180)";
export const SHEET_COLOR_LIGHT = "rgb(13,149,225)";
export const SHEET_BORDER_COLOR = "rgb(121,135,203)";
export const SHEET_FECHAHORA_COLOR = "#0d9488";

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
    return cn(baseStyles, "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed");
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
      return cn(baseStyles, "bg-white dark:bg-gray-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800");
    
    case "calculated":
      return cn(baseStyles, "bg-teal-50 dark:bg-teal-900/20 text-muted-foreground cursor-default font-medium");
    
    case "readonly":
      return cn(baseStyles, "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-default");
    
    case "index":
      return cn(baseStyles, "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-default text-center");
    
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
    case "development-type-select":
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
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "2-digit" });
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
    label: "Descuento", 
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
    label: "Inicial", 
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
    field: "remainingAmount", 
    label: "Al Escriturar", 
    formula: "Precio Final × (% Restante ÷ 100)",
    description: "Monto restante a pagar al momento de la escritura"
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

export interface SpreadsheetColumnDef {
  key: string;
  label: string;
  group?: string;
  width: string;
  type?: string;
  cellType?: CellType;
}

export interface SpreadsheetColumnGroup {
  key: string;
  label: string;
  color?: string;
}

export interface SpreadsheetColumnGroupRun {
  key: string;
  label: string;
  color?: string;
  colspan: number;
}

// --- Input filter utilities for keystroke-level validation ---

export type InputFilterType = 'phone' | 'email' | 'rfc' | 'name';

const FILTER_PATTERNS: Record<InputFilterType, RegExp> = {
  phone: /^[0-9+\-() ]$/,
  email: /^[a-zA-Z0-9@._+\-]$/,
  rfc: /^[A-Za-z0-9]$/,
  name: /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ .\-]$/,
};

const FILTER_STRIP_PATTERNS: Record<InputFilterType, RegExp> = {
  phone: /[^0-9+\-() ]/g,
  email: /[^a-zA-Z0-9@._+\-]/g,
  rfc: /[^A-Za-z0-9]/g,
  name: /[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ .\-]/g,
};

const COLUMN_FILTER_MAP: Record<string, InputFilterType> = {
  contactPhone: 'phone',
  telefono: 'phone',
  ventasTelefono: 'phone',
  pagosTelefono: 'phone',
  contactEmail: 'email',
  correo: 'email',
  ventasCorreo: 'email',
  pagosCorreo: 'email',
  rfc: 'rfc',
  nombre: 'name',
  apellido: 'name',
  representante: 'name',
  contactName: 'name',
  ventasNombre: 'name',
  pagosNombre: 'name',
};

export function getColumnFilterType(columnKey: string): InputFilterType | undefined {
  return COLUMN_FILTER_MAP[columnKey];
}

export function createInputFilter(type: InputFilterType): (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void {
  const pattern = FILTER_PATTERNS[type];
  return (e) => {
    // Allow control keys (Backspace, Delete, Tab, arrows, Enter, Escape, etc.)
    if (e.key.length > 1) return;
    // Allow Ctrl/Cmd combos (copy, paste, select all, undo, redo)
    if (e.ctrlKey || e.metaKey) return;
    if (!pattern.test(e.key)) {
      e.preventDefault();
    }
  };
}

export function createPasteFilter(type: InputFilterType): (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void {
  const stripPattern = FILTER_STRIP_PATTERNS[type];
  return (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    let cleaned = pasted.replace(stripPattern, '');
    if (type === 'rfc') {
      cleaned = cleaned.toUpperCase();
    }
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    const current = target.value;
    const newValue = current.slice(0, start) + cleaned + current.slice(end);
    // Use native input setter to trigger React's onChange
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(target), 'value'
    )?.set;
    nativeInputValueSetter?.call(target, newValue);
    target.dispatchEvent(new Event('input', { bubbles: true }));
    // Restore cursor position
    const newCursorPos = start + cleaned.length;
    requestAnimationFrame(() => target.setSelectionRange(newCursorPos, newCursorPos));
  };
}

export const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// Convert stored YYYY-MM-DD → display dd/mm/yy
export function formatDateShort(str: any): string {
  if (!str) return "";
  const s = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [year, month, day] = s.split('-');
    return `${day}/${month}/${year.slice(2)}`;
  }
  return s;
}

// Parse user input dd/mm/yy → storage YYYY-MM-DD
export function parseDateInput(input: string): string | null {
  const s = input.trim().replace(/\s/g, '');
  // Accept dd/mm/yy or dd/mm/yyyy
  const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!match) return null;
  const [, dd, mm, rawYy] = match;
  const year = rawYy.length === 2 ? `20${rawYy}` : rawYy;
  const day = dd.padStart(2, '0');
  const month = mm.padStart(2, '0');
  // Basic validation
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  if (isNaN(d.getTime()) || d.getDate() !== Number(day)) return null;
  return `${year}-${month}-${day}`;
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
