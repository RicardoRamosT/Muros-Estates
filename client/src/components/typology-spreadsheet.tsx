import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  ChevronDown, ChevronRight, Plus, Minus, Trash2, Save, X, Layers,
  Loader2, RefreshCw, AlertCircle,
  Filter, Check, CornerDownRight, ImagePlus, Images, Video, Eye, GripVertical, Lock
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Typology } from "@shared/schema";
import { CITIES, ZONES_MONTERREY, ZONES_CDMX, DEVELOPERS, DEVELOPMENTS } from "@shared/constants";
import { cn } from "@/lib/utils";
import { formatDate, formatTime } from "@/lib/spreadsheet-utils";

type TypologyField = keyof Typology;

interface ColumnDef {
  key: TypologyField;
  label: string;
  type: "text" | "number" | "decimal" | "select" | "multiselect" | "boolean" | "date" | "development-type-select";
  options?: readonly string[];
  width?: number;
  calculated?: boolean;
  format?: "currency" | "percent" | "area";
  hideLabel?: boolean;
  fullLabel?: string;
  centerCells?: boolean;
  linkedSizeField?: TypologyField;
}

interface SectionDef {
  id: string;
  label: string;
  parentLabel?: string;
  headerColor: string;  // Strongest color for section headers
  columnHeaderColor?: string;  // Medium color for column names/filters
  cellColor?: string;   // Lightest color for calculated/disabled cells (input cells stay white)
  columns: ColumnDef[];
  subheader?: string;
  conditionalFields?: { field: TypologyField; dependsOn: TypologyField | TypologyField[] }[];
}

// Extra width for sort icon per column header
const SORT_ICON_WIDTH = 18;

const ActiveDropdownRef = { current: null as (() => void) | null };

function ExclusiveSelect({ children, ...props }: React.ComponentProps<typeof Select>) {
  const [open, setOpen] = useState(false);
  const closeMe = useCallback(() => setOpen(false), []);
  useEffect(() => {
    return () => { if (ActiveDropdownRef.current === closeMe) ActiveDropdownRef.current = null; };
  }, [closeMe]);
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      if (ActiveDropdownRef.current && ActiveDropdownRef.current !== closeMe) {
        ActiveDropdownRef.current();
      }
      ActiveDropdownRef.current = closeMe;
    } else {
      if (ActiveDropdownRef.current === closeMe) ActiveDropdownRef.current = null;
    }
    setOpen(isOpen);
  }, [closeMe]);
  return <Select {...props} open={open} onOpenChange={handleOpenChange}>{children}</Select>;
}

const SECTION_COLOR_DARK = "rgb(13,149,225)";
const SECTION_COLOR_LIGHT = "rgb(11,120,180)";
const SECTION_BORDER_COLOR = "rgb(121,135,203)";


function getSectionColor(index: number): string {
  return index % 2 === 0 ? SECTION_COLOR_DARK : SECTION_COLOR_LIGHT;
}

const _groupColorCache = new Map<number, string>();
function buildGroupColorCache(sections: SectionDef[]) {
  _groupColorCache.clear();
  let visualIndex = 0;
  let i = 0;
  while (i < sections.length) {
    const pl = sections[i].parentLabel;
    if (pl) {
      const color = visualIndex % 2 === 0 ? SECTION_COLOR_DARK : SECTION_COLOR_LIGHT;
      while (i < sections.length && sections[i].parentLabel === pl) {
        _groupColorCache.set(i, color);
        i++;
      }
    } else {
      _groupColorCache.set(i, visualIndex % 2 === 0 ? SECTION_COLOR_DARK : SECTION_COLOR_LIGHT);
      i++;
    }
    visualIndex++;
  }
}

function getSectionGroupColor(_sections: SectionDef[], index: number): string {
  return _groupColorCache.get(index) || getSectionColor(index);
}

const SECTIONS: SectionDef[] = [
  {
    id: "basico",
    label: "",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-gray-50 dark:bg-gray-900/20",
    columns: [
      { key: "active", label: "Act.", type: "boolean", width: 40, hideLabel: true, fullLabel: "Activo" },
    ],
  },
  {
    id: "fechahora",
    label: "Fecha/Hora",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(255,241,220)] dark:bg-[rgb(60,40,10)]",
    columns: [
      { key: "createdDate", label: "Fecha", type: "text", width: 75, calculated: true, centerCells: true },
      { key: "createdTime", label: "Hora", type: "text", width: 40, calculated: true, hideLabel: true, fullLabel: "Hora", centerCells: true },
    ],
  },
  {
    id: "ubicacion",
    label: "",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-gray-100 dark:bg-gray-900/30",
    columns: [
      { key: "city", label: "Ciudad", type: "select", options: CITIES, width: 80, calculated: true },
      { key: "zone", label: "Zona", type: "select", options: [], width: 100, calculated: true },
      { key: "developer", label: "Desarrollador", type: "select", options: [], width: 140 },
      { key: "development", label: "Desarrollo", type: "select", options: DEVELOPMENTS, width: 110 },
      { key: "tipoDesarrollo", label: "Tipo", type: "development-type-select", width: 100 },
    ],
  },
  {
    id: "generales",
    label: "Generales",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)] dark:bg-[rgb(50,35,10)]",
    columns: [
      { key: "type", label: "Tipología", type: "select", options: [], width: 90 },
      { key: "view", label: "Vista", type: "select", options: [], width: 80 },
      { key: "level", label: "Nivel", type: "select", options: [] as string[], width: 60, centerCells: true },
    ],
  },
  {
    id: "precio_tamano",
    label: "Tamaño",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(255,241,220)] dark:bg-[rgb(60,40,10)]",
    columns: [
      { key: "size", label: "Unidad", type: "decimal", width: 85, format: "area" },
      { key: "sizeFinal", label: "Total", type: "decimal", width: 100, format: "area" },
    ],
  },
  {
    id: "precio_valores",
    label: "Precio",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)] dark:bg-[rgb(50,35,10)]",
    columns: [
      { key: "price", label: "Precio", type: "decimal", width: 90, format: "currency" },
      { key: "hasDiscount", label: "Bono", type: "boolean", width: 75, fullLabel: "Bono Descuento" },
      { key: "discountPercent", label: "%", type: "decimal", width: 40, format: "percent", hideLabel: true, fullLabel: "Porcentaje", centerCells: true },
      { key: "discountAmount", label: "$ Monto", type: "decimal", width: 70, format: "currency" },
      { key: "finalPrice", label: "Final", type: "decimal", width: 100, format: "currency", calculated: true },
      { key: "pricePerM2", label: "m²", type: "decimal", width: 80, format: "currency", calculated: true, fullLabel: "Precio por m²" },
      { key: "hasSeedCapital", label: "Capital Semilla", type: "boolean", width: 95, fullLabel: "Capital Semilla" },
      { key: "hasPromo", label: "Promo", type: "boolean", width: 70, fullLabel: "Promo" },
      { key: "promoDescription", label: "Descripción", type: "text", width: 130, fullLabel: "Descripción Promo" },
    ],
    conditionalFields: [
      { field: "discountPercent", dependsOn: "hasDiscount" },
      { field: "discountAmount", dependsOn: "hasDiscount" },
    ],
  },
  {
    id: "distribucion",
    label: "Distribución",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(255,241,220)] dark:bg-[rgb(60,40,10)]",
    columns: [
      { key: "bedrooms", label: "Recámaras", type: "select", options: [] as string[], width: 100 },
      { key: "bathrooms", label: "Baños", type: "select", options: [] as string[], width: 80 },
      { key: "areas", label: "Áreas", type: "multiselect", options: [], width: 70 },
      { key: "hasBalcony", label: "Balcón", type: "boolean", width: 45, linkedSizeField: "balconySize" },
      { key: "balconySize", label: "m²", type: "decimal", width: 65, format: "area", hideLabel: true },
      { key: "hasTerrace", label: "Terraza", type: "boolean", width: 45, linkedSizeField: "terraceSize" },
      { key: "terraceSize", label: "m²", type: "decimal", width: 65, format: "area", hideLabel: true },
      { key: "lockOff", label: "Lock-Off", type: "boolean", width: 85 },
    ],
  },
  {
    id: "lockoff",
    label: "Lock-Off",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(255,241,220)] dark:bg-[rgb(60,40,10)]",
    columns: [
      { key: "bedrooms2", label: "Recámaras", type: "select", options: [] as string[], width: 75 },
      { key: "bathrooms2", label: "Baños", type: "select", options: [] as string[], width: 55 },
      { key: "areas2", label: "Áreas", type: "multiselect", options: [], width: 70 },
      { key: "hasBalcony2", label: "Balcón", type: "boolean", width: 45, linkedSizeField: "balconySize2" },
      { key: "balconySize2", label: "m²", type: "decimal", width: 65, format: "area", hideLabel: true },
      { key: "hasTerrace2", label: "Terraza", type: "boolean", width: 45, linkedSizeField: "terraceSize2" },
      { key: "terraceSize2", label: "m²", type: "decimal", width: 65, format: "area", hideLabel: true },
    ],
    conditionalFields: [
      { field: "bedrooms2", dependsOn: "lockOff" },
      { field: "bathrooms2", dependsOn: "lockOff" },
      { field: "areas2", dependsOn: "lockOff" },
      { field: "hasBalcony2", dependsOn: "lockOff" },
      { field: "hasTerrace2", dependsOn: "lockOff" },
    ],
  },
  {
    id: "cajones",
    label: "Cajones",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)] dark:bg-[rgb(50,35,10)]",
    columns: [
      { key: "parkingIncluded", label: "Incluye", type: "select", options: [] as string[], width: 75, centerCells: true },
      { key: "hasParkingOptional", label: "Opcional", type: "boolean", width: 60 },
      { key: "parkingOptionalPrice", label: "Precio", type: "decimal", width: 70, format: "currency" },
    ],
    conditionalFields: [
      { field: "parkingOptionalPrice", dependsOn: "hasParkingOptional" },
    ],
  },
  {
    id: "bodega",
    label: "Bodega",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(255,241,220)] dark:bg-[rgb(60,40,10)]",
    columns: [
      { key: "hasStorage", label: "Incluye", type: "boolean", width: 55 },
      { key: "storageSize", label: "Tamaño", type: "decimal", width: 75, format: "area" },
      { key: "hasStorageOptional", label: "Opcional", type: "boolean", width: 60 },
      { key: "storageSize2", label: "Tamaño", type: "decimal", width: 75, format: "area" },
      { key: "storagePrice", label: "Precio", type: "decimal", width: 70, format: "currency" },
    ],
    conditionalFields: [
      { field: "storageSize", dependsOn: "hasStorage" },
      { field: "storageSize2", dependsOn: "hasStorageOptional" },
      { field: "storagePrice", dependsOn: "hasStorageOptional" },
    ],
  },
  {
    id: "queIncluye",
    label: "Que Incluye",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "",
    columns: [
      { key: "queIncluye", label: "Que Incluye", type: "multiselect", width: 120 },
    ],
  },
  {
    id: "enganche_inicial",
    label: "Inicial",
    parentLabel: "Enganche",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)] dark:bg-[rgb(50,35,10)]",
    columns: [
      { key: "initialPercent", label: "%", type: "decimal", width: 55, format: "percent", centerCells: true, fullLabel: "Inicial Porcentaje" },
      { key: "initialAmount", label: "$ Monto", type: "decimal", width: 70, format: "currency", fullLabel: "Inicial Monto" },
    ],
  },
  {
    id: "enganche_plazo",
    label: "A Plazo",
    parentLabel: "Enganche",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)] dark:bg-[rgb(50,35,10)]",
    columns: [
      { key: "duringConstructionPercent", label: "%", type: "decimal", width: 55, format: "percent", centerCells: true, fullLabel: "Plazo Porcentaje" },
      { key: "duringConstructionAmount", label: "$ Monto", type: "decimal", width: 70, format: "currency", fullLabel: "Plazo Monto" },
      { key: "paymentMonths", label: "M", type: "number", width: 35, hideLabel: true, fullLabel: "Meses", centerCells: true },
      { key: "monthlyPayment", label: "Mens.", type: "decimal", width: 80, format: "currency", calculated: true, fullLabel: "Mensualidad" },
    ],
  },
  {
    id: "enganche_escritura",
    label: "Al Escriturar",
    parentLabel: "Pago Final",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)] dark:bg-[rgb(50,35,10)]",
    columns: [
      { key: "remainingPercent", label: "%", type: "decimal", width: 55, format: "percent", centerCells: true, fullLabel: "Al Escriturar Porcentaje" },
      { key: "remainingAmount" as any, label: "$ Monto", type: "decimal", width: 70, format: "currency", fullLabel: "Al Escriturar Monto" },
    ],
  },
  {
    id: "enganche_total",
    label: "Total",
    parentLabel: "Pago Final",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)] dark:bg-[rgb(50,35,10)]",
    columns: [
      { key: "totalEnganche", label: "Total", type: "decimal", width: 80, format: "currency", calculated: true },
    ],
  },
  {
    id: "entrega",
    label: "",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)] dark:bg-[rgb(50,35,10)]",
    columns: [
      { key: "deliveryDate", label: "Entrega", type: "text", width: 80, calculated: true },
    ],
  },
  {
    id: "impuestos",
    label: "Impuestos",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(255,241,220)] dark:bg-[rgb(60,40,10)]",
    columns: [
      { key: "isaPercent", label: "%", type: "decimal", width: 45, format: "percent", centerCells: true, fullLabel: "ISAI Porcentaje" },
      { key: "isaAmount", label: "$", type: "decimal", width: 85, format: "currency", calculated: true, fullLabel: "ISAI Monto" },
    ],
  },
  {
    id: "notaria",
    label: "Notaría",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(255,241,220)] dark:bg-[rgb(60,40,10)]",
    columns: [
      { key: "notaryPercent", label: "%", type: "decimal", width: 45, format: "percent", centerCells: true, fullLabel: "Notaría Porcentaje" },
      { key: "notaryAmount", label: "$", type: "decimal", width: 85, format: "currency", calculated: true, fullLabel: "Notaría Monto" },
    ],
  },
  {
    id: "gastos_extra",
    label: "Post Entrega",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(255,241,220)] dark:bg-[rgb(60,40,10)]",
    columns: [
      { key: "equipmentCost", label: "Equipo", type: "decimal", width: 80, format: "currency", calculated: true },
      { key: "furnitureCost", label: "Muebles", type: "decimal", width: 80, format: "currency", calculated: true },
      { key: "totalPostDeliveryCosts", label: "Total", type: "decimal", width: 80, format: "currency", calculated: true },
    ],
  },
  {
    id: "credito",
    label: "Crédito Hipotecario",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)] dark:bg-[rgb(50,35,10)]",
    columns: [
      { key: "mortgageAmount", label: "Monto", type: "decimal", width: 70, format: "currency" },
      { key: "mortgageStartDate", label: "Inicia", type: "date", width: 85 },
      { key: "mortgageInterestPercent", label: "Tasa", type: "decimal", width: 55, format: "percent", centerCells: true },
      { key: "mortgageYears", label: "Años", type: "number", width: 45 },
      { key: "mortgageMonthlyPayment", label: "Mens.", type: "decimal", width: 80, format: "currency", calculated: true, fullLabel: "Mensualidad" },
      { key: "mortgageEndDate", label: "Termina", type: "date", width: 85 },
      { key: "mortgageTotal", label: "Total", type: "decimal", width: 85, format: "currency", calculated: true },
    ],
  },
  {
    id: "mantenimiento",
    label: "Mantenimiento",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(255,241,220)] dark:bg-[rgb(60,40,10)]",
    columns: [
      { key: "maintenanceM2", label: "m²", type: "decimal", width: 60, format: "currency" },
      { key: "maintenanceInitial", label: "Inicial", type: "decimal", width: 75, format: "currency", calculated: true },
      { key: "maintenanceStartDate", label: "Fecha", type: "date", width: 85 },
      { key: "maintenanceFinal", label: "Final", type: "decimal", width: 75, format: "currency" },
      { key: "maintenanceEndDate", label: "Fecha", type: "date", width: 85 },
      { key: "maintenanceTotal", label: "Total", type: "decimal", width: 80, format: "currency", calculated: true },
    ],
  },
  {
    id: "renta1",
    label: "Renta",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)] dark:bg-[rgb(50,35,10)]",
    columns: [
      { key: "rentInitial", label: "Inicial", type: "decimal", width: 75, format: "currency" },
      { key: "rentStartDate", label: "Fecha", type: "date", width: 85 },
    ],
  },
  {
    id: "tasa_renta",
    label: "",
    subheader: "7.0%",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)] dark:bg-[rgb(50,35,10)]",
    columns: [
      { key: "rentRatePercent", label: "Tasa", type: "decimal", width: 55, format: "percent", centerCells: true },
    ],
  },
  {
    id: "renta2",
    label: "Renta",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)] dark:bg-[rgb(50,35,10)]",
    columns: [
      { key: "rentFinal", label: "Final", type: "decimal", width: 75, format: "currency" },
      { key: "rentEndDate", label: "Fecha", type: "date", width: 85 },
    ],
  },
  {
    id: "meses",
    label: "",
    subheader: "11.0",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)] dark:bg-[rgb(50,35,10)]",
    columns: [
      { key: "rentMonths", label: "Meses", type: "number", width: 50 },
    ],
  },
  {
    id: "total_renta",
    label: "Total",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)] dark:bg-[rgb(50,35,10)]",
    columns: [
      { key: "rentTotal", label: "Total", type: "decimal", width: 80, format: "currency", calculated: true },
    ],
  },
  {
    id: "inversion",
    label: "Inversión",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(255,241,220)] dark:bg-[rgb(60,40,10)]",
    columns: [
      { key: "investmentTotal", label: "Total", type: "decimal", width: 85, format: "currency", calculated: true },
      { key: "investmentNet", label: "Neta", type: "decimal", width: 80, format: "currency", calculated: true, fullLabel: "Inversión Neta" },
      { key: "investmentMonthly", label: "Mens.", type: "decimal", width: 80, format: "currency", calculated: true, fullLabel: "Mensualidad" },
      { key: "investmentRate", label: "Tasa", type: "decimal", width: 55, format: "percent", calculated: true, centerCells: true },
    ],
  },
  {
    id: "tasa_plusvalia",
    label: "",
    subheader: "7.0%",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)] dark:bg-[rgb(50,35,10)]",
    columns: [
      { key: "appreciationRate", label: "Tasa", type: "decimal", width: 55, format: "percent", centerCells: true },
    ],
  },
  {
    id: "plusvalia",
    label: "Plusvalía",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)] dark:bg-[rgb(50,35,10)]",
    columns: [
      { key: "appreciationDays", label: "Días", type: "number", width: 45 },
      { key: "appreciationMonths", label: "Meses", type: "number", width: 50 },
      { key: "appreciationYears", label: "Años", type: "number", width: 45 },
      { key: "appreciationTotal", label: "Total", type: "decimal", width: 85, format: "currency", calculated: true },
      { key: "finalValue", label: "M. Final", type: "decimal", width: 90, format: "currency", calculated: true, fullLabel: "Monto Final" },
    ],
  },
  ];

buildGroupColorCache(SECTIONS);

function calculateFields(row: Partial<Typology>, globalDefaults?: Record<string, number>, nivelMantenimientoLookup?: Record<string, { valor: number; equipo: number; muebles: number }>): Partial<Typology> {
  const getDefault = (key: string, fallback: number): number => globalDefaults?.[key] ?? fallback;
  const price = parseFloat(row.price as string) || 0;
  const size = parseFloat(row.size as string) || 0;
  
  // Respect hasDiscount: if false, no discount is applied
  const hasDiscount = row.hasDiscount === true;
  let discountAmount = 0;
  if (hasDiscount) {
    // Use existing discountAmount from row if available
    discountAmount = parseFloat(row.discountAmount as string) || 0;
    // Fallback: if discountAmount is 0 but discountPercent has a value, compute from percent
    if (discountAmount === 0) {
      const discountPercent = parseFloat(row.discountPercent as string) || 0;
      if (discountPercent > 0) {
        discountAmount = price * (discountPercent / 100);
      }
    }
  }
  const finalPrice = price - discountAmount;
  const pricePerM2 = size > 0 ? finalPrice / size : 0;
  
  const initialPercent = parseFloat(row.initialPercent as string) || 0;
  const duringConstructionPercent = parseFloat(row.duringConstructionPercent as string) || 0;
  const paymentMonths = (row.paymentMonths as number) || 0;
  
  // Use existing initialAmount from row if available, otherwise calculate from percent
  let initialAmount = parseFloat(row.initialAmount as string) || 0;
  if (initialAmount === 0 && initialPercent > 0 && finalPrice > 0) {
    initialAmount = finalPrice * (initialPercent / 100);
  }
  
  // Use existing duringConstructionAmount from row if available, otherwise calculate from percent
  let duringConstructionAmount = parseFloat(row.duringConstructionAmount as string) || 0;
  if (duringConstructionAmount === 0 && duringConstructionPercent > 0 && finalPrice > 0) {
    duringConstructionAmount = finalPrice * (duringConstructionPercent / 100);
  }
  
  const monthlyPayment = paymentMonths > 0 ? duringConstructionAmount / paymentMonths : 0;
  const totalEnganche = initialAmount + duringConstructionAmount;
  const remainingPercent = 100 - initialPercent - duringConstructionPercent;
  
  const isaPercentDefault = globalDefaults?.['isaPercent'] ?? 3.0;
  const notaryPercentDefault = globalDefaults?.['notaryPercent'] ?? 2.5;
  const isaPercent = parseFloat(row.isaPercent as string) || isaPercentDefault;
  const notaryPercent = parseFloat(row.notaryPercent as string) || notaryPercentDefault;
  const nivelKey = row.nivelMantenimiento as string;
  const nivelData = nivelKey && nivelMantenimientoLookup ? nivelMantenimientoLookup[nivelKey] : null;
  const sizeFinal = parseFloat(row.sizeFinal as string) || size;
  const equipmentCost = nivelData ? sizeFinal * nivelData.equipo : (parseFloat(row.equipmentCost as string) || 0);
  const furnitureCost = nivelData ? sizeFinal * nivelData.muebles : (parseFloat(row.furnitureCost as string) || 0);
  const maintenanceM2FromNivel = nivelData ? nivelData.valor : 0;
  const isaAmount = finalPrice * (isaPercent / 100);
  const notaryAmount = finalPrice * (notaryPercent / 100);
  const totalPostDeliveryCosts = isaAmount + notaryAmount + equipmentCost + furnitureCost;
  
  const mortgageAmount = parseFloat(row.mortgageAmount as string) || 0;
  const mortgageYears = (row.mortgageYears as number) || getDefault('mortgageYears', 15);
  const mortgageInterestPercent = parseFloat(row.mortgageInterestPercent as string) || getDefault('mortgageInterestPercent', 10.5);
  const monthlyRate = mortgageInterestPercent / 100 / 12;
  const numPayments = mortgageYears * 12;
  let mortgageMonthlyPayment = 0;
  if (monthlyRate > 0 && numPayments > 0) {
    mortgageMonthlyPayment = mortgageAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1);
  } else if (numPayments > 0) {
    mortgageMonthlyPayment = mortgageAmount / numPayments;
  }
  const mortgageTotal = mortgageMonthlyPayment * numPayments;
  
  const maintenanceM2 = maintenanceM2FromNivel || (parseFloat(row.maintenanceM2 as string) || 0);
  const maintenanceInitialCalc = maintenanceM2 * sizeFinal;
  const maintenanceInitial = maintenanceInitialCalc > 0 ? maintenanceInitialCalc : (parseFloat(row.maintenanceInitial as string) || 0);
  const maintenanceTotal = maintenanceInitial * 12;
  
  const rentInitial = parseFloat(row.rentInitial as string) || 0;
  const rentRatePercent = parseFloat(row.rentRatePercent as string) || getDefault('rentRatePercent', 7.0);
  const rentMonths = (row.rentMonths as number) || getDefault('rentMonths', 11);
  const rentTotal = rentInitial * rentMonths;
  
  const investmentTotal = finalPrice + totalPostDeliveryCosts;
  const investmentNet = rentTotal - maintenanceTotal;
  const investmentMonthly = rentMonths > 0 ? investmentNet / rentMonths : 0;
  const investmentRate = investmentTotal > 0 ? (investmentNet / investmentTotal) * 100 : 0;
  
  const appreciationRate = parseFloat(row.appreciationRate as string) || getDefault('appreciationRate', 7.0);
  const appreciationDays = (row.appreciationDays as number) || 0;
  const appreciationMonths = (row.appreciationMonths as number) || 0;
  const appreciationYears = (row.appreciationYears as number) || 0;
  const totalYearsForAppreciation = appreciationDays / 365 + appreciationMonths / 12 + appreciationYears;
  const appreciationTotal = finalPrice * Math.pow(1 + appreciationRate / 100, totalYearsForAppreciation) - finalPrice;
  const finalValue = finalPrice + appreciationTotal;
  
  const result: Partial<Typology> = {
    finalPrice: finalPrice.toFixed(2),
    pricePerM2: pricePerM2.toFixed(2),
    monthlyPayment: monthlyPayment.toFixed(2),
    totalEnganche: totalEnganche.toFixed(2),
    remainingPercent: remainingPercent.toFixed(2),
    remainingAmount: (finalPrice * remainingPercent / 100).toFixed(2),
    isaPercent: row.isaPercent ?? isaPercent.toFixed(2),
    isaAmount: isaAmount.toFixed(2),
    notaryPercent: row.notaryPercent ?? notaryPercent.toFixed(2),
    notaryAmount: notaryAmount.toFixed(2),
    equipmentCost: equipmentCost.toFixed(2),
    furnitureCost: furnitureCost.toFixed(2),
    totalPostDeliveryCosts: totalPostDeliveryCosts.toFixed(2),
    mortgageInterestPercent: row.mortgageInterestPercent ?? mortgageInterestPercent.toFixed(2),
    mortgageYears: row.mortgageYears ?? mortgageYears,
    mortgageMonthlyPayment: mortgageMonthlyPayment.toFixed(2),
    mortgageTotal: mortgageTotal.toFixed(2),
    maintenanceInitial: maintenanceInitialCalc > 0 ? maintenanceInitialCalc.toFixed(2) : (row.maintenanceInitial ?? "0"),
    maintenanceTotal: maintenanceTotal.toFixed(2),
    rentRatePercent: row.rentRatePercent ?? rentRatePercent.toFixed(2),
    rentMonths: row.rentMonths ?? rentMonths,
    rentTotal: rentTotal.toFixed(2),
    investmentTotal: investmentTotal.toFixed(2),
    investmentNet: investmentNet.toFixed(2),
    investmentMonthly: investmentMonthly.toFixed(2),
    investmentRate: investmentRate.toFixed(2),
    appreciationRate: row.appreciationRate ?? appreciationRate.toFixed(2),
    appreciationTotal: appreciationTotal.toFixed(2),
    finalValue: finalValue.toFixed(2),
  };
  if (nivelData) {
    result.maintenanceM2 = maintenanceM2.toFixed(2);
  }
  return result;
}

function formatValue(value: any, format?: string): string {
  if (value === null || value === undefined || value === "") return "";
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  
  switch (format) {
    case "currency":
      return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(num);
    case "percent":
      return `${num.toFixed(1)}%`;
    case "area":
      return `${num.toFixed(2)} m²`;
    default:
      return num.toString();
  }
}

function FormattedCellValue({ value, format }: { value: any; format?: string }) {
  if (value === null || value === undefined || value === "") return null;
  const num = parseFloat(value);
  if (isNaN(num)) return <span>{value}</span>;
  
  if (format === "currency") {
    const formatted = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(num);
    return (
      <span className="flex w-full justify-between items-center gap-0.5">
        <span className="text-muted-foreground/70 shrink-0">$</span>
        <span className="tabular-nums">{formatted}</span>
      </span>
    );
  }
  
  if (format === "area") {
    return (
      <span className="flex w-full justify-end items-center">
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{num.toFixed(2)}</span>
        <span className="text-[10px] ml-0.5">m²</span>
      </span>
    );
  }
  
  return <span>{formatValue(value, format)}</span>;
}

interface SortableMediaItemProps {
  doc: any;
  index: number;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function SortableMediaItem({ doc, index, onDelete, isDeleting }: SortableMediaItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: doc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
  const fileName = doc.fileName?.toLowerCase() || '';
  const isVideo = doc.mimeType?.startsWith("video/") || videoExtensions.some((ext: string) => fileName.endsWith(ext));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group border rounded-lg overflow-visible",
        isDragging && "z-50 shadow-lg"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 z-10 p-1 bg-black/60 rounded cursor-grab active:cursor-grabbing"
        data-testid={`drag-handle-${doc.id}`}
      >
        <GripVertical className="w-4 h-4 text-white" />
      </div>
      <div className="absolute top-1 right-1 z-10 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
        {index + 1}
      </div>
      {isVideo ? (
        <video 
          src={doc.fileUrl}
          controls
          className="w-full h-40 object-cover bg-black"
          data-testid={`video-${doc.id}`}
        />
      ) : (
        <img 
          src={doc.fileUrl}
          alt={doc.fileName || doc.originalName}
          className="w-full h-40 object-cover"
          data-testid={`image-${doc.id}`}
        />
      )}
      <div className="absolute top-10 left-0 right-0 bottom-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none group-hover:pointer-events-auto">
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onDelete(doc.id)}
          disabled={isDeleting}
          data-testid={`button-delete-media-${doc.id}`}
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <Trash2 className="w-4 h-4 mr-1" />
          )}
          Eliminar
        </Button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate flex items-center gap-1">
        {isVideo ? <Video className="w-3 h-3" /> : <ImagePlus className="w-3 h-3" />}
        {doc.fileName}
      </div>
    </div>
  );
}

interface RangeFilter {
  min: string;
  max: string;
}

interface ColumnFilterProps {
  column: ColumnDef;
  data: Typology[];
  selectedValues: Set<string>;
  sortDirection: "asc" | "desc" | null;
  onFilterChange: (values: Set<string>) => void;
  onSortChange: (direction: "asc" | "desc" | null) => void;
  sectionColor: string;
  availableValues?: Set<string>;
  rangeFilter?: RangeFilter;
  onRangeFilterChange?: (range: RangeFilter) => void;
  groupedOptions?: { group: string; values: string[] }[];
  columnWidth?: number;
  hideLabel?: boolean;
  fullLabel?: string;
}

function TruncatedLabel({ label, fullLabel, columnKey }: { label: string; fullLabel?: string; columnKey: string }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  
  useEffect(() => {
    const checkTruncation = () => {
      const el = spanRef.current;
      if (el) {
        setIsTruncated(el.scrollWidth > el.clientWidth);
      }
    };
    checkTruncation();
    window.addEventListener("resize", checkTruncation);
    return () => window.removeEventListener("resize", checkTruncation);
  }, [label]);
  
  if (isTruncated || fullLabel) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span 
            ref={spanRef}
            className="flex-1 text-xs font-medium truncate text-center min-w-0 cursor-default" 
            data-testid={`header-label-${columnKey}`}
          >
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {fullLabel || label}
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return (
    <span 
      ref={spanRef}
      className="flex-1 text-xs font-medium truncate pointer-events-none text-center min-w-0" 
      data-testid={`header-label-${columnKey}`}
    >
      {label}
    </span>
  );
}

function ColumnFilter({ column, data, selectedValues, sortDirection, onFilterChange, onSortChange, sectionColor, availableValues, rangeFilter, onRangeFilterChange, groupedOptions, columnWidth, hideLabel, fullLabel }: ColumnFilterProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [localMin, setLocalMin] = useState(rangeFilter?.min || "");
  const [localMax, setLocalMax] = useState(rangeFilter?.max || "");
  const isRangeColumn = column.key === "size";
  
  useEffect(() => {
    setLocalMin(rangeFilter?.min || "");
    setLocalMax(rangeFilter?.max || "");
  }, [rangeFilter?.min, rangeFilter?.max]);
  
  const uniqueValues = useMemo(() => {
    const values = new Set<string>();
    data.forEach(row => {
      const val = row[column.key];
      if (val !== null && val !== undefined && val !== "") {
        values.add(String(val));
      }
    });
    
    const arr = Array.from(values);
    
    if (column.type === "number" || column.type === "decimal") {
      return arr.sort((a, b) => parseFloat(a) - parseFloat(b));
    }
    return arr.sort((a, b) => a.localeCompare(b, "es"));
  }, [data, column]);
  
  const filteredValues = useMemo(() => {
    if (!search) return uniqueValues;
    const searchLower = search.toLowerCase();
    return uniqueValues.filter(v => v.toLowerCase().includes(searchLower));
  }, [uniqueValues, search]);
  
  const allSelected = selectedValues.size === 0 || selectedValues.size === uniqueValues.length;
  
  const handleSelectAll = () => {
    onFilterChange(new Set());
  };
  
  const handleToggleValue = (value: string) => {
    const newSet = new Set(selectedValues.size === 0 ? uniqueValues : selectedValues);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    if (newSet.size === uniqueValues.length) {
      onFilterChange(new Set());
    } else {
      onFilterChange(newSet);
    }
  };
  
  const handleClearFilter = () => {
    onFilterChange(new Set());
    onSortChange(null);
    if (onRangeFilterChange) {
      onRangeFilterChange({ min: "", max: "" });
      setLocalMin("");
      setLocalMax("");
    }
    setOpen(false);
  };
  
  const handleApplyRange = () => {
    if (onRangeFilterChange) {
      onRangeFilterChange({ min: localMin, max: localMax });
    }
    setOpen(false);
  };
  
  const isFiltered = selectedValues.size > 0 && selectedValues.size < uniqueValues.length;
  const isRangeFiltered = rangeFilter && (rangeFilter.min !== "" || rangeFilter.max !== "");
  const hasActiveFilter = isFiltered || isRangeFiltered;
  const isSorted = sortDirection !== null;
  const isNumeric = column.type === "number" || column.type === "decimal";
  
  const handleSortClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sortDirection === null) {
      onSortChange("asc");
    } else if (sortDirection === "asc") {
      onSortChange("desc");
    } else {
      onSortChange(null);
    }
  };

  const SortIcon = () => {
    if (sortDirection === "asc" || sortDirection === "desc") {
      const topSign = sortDirection === "asc" ? "+" : "−";
      const bottomSign = sortDirection === "asc" ? "−" : "+";
      return (
        <span className="flex items-center gap-0 flex-shrink-0" style={{ width: 20, height: 14 }}>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <path d="M4 0.5L4 12.5M4 12.5L1.5 9.5M4 12.5L6.5 9.5" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', width: 12, height: 14, fontSize: 10, lineHeight: 1, fontWeight: 300, color: 'white', flexShrink: 0 }}>
            <span style={{ height: 7, display: 'flex', alignItems: 'center' }}>{topSign}</span>
            <span style={{ height: 7, display: 'flex', alignItems: 'center' }}>{bottomSign}</span>
          </span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-0 flex-shrink-0" style={{ width: 16, height: 14 }}>
        <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <path d="M4 12.5L4 1.5M4 1.5L1.5 4.5M4 1.5L6.5 4.5" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <path d="M4 1.5L4 12.5M4 12.5L1.5 9.5M4 12.5L6.5 9.5" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  };

  return (
    <div className={cn("w-full h-full relative flex items-center text-white", hasActiveFilter && "!bg-amber-200 dark:!bg-amber-500/40 !text-amber-900 dark:!text-amber-100")} style={!hasActiveFilter ? { backgroundColor: sectionColor || undefined } : undefined}>
      <Popover open={open} onOpenChange={setOpen}>
        {hideLabel ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex-shrink-0" style={{ height: '100%' }}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center justify-center h-full cursor-pointer rounded flex-shrink-0",
                      hasActiveFilter && "bg-primary/10"
                    )}
                    style={{ width: 28 }}
                    data-testid={`filter-trigger-${column.key}`}
                  >
                    <ChevronDown className={cn(
                      "w-3 h-3 flex-shrink-0",
                      hasActiveFilter ? "text-amber-700 dark:text-amber-300" : "text-white"
                    )} />
                  </button>
                </PopoverTrigger>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {fullLabel || column.label}
            </TooltipContent>
          </Tooltip>
        ) : (
          <PopoverTrigger asChild>
            <button
              className="flex items-center justify-center h-full text-xs font-medium cursor-pointer rounded flex-shrink-0"
              style={{ width: 28 }}
              data-testid={`filter-trigger-${column.key}`}
            >
              <ChevronDown className={cn(
                "w-3 h-3 flex-shrink-0",
                hasActiveFilter ? "text-amber-700 dark:text-amber-300" : "text-white"
              )} />
            </button>
          </PopoverTrigger>
        )}
      <PopoverContent className="w-56 p-0" align="start">
        <div className="flex flex-col">
          <div className="px-3 py-2 border-b bg-muted/50">
            <span className="text-xs font-semibold">{column.label}</span>
            {column.calculated && <span className="text-xs text-muted-foreground ml-1">(calculado)</span>}
          </div>
          
          {hasActiveFilter && (
            <>
              <button
                className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted text-left text-muted-foreground"
                onClick={handleClearFilter}
                data-testid={`clear-filter-${column.key}`}
              >
                <X className="w-4 h-4" />
                Borrar filtro de "{column.label}"
              </button>
              <div className="border-t" />
            </>
          )}
          
          {isRangeColumn ? (
            <>
              <div className="p-3 space-y-3">
                <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Filtrar por rango</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Mínimo (m²)</label>
                    <Input
                      type="number"
                      placeholder="Min"
                      value={localMin}
                      onChange={(e) => setLocalMin(e.target.value)}
                      className="h-8 text-sm"
                      data-testid={`range-min-${column.key}`}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Máximo (m²)</label>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={localMax}
                      onChange={(e) => setLocalMax(e.target.value)}
                      className="h-8 text-sm"
                      data-testid={`range-max-${column.key}`}
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t" />
              
              <div className="px-3 py-2">
                <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Valores disponibles</div>
                <div className="max-h-32 overflow-y-auto text-xs text-muted-foreground space-y-0.5">
                  {uniqueValues.map((value) => {
                    const displayValue = column.format ? formatValue(value, column.format) : value;
                    return (
                      <div key={value} className="py-0.5">
                        {displayValue}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="border-t p-2 flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleApplyRange} data-testid={`apply-filter-${column.key}`}>
                  Aplicar
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="p-2">
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 text-sm"
                  data-testid={`search-filter-${column.key}`}
                />
              </div>
              
              <div className="max-h-48 overflow-y-auto px-2 pb-2">
                {groupedOptions && groupedOptions.length > 0 ? (
                  <>
                    <label className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-muted px-1 rounded mb-2 border-b pb-2">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        data-testid={`select-all-${column.key}`}
                      />
                      <span className="text-xs font-medium">(Seleccionar todo)</span>
                    </label>
                    {groupedOptions.map(group => {
                      if (!group.group) return null;
                      const groupFilteredValues = group.values.filter(v => 
                        v && (!search || v.toLowerCase().includes(search.toLowerCase()))
                      );
                      if (groupFilteredValues.length === 0) return null;
                      return (
                        <div key={group.group} className="mb-2">
                          <div className="text-xs font-semibold text-muted-foreground px-1 py-1 bg-muted/50 rounded mb-1">
                            {group.group}
                          </div>
                          {groupFilteredValues.map((value) => {
                            const isChecked = selectedValues.size === 0 || selectedValues.has(value);
                            const displayValue = column.format ? formatValue(value, column.format) : value;
                            const isAvailable = !availableValues || availableValues.has(value);
                            
                            return (
                              <label
                                key={value}
                                className={cn(
                                  "flex items-center gap-2 py-1 px-1 rounded ml-2",
                                  isAvailable
                                    ? "cursor-pointer hover:bg-muted"
                                    : "opacity-40 cursor-not-allowed"
                                )}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => handleToggleValue(value)}
                                  disabled={!isAvailable}
                                  data-testid={`filter-value-${column.key}-${value}`}
                                />
                                <span className={cn(
                                  "text-xs truncate",
                                  !isAvailable && "text-muted-foreground line-through"
                                )}>
                                  {displayValue}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <label className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-muted px-1 rounded">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        data-testid={`select-all-${column.key}`}
                      />
                      <span className="text-xs font-medium">(Seleccionar todo)</span>
                    </label>
                    
                    {filteredValues.map((value) => {
                      const isChecked = selectedValues.size === 0 || selectedValues.has(value);
                      const displayValue = column.format ? formatValue(value, column.format) : value;
                      const isAvailable = !availableValues || availableValues.has(value);
                      
                      return (
                        <label
                          key={value}
                          className={cn(
                            "flex items-center gap-2 py-1 px-1 rounded",
                            isAvailable
                              ? "cursor-pointer hover:bg-muted"
                              : "opacity-40 cursor-not-allowed"
                          )}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleValue(value)}
                            disabled={!isAvailable}
                            data-testid={`filter-value-${column.key}-${value}`}
                          />
                          <span className={cn(
                            "text-xs truncate",
                            !isAvailable && "text-muted-foreground line-through"
                          )}>
                            {displayValue}
                          </span>
                        </label>
                      );
                    })}
                    
                    {filteredValues.length === 0 && (
                      <p className="text-xs text-muted-foreground py-2 text-center">
                        Sin resultados
                      </p>
                    )}
                  </>
                )}
              </div>
              
              <div className="border-t p-2 flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={() => setOpen(false)} data-testid={`apply-filter-${column.key}`}>
                  Aceptar
                </Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
      </Popover>
      {hideLabel ? (
        <div className="flex-1" />
      ) : (
        <TruncatedLabel 
          label={column.label} 
          fullLabel={fullLabel}
          columnKey={column.key}
        />
      )}
      {hideLabel ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleSortClick}
              className={cn(
                "flex items-center justify-center h-full cursor-pointer rounded flex-shrink-0",
                isSorted && "bg-primary/10"
              )}
              style={{ width: 28 }}
              title={undefined}
              data-testid={`sort-toggle-${column.key}`}
            >
              <SortIcon />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {fullLabel || column.label}
          </TooltipContent>
        </Tooltip>
      ) : (
        <button
          onClick={handleSortClick}
          className={cn(
            "flex items-center justify-center h-full cursor-pointer rounded flex-shrink-0",
            isSorted && "bg-primary/10"
          )}
          style={{ width: 28 }}
          title={undefined}
          data-testid={`sort-toggle-${column.key}`}
        >
          <SortIcon />
        </button>
      )}
    </div>
  );
}

interface EditableCellProps {
  value: any;
  column: ColumnDef;
  rowId: string;
  city?: string;
  developer?: string;
  onChange: (value: any) => void;
  disabled?: boolean;
  dynamicOptions?: string[];
  allDevelopments?: any[];
  allDevelopers?: any[];
  vistaOptions?: string[];
  vistasByDevelopment?: Record<string, string[]>;
  areaOptions?: string[];
  incluyeOptions?: string[];
  tipologiaOptions?: string[];
  typesByDevelopment?: Record<string, string[]>;
  recamaraOptions?: string[];
  banoOptions?: string[];
  cajonOptions?: string[];
  developerSelectOptions?: string[];
  zoneOptionsByCity?: Record<string, string[]>;
  isLastInSection?: boolean;
  row?: Typology;
  sectionCellColor?: string;
  isDynamicCalculated?: boolean;
  filteredDevelopmentName?: string | null;
  linkedSizeValue?: any;
  onLinkedSizeChange?: (value: any) => void;
}

const EditableCell = React.memo(function EditableCell({ value, column, rowId, city, developer, onChange, disabled, dynamicOptions, allDevelopments, allDevelopers, vistaOptions, vistasByDevelopment, areaOptions, incluyeOptions, tipologiaOptions, typesByDevelopment, recamaraOptions, banoOptions, cajonOptions, developerSelectOptions, zoneOptionsByCity, isLastInSection, row, sectionCellColor, isDynamicCalculated, filteredDevelopmentName, linkedSizeValue, onLinkedSizeChange }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const cellBorderClass = "";
  
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value) {
      onChange(localValue);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setLocalValue(value);
      setIsEditing(false);
    }
  };
  
  if (column.calculated || disabled) {
    return (
      <div 
        className={cn(
          "spreadsheet-cell px-2 text-xs", cellBorderClass,
          (column.format === "currency" || column.format === "area") ? "" : "truncate",
          column.calculated && "bg-[rgb(255,241,220)] dark:bg-[rgb(60,40,10)]",
          column.calculated && "text-muted-foreground",
          disabled && !column.calculated && "bg-gray-200 dark:bg-gray-700",
          disabled && !column.calculated && "text-gray-400 dark:text-gray-500 cursor-not-allowed",
          column.centerCells && "justify-center text-center"
        )}
        style={{ width: (column.width || 100) + SORT_ICON_WIDTH }}
        data-testid={`cell-${column.key}-disabled`}
      >
        {(column.format === "currency" || column.format === "area") 
          ? <FormattedCellValue value={value} format={column.format} />
          : (formatValue(value, column.format) || "")}
      </div>
    );
  }
  
  if (isDynamicCalculated && !isEditing) {
    return (
      <div 
        className={cn(
          "spreadsheet-cell px-2 text-xs cursor-pointer text-muted-foreground", cellBorderClass,
          "bg-[rgb(255,241,220)] dark:bg-[rgb(60,40,10)]",
          (column.format === "currency" || column.format === "area") ? "" : "truncate",
          column.centerCells && "justify-center text-center"
        )}
        style={{ width: (column.width || 100) + SORT_ICON_WIDTH }}
        onClick={() => setIsEditing(true)}
        data-testid={`cell-${column.key}-${rowId}`}
      >
        {(column.format === "currency" || column.format === "area")
          ? <FormattedCellValue value={value} format={column.format} />
          : (formatValue(value, column.format) || "")}
      </div>
    );
  }
  
  if (column.type === "boolean") {
    // Cell background: light green for Sí, light red for No
    const cellBgColor = value === true 
      ? '#dcfce7'  // green-100 
      : value === false 
        ? '#fee2e2'  // red-100
        : undefined;
    // Text color: dark green for Sí, dark red for No
    const textColorClass = value === true 
      ? 'text-green-700 font-medium' 
      : value === false 
        ? 'text-red-600 font-medium' 
        : 'text-muted-foreground';
    if (column.linkedSizeField && onLinkedSizeChange) {
      const sizeVal = linkedSizeValue != null ? String(linkedSizeValue) : "";
      const showSizeInput = value === true;
      return (
        <div 
          className={cn("spreadsheet-cell px-0 flex", cellBorderClass)}
          style={{ width: (column.width || 100) + SORT_ICON_WIDTH }}
        >
          <div style={{ backgroundColor: cellBgColor, width: 42, flexShrink: 0 }}>
            <ExclusiveSelect
              value={value === true ? "si" : value === false ? "no" : ""}
              onValueChange={(val) => onChange(val === "si")}
            >
              <SelectTrigger className={`h-6 text-xs border-0 bg-transparent px-0 !justify-center gap-0.5 [&_svg]:h-3 [&_svg]:w-3 [&_svg]:shrink-0 focus:ring-0 focus:ring-offset-0 ${textColorClass}`} style={{ width: 42 }} data-testid={`boolean-${column.key}-${rowId}`}>
                <span className="shrink-0 text-left" style={{ width: '2.5ch' }}>{value === true ? "Sí" : value === false ? "No" : "-"}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="si" className="text-green-700 font-medium">Sí</SelectItem>
                <SelectItem value="no" className="text-red-600 font-medium">No</SelectItem>
              </SelectContent>
            </ExclusiveSelect>
          </div>
          <div className="flex-1 border-l border-gray-200 dark:border-gray-700">
            {showSizeInput ? (
              <input
                type="text"
                value={sizeVal}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, "");
                  onLinkedSizeChange(raw === "" ? null : parseFloat(raw));
                }}
                className="h-6 w-full text-xs px-1 bg-white dark:bg-gray-900 border-0 outline-none text-right"
                placeholder="m²"
                data-testid={`input-${column.linkedSizeField}-${rowId}`}
              />
            ) : (
              <div className="h-6 w-full bg-gray-100 dark:bg-gray-800" />
            )}
          </div>
        </div>
      );
    }
    return (
      <div 
        className={cn("spreadsheet-cell px-0", cellBorderClass)}
        style={{ width: (column.width || 100) + SORT_ICON_WIDTH, backgroundColor: cellBgColor }}
      >
        <ExclusiveSelect
          value={value === true ? "si" : value === false ? "no" : ""}
          onValueChange={(val) => onChange(val === "si")}
        >
          <SelectTrigger className={`h-6 w-full text-xs border-0 bg-transparent px-0 !justify-center gap-0.5 [&_svg]:h-3 [&_svg]:w-3 [&_svg]:shrink-0 focus:ring-0 focus:ring-offset-0 ${textColorClass}`} data-testid={`boolean-${column.key}-${rowId}`}>
            <span className="shrink-0 text-left" style={{ width: '2.5ch' }}>{value === true ? "Sí" : value === false ? "No" : "-"}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="si" className="text-green-700 font-medium">Sí</SelectItem>
            <SelectItem value="no" className="text-red-600 font-medium">No</SelectItem>
          </SelectContent>
        </ExclusiveSelect>
      </div>
    );
  }
  
  // Multi-select with checkboxes (for areas)
  if (column.type === "multiselect") {
    const baseOptions: string[] = column.key === "queIncluye"
      ? (incluyeOptions && incluyeOptions.length > 0 ? [...incluyeOptions] : [])
      : areaOptions && areaOptions.length > 0 
        ? [...areaOptions] 
        : (column.options ? [...column.options] : []);
    
    // Parse current value - stored as comma-separated string, use Set to avoid duplicates
    const currentValuesSet = new Set(
      value ? String(value).split(",").map(v => v.trim()).filter(Boolean) : []
    );
    const currentValues = Array.from(currentValuesSet);
    
    // Ensure current values are in options (in case they were saved before options changed)
    const allOptions = Array.from(new Set([...baseOptions, ...currentValues]));
    
    const handleToggle = (opt: string) => {
      const newSet = new Set(currentValues);
      if (newSet.has(opt)) {
        newSet.delete(opt);
      } else {
        newSet.add(opt);
      }
      onChange(Array.from(newSet).join(", "));
    };
    
    const displayValue = currentValues.length > 0 
      ? `${currentValues.length} seleccionados`
      : "";
    
    return (
      <div 
        className={cn("spreadsheet-cell px-1 bg-gray-50 dark:bg-gray-800/50", cellBorderClass)}
        style={{ width: (column.width || 100) + SORT_ICON_WIDTH }}
      >
        {disabled ? (
          <div className="flex items-center gap-1 px-1">
            <span className="text-xs text-muted-foreground truncate">{displayValue}</span>
            <Lock className="w-3 h-3 opacity-50 shrink-0" />
          </div>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-between w-full h-6 text-xs px-1 cursor-pointer bg-transparent border-0 focus:ring-0 focus:outline-none text-left"
                data-testid={`multiselect-${column.key}-${rowId}`}
              >
                <span className="truncate">{displayValue}</span>
                <ChevronDown className="ml-auto h-3 w-3 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {allOptions.map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={currentValues.includes(opt)}
                      onCheckedChange={() => handleToggle(opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  }
  
  if (column.type === "select") {
    let options: readonly string[] = dynamicOptions || column.options || [];
    if (column.key === "zone" && city) {
      if (zoneOptionsByCity && zoneOptionsByCity[city]?.length > 0) {
        options = zoneOptionsByCity[city];
      } else {
        options = city === "Monterrey" ? ZONES_MONTERREY : city === "CDMX" ? ZONES_CDMX : [];
      }
    }
    
    if (column.key === "developer") {
      if (developerSelectOptions && developerSelectOptions.length > 0) {
        options = developerSelectOptions;
      }
    }

    if (column.key === "development" && allDevelopments) {
      const devsToShow = city
        ? allDevelopments.filter(d => d.city === city)
        : allDevelopments;
      const devNames = devsToShow
        .map(d => d.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'es'));
      if (devNames.length > 0) {
        options = devNames;
      }
    }
    
    if (column.key === "view") {
      const rowDevName = row?.development;
      if (rowDevName && vistasByDevelopment && vistasByDevelopment[rowDevName]?.length > 0) {
        options = vistasByDevelopment[rowDevName];
      } else if (vistaOptions && vistaOptions.length > 0) {
        options = vistaOptions;
      }
    }
    
    if (column.key === "type") {
      const rowDev = row?.development;
      if (rowDev && typesByDevelopment && typesByDevelopment[rowDev]?.length > 0) {
        options = typesByDevelopment[rowDev];
      } else if (tipologiaOptions && tipologiaOptions.length > 0) {
        options = tipologiaOptions;
      }
    }
    
    // Use catalog options for bedrooms (recamaras)
    if ((column.key === "bedrooms" || column.key === "bedrooms2") && recamaraOptions && recamaraOptions.length > 0) {
      options = recamaraOptions;
    }
    
    // Use catalog options for bathrooms (baños)
    if ((column.key === "bathrooms" || column.key === "bathrooms2") && banoOptions && banoOptions.length > 0) {
      options = banoOptions;
    }
    
    // Use catalog options for parking included (cajones)
    if (column.key === "parkingIncluded" && cajonOptions && cajonOptions.length > 0) {
      options = cajonOptions;
    }
    
    // Generate level options from development's niveles
    if (column.key === "level" && row?.development && allDevelopments) {
      const dev = allDevelopments.find(d => d.name === row.development);
      const niveles = dev?.niveles as number | undefined;
      if (niveles && niveles > 0) {
        options = Array.from({ length: niveles }, (_, i) => String(i + 1));
      }
    }
    
    // Ensure current value is always in options to prevent disappearing values
    const currentValue = value?.toString() || "";
    const isNumericOptions = options.length > 0 && options.every(o => /^\d+$/.test(o));
    let finalOptions = isNumericOptions 
      ? [...options].sort((a, b) => parseInt(a) - parseInt(b))
      : [...options].sort((a, b) => a.localeCompare(b, 'es'));
    if (currentValue && !finalOptions.includes(currentValue)) {
      finalOptions = [currentValue, ...finalOptions];
    }
    
    return (
      <div 
        className={cn("spreadsheet-cell px-1 bg-gray-50 dark:bg-gray-800/50", cellBorderClass)}
        style={{ width: (column.width || 100) + SORT_ICON_WIDTH }}
      >
        <ExclusiveSelect 
          value={currentValue} 
          onValueChange={(val) => {
            if (val === "__sin_asignar__") {
              onChange("");
            } else {
              onChange(val);
            }
          }}
        >
          <SelectTrigger 
            className={cn("h-6 w-full text-xs border-0 focus:ring-0 shadow-none bg-transparent px-1 [&_svg]:h-3 [&_svg]:w-3", column.centerCells && (!currentValue || /^\d+$/.test(currentValue)) ? "text-center" : "text-left")}
            data-testid={`select-${column.key}-${rowId}`}
          >
            <span className="truncate min-w-0 flex-1">{currentValue || ""}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__sin_asignar__" className="font-bold text-muted-foreground">Sin Asignar</SelectItem>
            {finalOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </ExclusiveSelect>
      </div>
    );
  }
  
  // Development type multi-select - shows types from the selected development or developer
  if (column.type === "development-type-select") {
    const developmentName = row?.development;
    const selectedDevelopment = allDevelopments?.find(d => d.name === developmentName);
    
    // First try development tipos, then fallback to developer tipos
    let availableTypes: string[] = [];
    if (selectedDevelopment?.tipos && (selectedDevelopment.tipos as string[]).length > 0) {
      availableTypes = selectedDevelopment.tipos as string[];
    } else if (selectedDevelopment?.developerId && allDevelopers) {
      const selectedDeveloper = allDevelopers.find(dev => dev.id === selectedDevelopment.developerId);
      if (selectedDeveloper?.tipos && (selectedDeveloper.tipos as string[]).length > 0) {
        availableTypes = selectedDeveloper.tipos as string[];
      }
    }
    
    const currentTypes: string[] = Array.isArray(value) ? value : (value ? [value as string] : []);
    const selectedType = currentTypes.length > 0 ? currentTypes[0] : "";
    
    if (availableTypes.length === 0) {
      return (
        <div 
          className={cn("spreadsheet-cell px-1 bg-gray-100 dark:bg-gray-800/50", cellBorderClass)}
          style={{ width: (column.width || 100) + SORT_ICON_WIDTH }}
        >
          <span className="text-xs text-muted-foreground">Sin tipos</span>
        </div>
      );
    }
    
    const handleTypeSelect = (tipo: string) => {
      onChange([tipo]);
    };
    
    return (
      <div 
        className={cn("spreadsheet-cell px-1 bg-gray-50 dark:bg-gray-800/50", cellBorderClass)}
        style={{ width: (column.width || 100) + SORT_ICON_WIDTH }}
      >
        {disabled ? (
          <div className="flex items-center gap-1 px-1">
            <span className={`text-xs truncate ${!selectedType ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
              {!selectedType ? "SIN ASIGNAR" : selectedType}
            </span>
            <Lock className="w-3 h-3 opacity-50 shrink-0" />
          </div>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn("h-6 w-full justify-between px-1 text-xs font-normal [&_svg]:h-3 [&_svg]:w-3", !selectedType ? 'text-red-500 font-medium' : '')}
                data-testid={`select-${column.key}-${rowId}`}
              >
                <span className="truncate text-left min-w-0 flex-1">
                  {!selectedType ? "SIN ASIGNAR" : selectedType}
                </span>
                <ChevronDown className="shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
              <div className="space-y-0.5">
                {availableTypes.map((tipo) => (
                  <button
                    key={tipo}
                    className={`w-full text-left px-2 py-1 text-xs rounded-sm cursor-pointer transition-colors ${
                      selectedType === tipo 
                        ? 'bg-primary/10 text-primary font-medium' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => handleTypeSelect(tipo)}
                    data-testid={`option-${column.key}-${rowId}-${tipo}`}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  }
  
  if (isEditing) {
    return (
      <div 
        className={cn("spreadsheet-cell px-1 bg-white dark:bg-gray-900", cellBorderClass)}
        style={{ width: (column.width || 100) + SORT_ICON_WIDTH }}
      >
        <Input
          ref={inputRef}
          type={column.type === "number" || column.type === "decimal" ? "number" : "text"}
          step={column.type === "decimal" ? "0.01" : "1"}
          value={localValue ?? ""}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn("h-6 w-full text-xs border-0 focus:ring-0 shadow-none p-1 bg-transparent", column.centerCells && "text-center")}
          data-testid={`input-${column.key}-${rowId}`}
        />
      </div>
    );
  }
  
  return (
    <div
      className={cn(
        "spreadsheet-cell px-2 text-xs cursor-pointer bg-white dark:bg-gray-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/30 overflow-hidden", cellBorderClass,
        column.centerCells && "justify-center text-center"
      )}
      style={{ width: (column.width || 100) + SORT_ICON_WIDTH }}
      onClick={() => setIsEditing(true)}
      title={formatValue(value, column.format)}
      data-testid={`cell-${column.key}-${rowId}`}
    >
      {(column.format === "currency" || column.format === "area")
        ? <FormattedCellValue value={value} format={column.format} />
        : <span className="truncate min-w-0">{formatValue(value, column.format) || ""}</span>}
    </div>
  );
});

type ColumnFilters = Record<string, Set<string>>;
type ColumnSorts = Record<string, "asc" | "desc" | null>;
type RangeFilters = Record<string, RangeFilter>;

const BIDIRECTIONAL_PAIRS: [string, string][] = [
  ["discountPercent", "discountAmount"],
  ["initialPercent", "initialAmount"],
  ["duringConstructionPercent", "duringConstructionAmount"],
  ["remainingPercent", "remainingAmount"],
];

type DynamicGrayState = Record<string, Record<string, string>>;

export function TypologySpreadsheet() {
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(SECTIONS.map(s => s.id))
  );
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});
  const [columnSorts, setColumnSorts] = useState<ColumnSorts>({});
  const [rangeFilters, setRangeFilters] = useState<RangeFilters>({});
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<Typology>>>(new Map());
  const [dynamicGray, setDynamicGray] = useState<DynamicGrayState>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [selectedTypologyForMedia, setSelectedTypologyForMedia] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  
  const { data: typologies = [], isLoading, refetch } = useQuery<Typology[]>({
    queryKey: ["/api/typologies"],
  });
  
  const { data: documents = [] } = useQuery<any[]>({
    queryKey: ["/api/documents"],
  });
  
  const { data: dbDevelopers = [] } = useQuery<any[]>({
    queryKey: ["/api/developers"],
  });
  
  const { data: dbDevelopments = [] } = useQuery<any[]>({
    queryKey: ["/api/developments-entity"],
  });
  
  const { data: catalogVistas = [] } = useQuery<any[]>({
    queryKey: ["/api/catalog/vistas"],
  });
  
  const { data: catalogAreas = [] } = useQuery<any[]>({
    queryKey: ["/api/catalog/areas"],
  });
  
  const { data: catalogTipologias = [] } = useQuery<any[]>({
    queryKey: ["/api/catalog/tipologias"],
  });
  
  const { data: catalogRecamaras = [] } = useQuery<any[]>({
    queryKey: ["/api/catalog/recamaras"],
  });
  
  const { data: catalogBanos = [] } = useQuery<any[]>({
    queryKey: ["/api/catalog/banos"],
  });
  
  const { data: catalogCajones = [] } = useQuery<any[]>({
    queryKey: ["/api/catalog/cajones"],
  });
  
  const { data: catalogIncluye = [] } = useQuery<any[]>({
    queryKey: ["/api/catalog/incluye"],
  });
  
  const { data: catalogNivelMantenimiento = [] } = useQuery<any[]>({
    queryKey: ["/api/catalog/nivel-mantenimiento"],
  });
  
  const { data: catalogCities = [] } = useQuery<any[]>({
    queryKey: ["/api/catalog/cities"],
  });
  
  const { data: catalogZones = [] } = useQuery<any[]>({
    queryKey: ["/api/catalog/zones"],
  });

  const { data: globalSettingsData = [] } = useQuery<{ id: string; key: string; value: string; label: string | null }[]>({
    queryKey: ["/api/global-settings"],
  });

  const globalDefaultsMap = useMemo(() => {
    const map: Record<string, number> = {};
    globalSettingsData.forEach(s => {
      const val = parseFloat(s.value);
      if (!isNaN(val)) map[s.key] = val;
    });
    return map;
  }, [globalSettingsData]);

  const cityDefaultsMap = useMemo(() => {
    const map: Record<string, { isaPercent: number; notariaPercent: number }> = {};
    catalogCities.forEach((city: any) => {
      if (city.name) {
        map[city.name] = {
          isaPercent: parseFloat(city.isaiPercent) || 3.0,
          notariaPercent: parseFloat(city.notariaPercent) || 2.5,
        };
      }
    });
    return map;
  }, [catalogCities]);

  const nivelMantenimientoLookup = useMemo(() => {
    const map: Record<string, { valor: number; equipo: number; muebles: number }> = {};
    catalogNivelMantenimiento.forEach((n: any) => {
      if (n.name) {
        map[n.name] = {
          valor: parseFloat(n.valor) || 0,
          equipo: parseFloat(n.equipo) || 0,
          muebles: parseFloat(n.muebles) || 0,
        };
      }
    });
    return map;
  }, [catalogNivelMantenimiento]);

  const getDefaultsForRow = (row: Partial<Typology>) => {
    const cityName = row.city as string;
    const cityDefaults = cityName ? cityDefaultsMap[cityName] : undefined;
    return {
      ...globalDefaultsMap,
      ...(cityDefaults ? { isaPercent: cityDefaults.isaPercent, notaryPercent: cityDefaults.notariaPercent } : {}),
    };
  };
  
  const vistaOptions = useMemo(() => {
    return catalogVistas.map(v => v.name).filter(Boolean);
  }, [catalogVistas]);

  const vistasByDevelopment = useMemo(() => {
    const map: Record<string, string[]> = {};
    if (dbDevelopments) {
      dbDevelopments.forEach((dev: any) => {
        if (dev.name && Array.isArray(dev.vistas) && dev.vistas.length > 0) {
          map[dev.name] = dev.vistas;
        }
      });
    }
    return map;
  }, [dbDevelopments]);

  const filteredDevelopmentName = useMemo(() => {
    const devFilter = columnFilters["development"];
    if (devFilter && devFilter.size === 1) {
      return Array.from(devFilter)[0] as string;
    }
    return null;
  }, [columnFilters]);
  
  const areaOptions = useMemo(() => {
    return catalogAreas.map(a => a.name).filter(Boolean);
  }, [catalogAreas]);
  
  const incluyeOptions = useMemo(() => {
    return catalogIncluye.map((i: any) => i.name).filter(Boolean);
  }, [catalogIncluye]);
  
  const tipologiaOptions = useMemo(() => {
    return catalogTipologias.map(t => t.name).filter(Boolean);
  }, [catalogTipologias]);

  const typesByDevelopment = useMemo(() => {
    const map: Record<string, string[]> = {};
    typologies.forEach((t) => {
      const dev = t.development;
      if (!dev) return;
      if (!map[dev]) map[dev] = [];
      const typeVal = t.type?.toString();
      if (typeVal && !map[dev].includes(typeVal)) {
        map[dev].push(typeVal);
      }
    });
    Object.keys(map).forEach((key) => map[key].sort());
    return map;
  }, [typologies]);
  
  const recamaraOptions = useMemo(() => {
    return catalogRecamaras.map(r => r.name).filter(Boolean);
  }, [catalogRecamaras]);
  
  const banoOptions = useMemo(() => {
    return catalogBanos.map(b => b.name).filter(Boolean);
  }, [catalogBanos]);
  
  const cajonOptions = useMemo(() => {
    return catalogCajones.map(c => c.name).filter(Boolean);
  }, [catalogCajones]);
  
  const developerOptions = useMemo(() => {
    const dbNames = dbDevelopers.map(d => d.name).filter(Boolean);
    const constantNames = [...DEVELOPERS];
    const allNames = Array.from(new Set([...dbNames, ...constantNames]));
    return allNames.sort();
  }, [dbDevelopers]);
  
  const developmentOptions = useMemo(() => {
    const dbNames = dbDevelopments.map(d => d.name).filter(Boolean);
    const constantNames = [...DEVELOPMENTS];
    const allNames = Array.from(new Set([...dbNames, ...constantNames]));
    return allNames.sort();
  }, [dbDevelopments]);
  
  const zoneOptionsByCity = useMemo(() => {
    const cityMap: Record<string, string[]> = {};
    catalogZones.forEach((zone: any) => {
      if (!zone.name) return;
      const cityId = zone.cityId;
      const city = catalogCities.find((c: any) => c.id === cityId);
      const cityName = city?.name || "Sin Ciudad";
      if (!cityMap[cityName]) cityMap[cityName] = [];
      if (!cityMap[cityName].includes(zone.name)) {
        cityMap[cityName].push(zone.name);
      }
    });
    Object.keys(cityMap).forEach(k => cityMap[k].sort());
    return cityMap;
  }, [catalogZones, catalogCities]);

  const zoneGroupedOptions = useMemo(() => {
    const groups: { group: string; values: string[] }[] = [];
    const cityMap: Record<string, string[]> = {};
    const allZoneNames = new Set<string>();
    
    catalogZones.forEach((zone: any) => {
      if (!zone.name) return;
      allZoneNames.add(zone.name);
      const cityId = zone.cityId;
      const city = catalogCities.find((c: any) => c.id === cityId);
      const cityName = city?.name || "Sin Ciudad";
      if (!cityMap[cityName]) {
        cityMap[cityName] = [];
      }
      if (!cityMap[cityName].includes(zone.name)) {
        cityMap[cityName].push(zone.name);
      }
    });
    
    typologies.forEach((t: any) => {
      if (t.zone && !allZoneNames.has(t.zone)) {
        if (!cityMap["Otras Zonas"]) {
          cityMap["Otras Zonas"] = [];
        }
        if (!cityMap["Otras Zonas"].includes(t.zone)) {
          cityMap["Otras Zonas"].push(t.zone);
        }
      }
    });
    
    Object.keys(cityMap).sort().forEach(cityName => {
      groups.push({
        group: cityName,
        values: cityMap[cityName].filter(Boolean).sort(),
      });
    });
    
    return groups;
  }, [catalogZones, catalogCities, typologies]);
  
  const developmentGroupedOptions = useMemo(() => {
    const groups: { group: string; values: string[] }[] = [];
    const developerMap: Record<string, string[]> = {};
    const allDevNames = new Set<string>();
    
    dbDevelopments.forEach((dev: any) => {
      if (!dev.name) return;
      allDevNames.add(dev.name);
      const developerId = dev.developerId;
      const developer = dbDevelopers.find((d: any) => d.id === developerId);
      const developerName = developer?.name || "Sin Desarrollador";
      if (!developerMap[developerName]) {
        developerMap[developerName] = [];
      }
      if (!developerMap[developerName].includes(dev.name)) {
        developerMap[developerName].push(dev.name);
      }
    });
    
    typologies.forEach((t: any) => {
      if (t.development && !allDevNames.has(t.development)) {
        if (!developerMap["Otros Desarrollos"]) {
          developerMap["Otros Desarrollos"] = [];
        }
        if (!developerMap["Otros Desarrollos"].includes(t.development)) {
          developerMap["Otros Desarrollos"].push(t.development);
        }
      }
    });
    
    Object.keys(developerMap).sort().forEach(developerName => {
      groups.push({
        group: developerName,
        values: developerMap[developerName].filter(Boolean).sort(),
      });
    });
    
    return groups;
  }, [dbDevelopments, dbDevelopers, typologies]);
  
  const getTypologyDocCount = useCallback((typologyId: string) => {
    return documents.filter(d => d.typologyId === typologyId && d.rootCategory === "desarrolladores").length;
  }, [documents]);
  
  const uploadMediaMutation = useMutation({
    mutationFn: async ({ typologyId, file }: { typologyId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("rootCategory", "desarrolladores");
      formData.append("section", "productos");
      formData.append("typologyId", typologyId);
      formData.append("shareable", "true");
      
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("muros_session")}`,
        },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Archivo subido correctamente" });
    },
    onError: () => {
      toast({ title: "Error al subir archivo", variant: "destructive" });
    },
  });
  
  const deleteMediaMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("muros_session")}`,
        },
      });
      if (!res.ok) throw new Error("Delete failed");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Archivo eliminado" });
    },
    onError: () => {
      toast({ title: "Error al eliminar archivo", variant: "destructive" });
    },
  });
  
  const getTypologyMedia = useCallback((typologyId: string) => {
    return documents
      .filter(d => d.typologyId === typologyId && d.rootCategory === "desarrolladores")
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [documents]);

  const reorderMediaMutation = useMutation({
    mutationFn: async (documentIds: string[]) => {
      const res = await fetch("/api/documents/reorder", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("muros_session")}`,
        },
        body: JSON.stringify({ documentIds }),
      });
      if (!res.ok) throw new Error("Reorder failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Orden actualizado" });
    },
    onError: () => {
      toast({ title: "Error al reordenar", variant: "destructive" });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !selectedTypologyForMedia) return;
    
    const media = getTypologyMedia(selectedTypologyForMedia);
    const oldIndex = media.findIndex((d: any) => d.id === active.id);
    const newIndex = media.findIndex((d: any) => d.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(media, oldIndex, newIndex);
      const documentIds = reordered.map((d: any) => d.id);
      reorderMediaMutation.mutate(documentIds);
    }
  };
  
  
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connect = () => {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "typology") {
            queryClient.invalidateQueries({ queryKey: ["/api/typologies"] });
          }
        } catch (e) {
          console.error("WebSocket message error:", e);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected, reconnecting...");
        setTimeout(connect, 3000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    };
    
    connect();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Typology>) => {
      const res = await apiRequest("POST", "/api/typologies", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/typologies"] });
      toast({ title: "Tipología creada" });
    },
    onError: () => {
      toast({ title: "Error al crear tipología", variant: "destructive" });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Typology> }) => {
      const res = await apiRequest("PUT", `/api/typologies/${id}`, data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      setPendingChanges(prev => {
        const next = new Map(prev);
        next.delete(variables.id);
        return next;
      });
    },
    onError: () => {
      toast({ title: "Error al actualizar", variant: "destructive" });
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/typologies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/typologies"] });
      toast({ title: "Tipología eliminada" });
    },
    onError: () => {
      toast({ title: "Error al eliminar", variant: "destructive" });
    },
  });
  
  const handleCellChange = useCallback((rowId: string, field: TypologyField, value: any) => {
    const currentRow = typologies.find(t => t.id === rowId);
    if (!currentRow) return;
    
    const pending = pendingChanges.get(rowId);
    const updatedRow = { ...currentRow, ...(pending || {}), [field]: value };
    
    // Auto-populate zone and developer when development changes
    const autoPopulatedFields: Record<string, any> = {};
    if (field === "development" && dbDevelopments) {
      const selectedDev = dbDevelopments.find(d => d.name === value);
      if (selectedDev) {
        if (selectedDev.city) {
          autoPopulatedFields.city = selectedDev.city;
          (updatedRow as any).city = selectedDev.city;
          const selectedCity = catalogCities.find((c: any) => c.name === selectedDev.city);
          if (selectedCity) {
            if (selectedCity.isaiPercent) {
              autoPopulatedFields.isaPercent = selectedCity.isaiPercent;
              (updatedRow as any).isaPercent = selectedCity.isaiPercent;
            }
            if (selectedCity.notariaPercent) {
              autoPopulatedFields.notaryPercent = selectedCity.notariaPercent;
              (updatedRow as any).notaryPercent = selectedCity.notariaPercent;
            }
          }
        }
        autoPopulatedFields.zone = selectedDev.zone || "";
        const developerRecord = dbDevelopers.find((dev: any) => dev.id === selectedDev.developerId);
        autoPopulatedFields.developer = developerRecord?.name || "";
        (updatedRow as any).zone = autoPopulatedFields.zone;
        (updatedRow as any).developer = autoPopulatedFields.developer;
        const devTipos = (selectedDev as any).tipos as string[] | null;
        if (devTipos && devTipos.length > 0) {
          autoPopulatedFields.tipoDesarrollo = devTipos;
          (updatedRow as any).tipoDesarrollo = devTipos;
        } else if (developerRecord) {
          const devRecTipos = (developerRecord as any).tipos as string[] | null;
          if (devRecTipos && devRecTipos.length > 0) {
            autoPopulatedFields.tipoDesarrollo = devRecTipos;
            (updatedRow as any).tipoDesarrollo = devRecTipos;
          }
        }
      }
    }
    
    if (field === "developer" && dbDevelopers) {
      const selectedDeveloper = dbDevelopers.find((d: any) => d.name === value);
      if (selectedDeveloper) {
        if ((selectedDeveloper as any).ciudad) {
          autoPopulatedFields.city = (selectedDeveloper as any).ciudad;
          (updatedRow as any).city = (selectedDeveloper as any).ciudad;
          const selectedCity = catalogCities.find((c: any) => c.name === (selectedDeveloper as any).ciudad);
          if (selectedCity) {
            if (selectedCity.isaiPercent) {
              autoPopulatedFields.isaPercent = selectedCity.isaiPercent;
              (updatedRow as any).isaPercent = selectedCity.isaiPercent;
            }
            if (selectedCity.notariaPercent) {
              autoPopulatedFields.notaryPercent = selectedCity.notariaPercent;
              (updatedRow as any).notaryPercent = selectedCity.notariaPercent;
            }
          }
        }
        if ((selectedDeveloper as any).zona) {
          autoPopulatedFields.zone = (selectedDeveloper as any).zona;
          (updatedRow as any).zone = (selectedDeveloper as any).zona;
        }
        setDynamicGray(prev => ({
          ...prev,
          [rowId]: { ...(prev[rowId] || {}), city: "calculated", zone: "calculated" }
        }));
      }
    }
    
    // Clear development, zone, and developer when city changes; auto-populate ISAI% from city
    if (field === "city") {
      autoPopulatedFields.development = "";
      autoPopulatedFields.zone = "";
      autoPopulatedFields.developer = "";
      (updatedRow as any).development = "";
      (updatedRow as any).zone = "";
      (updatedRow as any).developer = "";
      const selectedCity = catalogCities.find((c: any) => c.name === value);
      if (selectedCity) {
        if (selectedCity.isaiPercent) {
          autoPopulatedFields.isaPercent = selectedCity.isaiPercent;
          (updatedRow as any).isaPercent = selectedCity.isaiPercent;
        }
        if (selectedCity.notariaPercent) {
          autoPopulatedFields.notaryPercent = selectedCity.notariaPercent;
          (updatedRow as any).notaryPercent = selectedCity.notariaPercent;
        }
      }
    }
    
    const dependentFieldsToClear: Record<string, string[]> = {
      hasBalcony: ["balconySize"],
      hasTerrace: ["terraceSize"],
      hasBalcony2: ["balconySize2"],
      hasTerrace2: ["terraceSize2"],
      hasParkingOptional: ["parkingOptionalPrice"],
      hasStorage: ["storageSize"],
      hasStorageOptional: ["storageSize2", "storagePrice"],
      hasDiscount: ["discountPercent", "discountAmount"],
    };
    
    // When boolean toggles to false, don't clear dependent field values
    // They stay in DB but the cell is visually disabled and hidden from Landing
    
    // Bidirectional calculation for discount: if user edits %, calculate Monto and vice versa
    const price = parseFloat(updatedRow.price as string) || 0;
    if (field === "discountPercent" && price > 0) {
      const percent = parseFloat(value as string) || 0;
      (updatedRow as any).discountAmount = (price * percent / 100).toFixed(2);
    } else if (field === "discountAmount" && price > 0) {
      const amount = parseFloat(value as string) || 0;
      (updatedRow as any).discountPercent = ((amount / price) * 100).toFixed(2);
    }
    
    // Calculate finalPrice for payment scheme bidirectional calculations
    // Must consider both discountPercent and discountAmount to get the most current value
    const hasDiscount = updatedRow.hasDiscount === true;
    let discountAmountForFinal = 0;
    if (hasDiscount) {
      // First try to use discountAmount, fallback to calculating from discountPercent
      discountAmountForFinal = parseFloat((updatedRow as any).discountAmount as string) || 0;
      if (discountAmountForFinal === 0) {
        const discountPct = parseFloat((updatedRow as any).discountPercent as string) || 0;
        if (discountPct > 0 && price > 0) {
          discountAmountForFinal = price * discountPct / 100;
        }
      }
    }
    const finalPrice = price - discountAmountForFinal;
    
    // Bidirectional calculation for initialPercent/initialAmount
    if (field === "initialPercent" && finalPrice > 0) {
      const percent = parseFloat(value as string) || 0;
      (updatedRow as any).initialAmount = (finalPrice * percent / 100).toFixed(2);
    } else if (field === "initialAmount" && finalPrice > 0) {
      const amount = parseFloat(value as string) || 0;
      (updatedRow as any).initialPercent = ((amount / finalPrice) * 100).toFixed(2);
    }
    
    // Bidirectional calculation for duringConstructionPercent/duringConstructionAmount
    if (field === "duringConstructionPercent" && finalPrice > 0) {
      const percent = parseFloat(value as string) || 0;
      (updatedRow as any).duringConstructionAmount = (finalPrice * percent / 100).toFixed(2);
    } else if (field === "duringConstructionAmount" && finalPrice > 0) {
      const amount = parseFloat(value as string) || 0;
      (updatedRow as any).duringConstructionPercent = ((amount / finalPrice) * 100).toFixed(2);
    }
    
    // Bidirectional calculation for remainingPercent/remainingAmount
    if (field === "remainingPercent" && finalPrice > 0) {
      const percent = parseFloat(value as string) || 0;
      (updatedRow as any).remainingAmount = (finalPrice * percent / 100).toFixed(2);
    } else if (field === "remainingAmount" && finalPrice > 0) {
      const amount = parseFloat(value as string) || 0;
      (updatedRow as any).remainingPercent = ((amount / finalPrice) * 100).toFixed(2);
    }
    
    // Update dynamic gray state for bidirectional pairs
    const fieldStr = field as string;
    for (const [fieldA, fieldB] of BIDIRECTIONAL_PAIRS) {
      if (fieldStr === fieldA) {
        setDynamicGray(prev => ({
          ...prev,
          [rowId]: { ...(prev[rowId] || {}), [fieldA]: "edited", [fieldB]: "calculated" }
        }));
        break;
      } else if (fieldStr === fieldB) {
        setDynamicGray(prev => ({
          ...prev,
          [rowId]: { ...(prev[rowId] || {}), [fieldA]: "calculated", [fieldB]: "edited" }
        }));
        break;
      }
    }
    
    const calculatedFields = calculateFields(updatedRow, getDefaultsForRow(updatedRow), nivelMantenimientoLookup);
    
    // Don't overwrite remaining fields if user manually edited them
    if (field === "remainingPercent" || field === "remainingAmount") {
      delete (calculatedFields as any).remainingPercent;
      delete (calculatedFields as any).remainingAmount;
    }
    const fullUpdate = { ...updatedRow, ...calculatedFields };
    
    const clearedFields: Record<string, null> = {};
    if (dependentFieldsToClear[field] && value === false) {
      dependentFieldsToClear[field].forEach(depField => {
        clearedFields[depField] = null;
      });
    }
    
    // Include bidirectional fields if they were calculated
    const bidirectionalFields: Record<string, any> = {};
    if (field === "discountPercent" && price > 0) {
      bidirectionalFields.discountAmount = (updatedRow as any).discountAmount;
    } else if (field === "discountAmount" && price > 0) {
      bidirectionalFields.discountPercent = (updatedRow as any).discountPercent;
    }
    
    // Include payment scheme bidirectional fields
    if (field === "initialPercent" && finalPrice > 0) {
      bidirectionalFields.initialAmount = (updatedRow as any).initialAmount;
    } else if (field === "initialAmount" && finalPrice > 0) {
      bidirectionalFields.initialPercent = (updatedRow as any).initialPercent;
    }
    if (field === "duringConstructionPercent" && finalPrice > 0) {
      bidirectionalFields.duringConstructionAmount = (updatedRow as any).duringConstructionAmount;
    } else if (field === "duringConstructionAmount" && finalPrice > 0) {
      bidirectionalFields.duringConstructionPercent = (updatedRow as any).duringConstructionPercent;
    }
    if (field === "remainingPercent" && finalPrice > 0) {
      bidirectionalFields.remainingAmount = (updatedRow as any).remainingAmount;
    } else if (field === "remainingAmount" && finalPrice > 0) {
      bidirectionalFields.remainingPercent = (updatedRow as any).remainingPercent;
    }
    
    setPendingChanges(prev => {
      const next = new Map(prev);
      const existing = next.get(rowId) || {};
      next.set(rowId, { ...existing, [field]: value, ...clearedFields, ...bidirectionalFields, ...calculatedFields, ...autoPopulatedFields });
      return next;
    });
    
    const debounceId = setTimeout(() => {
      const updateData = { [field]: value, ...clearedFields, ...bidirectionalFields, ...calculatedFields, ...autoPopulatedFields };
      updateMutation.mutate({ id: rowId, data: updateData });
    }, 500);
    
    return () => clearTimeout(debounceId);
  }, [typologies, updateMutation, dbDevelopments, dbDevelopers, catalogCities, pendingChanges]);
  
  const handleAddRow = () => {
    const globalKeys = ["mortgageInterestPercent", "mortgageYears", "rentRatePercent", "rentMonths", "appreciationRate"];
    const initialData: Record<string, any> = {};
    for (const key of globalKeys) {
      if (globalDefaultsMap[key] !== undefined) {
        initialData[key] = globalDefaultsMap[key];
      }
    }
    createMutation.mutate(initialData);
  };
  
  const handleDeleteRow = (id: string) => {
    if (pendingDeleteId === id) {
      deleteMutation.mutate(id);
      setPendingDeleteId(null);
    } else {
      setPendingDeleteId(id);
    }
  };
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const COLLAPSED_COL_WIDTH = 20;

  const toggleColumn = (columnKey: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnKey)) {
        next.delete(columnKey);
      } else {
        next.add(columnKey);
      }
      return next;
    });
  };

  const getColWidth = (col: ColumnDef) => {
    if (collapsedColumns.has(col.key)) return COLLAPSED_COL_WIDTH;
    return (col.width || 100) + SORT_ICON_WIDTH;
  };
  
  const handleColumnFilterChange = (columnKey: string, values: Set<string>) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnKey]: values,
    }));
  };
  
  const handleColumnSortChange = (columnKey: string, direction: "asc" | "desc" | null) => {
    setColumnSorts(prev => {
      const newSorts: ColumnSorts = {};
      if (direction !== null) {
        newSorts[columnKey] = direction;
      }
      return newSorts;
    });
  };
  
  const handleRangeFilterChange = useCallback((columnKey: string, range: RangeFilter) => {
    setRangeFilters(prev => ({
      ...prev,
      [columnKey]: range,
    }));
  }, []);
  
  const filteredAndSortedTypologies = useMemo(() => {
    let result = typologies.filter(t => {
      const passesCheckboxFilters = Object.entries(columnFilters).every(([key, values]) => {
        if (values.size === 0) return true;
        const fieldValue = String(t[key as keyof Typology] ?? "");
        return values.has(fieldValue);
      });
      
      const passesRangeFilters = Object.entries(rangeFilters).every(([key, range]) => {
        if (range.min === "" && range.max === "") return true;
        const fieldValue = parseFloat(String(t[key as keyof Typology] ?? ""));
        if (isNaN(fieldValue)) return false;
        const minVal = range.min !== "" ? parseFloat(range.min) : null;
        const maxVal = range.max !== "" ? parseFloat(range.max) : null;
        if (minVal !== null && !isNaN(minVal) && fieldValue < minVal) return false;
        if (maxVal !== null && !isNaN(maxVal) && fieldValue > maxVal) return false;
        return true;
      });
      
      return passesCheckboxFilters && passesRangeFilters;
    });
    
    const sortEntries = Object.entries(columnSorts).filter(([_, dir]) => dir !== null);
    if (sortEntries.length > 0) {
      const [sortKey, sortDir] = sortEntries[0];
      const column = SECTIONS.flatMap(s => s.columns).find(c => c.key === sortKey);
      const isNumeric = column?.type === "number" || column?.type === "decimal";
      
      result = [...result].sort((a, b) => {
        const aVal = a[sortKey as keyof Typology];
        const bVal = b[sortKey as keyof Typology];
        
        const aStr = String(aVal ?? "").trim();
        const bStr = String(bVal ?? "").trim();
        
        // Handle empty values - push them to the end regardless of sort direction
        const aEmpty = aStr === "" || aVal === null || aVal === undefined;
        const bEmpty = bStr === "" || bVal === null || bVal === undefined;
        if (aEmpty && bEmpty) return 0;
        if (aEmpty) return 1; // a goes after b
        if (bEmpty) return -1; // b goes after a
        
        // Parse numeric values (strip commas and currency symbols for formatted values)
        const parseNum = (s: string) => {
          const cleaned = s.replace(/[$,]/g, "").trim();
          return parseFloat(cleaned);
        };
        const aNum = parseNum(aStr);
        const bNum = parseNum(bStr);
        
        // Check if both values are numeric (by column type or by value detection)
        const bothNumeric = isNumeric || (!isNaN(aNum) && !isNaN(bNum));
        
        if (bothNumeric) {
          return sortDir === "asc" ? aNum - bNum : bNum - aNum;
        }
        
        return sortDir === "asc" 
          ? aStr.localeCompare(bStr, "es")
          : bStr.localeCompare(aStr, "es");
      });
    } else {
      // Default sort: by createdAt ascending (oldest first, newest at bottom)
      result = [...result].sort((a, b) => {
        const aDate = new Date(a.createdAt || 0).getTime();
        const bDate = new Date(b.createdAt || 0).getTime();
        return aDate - bDate;
      });
    }
    
    return result;
  }, [typologies, columnFilters, columnSorts, rangeFilters]);

  const INITIAL_ROWS = 50;
  const LOAD_MORE = 30;
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS);
  const [zoomLevel, setZoomLevel] = useState(100);
  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 200));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 50));
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(INITIAL_ROWS);
  }, [filteredAndSortedTypologies.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scrollContainer = contentScrollRef.current;
    if (!sentinel || !scrollContainer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + LOAD_MORE, filteredAndSortedTypologies.length));
        }
      },
      { root: scrollContainer, rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredAndSortedTypologies.length]);

  const visibleData = useMemo(
    () => filteredAndSortedTypologies.slice(0, visibleCount),
    [filteredAndSortedTypologies, visibleCount]
  );

  const availableValuesMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    const allColumns = SECTIONS.flatMap(s => s.columns);
    
    allColumns.forEach((col) => {
      let filteredData = [...typologies];
      Object.entries(columnFilters).forEach(([key, values]) => {
        if (key === col.key) return;
        if (values.size === 0) return;
        filteredData = filteredData.filter((row) => {
          const fieldValue = String(row[key as keyof Typology] ?? "");
          return values.has(fieldValue);
        });
      });
      
      const availableValues = new Set<string>();
      filteredData.forEach((row) => {
        const val = row[col.key as keyof Typology];
        if (val !== null && val !== undefined && val !== "") {
          availableValues.add(String(val));
        }
      });
      map[col.key] = availableValues;
    });
    
    return map;
  }, [typologies, columnFilters]);
  
  const getMergedRow = (row: Typology): Typology => {
    const pending = pendingChanges.get(row.id);
    const merged = pending ? { ...row, ...pending } : row;
    
    let autoDeliveryDate: string | null = null;
    let displayCity = merged.city;
    let displayZone = merged.zone;
    if (merged.development && dbDevelopments.length > 0) {
      const dev = dbDevelopments.find(d => d.name === merged.development);
      if (dev) {
        if (!displayCity && dev.city) displayCity = dev.city;
        if (!displayZone && dev.zone) displayZone = dev.zone;
        if (dev.entregaProyectada) {
          const date = new Date(dev.entregaProyectada);
          const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
          autoDeliveryDate = `${months[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`;
        }
      }
    }
    if (!displayCity && merged.developer && dbDevelopers.length > 0) {
      const devRecord = dbDevelopers.find((d: any) => d.name === merged.developer);
      if (devRecord) {
        if (!displayCity && (devRecord as any).ciudad) displayCity = (devRecord as any).ciudad;
        if (!displayZone && (devRecord as any).zona) displayZone = (devRecord as any).zona;
      }
    }
    
    const calculated = calculateFields(merged, getDefaultsForRow(merged), nivelMantenimientoLookup);
    return { ...merged, ...calculated, city: displayCity, zone: displayZone, deliveryDate: autoDeliveryDate } as Typology;
  };
  
  const activeFilterCount = Object.values(columnFilters).filter(v => v.size > 0).length;
  const activeSortKey = Object.entries(columnSorts).find(([_, dir]) => dir !== null)?.[0];
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-bold" data-testid="text-page-title">Tipologías</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          {(activeFilterCount > 0 || activeSortKey || Object.values(rangeFilters).some(r => r.min || r.max)) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setColumnFilters({});
                setColumnSorts({});
                setRangeFilters({});
              }}
              data-testid="button-clear-all-filters"
            >
              <X className="w-3 h-3 mr-1" />
              Limpiar filtros
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pendingChanges.size > 0 && (
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Guardando...
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{filteredAndSortedTypologies.length} tipologías</span>
          <Button 
            onClick={handleAddRow} 
            size="sm"
            disabled={createMutation.isPending}
            data-testid="button-add-typology"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nuevo
          </Button>
        </div>
      </div>
      
      <div 
        ref={contentScrollRef}
        className="flex-1 overflow-auto spreadsheet-scroll"
      >
        <div className="min-w-max" style={zoomLevel !== 100 ? { zoom: zoomLevel / 100 } : undefined}>
          {/* Header: Three-row structure for consistent alignment */}
          <div className="sticky top-0 z-20 bg-background">
            {/* Row 1: Section toggle triggers (groups consecutive sections with same parentLabel) */}
            <div className="flex border-b spreadsheet-header-row1">
              <div className="w-[60px] flex-shrink-0 sticky left-0 z-30" style={{ backgroundColor: getSectionColor(0), borderRight: `1px solid ${SECTION_BORDER_COLOR}` }} />
              {(() => {
                const groups: { label: string; sections: { section: SectionDef; index: number }[] }[] = [];
                SECTIONS.forEach((section, sectionIndex) => {
                  const groupLabel = section.parentLabel || section.label;
                  const lastGroup = groups[groups.length - 1];
                  if (lastGroup && lastGroup.label === groupLabel) {
                    lastGroup.sections.push({ section, index: sectionIndex });
                  } else {
                    groups.push({ label: groupLabel, sections: [{ section, index: sectionIndex }] });
                  }
                });
                return groups.map((group) => {
                  const firstIndex = group.sections[0].index;
                  const isFirstSection = firstIndex === 0;
                  const allExpanded = group.sections.every(s => expandedSections.has(s.section.id));
                  const anyExpanded = group.sections.some(s => expandedSections.has(s.section.id));
                  let totalWidth = 0;
                  for (const { section } of group.sections) {
                    const isExp = expandedSections.has(section.id);
                    totalWidth += isExp ? section.columns.reduce((sum, col) => sum + getColWidth(col), 0) : COLLAPSED_COL_WIDTH;
                  }
                  const toggleAll = () => {
                    setExpandedSections(prev => {
                      const n = new Set(prev);
                      for (const { section } of group.sections) {
                        if (allExpanded) n.delete(section.id);
                        else n.add(section.id);
                      }
                      return n;
                    });
                  };
                  return (
                    <div 
                      key={group.sections.map(s => s.section.id).join("-")} 
                      className={cn("flex-shrink-0 flex items-center h-full text-white", anyExpanded ? "justify-between" : "justify-center", isFirstSection && "sticky z-30")}
                      style={{ 
                        backgroundColor: getSectionGroupColor(SECTIONS, firstIndex),
                        width: totalWidth,
                        ...(isFirstSection ? { left: 60 } : {})
                      }}
                    >
                      {anyExpanded && (
                        <div className="pointer-events-none" style={{ width: 20 }} />
                      )}
                      {anyExpanded && (
                        <span className="text-xs font-medium flex-1 text-center pointer-events-none uppercase">
                          {group.label}
                        </span>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={toggleAll}
                            className={cn("flex items-center justify-center h-full flex-shrink-0 cursor-pointer", !anyExpanded && "w-full")}
                            style={anyExpanded ? { width: 20 } : undefined}
                            data-testid={`section-toggle-${group.sections[0].section.id}`}
                          >
                            {allExpanded ? (
                              <Minus className="w-3 h-3" style={{ color: 'white' }} />
                            ) : (
                              <Plus className="w-3 h-3" style={{ color: 'white' }} />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {allExpanded ? `Colapsar ${group.label}` : group.label}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  );
                });
              })()}
              <div className="w-24 flex-shrink-0 bg-muted/50" />
            </div>
            
            {/* Row 2: Section/column labels */}
            <div className="flex border-b spreadsheet-header-row2">
              <div className="w-[60px] h-full flex-shrink-0 flex items-center justify-center sticky left-0 z-30" style={{ backgroundColor: getSectionColor(0), borderRight: `1px solid ${SECTION_BORDER_COLOR}` }}>
                <span className="text-xs font-medium text-white">ID</span>
              </div>
              {SECTIONS.flatMap((section, sectionIndex) => {
                const isExpanded = expandedSections.has(section.id);
                const isFirstSection = sectionIndex === 0;
                if (!isExpanded) {
                  return [(
                    <div 
                      key={`collapsed-${section.id}`}
                      className={cn("flex-shrink-0 flex items-center justify-center text-xs h-full text-white", isFirstSection && "sticky z-30")}
                      style={{ backgroundColor: getSectionGroupColor(SECTIONS, sectionIndex), width: COLLAPSED_COL_WIDTH, ...(isFirstSection ? { left: 60 } : {}) }}
                    />
                  )];
                }
                if (section.parentLabel) {
                  const sectionWidth = section.columns.reduce((sum, col) => sum + getColWidth(col), 0);
                  const isLastInGroup = sectionIndex === SECTIONS.length - 1 || SECTIONS[sectionIndex + 1]?.parentLabel !== section.parentLabel;
                  return [(
                    <div
                      key={`subsec-${section.id}`}
                      className={cn("flex-shrink-0 h-full flex items-center justify-between text-white", isFirstSection && "sticky z-30")}
                      style={{ 
                        backgroundColor: getSectionGroupColor(SECTIONS, sectionIndex), 
                        width: sectionWidth,
                        ...(isFirstSection ? { left: 60 } : {}),
                        ...(!isLastInGroup ? { borderRight: `1px solid ${SECTION_BORDER_COLOR}` } : {}),
                      }}
                    >
                      <div className="pointer-events-none" style={{ width: 20 }} />
                      <span className="text-xs font-medium flex-1 text-center pointer-events-none">{section.label}</span>
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="flex items-center justify-center h-full flex-shrink-0 cursor-pointer"
                        style={{ width: 20 }}
                        data-testid={`section-toggle-${section.id}`}
                      >
                        <Minus className="w-3 h-3" style={{ color: 'white' }} />
                      </button>
                    </div>
                  )];
                }
                return section.columns.map((col, colIndex) => {
                  const isColCollapsed = collapsedColumns.has(col.key);
                  const colW = getColWidth(col);
                  const isLastCol = colIndex === section.columns.length - 1;
                  return (
                    <div
                      key={`name-${col.key}`}
                      className={cn(
                        "flex-shrink-0 h-full flex items-center text-white",
                        isColCollapsed ? "justify-center" : "justify-between",
                        isFirstSection && "sticky z-30"
                      )}
                      style={{ 
                        backgroundColor: getSectionGroupColor(SECTIONS, sectionIndex), 
                        width: colW, 
                        ...(isFirstSection ? { left: 60 } : {}),
                        ...(!isLastCol ? { borderRight: `1px solid ${SECTION_BORDER_COLOR}` } : {})
                      }}
                    >
                      {isColCollapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => toggleColumn(col.key)}
                              className="flex items-center justify-center w-full h-full cursor-pointer"
                              data-testid={`col-expand-${col.key}`}
                            >
                              <Plus className="w-3 h-3" style={{ color: 'white' }} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {col.fullLabel || col.label}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <>
                          <div className="flex-shrink-0" style={{ width: 20 }} />
                          <TruncatedLabel 
                            label={col.label} 
                            fullLabel={col.fullLabel}
                            columnKey={col.key}
                          />
                          <button
                            onClick={() => toggleColumn(col.key)}
                            className="flex items-center justify-center h-full flex-shrink-0 cursor-pointer"
                            style={{ width: 20 }}
                            data-testid={`col-collapse-${col.key}`}
                          >
                            <Minus className="w-3 h-3" style={{ color: 'white' }} />
                          </button>
                        </>
                      )}
                    </div>
                  );
                });
              })}
              <div className="w-24 h-full flex-shrink-0 bg-slate-100 dark:bg-slate-900/30 flex items-center justify-center border-r">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Images className="w-3 h-3" />
                      Medios
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Subir fotos/videos a Documentos &gt; Desarrolladores &gt; Productos</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Row 3: Filter and sort controls */}
            <div className="flex border-b spreadsheet-header-row3">
              <div className="w-[60px] flex-shrink-0 h-full sticky left-0 z-30 overflow-hidden" style={{ backgroundColor: getSectionColor(0), borderRight: `1px solid ${SECTION_BORDER_COLOR}` }}>
                <ColumnFilter
                  column={{ key: "id" as any, label: "ID", type: "number", width: 25 }}
                  data={typologies}
                  selectedValues={columnFilters["id"] || new Set()}
                  onFilterChange={(values) => setColumnFilters(prev => ({ ...prev, id: values }))}
                  sortDirection={columnSorts["id"] || null}
                  onSortChange={(dir) => setColumnSorts(prev => ({ ...prev, id: dir }))}
                  hideLabel
                  sectionColor={getSectionColor(0)}
                />
              </div>
              {SECTIONS.flatMap((section, sectionIndex) => {
                const isExpanded = expandedSections.has(section.id);
                const isFirstSection = sectionIndex === 0;
                if (!isExpanded) {
                  return [(
                    <div 
                      key={`collapsed-filter-${section.id}`}
                      className={cn("flex-shrink-0 h-full", isFirstSection && "sticky z-30")}
                      style={{ backgroundColor: getSectionGroupColor(SECTIONS, sectionIndex), width: COLLAPSED_COL_WIDTH, ...(isFirstSection ? { left: 60 } : {}) }}
                    />
                  )];
                }
                return section.columns.map((col, colIndex) => {
                  const isColCollapsed = collapsedColumns.has(col.key);
                  const colW = getColWidth(col);
                  const isLastCol = colIndex === section.columns.length - 1;
                  return (
                    <div
                      key={`filter-${col.key}`}
                      className={cn(
                        "flex-shrink-0 h-full overflow-hidden",
                        isFirstSection && "sticky z-30"
                      )}
                      style={{ 
                        backgroundColor: getSectionGroupColor(SECTIONS, sectionIndex),
                        width: colW, 
                        ...(isFirstSection ? { left: 60 } : {}),
                        ...(!isLastCol ? { borderRight: `1px solid ${SECTION_BORDER_COLOR}` } : {})
                      }}
                    >
                      {!isColCollapsed && (
                        <ColumnFilter
                          column={col}
                          data={typologies}
                          selectedValues={columnFilters[col.key] || new Set()}
                          sortDirection={columnSorts[col.key] || null}
                          onFilterChange={(values) => handleColumnFilterChange(col.key, values)}
                          onSortChange={(dir) => handleColumnSortChange(col.key, dir)}
                          sectionColor={getSectionGroupColor(SECTIONS, sectionIndex)}
                          availableValues={availableValuesMap[col.key]}
                          rangeFilter={rangeFilters[col.key]}
                          onRangeFilterChange={(range) => handleRangeFilterChange(col.key, range)}
                          groupedOptions={
                            col.key === "zone" ? zoneGroupedOptions :
                            col.key === "development" ? developmentGroupedOptions :
                            undefined
                          }
                          columnWidth={col.width}
                          hideLabel={true}
                          fullLabel={col.fullLabel || col.label}
                        />
                      )}
                    </div>
                  );
                });
              })}
              <div className="w-24 h-full flex-shrink-0 bg-slate-100 dark:bg-slate-900/30 border-r" />
            </div>
          </div>
          
          {visibleData.map((row, rowIndex) => {
            const mergedRow = getMergedRow(row);
            
            return (
              <div
                key={row.id}
                className={cn(
                  "flex border-b",
                  rowIndex % 2 === 0 ? "bg-background" : "bg-muted/10"
                )}
                style={{ height: '32px', maxHeight: '32px' }}
                data-testid={`row-typology-${row.id}`}
              >
                <div 
                  className="spreadsheet-cell w-[60px] flex-shrink-0 justify-center text-xs text-white sticky left-0 z-10"
                  style={{ backgroundColor: getSectionColor(0), borderRight: `1px solid ${SECTION_BORDER_COLOR}` }}
                  data-testid={`cell-index-${row.id}`}
                >
                  {rowIndex + 1}
                </div>
                
                {/* Flat cell structure for perfect row alignment */}
                {SECTIONS.flatMap((section, sectionIndex) => {
                  const isExpanded = expandedSections.has(section.id);
                  const isFirstSection = sectionIndex === 0;
                  if (!isExpanded) {
                    return [(
                      <div 
                        key={`collapsed-${section.id}`}
                        className={cn(
                          "spreadsheet-cell bg-white dark:bg-gray-900",
                          isFirstSection && "sticky z-10"
                        )}
                        style={{ width: COLLAPSED_COL_WIDTH, ...(isFirstSection ? { left: 60 } : {}) }}
                      />
                    )];
                  }
                  return section.columns.map((col, colIndex) => {
                    const isColCollapsed = collapsedColumns.has(col.key);
                    const isLastCol = colIndex === section.columns.length - 1;
                    if (isColCollapsed) {
                      const collapsedCell = (
                        <div
                          key={col.key}
                          className="spreadsheet-cell bg-white dark:bg-gray-900"
                          style={{ width: COLLAPSED_COL_WIDTH }}
                        />
                      );
                      if (isFirstSection) {
                        return (
                          <div key={`sticky-${col.key}`} className="sticky z-10" style={{ left: 60 }}>
                            {collapsedCell}
                          </div>
                        );
                      }
                      return collapsedCell;
                    }
                    if (col.key === "createdDate") {
                      return (
                        <div
                          key={col.key}
                          className={cn(
                            "spreadsheet-cell px-2 text-xs text-muted-foreground truncate justify-center text-center",
                            section.cellColor
                          )}
                          style={{ width: (col.width || 85) + SORT_ICON_WIDTH }}
                          data-testid={`cell-createdDate-${row.id}`}
                        >
                          {formatDate(row.createdAt)}
                        </div>
                      );
                    }
                    if (col.key === "createdTime") {
                      return (
                        <div
                          key={col.key}
                          className={cn(
                            "spreadsheet-cell px-2 text-xs text-muted-foreground truncate justify-center text-center",
                            section.cellColor
                          )}
                          style={{ width: (col.width || 65) + SORT_ICON_WIDTH }}
                          data-testid={`cell-createdTime-${row.id}`}
                        >
                          {formatTime(row.createdAt)}
                        </div>
                      );
                    }

                    let dynamicOpts: string[] | undefined;
                    if (col.key === "developer") dynamicOpts = developerOptions;
                    if (col.key === "development") dynamicOpts = developmentOptions;
                    if (col.key === "nivelMantenimiento") dynamicOpts = catalogNivelMantenimiento.filter((n: any) => n.active !== false).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)).map((n: any) => n.name);
                    
                    const conditionalField = section.conditionalFields?.find(cf => cf.field === col.key);
                    let isConditionallyDisabled = false;
                    if (conditionalField) {
                      const deps = Array.isArray(conditionalField.dependsOn) 
                        ? conditionalField.dependsOn 
                        : [conditionalField.dependsOn];
                      isConditionallyDisabled = deps.some(dep => !mergedRow[dep]);
                    }
                    
                    const rowGrayState = dynamicGray[row.id];
                    const isDynCalc = rowGrayState?.[col.key] === "calculated";
                    
                    const cell = (
                      <EditableCell
                        key={col.key}
                        value={mergedRow[col.key]}
                        column={col}
                        rowId={row.id}
                        city={mergedRow.city}
                        developer={mergedRow.developer}
                        onChange={(value) => handleCellChange(row.id, col.key, value)}
                        disabled={isConditionallyDisabled}
                        dynamicOptions={dynamicOpts}
                        allDevelopments={dbDevelopments}
                        allDevelopers={dbDevelopers}
                        vistaOptions={vistaOptions}
                        vistasByDevelopment={vistasByDevelopment}
                        areaOptions={areaOptions}
                        incluyeOptions={incluyeOptions}
                        tipologiaOptions={tipologiaOptions}
                        typesByDevelopment={typesByDevelopment}
                        recamaraOptions={recamaraOptions}
                        banoOptions={banoOptions}
                        cajonOptions={cajonOptions}
                        developerSelectOptions={developerOptions}
                        zoneOptionsByCity={zoneOptionsByCity}
                        isLastInSection={colIndex === section.columns.length - 1}
                        row={mergedRow as Typology}
                        sectionCellColor={section.cellColor}
                        isDynamicCalculated={isDynCalc}
                        filteredDevelopmentName={filteredDevelopmentName}
                        linkedSizeValue={col.linkedSizeField ? mergedRow[col.linkedSizeField] : undefined}
                        onLinkedSizeChange={col.linkedSizeField ? (val) => handleCellChange(row.id, col.linkedSizeField!, val) : undefined}
                      />
                    );
                    if (isFirstSection) {
                      return (
                        <div key={`sticky-${col.key}`} className="sticky z-10 bg-gray-50 dark:bg-gray-800" style={{ left: 60 }}>
                          {cell}
                        </div>
                      );
                    }
                    return cell;
                  });
                })}
                
                <div 
                  className="spreadsheet-cell w-24 flex-shrink-0 justify-center gap-0.5"
                  data-testid={`cell-media-${row.id}`}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files) {
                              Array.from(files).forEach(file => {
                                uploadMediaMutation.mutate({ typologyId: row.id, file });
                              });
                            }
                            e.target.value = "";
                          }}
                          data-testid={`input-media-${row.id}`}
                        />
                      </label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Subir fotos/videos</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => {
                          setSelectedTypologyForMedia(row.id);
                          setMediaDialogOpen(true);
                        }}
                        data-testid={`button-view-media-${row.id}`}
                      >
                        {getTypologyDocCount(row.id) > 0 ? (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 min-w-5">
                            {getTypologyDocCount(row.id)}
                          </Badge>
                        ) : (
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getTypologyDocCount(row.id) > 0 ? `Ver/editar ${getTypologyDocCount(row.id)} medios` : "Ver medios"}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
          <div ref={sentinelRef} style={{ height: '1px' }} />
          
          {filteredAndSortedTypologies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p>No hay tipologías</p>
              <Button variant="ghost" onClick={handleAddRow} className="mt-2">
                Crear la primera
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 bg-background border rounded-md shadow-lg px-1 py-0.5" data-testid="zoom-controls">
        <Button size="icon" variant="ghost" onClick={zoomOut} disabled={zoomLevel <= 50} data-testid="zoom-out">
          <Minus className="w-3.5 h-3.5" />
        </Button>
        <span className="text-xs font-medium tabular-nums w-10 text-center" data-testid="zoom-level">{zoomLevel}%</span>
        <Button size="icon" variant="ghost" onClick={zoomIn} disabled={zoomLevel >= 200} data-testid="zoom-in">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Images className="w-5 h-5" />
              Medios de la Tipología
              {reorderMediaMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              )}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Arrastra las imágenes para cambiar el orden
            </p>
          </DialogHeader>
          {selectedTypologyForMedia && getTypologyMedia(selectedTypologyForMedia).length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={getTypologyMedia(selectedTypologyForMedia).map((d: any) => d.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {getTypologyMedia(selectedTypologyForMedia).map((doc: any, index: number) => (
                    <SortableMediaItem
                      key={doc.id}
                      doc={doc}
                      index={index}
                      onDelete={(id) => deleteMediaMutation.mutate(id)}
                      isDeleting={deleteMediaMutation.isPending}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          {selectedTypologyForMedia && getTypologyMedia(selectedTypologyForMedia).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No hay medios para esta tipología
            </div>
          )}
          <div className="mt-4 flex justify-center">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && selectedTypologyForMedia) {
                    Array.from(files).forEach(file => {
                      uploadMediaMutation.mutate({ typologyId: selectedTypologyForMedia, file });
                    });
                  }
                  e.target.value = "";
                }}
                data-testid="input-upload-more-media"
              />
              <Button variant="outline" asChild>
                <span>
                  {uploadMediaMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Subir más
                </span>
              </Button>
            </label>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
