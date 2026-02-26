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
import { useAuth } from "@/lib/auth";
import type { Typology, CatalogAviso } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { cn } from "@/lib/utils";
import { formatDate, formatTime } from "@/lib/spreadsheet-utils";

type TypologyField = keyof Typology;

interface ColumnDef {
  key: TypologyField | "createdDate" | "createdTime";
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
  allowUnassigned?: boolean;
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
  subSections?: string[];
  hideInRow2?: boolean;
  mergeHeaders?: boolean;
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
    id: "registro",
    label: "Registro",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-gray-50/30 dark:bg-gray-900/10",
    columns: [
      { key: "active", label: "Act.", type: "boolean", width: 60 },
      { key: "createdDate", label: "Fecha", type: "text", width: 65, calculated: true, centerCells: true },
      { key: "createdTime", label: "Hora", type: "text", width: 55, calculated: true, centerCells: true },
    ],
  },
  {
    id: "ubicacion",
    label: "General",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)]/30 dark:bg-[rgb(50,35,10)]/30",
    columns: [
      { key: "city", label: "Ciudad", type: "text", width: 72, calculated: true },
      { key: "zone", label: "Zona", type: "text", width: 62, calculated: true },
      { key: "developer", label: "Desarrollador", type: "select", options: [], width: 125 },
      { key: "development", label: "Desarrollo", type: "select", options: [] as string[], width: 100 },
      { key: "tipoDesarrollo", label: "Tipo", type: "development-type-select", width: 62 },
    ],
  },
  {
    id: "generales",
    label: "Generales",
    parentLabel: "DEPARTAMENTO",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)]/30 dark:bg-[rgb(50,35,10)]/30",
    columns: [
      { key: "type", label: "Tipología", type: "select", options: [], width: 90 },
      { key: "view", label: "Vista", type: "select", options: [], width: 66 },
      { key: "level", label: "Nivel", type: "select", options: [] as string[], width: 60, centerCells: true },
    ],
  },
  {
    id: "precio_tamano",
    label: "Tamaño",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(255,241,220)]/30 dark:bg-[rgb(60,40,10)]/30",
    columns: [
      { key: "size", label: "Unidad", type: "decimal", width: 85, format: "area" },
      { key: "sizeFinal", label: "Total", type: "decimal", width: 100, format: "area", calculated: true },
    ],
  },
  {
    id: "precio_valores",
    label: "Precio",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)]/30 dark:bg-[rgb(50,35,10)]/30",
    columns: [
      { key: "price", label: "Precio", type: "decimal", width: 90, format: "currency" },
      { key: "hasDiscount", label: "Bono", type: "boolean", width: 55, fullLabel: "Bono Descuento" },
      { key: "discountPercent", label: "%", type: "decimal", width: 60, format: "percent", hideLabel: true, fullLabel: "Porcentaje", centerCells: true },
      { key: "discountAmount", label: "$ Monto", type: "decimal", width: 70, format: "currency" },
      { key: "finalPrice", label: "Final", type: "decimal", width: 100, format: "currency", calculated: true },
      { key: "pricePerM2", label: "m²", type: "decimal", width: 80, format: "currency", calculated: true, fullLabel: "Precio por m²" },
      { key: "hasSeedCapital", label: "Capital Semilla", type: "boolean", width: 95, fullLabel: "Capital Semilla" },
      { key: "hasPromo", label: "Promo", type: "boolean", width: 62, fullLabel: "Promo" },
      { key: "promoDescription", label: "Descripción", type: "text", width: 110, fullLabel: "Descripción Promo" },
    ],
    conditionalFields: [
      { field: "discountPercent", dependsOn: "hasDiscount" },
      { field: "discountAmount", dependsOn: "hasDiscount" },
      { field: "promoDescription", dependsOn: "hasPromo" },
    ],
  },
  {
    id: "distribucion",
    label: "Distribución",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "",
    columns: [
      { key: "bedrooms", label: "Recámaras", type: "select", options: [] as string[], width: 90 },
      { key: "bathrooms", label: "Baños", type: "select", options: [] as string[], width: 66 },
      { key: "areas", label: "Áreas", type: "multiselect", options: [], width: 66 },
      { key: "hasBalcony", label: "Balcón", type: "boolean", width: 60, linkedSizeField: "balconySize", hideLabel: true, fullLabel: "Balcón" },
      { key: "balconySize", label: "m²", type: "decimal", width: 65, format: "area", hideLabel: true, fullLabel: "Balcón m²" },
      { key: "hasTerrace", label: "Terraza", type: "boolean", width: 60, linkedSizeField: "terraceSize", hideLabel: true, fullLabel: "Terraza" },
      { key: "terraceSize", label: "m²", type: "decimal", width: 65, format: "area", hideLabel: true, fullLabel: "Terraza m²" },
      { key: "lockOff", label: "Lock-Off", type: "boolean", width: 78, allowUnassigned: true },
    ],
    conditionalFields: [
      { field: "balconySize", dependsOn: "hasBalcony" },
      { field: "terraceSize", dependsOn: "hasTerrace" },
    ],
  },
  {
    id: "lockoff",
    label: "Lock-Off",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "",
    columns: [
      { key: "bedrooms2", label: "Recámaras", type: "select", options: [] as string[], width: 90 },
      { key: "bathrooms2", label: "Baños", type: "select", options: [] as string[], width: 66 },
      { key: "areas2", label: "Áreas", type: "multiselect", options: [], width: 66 },
      { key: "hasBalcony2", label: "Balcón", type: "boolean", width: 60, linkedSizeField: "balconySize2", hideLabel: true, fullLabel: "Balcón" },
      { key: "balconySize2", label: "m²", type: "decimal", width: 65, format: "area", hideLabel: true, fullLabel: "Balcón m²" },
      { key: "hasTerrace2", label: "Terraza", type: "boolean", width: 60, linkedSizeField: "terraceSize2", hideLabel: true, fullLabel: "Terraza" },
      { key: "terraceSize2", label: "m²", type: "decimal", width: 65, format: "area", hideLabel: true, fullLabel: "Terraza m²" },
    ],
    conditionalFields: [
      { field: "bedrooms2", dependsOn: "lockOff" },
      { field: "bathrooms2", dependsOn: "lockOff" },
      { field: "areas2", dependsOn: "lockOff" },
      { field: "hasBalcony2", dependsOn: "lockOff" },
      { field: "balconySize2", dependsOn: ["lockOff", "hasBalcony2"] },
      { field: "hasTerrace2", dependsOn: "lockOff" },
      { field: "terraceSize2", dependsOn: ["lockOff", "hasTerrace2"] },
    ],
  },
  {
    id: "cajones",
    label: "Cajones",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)]/30 dark:bg-[rgb(50,35,10)]/30",
    columns: [
      { key: "parkingIncluded", label: "Incluye", type: "select", options: [] as string[], width: 75, centerCells: true, allowUnassigned: true },
      { key: "hasParkingOptional", label: "Opcional", type: "boolean", width: 80 },
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
    cellColor: "bg-[rgb(255,241,220)]/30 dark:bg-[rgb(60,40,10)]/30",
    columns: [
      { key: "hasStorage", label: "Incluye", type: "boolean", width: 75, allowUnassigned: true },
      { key: "storageSize", label: "Tamaño", type: "decimal", width: 75, format: "area" },
      { key: "hasStorageOptional", label: "Opcional", type: "boolean", width: 80 },
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
    label: "Equipo",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "",
    mergeHeaders: true,
    columns: [
      { key: "queIncluye", label: "Equipo", type: "multiselect", width: 72 },
    ],
  },
  {
    id: "enganche_inicial",
    label: "Inicial",
    parentLabel: "Enganche",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)]/30 dark:bg-[rgb(50,35,10)]/30",
    columns: [
      { key: "initialPercent", label: "%", type: "decimal", width: 60, format: "percent", centerCells: true, fullLabel: "Porcentaje" },
      { key: "initialAmount", label: "$ Monto", type: "decimal", width: 70, format: "currency", fullLabel: "Inicial" },
    ],
  },
  {
    id: "enganche_plazo",
    label: "A Plazo",
    parentLabel: "Enganche",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)]/30 dark:bg-[rgb(50,35,10)]/30",
    columns: [
      { key: "duringConstructionPercent", label: "%", type: "decimal", width: 60, format: "percent", centerCells: true, fullLabel: "Porcentaje" },
      { key: "duringConstructionAmount", label: "$ Monto", type: "decimal", width: 70, format: "currency", fullLabel: "Plazo" },
      { key: "paymentMonths", label: "Meses", type: "number", width: 60, fullLabel: "Meses", centerCells: true },
      { key: "monthlyPayment", label: "Total", type: "decimal", width: 80, format: "currency", calculated: true, fullLabel: "Total" },
    ],
  },
  {
    id: "enganche_escritura",
    label: "Al Escriturar",
    parentLabel: "Pago Final",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)]/30 dark:bg-[rgb(50,35,10)]/30",
    columns: [
      { key: "remainingPercent", label: "%", type: "decimal", width: 60, format: "percent", centerCells: true, fullLabel: "Porcentaje" },
      { key: "remainingAmount", label: "$ Monto", type: "decimal", width: 70, format: "currency", fullLabel: "Al Escriturar", calculated: true },
    ],
  },
  {
    id: "enganche_total",
    label: "Total",
    parentLabel: "Pago Final",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)]/30 dark:bg-[rgb(50,35,10)]/30",
    columns: [
      { key: "totalEnganche", label: "Total", type: "decimal", width: 80, format: "currency", calculated: true },
    ],
  },
  {
    id: "entrega",
    label: "Entrega",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)]/30 dark:bg-[rgb(50,35,10)]/30",
    mergeHeaders: true,
    columns: [
      { key: "deliveryDate", label: "Entrega", type: "text", width: 80, calculated: true },
    ],
  },
  {
    id: "gastos_post_entrega",
    label: "",
    parentLabel: "Gastos Post-Entrega",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(255,241,220)]/30 dark:bg-[rgb(60,40,10)]/30",
    columns: [],
    subSections: ["impuestos", "notaria", "gastos_extra"],
    hideInRow2: true
  },
  {
    id: "impuestos",
    label: "",
    parentLabel: "Gastos Post-Entrega",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(255,241,220)]/30 dark:bg-[rgb(60,40,10)]/30",
    columns: [
      { key: "isaPercent", label: "%", type: "decimal", width: 60, format: "percent", centerCells: true, fullLabel: "Porcentaje" },
      { key: "isaAmount", label: "$", type: "decimal", width: 85, format: "currency", calculated: true, fullLabel: "ISAI Monto" },
    ],
  },
  {
    id: "notaria",
    label: "",
    parentLabel: "Gastos Post-Entrega",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(255,241,220)]/30 dark:bg-[rgb(60,40,10)]/30",
    columns: [
      { key: "notaryPercent", label: "%", type: "decimal", width: 60, format: "percent", centerCells: true, fullLabel: "Porcentaje" },
      { key: "notaryAmount", label: "$", type: "decimal", width: 85, format: "currency", calculated: true, fullLabel: "Notaría Monto" },
    ],
  },
  {
    id: "gastos_extra",
    label: "",
    parentLabel: "Gastos Post-Entrega",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(255,241,220)]/30 dark:bg-[rgb(60,40,10)]/30",
    columns: [
      { key: "equipmentCost", label: "Equipo", type: "decimal", width: 80, format: "currency", calculated: true },
      { key: "furnitureCost", label: "Muebles", type: "decimal", width: 80, format: "currency", calculated: true },
      { key: "totalPostDeliveryCosts", label: "Total", type: "decimal", width: 80, format: "currency", calculated: true },
    ],
  },
  {
    id: "credito",
    label: "Crédito Hipotecario",
    parentLabel: "Crédito Hipotecario",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)]/30 dark:bg-[rgb(50,35,10)]/30",
    columns: [
      { key: "mortgageAmount", label: "Monto", type: "decimal", width: 70, format: "currency" },
      { key: "mortgageStartDate", label: "Inicia", type: "date", width: 85 },
      { key: "mortgageInterestPercent", label: "Tasa", type: "decimal", width: 60, format: "percent", centerCells: true },
      { key: "mortgageYears", label: "Años", type: "number", width: 60 },
      { key: "mortgageMonthlyPayment", label: "Mens.", type: "decimal", width: 80, format: "currency", calculated: true, fullLabel: "Mensualidad" },
      { key: "mortgageEndDate", label: "Termina", type: "date", width: 85 },
      { key: "mortgageTotal", label: "Total", type: "decimal", width: 85, format: "currency", calculated: true },
    ],
  },
  {
    id: "mantenimiento",
    label: "Mantenimiento",
    parentLabel: "Mantenimiento",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(255,241,220)]/30 dark:bg-[rgb(60,40,10)]/30",
    columns: [
      { key: "maintenanceM2", label: "m²", type: "decimal", width: 60, format: "currency" },
      { key: "maintenanceInitial", label: "Inicial", type: "decimal", width: 75, format: "currency", calculated: true },
      { key: "maintenanceStartDate", label: "Fecha", type: "date", width: 85, calculated: true },
      { key: "maintenanceFinal", label: "Final", type: "decimal", width: 75, format: "currency" },
      { key: "maintenanceEndDate", label: "Fecha", type: "date", width: 85, calculated: true },
      { key: "maintenanceTotal", label: "Total", type: "decimal", width: 80, format: "currency", calculated: true },
    ],
  },
  {
    id: "renta1",
    label: "Renta",
    parentLabel: "Renta",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)]/30 dark:bg-[rgb(50,35,10)]/30",
    columns: [
      { key: "rentInitial", label: "Inicial", type: "decimal", width: 75, format: "currency" },
      { key: "rentStartDate", label: "Fecha", type: "date", width: 85, calculated: true },
    ],
  },
  {
    id: "tasa_renta",
    label: "",
    parentLabel: "Renta",
    subheader: "7.0%",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)]/30 dark:bg-[rgb(50,35,10)]/30",
    columns: [
      { key: "rentRatePercent", label: "Tasa", type: "decimal", width: 60, format: "percent", centerCells: true },
    ],
  },
  {
    id: "renta2",
    label: "Renta",
    parentLabel: "Renta",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)]/30 dark:bg-[rgb(50,35,10)]/30",
    columns: [
      { key: "rentFinal", label: "Final", type: "decimal", width: 75, format: "currency" },
      { key: "rentEndDate", label: "Fecha", type: "date", width: 85, calculated: true },
    ],
  },
  {
    id: "meses",
    label: "",
    parentLabel: "Renta",
    subheader: "11.0",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)]/30 dark:bg-[rgb(50,35,10)]/30",
    columns: [
      { key: "rentMonths", label: "Meses", type: "number", width: 60 },
    ],
  },
  {
    id: "total_renta",
    label: "Total",
    parentLabel: "Renta",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)]/30 dark:bg-[rgb(50,35,10)]/30",
    columns: [
      { key: "rentTotal", label: "Total", type: "decimal", width: 80, format: "currency", calculated: true },
    ],
  },
  {
    id: "inversion",
    label: "Inversión",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(255,241,220)]/30 dark:bg-[rgb(60,40,10)]/30",
    columns: [
      { key: "investmentTotal", label: "Total", type: "decimal", width: 85, format: "currency", calculated: true },
      { key: "investmentNet", label: "Neta", type: "decimal", width: 80, format: "currency", calculated: true, fullLabel: "Inversión Neta" },
      { key: "investmentMonthly", label: "Mens.", type: "decimal", width: 80, format: "currency", calculated: true, fullLabel: "Mensualidad" },
      { key: "investmentRate", label: "Tasa", type: "decimal", width: 60, format: "percent", calculated: true, centerCells: true },
    ],
  },
  {
    id: "plusvalia",
    label: "Plusvalía",
    headerColor: "",
    columnHeaderColor: "",
    cellColor: "bg-[rgb(254,243,220)]/30 dark:bg-[rgb(50,35,10)]/30",
    columns: [
      { key: "appreciationRate", label: "Tasa", type: "decimal", width: 60, format: "percent", centerCells: true },
      { key: "appreciationDays", label: "Días", type: "number", width: 60 },
      { key: "appreciationMonths", label: "Meses", type: "number", width: 60 },
      { key: "appreciationYears", label: "Años", type: "number", width: 60 },
      { key: "appreciationTotal", label: "Total", type: "decimal", width: 85, format: "currency", calculated: true },
      { key: "finalValue", label: "M. Final", type: "decimal", width: 90, format: "currency", calculated: true, fullLabel: "Valor Final" },
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

  // Calculate remainingPercent as a base value
  const calculatedRemainingPercent = 100 - initialPercent - duringConstructionPercent;
  // If the row has a value for remainingPercent, use it, otherwise use the calculated one
  const remainingPercent = row.remainingPercent !== undefined && row.remainingPercent !== null 
    ? parseFloat(row.remainingPercent as string) 
    : calculatedRemainingPercent;
  
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
  
  const isaPercentDefault = globalDefaults?.['isaPercent'] ?? 3.0;
  const notaryPercentDefault = globalDefaults?.['notaryPercent'] ?? 2.5;
  const isaPercent = parseFloat(row.isaPercent as string) || isaPercentDefault;
  const notaryPercent = parseFloat(row.notaryPercent as string) || notaryPercentDefault;
  const nivelKey = row.nivelMantenimiento as string;
  const nivelData = nivelKey && nivelMantenimientoLookup ? nivelMantenimientoLookup[nivelKey] : null;
  const storageSizeValue = row.hasStorage ? (parseFloat(row.storageSize as string) || 0) : 0;
  const sizeFinal = size + storageSizeValue;
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
    sizeFinal: sizeFinal.toFixed(2),
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

const FIELD_CHECK_CONFIG = (() => {
  const SKIP_FIELDS = new Set(["active", "createdDate", "createdTime", "city", "zone", "queIncluye"]);
  const BALCONY_TERRACE_FIELDS = new Set(["hasBalcony", "hasTerrace", "hasBalcony2", "hasTerrace2", "lockOff"]);
  const BALCONY_SIZE_MAP: Record<string, string> = {
    hasBalcony: "balconySize",
    hasTerrace: "terraceSize",
    hasBalcony2: "balconySize2",
    hasTerrace2: "terraceSize2",
  };
  const conditionalDeps: Record<string, string | string[]> = {};
  for (const section of SECTIONS) {
    if (section.conditionalFields) {
      for (const cf of section.conditionalFields) {
        conditionalDeps[cf.field] = cf.dependsOn;
      }
    }
  }
  return { SKIP_FIELDS, BALCONY_TERRACE_FIELDS, BALCONY_SIZE_MAP, conditionalDeps };
})();

interface ValidEntities {
  developers: string[];
  developments: string[];
}

const ENTITY_LINKED_FIELDS: Record<string, keyof ValidEntities | null> = {
  developer: "developers",
  development: "developments",
};

function isFieldEmpty(row: Partial<Typology>, col: ColumnDef, config: typeof FIELD_CHECK_CONFIG, validEntities?: ValidEntities): boolean {
  const { SKIP_FIELDS, BALCONY_TERRACE_FIELDS, BALCONY_SIZE_MAP, conditionalDeps } = config;
  if (SKIP_FIELDS.has(col.key)) return false;
  if (col.calculated) return false;

  const dep = conditionalDeps[col.key];
  if (dep) {
    if (Array.isArray(dep)) {
      const anyDisabled = dep.some(d => !row[d as keyof Typology]);
      if (anyDisabled) return false;
    } else {
      if (!row[dep as keyof Typology]) return false;
    }
  }

  const sizeFieldParent = Object.entries(BALCONY_SIZE_MAP).find(([_, size]) => size === col.key);
  if (sizeFieldParent) {
    const parentVal = row[sizeFieldParent[0] as keyof Typology];
    if (parentVal === null || parentVal === undefined) return false;
  }

  if (BALCONY_TERRACE_FIELDS.has(col.key)) {
    const val = row[col.key as keyof Typology];
    return val === null || val === undefined;
  }

  const val = row[col.key as keyof Typology];
  if (col.allowUnassigned && (val === null || val === undefined || val === "")) return false;
  if (val === null || val === undefined || val === "") return true;
  if (typeof val === "number" && isNaN(val)) return true;

  const entityKey = ENTITY_LINKED_FIELDS[col.key];
  if (entityKey && validEntities && typeof val === "string") {
    if (!validEntities[entityKey].includes(val)) return true;
  }

  return false;
}

function isTypologyComplete(row: Partial<Typology>, validEntities?: ValidEntities): boolean {
  const config = FIELD_CHECK_CONFIG;
  for (const section of SECTIONS) {
    for (const col of section.columns) {
      if (isFieldEmpty(row, col, config, validEntities)) return false;
    }
  }
  return true;
}

function getMissingFields(row: Partial<Typology>, validEntities?: ValidEntities): { section: string; field: string }[] {
  const config = FIELD_CHECK_CONFIG;
  const missing: { section: string; field: string }[] = [];
  for (const section of SECTIONS) {
    for (const col of section.columns) {
      if (isFieldEmpty(row, col, config, validEntities)) {
        missing.push({
          section: section.parentLabel || section.label || section.id,
          field: col.fullLabel || col.label,
        });
      }
    }
  }
  return missing;
}

function formatValue(value: any, format?: string): string {
  if (value === null || value === undefined || value === "") return "";
  const strValue = String(value).trim();
  const num = parseFloat(strValue);
  if (isNaN(num) || strValue !== String(num)) return strValue;
  
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

function toDateInputValue(str: any): string {
  if (!str) return "";
  const s = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parts = s.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return "";
}

function formatDateDisplay(str: any): string {
  if (!str) return "";
  const s = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [year, month, day] = s.split('-');
    return `${day}/${month}/${year.slice(2)}`;
  }
  return s;
}

function FormattedCellValue({ value, format }: { value: any; format?: string }) {
  if (value === null || value === undefined || value === "") return null;
  const num = parseFloat(value);
  if (isNaN(num)) return <span>{value}</span>;
  
  if (format === "currency") {
    const formatted = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(num);
    return (
      <span className="flex w-full justify-between items-center gap-0.5">
        <span className="shrink-0">$</span>
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
  disabledMessage?: string;
  overrideUniqueValues?: string[];
  hasParentGroup?: boolean;
  dotColorMap?: Record<string, string>;
  labelMap?: Record<string, string>;
}

function TruncatedLabel({ label, fullLabel, columnKey, uppercaseTooltip }: { label: string; fullLabel?: string; columnKey: string; uppercaseTooltip?: boolean }) {
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
  
  const tooltipContent = uppercaseTooltip ? label.toUpperCase() : label;

  const isAmountField = (columnKey.toLowerCase().includes("amount") || 
                        columnKey.toLowerCase().includes("price") || 
                        columnKey.toLowerCase().includes("payment") ||
                        columnKey.toLowerCase().includes("total") ||
                        columnKey.toLowerCase().includes("cost") ||
                        columnKey.toLowerCase().includes("remaining") ||
                        columnKey.toLowerCase().includes("initial") ||
                        columnKey.toLowerCase().includes("during")) && 
                        !columnKey.toLowerCase().includes("percent");

  if ((isTruncated || fullLabel) && !isAmountField) {
    const isPercent = columnKey.toLowerCase().includes("percent") || label.toLowerCase() === "porcentaje";
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
          {isPercent ? "Porcentaje" : tooltipContent}
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

function ColumnFilter({ column, data, selectedValues, sortDirection, onFilterChange, onSortChange, sectionColor, availableValues, rangeFilter, onRangeFilterChange, groupedOptions, columnWidth, hideLabel, fullLabel, disabledMessage, overrideUniqueValues, hasParentGroup, dotColorMap, labelMap }: ColumnFilterProps) {
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
    if (overrideUniqueValues) {
      return overrideUniqueValues.sort((a, b) => a.localeCompare(b, "es"));
    }
    const values = new Set<string>();
    data.forEach(row => {
      const val = row[column.key as keyof Typology];
      if (val !== null && val !== undefined && val !== "") {
        values.add(String(val));
      }
    });
    
    const arr = Array.from(values);
    
    if (column.type === "number" || column.type === "decimal") {
      return arr.sort((a, b) => parseFloat(a) - parseFloat(b));
    }
    return arr.sort((a, b) => a.localeCompare(b, "es"));
  }, [data, column, overrideUniqueValues]);
  
  const filteredValues = useMemo(() => {
    if (!search) return uniqueValues;
    const searchLower = search.toLowerCase();
    return uniqueValues.filter(v => v.toLowerCase().includes(searchLower));
  }, [uniqueValues, search]);
  
  const allSelected = selectedValues.size === 0 || (selectedValues.size === uniqueValues.length && !selectedValues.has("__none__"));
  
  const handleSelectAll = () => {
    onFilterChange(new Set());
  };
  
  const noneSelected = selectedValues.size === 1 && selectedValues.has("__none__");
  
  const handleDeselectAll = () => {
    onFilterChange(new Set(["__none__"]));
  };
  
  const handleToggleValue = (value: string) => {
    let newSet: Set<string>;
    if (noneSelected) {
      newSet = new Set([value]);
    } else {
      newSet = new Set(selectedValues.size === 0 ? uniqueValues : selectedValues);
      newSet.delete("__none__");
      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
    }
    if (newSet.size === uniqueValues.length) {
      onFilterChange(new Set());
    } else if (newSet.size === 0) {
      onFilterChange(new Set(["__none__"]));
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
  
  const isFiltered = noneSelected || (selectedValues.size > 0 && selectedValues.size < uniqueValues.length);
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

  const centerHoverZone = fullLabel ? (
    <div 
      className="absolute inset-0 z-0 flex items-center justify-center cursor-default group/center"
      onClick={(e) => e.stopPropagation()}
    >
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="w-full h-full" />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {fullLabel.toUpperCase()}
        </TooltipContent>
      </Tooltip>
    </div>
  ) : (
    <div 
      className="absolute inset-0 z-0 flex items-center justify-center cursor-default"
      onClick={(e) => e.stopPropagation()}
    />
  );

  return (
    <div className={cn("w-full h-full relative flex items-center text-white", hasActiveFilter && "!bg-amber-200 dark:!bg-amber-500/40 !text-amber-900 dark:!text-amber-100")} style={!hasActiveFilter ? { backgroundColor: sectionColor || undefined } : undefined}>
      <Popover open={open} onOpenChange={setOpen}>
        {hideLabel ? (
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center justify-center h-full cursor-pointer rounded flex-shrink-0 z-10",
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
        ) : (
          <PopoverTrigger asChild>
            <button
              className="flex items-center justify-center h-full text-xs font-medium cursor-pointer rounded flex-shrink-0 z-10"
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
          
          {disabledMessage ? (
            <div className="flex flex-col">
              {hasActiveFilter && (
                <>
                  <button
                    className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted text-left text-muted-foreground"
                    onClick={handleClearFilter}
                    data-testid={`clear-filter-${column.key}-disabled`}
                  >
                    <X className="w-4 h-4" />
                    Borrar filtro de "{column.label}"
                  </button>
                  <div className="border-t" />
                </>
              )}
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                {disabledMessage}
              </div>
            </div>
          ) : (
          <>
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
                    <label className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-muted px-1 rounded">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        data-testid={`select-all-${column.key}`}
                      />
                      <span className="text-xs font-medium">(Seleccionar todo)</span>
                    </label>
                    <div
                      className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-muted px-1 rounded mb-2 border-b pb-2"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeselectAll(); }}
                    >
                      <div className="h-4 w-4 border rounded-sm flex items-center justify-center bg-background pointer-events-none">
                        <X className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">(Deseleccionar todo)</span>
                    </div>
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
                    <div
                      className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-muted px-1 rounded"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeselectAll(); }}
                    >
                      <div className="h-4 w-4 border rounded-sm flex items-center justify-center bg-background pointer-events-none">
                        <X className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">(Deseleccionar todo)</span>
                    </div>
                    
                    {filteredValues.map((value) => {
                      const isChecked = selectedValues.size === 0 || selectedValues.has(value);
                      const displayValue = labelMap?.[value] ?? (column.format ? formatValue(value, column.format) : value);
                      const isAvailable = !availableValues || availableValues.has(value);
                      const dotColor = dotColorMap?.[value];
                      
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
                            "flex items-center gap-1.5 text-xs truncate",
                            !isAvailable && "text-muted-foreground line-through"
                          )}>
                            {dotColor && (
                              <span style={{ color: dotColor }} className="text-[8px] leading-none flex-shrink-0">●</span>
                            )}
                            <span style={dotColor ? { color: dotColor, fontWeight: 500 } : undefined}>{displayValue}</span>
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
          </>
          )}
        </div>
      </PopoverContent>
      </Popover>
      {hideLabel ? (
        fullLabel ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn("flex-1 h-full cursor-default", hasParentGroup && "hover:bg-white/10")} style={{ minWidth: 4 }} data-testid={`header-hover-${column.key}`} />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {fullLabel}
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className={cn("flex-1 h-full cursor-default", hasParentGroup && "hover:bg-white/10")} style={{ minWidth: 4 }} data-testid={`header-hover-${column.key}`} />
        )
      ) : (
        <TruncatedLabel 
          label={column.label} 
          fullLabel={fullLabel}
          columnKey={column.key}
        />
      )}
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
  tipologiasConfigByDevelopment?: Record<string, Record<string, string[]>>;
  isLastInSection?: boolean;
  row?: Typology;
  sectionCellColor?: string;
  isDynamicCalculated?: boolean;
  filteredDevelopmentName?: string | null;
  linkedSizeValue?: any;
  onLinkedSizeChange?: (value: any) => void;
  isComplete?: boolean;
  validEntities?: ValidEntities;
  isRowDisabled?: boolean;
}

const EditableCell = React.memo(function EditableCell({ value, column, rowId, city, developer, onChange, disabled, dynamicOptions, allDevelopments, allDevelopers, vistaOptions, vistasByDevelopment, areaOptions, incluyeOptions, tipologiaOptions, typesByDevelopment, recamaraOptions, banoOptions, cajonOptions, developerSelectOptions, zoneOptionsByCity, tipologiasConfigByDevelopment, isLastInSection, row, sectionCellColor, isDynamicCalculated, filteredDevelopmentName, linkedSizeValue, onLinkedSizeChange, isComplete, validEntities, isRowDisabled }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const cellBorderClass = "";
  const rowDisabledStyle: React.CSSProperties | undefined = (isRowDisabled && column.key !== "active" && column.key !== "id")
    ? { backgroundColor: '#9ca3af' }
    : undefined;
  
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
          column.calculated && !rowDisabledStyle && "bg-[rgb(255,241,220)] dark:bg-[rgb(60,40,10)] cursor-default",
          disabled && !column.calculated && !rowDisabledStyle && "bg-gray-200/60 dark:bg-gray-800/50",
          disabled && !column.calculated && "text-gray-350 dark:text-gray-500 cursor-not-allowed",
          column.centerCells && "justify-center text-center"
        )}
        style={{ width: (column.width || 100) + SORT_ICON_WIDTH, ...rowDisabledStyle }}
        data-testid={`cell-${column.key}-disabled`}
      >
        {(column.format === "currency" || column.format === "area") 
          ? <FormattedCellValue value={value} format={column.format} />
          : (formatValue(value, column.format) || "")}
      </div>
    );
  }
  
  if (isDynamicCalculated && !isEditing && column.type !== "select") {
    return (
      <div 
        className={cn(
          "spreadsheet-cell px-2 text-xs cursor-pointer", cellBorderClass,
          !rowDisabledStyle && "bg-[rgb(255,241,220)] dark:bg-[rgb(60,40,10)]",
          (column.format === "currency" || column.format === "area") ? "" : "truncate",
          column.centerCells && "justify-center text-center"
        )}
        style={{ width: (column.width || 100) + SORT_ICON_WIDTH, ...rowDisabledStyle }}
        onClick={() => setIsEditing(true)}
        data-testid={`cell-${column.key}-${rowId}`}
      >
        {(column.format === "currency" || column.format === "area")
          ? <FormattedCellValue value={value} format={column.format} />
          : (formatValue(value, column.format) || "")}
      </div>
    );
  }
  
  if (column.type === "boolean" && column.key === "active") {
    const isDisabled = value === null || value === undefined;
    const activeState = isDisabled ? "disabled" : (value === true && isComplete) ? "active" : (isComplete ? "ready" : "incomplete");

    let bgColor: string;
    let dotColor: string;
    let textColorStyle: React.CSSProperties;
    let label: string;

    switch (activeState) {
      case "active":
        bgColor = "#dcfce7";
        dotColor = "#15803d";
        textColorStyle = { color: "#15803d", fontWeight: 500 };
        label = "Sí";
        break;
      case "ready":
        bgColor = "#fef3c7";
        dotColor = "#b45309";
        textColorStyle = { color: "#b45309", fontWeight: 500 };
        label = "No";
        break;
      case "disabled":
        bgColor = "#9ca3af";
        dotColor = "#1f2937";
        textColorStyle = { color: "#1f2937", fontWeight: 500 };
        label = "Deshabilitado";
        break;
      case "incomplete":
      default:
        bgColor = "#fee2e2";
        dotColor = "#dc2626";
        textColorStyle = { color: "#dc2626", fontWeight: 500 };
        label = "No";
        break;
    }

    const computedMissing = activeState === "incomplete" && row ? getMissingFields(row as Partial<Typology>, validEntities) : [];
    const missingCount = computedMissing.length;
    const tooltipContent = missingCount > 0
      ? `Campos vacíos (${missingCount}):\n${computedMissing.map(f => `• ${f.section} → ${f.field}`).join('\n')}`
      : undefined;

    return (
      <div
        className={cn("spreadsheet-cell px-0 relative group", cellBorderClass)}
        style={{ width: (column.width || 100) + SORT_ICON_WIDTH, backgroundColor: bgColor }}
      >
        <ExclusiveSelect
          value={activeState === "active" ? "active" : activeState === "disabled" ? "disabled" : "no"}
          onValueChange={(val) => {
            if (val === "disabled") {
              onChange(null);
            } else if (val === "active") {
              if (isComplete) onChange(true);
            } else {
              onChange(false);
            }
          }}
        >
          <SelectTrigger
            className="h-6 w-full text-xs border-0 bg-transparent px-1 !justify-center gap-1 [&_svg]:h-3 [&_svg]:w-3 [&_svg]:shrink-0 focus:ring-0 focus:ring-offset-0"
            style={textColorStyle}
            data-testid={`active-${rowId}`}
          >
            <span style={{ color: dotColor }} className="text-[8px] leading-none">●</span>
            <span className="truncate">{label}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active" disabled={!isComplete} className="text-xs">
              <span className="flex items-center gap-1.5">
                <span style={{ color: "#15803d" }} className="text-[8px] leading-none">●</span>
                <span style={{ color: "#15803d", fontWeight: 500 }}>Sí</span>
              </span>
            </SelectItem>
            <SelectItem value="no" className="text-xs">
              <span className="flex items-center gap-1.5">
                <span style={{ color: isComplete ? "#b45309" : "#dc2626" }} className="text-[8px] leading-none">●</span>
                <span style={{ color: isComplete ? "#b45309" : "#dc2626", fontWeight: 500 }}>No</span>
              </span>
            </SelectItem>
            <SelectItem value="disabled" className="text-xs">
              <span className="flex items-center gap-1.5">
                <span style={{ color: "#1f2937" }} className="text-[8px] leading-none">●</span>
                <span style={{ color: "#1f2937", fontWeight: 500 }}>Deshabilitado</span>
              </span>
            </SelectItem>
          </SelectContent>
        </ExclusiveSelect>
        {tooltipContent && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-[200] hidden group-hover:block bg-gray-900 text-white text-[10px] leading-tight rounded-md px-2.5 py-2 whitespace-pre-line shadow-lg min-w-[180px] max-w-[280px] max-h-[300px] overflow-y-auto pointer-events-none">
            {tooltipContent}
          </div>
        )}
      </div>
    );
  }

  if (column.type === "boolean") {
    const canBeUnassigned = !!column.linkedSizeField || !!column.allowUnassigned;
    const cellBgColor = value === true 
      ? '#dcfce7'  // green-100 
      : value === false 
        ? '#fee2e2'  // red-100
        : canBeUnassigned ? '#ffffff' : undefined;
    const textColorClass = value === true 
      ? 'text-green-700 font-medium' 
      : value === false 
        ? 'text-red-600 font-medium' 
        : canBeUnassigned ? 'text-foreground font-medium' : 'text-muted-foreground';
    return (
      <div 
        className={cn("spreadsheet-cell px-0", cellBorderClass)}
        style={{ width: (column.width || 100) + SORT_ICON_WIDTH, backgroundColor: rowDisabledStyle ? '#9ca3af' : cellBgColor }}
      >
        <ExclusiveSelect
          value={value === true ? "si" : value === false ? "no" : (canBeUnassigned ? "sa" : "")}
          onValueChange={(val) => {
            if (val === "sa") onChange(null);
            else onChange(val === "si");
          }}
        >
          <SelectTrigger className={`h-6 w-full text-xs border-0 bg-transparent px-0 !justify-center gap-0.5 [&_svg]:h-3 [&_svg]:w-3 [&_svg]:shrink-0 focus:ring-0 focus:ring-offset-0 ${textColorClass}`} data-testid={`boolean-${column.key}-${rowId}`}>
            <span className="shrink-0 text-left" style={{ width: '2.5ch' }}>{value === true ? "Sí" : value === false ? "No" : (canBeUnassigned ? "" : "-")}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="si" className="text-green-700 font-medium">Sí</SelectItem>
            <SelectItem value="no" className="text-red-600 font-medium">No</SelectItem>
            {canBeUnassigned && (
              <SelectItem value="sa" style={{ color: '#000' }}>—</SelectItem>
            )}
          </SelectContent>
        </ExclusiveSelect>
      </div>
    );
  }
  
  if (column.type === "multiselect") {
    const isQueIncluye = column.key === "queIncluye";
    const SIN_EQUIPO = "Sin Equipo";
    const baseOptions: string[] = isQueIncluye
      ? (incluyeOptions && incluyeOptions.length > 0 ? [...incluyeOptions] : [])
      : areaOptions && areaOptions.length > 0 
        ? [...areaOptions] 
        : (column.options ? [...column.options] : []);
    
    const currentValuesSet = new Set(
      value ? String(value).split(",").map(v => v.trim()).filter(Boolean) : []
    );
    const currentValues = Array.from(currentValuesSet);
    
    const allOptions = Array.from(new Set([...baseOptions, ...currentValues]));
    const equipmentOptions = isQueIncluye ? allOptions.filter(o => o !== SIN_EQUIPO) : allOptions;
    
    const handleToggle = (opt: string) => {
      if (isQueIncluye && opt === SIN_EQUIPO) {
        if (currentValues.includes(SIN_EQUIPO)) {
          onChange("");
        } else {
          onChange(SIN_EQUIPO);
        }
        return;
      }
      const newSet = new Set(currentValues);
      if (isQueIncluye) newSet.delete(SIN_EQUIPO);
      if (newSet.has(opt)) {
        newSet.delete(opt);
      } else {
        newSet.add(opt);
      }
      onChange(Array.from(newSet).join(", "));
    };
    
    const isSinEquipo = isQueIncluye && currentValues.length === 1 && currentValues[0] === SIN_EQUIPO;
    const displayValue = isSinEquipo 
      ? SIN_EQUIPO
      : currentValues.length > 0 
        ? `${currentValues.length} seleccionados`
        : "";
    
    return (
      <div 
        className={cn("spreadsheet-cell px-1", !rowDisabledStyle && (disabled ? "bg-gray-200 dark:bg-gray-700" : "bg-white dark:bg-gray-900"), cellBorderClass)}
        style={{ width: (column.width || 100) + SORT_ICON_WIDTH, ...rowDisabledStyle }}
      >
        {disabled ? (
          <div className="flex items-center gap-1 px-1">
            <span className="text-xs text-muted-foreground truncate">{displayValue}</span>
            <Lock className="w-3 h-3 opacity-50 shrink-0" />
          </div>
        ) : (
          <Popover modal>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-between w-full h-6 text-xs px-1 cursor-pointer bg-transparent border-0 focus:ring-0 focus:outline-none text-left"
                data-testid={`multiselect-${column.key}-${rowId}`}
                title={displayValue}
              >
                <span className="truncate">{displayValue}</span>
                <ChevronDown className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {isQueIncluye && (
                  <>
                    <label
                      className="flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-accent cursor-pointer font-medium"
                    >
                      <Checkbox
                        checked={currentValues.includes(SIN_EQUIPO)}
                        onCheckedChange={() => handleToggle(SIN_EQUIPO)}
                      />
                      <span>{SIN_EQUIPO}</span>
                    </label>
                    <div className="border-t my-1" />
                  </>
                )}
                {(isQueIncluye ? equipmentOptions : allOptions).map((opt) => (
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
    if (column.key === "city") {
      if (developer && allDevelopments && allDevelopers) {
        const devRecord = allDevelopers.find((dev: any) => dev.name === developer);
        if (devRecord) {
          const developerDevs = allDevelopments.filter(d => d.developerId === devRecord.id);
          options = Array.from(new Set(developerDevs.map(d => d.city).filter(Boolean)))
            .sort((a, b) => a.localeCompare(b, 'es'));
        } else {
          options = [];
        }
      } else {
        options = [];
      }
    }

    if (column.key === "zone") {
      if (developer && allDevelopments && allDevelopers) {
        const devRecord = allDevelopers.find((dev: any) => dev.name === developer);
        if (devRecord) {
          let developerDevs = allDevelopments.filter(d => d.developerId === devRecord.id);
          if (city) {
            developerDevs = developerDevs.filter(d => d.city === city);
          }
          options = Array.from(new Set(developerDevs.map(d => d.zone).filter(Boolean)))
            .sort((a, b) => a.localeCompare(b, 'es'));
        } else {
          options = [];
        }
      } else {
        options = [];
      }
    }
    
    if (column.key === "developer") {
      if (developerSelectOptions && developerSelectOptions.length > 0) {
        options = developerSelectOptions;
      }
    }

    if (column.key === "development" && allDevelopments) {
      if (developer && allDevelopers) {
        const devRecord = allDevelopers.find((dev: any) => dev.name === developer);
        if (devRecord) {
          options = allDevelopments
            .filter(d => d.developerId === devRecord.id)
            .map(d => d.name)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'es'));
        } else {
          options = [];
        }
      } else {
        options = [];
      }
    }
    
    if (column.key === "view") {
      const rowDevName = row?.development;
      if (rowDevName && vistasByDevelopment && vistasByDevelopment[rowDevName]?.length > 0) {
        options = vistasByDevelopment[rowDevName];
      } else {
        options = [];
      }
    }
    
    if (column.key === "type") {
      const rowDev = row?.development;
      if (rowDev && typesByDevelopment && typesByDevelopment[rowDev]?.length > 0) {
        options = typesByDevelopment[rowDev];
      } else {
        options = [];
      }
      const currentTipoDesarrollo = Array.isArray(row?.tipoDesarrollo)
        ? (row?.tipoDesarrollo as string[])[0]
        : (row?.tipoDesarrollo as string | null | undefined);
      if (currentTipoDesarrollo && tipologiasConfigByDevelopment && rowDev) {
        const devConfig = tipologiasConfigByDevelopment[rowDev];
        if (devConfig) {
          options = options.filter(tipologia =>
            ((devConfig[tipologia] || []) as string[]).includes(currentTipoDesarrollo)
          );
        }
      }
    }
    
    let preserveCatalogOrder = false;
    
    // Use catalog options for bedrooms (recamaras)
    if ((column.key === "bedrooms" || column.key === "bedrooms2") && recamaraOptions && recamaraOptions.length > 0) {
      options = recamaraOptions;
      preserveCatalogOrder = true;
    }
    
    // Use catalog options for bathrooms (baños)
    if ((column.key === "bathrooms" || column.key === "bathrooms2") && banoOptions && banoOptions.length > 0) {
      options = banoOptions;
      preserveCatalogOrder = true;
    }
    
    // Use catalog options for parking included (cajones)
    if (column.key === "parkingIncluded" && cajonOptions && cajonOptions.length > 0) {
      options = cajonOptions;
      preserveCatalogOrder = true;
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
    let finalOptions: string[];
    if (preserveCatalogOrder) {
      finalOptions = [...options];
    } else {
      const isNumericOptions = options.length > 0 && options.every(o => /^\d+$/.test(o));
      finalOptions = isNumericOptions 
        ? [...options].sort((a, b) => parseInt(a) - parseInt(b))
        : [...options].sort((a, b) => a.localeCompare(b, 'es'));
    }
    const entityLinkedFields = ["developer", "development", "city", "zone"];
    if (currentValue && !finalOptions.includes(currentValue) && !entityLinkedFields.includes(column.key)) {
      finalOptions = [currentValue, ...finalOptions];
    }
    
    const displayValue = (entityLinkedFields.includes(column.key) && currentValue && !finalOptions.includes(currentValue)) ? "" : currentValue;
    
    return (
      <div 
        className={cn("spreadsheet-cell px-1", !rowDisabledStyle && (isDynamicCalculated ? "bg-[rgb(255,241,220)] dark:bg-[rgb(60,40,10)]" : "bg-white dark:bg-gray-900"), cellBorderClass)}
        style={{ width: (column.width || 100) + SORT_ICON_WIDTH, ...rowDisabledStyle }}
      >
        <ExclusiveSelect 
          value={displayValue || (column.allowUnassigned ? "__clear__" : "")} 
          onValueChange={(val) => {
            if (val === "__clear__") {
              onChange(column.allowUnassigned ? null : "");
            } else {
              onChange(val);
            }
          }}
        >
          <SelectTrigger 
            className={cn("h-6 w-full text-xs border-0 focus:ring-0 shadow-none bg-transparent px-1 [&_svg]:h-3 [&_svg]:w-3", column.centerCells && (!displayValue || /^\d+$/.test(displayValue)) ? "text-center" : "text-left", !displayValue && column.allowUnassigned && "font-medium")}
            data-testid={`select-${column.key}-${rowId}`}
            title={displayValue || ""}
          >
            <span className="truncate min-w-0 flex-1">{displayValue || (column.allowUnassigned ? "-" : "")}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__" className={column.allowUnassigned ? "" : "text-muted-foreground italic"} style={column.allowUnassigned ? { color: '#000' } : undefined}>
              {column.allowUnassigned ? "—" : "—"}
            </SelectItem>
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

    const currentTipologia = row?.type;
    if (currentTipologia && tipologiasConfigByDevelopment && developmentName) {
      const devConfig = tipologiasConfigByDevelopment[developmentName];
      if (devConfig) {
        const validTipos = (devConfig[currentTipologia] || []) as string[];
        availableTypes = availableTypes.filter(tipo => validTipos.includes(tipo));
      }
    }

    if (availableTypes.length === 0 || disabled) {
      return (
        <div 
          className={cn("spreadsheet-cell px-1 text-gray-350 dark:text-gray-500 cursor-not-allowed", !rowDisabledStyle && "bg-gray-200/60 dark:bg-gray-800/50", cellBorderClass)}
          style={{ width: (column.width || 100) + SORT_ICON_WIDTH, ...rowDisabledStyle }}
        >
          {selectedType ? (
            <span className="text-xs text-muted-foreground px-1">{selectedType}</span>
          ) : (
            <span className="text-xs">&nbsp;</span>
          )}
        </div>
      );
    }
    
    const handleTypeSelect = (tipo: string) => {
      onChange([tipo]);
    };
    
    return (
      <div 
        className={cn("spreadsheet-cell px-1", !rowDisabledStyle && (isDynamicCalculated ? "bg-[rgb(255,241,220)] dark:bg-[rgb(60,40,10)]" : "bg-white dark:bg-gray-900"), cellBorderClass)}
        style={{ width: (column.width || 100) + SORT_ICON_WIDTH, ...rowDisabledStyle }}
      >
        <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="h-6 w-full justify-between px-1 text-xs font-normal [&_svg]:h-3 [&_svg]:w-3"
                data-testid={`select-${column.key}-${rowId}`}
                title={selectedType}
              >
                <span className="truncate text-left min-w-0 flex-1">
                  {selectedType || ""}
                </span>
                <ChevronDown className="shrink-0 text-muted-foreground" />
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
      </div>
    );
  }
  
  if (isEditing) {
    if (column.type === "date") {
      return (
        <div
          className={cn("spreadsheet-cell px-1", !rowDisabledStyle && "bg-white dark:bg-gray-900", cellBorderClass)}
          style={{ width: (column.width || 100) + SORT_ICON_WIDTH, ...rowDisabledStyle }}
        >
          <input
            ref={inputRef}
            type="date"
            value={toDateInputValue(localValue)}
            onChange={(e) => {
              setLocalValue(e.target.value);
              if (e.target.value) {
                onChange(e.target.value);
                setIsEditing(false);
              }
            }}
            onBlur={() => {
              setIsEditing(false);
              if (localValue !== value) onChange(localValue);
            }}
            onKeyDown={handleKeyDown}
            className="h-6 w-full text-xs border-0 focus:ring-0 shadow-none p-0 bg-transparent cursor-pointer"
            data-testid={`input-${column.key}-${rowId}`}
          />
        </div>
      );
    }
    return (
      <div 
        className={cn("spreadsheet-cell px-1", !rowDisabledStyle && "bg-white dark:bg-gray-900", cellBorderClass)}
        style={{ width: (column.width || 100) + SORT_ICON_WIDTH, ...rowDisabledStyle }}
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
        "spreadsheet-cell px-2 text-xs cursor-pointer overflow-hidden", cellBorderClass,
        !rowDisabledStyle && "bg-white dark:bg-gray-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/30",
        column.centerCells && "justify-center text-center"
      )}
      style={{ width: (column.width || 100) + SORT_ICON_WIDTH, ...rowDisabledStyle }}
      onClick={() => setIsEditing(true)}
      title={column.type === "date" ? formatDateDisplay(value) : formatValue(value, column.format)}
      data-testid={`cell-${column.key}-${rowId}`}
    >
      {column.type === "date"
        ? <span className="truncate min-w-0">{formatDateDisplay(value) || ""}</span>
        : (column.format === "currency" || column.format === "area")
          ? <FormattedCellValue value={value} format={column.format} />
          : <span className="truncate min-w-0">{formatValue(value, column.format) || ""}</span>}
    </div>
  );
}, (prevProps, nextProps) => {
  if (prevProps.value !== nextProps.value) return false;
  if (prevProps.disabled !== nextProps.disabled) return false;
  if (prevProps.column !== nextProps.column) return false;
  if (prevProps.rowId !== nextProps.rowId) return false;
  if (prevProps.city !== nextProps.city) return false;
  if (prevProps.developer !== nextProps.developer) return false;
  if (prevProps.isLastInSection !== nextProps.isLastInSection) return false;
  if (prevProps.sectionCellColor !== nextProps.sectionCellColor) return false;
  if (prevProps.isDynamicCalculated !== nextProps.isDynamicCalculated) return false;
  if (prevProps.filteredDevelopmentName !== nextProps.filteredDevelopmentName) return false;
  if (prevProps.linkedSizeValue !== nextProps.linkedSizeValue) return false;
  if (prevProps.isComplete !== nextProps.isComplete) return false;
  if (prevProps.dynamicOptions !== nextProps.dynamicOptions) return false;
  if (prevProps.row !== nextProps.row) return false;
  if (prevProps.isRowDisabled !== nextProps.isRowDisabled) return false;
  return true;
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
  const { user } = useAuth();
  const canEdit = user?.role === "Admin" || user?.role === "Actualizador";
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(SECTIONS.map(s => s.id))
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});
  const [columnSorts, setColumnSorts] = useState<ColumnSorts>({});
  const [rangeFilters, setRangeFilters] = useState<RangeFilters>({});
  const pendingChangesRef = useRef<Map<string, Partial<Typology>>>(new Map());
  const [pendingChangesVersion, setPendingChangesVersion] = useState(0);
  const pendingChanges = pendingChangesRef.current;
  const [dynamicGray, setDynamicGray] = useState<DynamicGrayState>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [activeEditingRowId, setActiveEditingRowId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [avisoWarning, setAvisoWarning] = useState<{ messages: string[]; rowId: string } | null>(null);
  const avisoResolveRef = useRef<((proceed: boolean) => void) | null>(null);
  const [selectedTypologyForMedia, setSelectedTypologyForMedia] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  
  const { data: typologies = [], isLoading, refetch } = useQuery<Typology[]>({
    queryKey: ["/api/typologies"],
  });
  
  const { data: documents = [] } = useQuery<any[]>({
    queryKey: ["/api/documents"],
  });

  const { data: avisos = [] } = useQuery<CatalogAviso[]>({
    queryKey: ["/api/catalog/avisos"],
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
    const cityDefaults = cityName ? (cityDefaultsMap[cityName] as any) : undefined;
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
    if (devFilter && devFilter.size === 1 && !devFilter.has("__none__")) {
      return Array.from(devFilter)[0] as string;
    }
    return null;
  }, [columnFilters]);

  const vistaFilterState = useMemo(() => {
    const devFilter = columnFilters["development"];
    const hasDevFilter = devFilter && devFilter.size > 0 && !devFilter.has("__none__");
    const filteredCount = hasDevFilter ? devFilter!.size : 0;
    if (filteredCount === 0) {
      return { disabledMessage: "Primero filtre un Desarrollo para ver sus vistas disponibles.", overrideValues: undefined as string[] | undefined };
    }
    if (filteredCount > 1) {
      return { disabledMessage: "Seleccione solo un Desarrollo para filtrar por Vista.", overrideValues: undefined as string[] | undefined };
    }
    const devName = Array.from(devFilter!)[0] as string;
    const devVistas = vistasByDevelopment[devName] || [];
    if (devVistas.length === 0) {
      return { disabledMessage: "Este Desarrollo no tiene vistas configuradas.", overrideValues: undefined as string[] | undefined };
    }
    return { disabledMessage: undefined as string | undefined, overrideValues: devVistas };
  }, [columnFilters, vistasByDevelopment]);
  
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
    dbDevelopments.forEach((dev) => {
      if (!dev.name) return;
      const tipList = (dev as any).tipologiasList as string[] | null;
      if (tipList && tipList.length > 0) {
        map[dev.name] = [...tipList].sort((a, b) => a.localeCompare(b, 'es'));
      }
    });
    return map;
  }, [dbDevelopments]);

  const tipologiasConfigByDevelopment = useMemo(() => {
    const map: Record<string, Record<string, string[]>> = {};
    dbDevelopments.forEach((dev) => {
      if (!dev.name) return;
      const cfg = (dev as any).tipologiasConfig as Record<string, string[]> | null;
      if (cfg) map[dev.name] = cfg;
    });
    return map;
  }, [dbDevelopments]);
  
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
    return dbDevelopers.map(d => d.name).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'));
  }, [dbDevelopers]);
  
  const developmentOptions = useMemo(() => {
    return dbDevelopments.map(d => d.name).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'));
  }, [dbDevelopments]);

  const validEntities = useMemo<ValidEntities>(() => ({
    developers: dbDevelopers.map(d => d.name).filter(Boolean),
    developments: dbDevelopments.map(d => d.name).filter(Boolean),
  }), [dbDevelopers, dbDevelopments]);
  
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

  const typologiesWithMediaCount = useMemo(() => {
    return typologies.map(t => ({
      ...t,
      mediaCount: String(getTypologyDocCount(t.id)),
    }));
  }, [typologies, getTypologyDocCount]);
  
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

  const hasAutoFixedRef = useRef(false);
  useEffect(() => {
    if (typologies.length === 0 || hasAutoFixedRef.current) return;
    hasAutoFixedRef.current = true;
    const incorrectRows = typologies.filter(t => t.active === true && t.active !== null && !isTypologyComplete(t, validEntities));
    if (incorrectRows.length === 0) return;
    Promise.all(
      incorrectRows.map(row => apiRequest("PUT", `/api/typologies/${row.id}`, { active: false }).catch(() => {}))
    ).then(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/typologies"] });
    });
  }, [typologies, validEntities]);

  const scrollToBottomPhaseRef = useRef<'idle' | 'loading_all' | 'done'>('idle');
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
  
  const saveRowByIdRef = useRef<(rowId: string) => Promise<void>>(async () => {});

  const handleCellChange = useCallback((rowId: string, field: TypologyField, value: any) => {
    const currentRow = typologies.find(t => t.id === rowId);
    if (!currentRow) return;
    
    const pending = pendingChanges.get(rowId);
    const updatedRow = { ...currentRow, ...(pending || {}), [field]: value };
    
    const autoPopulatedFields: Record<string, any> = {};

    const autoFillCityZoneFromDevelopment = (devName: string) => {
      if (!devName || !dbDevelopments) return;
      const dev = dbDevelopments.find(d => d.name === devName);
      if (dev) {
        if (dev.city) {
          autoPopulatedFields.city = dev.city;
          (updatedRow as any).city = dev.city;
          const selectedCity = catalogCities.find((c: any) => c.name === dev.city);
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
        if (dev.zone) {
          autoPopulatedFields.zone = dev.zone;
          (updatedRow as any).zone = dev.zone;
        }
      }
    };

    if (field === "developer" && dbDevelopers && dbDevelopments) {
      autoPopulatedFields.city = "";
      autoPopulatedFields.zone = "";
      autoPopulatedFields.development = "";
      autoPopulatedFields.type = null;
      autoPopulatedFields.tipoDesarrollo = null;
      (updatedRow as any).city = "";
      (updatedRow as any).zone = "";
      (updatedRow as any).development = "";
      (updatedRow as any).type = null;
      (updatedRow as any).tipoDesarrollo = null;

      const selectedDeveloper = dbDevelopers.find((d: any) => d.name === value);
      if (selectedDeveloper) {
        const developerDevelopments = dbDevelopments.filter(d => d.developerId === selectedDeveloper.id);
        
        if (developerDevelopments.length === 1) {
          const autoDevName = developerDevelopments[0].name;
          autoPopulatedFields.development = autoDevName;
          (updatedRow as any).development = autoDevName;
          
          autoFillCityZoneFromDevelopment(autoDevName);
          
          const devTipos = (developerDevelopments[0] as any).tipos as string[] | null;
          if (devTipos && devTipos.length === 1) {
            autoPopulatedFields.tipoDesarrollo = devTipos;
            (updatedRow as any).tipoDesarrollo = devTipos;
          } else if (devTipos && devTipos.length > 1) {
            autoPopulatedFields.tipoDesarrollo = null;
            (updatedRow as any).tipoDesarrollo = null;
          }

          autoPopulatedFields.type = null;
          (updatedRow as any).type = null;
        } else if (developerDevelopments.length > 1) {
          const uniqueCities = Array.from(new Set(developerDevelopments.map(d => d.city).filter(Boolean)));
          const uniqueZones = Array.from(new Set(developerDevelopments.map(d => d.zone).filter(Boolean)));

          if (uniqueCities.length === 1) {
            autoPopulatedFields.city = uniqueCities[0];
            (updatedRow as any).city = uniqueCities[0];
            const selectedCity = catalogCities.find((c: any) => c.name === uniqueCities[0]);
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
          if (uniqueZones.length === 1) {
            autoPopulatedFields.zone = uniqueZones[0];
            (updatedRow as any).zone = uniqueZones[0];
          }
        }

        if (!autoPopulatedFields.tipoDesarrollo) {
          const devRecTipos = (selectedDeveloper as any).tipos as string[] | null;
          if (devRecTipos && devRecTipos.length === 1) {
            autoPopulatedFields.tipoDesarrollo = devRecTipos;
            (updatedRow as any).tipoDesarrollo = devRecTipos;
          }
        }
      }

      setDynamicGray(prev => ({
        ...prev,
        [rowId]: { 
          ...(prev[rowId] || {}), 
          city: "calculated",
          zone: "calculated",
          development: autoPopulatedFields.development ? "calculated" : "input"
        }
      }));
    }
    
    if (field === "development" && dbDevelopments) {
      autoPopulatedFields.city = "";
      autoPopulatedFields.zone = "";
      (updatedRow as any).city = "";
      (updatedRow as any).zone = "";
      
      autoFillCityZoneFromDevelopment(value as string);
      
      setDynamicGray(prev => ({
        ...prev,
        [rowId]: { 
          ...(prev[rowId] || {}), 
          city: "calculated",
          zone: "calculated"
        }
      }));

      const devName = value as string;
      if (devName) {
        const devEntity = dbDevelopments.find(d => d.name === devName);
        const devTipos = (devEntity as any)?.tipos as string[] | null;
        if (devTipos && devTipos.length === 1) {
          autoPopulatedFields.tipoDesarrollo = devTipos;
          (updatedRow as any).tipoDesarrollo = devTipos;
        } else {
          autoPopulatedFields.tipoDesarrollo = null;
          (updatedRow as any).tipoDesarrollo = null;
        }

        autoPopulatedFields.type = null;
        (updatedRow as any).type = null;
      } else {
        autoPopulatedFields.type = null;
        (updatedRow as any).type = null;
        autoPopulatedFields.tipoDesarrollo = null;
        (updatedRow as any).tipoDesarrollo = null;
      }
    }

    if (field === "tipoDesarrollo") {
      const devName = (updatedRow as any).development as string | null;
      const devConfig = devName ? tipologiasConfigByDevelopment[devName] : null;
      const tipoVal = Array.isArray(value) ? (value as string[])[0] : (value as string | null);
      if (tipoVal && devConfig) {
        const tipologiasForTipo = Object.entries(devConfig)
          .filter(([, tipos]) => (tipos as string[]).includes(tipoVal))
          .map(([tipologia]) => tipologia);
        if (tipologiasForTipo.length === 1) {
          autoPopulatedFields.type = tipologiasForTipo[0];
          (updatedRow as any).type = tipologiasForTipo[0];
        } else {
          autoPopulatedFields.type = null;
          (updatedRow as any).type = null;
        }
      } else {
        autoPopulatedFields.type = null;
        (updatedRow as any).type = null;
      }
    }

    if (field === "tipologia" && value) {
      const devName = (updatedRow as any).development as string | null;
      const devConfig = devName ? tipologiasConfigByDevelopment[devName] : null;
      if (devConfig) {
        const tiposForTipologia = (devConfig[value as string] || []) as string[];
        if (tiposForTipologia.length === 1) {
          autoPopulatedFields.tipoDesarrollo = [tiposForTipologia[0]];
          (updatedRow as any).tipoDesarrollo = [tiposForTipologia[0]];
        } else {
          autoPopulatedFields.tipoDesarrollo = null;
          (updatedRow as any).tipoDesarrollo = null;
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

    // When hasDiscount toggles to false, preserve current % and Monto values explicitly
    // so disabled cells receive non-null `value` prop and display correctly
    const preservedFields: Record<string, any> = {};
    if (field === "hasDiscount" && value === false) {
      const pct = (updatedRow as any).discountPercent;
      const amt = (updatedRow as any).discountAmount;
      if (pct !== null && pct !== undefined) preservedFields.discountPercent = pct;
      if (amt !== null && amt !== undefined) preservedFields.discountAmount = amt;
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
    
    if (field !== "active") {
      const mergedActive = fullUpdate.active !== undefined ? fullUpdate.active : currentRow.active;
      if (mergedActive === true && !isTypologyComplete(fullUpdate, validEntities)) {
        (fullUpdate as any).active = false;
        autoPopulatedFields.active = false;
      }
    }

    const existing = pendingChangesRef.current.get(rowId) || {};
    pendingChangesRef.current.set(rowId, { ...existing, [field]: value, ...clearedFields, ...preservedFields, ...bidirectionalFields, ...calculatedFields, ...autoPopulatedFields });
    setPendingChangesVersion(v => v + 1);
    
    if (activeEditingRowId && activeEditingRowId !== rowId) {
      const prevChanges = pendingChangesRef.current.get(activeEditingRowId);
      if (prevChanges && Object.keys(prevChanges).length > 0) {
        saveRowByIdRef.current(activeEditingRowId);
      }
    }
    if (activeEditingRowId !== rowId) {
      setActiveEditingRowId(rowId);
    }
  }, [typologies, dbDevelopments, dbDevelopers, catalogCities, typesByDevelopment, tipologiasConfigByDevelopment, activeEditingRowId]);
  
  const checkAvisoWarnings = useCallback((rowId: string): string[] => {
    const currentRow = typologies.find(t => t.id === rowId);
    if (!currentRow) return [];
    const changes = pendingChanges.get(rowId) || {};
    const mergedRow = { ...currentRow, ...changes };
    if (!isTypologyComplete(mergedRow as Partial<Typology>, validEntities)) return [];
    const activeAvisos = avisos.filter(a => a.active);
    const warnings: string[] = [];
    for (const aviso of activeAvisos) {
      if (aviso.field === "media") {
        const mediaCount = getTypologyDocCount(rowId);
        if (mediaCount < aviso.minQuantity) {
          warnings.push(`Hay menos de ${aviso.minQuantity} cantidad de ${aviso.name.toLowerCase()} (actualmente ${mediaCount})`);
        }
      }
    }
    return warnings;
  }, [typologies, pendingChanges, avisos, validEntities, getTypologyDocCount]);

  const executeSave = useCallback(async (rowId: string) => {
    const changes = pendingChanges.get(rowId);
    if (!changes || Object.keys(changes).length === 0) return;
    
    const currentRow = typologies.find(t => t.id === rowId);
    const normalizedChanges = { ...changes };
    if (currentRow && validEntities) {
      const entityChecks: { field: keyof typeof normalizedChanges; list: string[] }[] = [
        { field: "developer", list: validEntities.developers },
        { field: "development", list: validEntities.developments },
      ];
      for (const { field, list } of entityChecks) {
        if (!(field in normalizedChanges)) {
          const val = currentRow[field as keyof typeof currentRow];
          if (typeof val === "string" && val && !list.includes(val)) {
            (normalizedChanges as any)[field] = null;
          }
        }
      }
    }

    setIsSaving(true);
    try {
      const res = await apiRequest("PUT", `/api/typologies/${rowId}`, normalizedChanges);
      const updatedRow = await res.json();
      pendingChangesRef.current.delete(rowId);
      setPendingChangesVersion(v => v + 1);
      queryClient.setQueryData(["/api/typologies"], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map(row => row.id === rowId ? { ...row, ...updatedRow } : row);
      });
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1200);
    } catch (error) {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, typologies, validEntities, toast]);

  const saveRowById = useCallback(async (rowId: string) => {
    const changes = pendingChanges.get(rowId);
    if (!changes || Object.keys(changes).length === 0) return;

    const warnings = checkAvisoWarnings(rowId);
    if (warnings.length > 0) {
      const proceed = await new Promise<boolean>((resolve) => {
        avisoResolveRef.current = resolve;
        setAvisoWarning({ messages: warnings, rowId });
      });
      if (!proceed) return;
    }

    await executeSave(rowId);
  }, [pendingChanges, checkAvisoWarnings, executeSave]);

  saveRowByIdRef.current = saveRowById;

  const saveActiveRow = useCallback(async () => {
    if (!activeEditingRowId) return;
    await saveRowById(activeEditingRowId);
  }, [activeEditingRowId, saveRowById]);

  const saveAllPendingRows = useCallback(async () => {
    const rowIds = Array.from(pendingChangesRef.current.keys());
    if (rowIds.length === 0) return;
    for (const rowId of rowIds) {
      await saveRowById(rowId);
    }
  }, [saveRowById]);

  const handleRowClick = useCallback(async (rowId: string) => {
    if (activeEditingRowId && activeEditingRowId !== rowId) {
      const changes = pendingChanges.get(activeEditingRowId);
      if (changes && Object.keys(changes).length > 0) {
        await saveRowById(activeEditingRowId);
      }
    }
    setActiveEditingRowId(rowId);
  }, [activeEditingRowId, pendingChanges, saveRowById]);

  const hasPendingRowChanges = activeEditingRowId ? pendingChanges.has(activeEditingRowId) : false;
  const pendingRowCount = useMemo(() => Array.from(pendingChangesRef.current.values()).filter(c => c && Object.keys(c).length > 0).length, [pendingChangesVersion]);

  useEffect(() => {
    const hasPending = pendingChanges.size > 0;
    const handler = (e: BeforeUnloadEvent) => {
      if (hasPending) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    if (hasPending) {
      window.addEventListener("beforeunload", handler);
    }
    return () => window.removeEventListener("beforeunload", handler);
  }, [pendingChangesVersion]);

  useEffect(() => {
    return () => {
      const pending = pendingChangesRef.current;
      if (pending.size === 0) return;
      const sessionId = localStorage.getItem("muros_session");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionId) headers["Authorization"] = `Bearer ${sessionId}`;
      pending.forEach((changes, rowId) => {
        if (!changes || Object.keys(changes).length === 0) return;
        fetch(`/api/typologies/${rowId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(changes),
          keepalive: true,
        });
      });
    };
  }, []);

  const handleAddRow = () => {
    const globalKeys = ["mortgageInterestPercent", "mortgageYears", "rentRatePercent", "rentMonths", "appreciationRate"];
    const initialData: Record<string, any> = {};
    for (const key of globalKeys) {
      if (globalDefaultsMap[key] !== undefined) {
        initialData[key] = globalDefaultsMap[key];
      }
    }
    initialData.active = false;
    initialData.queIncluye = "Sin Equipo";
    initialData.hasBalcony = null;
    initialData.hasTerrace = null;
    initialData.hasBalcony2 = null;
    initialData.hasTerrace2 = null;
    initialData.lockOff = null;
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

  const toggleColumns = (columnKeys: string[]) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      const allCollapsed = columnKeys.every(k => prev.has(k));
      for (const k of columnKeys) {
        if (allCollapsed) next.delete(k);
        else next.add(k);
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
  
  const getUniqueValues = useCallback((columnKey: string) => {
    const values = new Set<string>();
    typologies.forEach(t => {
      if (columnKey === "tipoDesarrollo") {
        const arr = Array.isArray(t.tipoDesarrollo) ? (t.tipoDesarrollo as string[]) : (t.tipoDesarrollo ? [String(t.tipoDesarrollo)] : []);
        arr.forEach(v => { if (v) values.add(v); });
      } else {
        const val = t[columnKey as keyof Typology];
        if (val !== null && val !== undefined && val !== "") {
          values.add(String(val));
        }
      }
    });
    return values;
  }, [typologies]);

  const filteredAndSortedTypologies = useMemo(() => {
    let result = typologies.filter(t => {
      const passesCheckboxFilters = Object.entries(columnFilters).every(([key, values]) => {
        if (values.size === 0) return true;
        if (key === "tipoDesarrollo") {
          const arr = Array.isArray(t.tipoDesarrollo) ? (t.tipoDesarrollo as string[]) : (t.tipoDesarrollo ? [String(t.tipoDesarrollo)] : []);
          return arr.some(v => values.has(v));
        }
        let fieldValue: string;
        if (key === "mediaCount") {
          fieldValue = String(getTypologyDocCount(t.id));
        } else if (key === "active") {
          fieldValue = t.active === null || t.active === undefined ? "null" : String(t.active);
        } else {
          fieldValue = String(t[key as keyof Typology] ?? "");
        }
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
      const isNumeric = column?.type === "number" || column?.type === "decimal" || sortKey === "mediaCount";
      
      result = [...result].sort((a, b) => {
        let aVal: any, bVal: any;
        if (sortKey === "mediaCount") {
          aVal = getTypologyDocCount(a.id);
          bVal = getTypologyDocCount(b.id);
        } else {
          aVal = a[sortKey as keyof Typology];
          bVal = b[sortKey as keyof Typology];
        }
        
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
  }, [typologies, columnFilters, columnSorts, rangeFilters, getTypologyDocCount]);

  const stableRowNumberMap = useMemo(() => {
    const sorted = [...typologies].sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return aDate - bDate;
    });
    const map = new Map<string, number>();
    sorted.forEach((t, i) => map.set(t.id, i + 1));
    return map;
  }, [typologies]);

  const INITIAL_ROWS = 50;
  const LOAD_MORE = 30;
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS);

  useEffect(() => {
    if (isLoading || typologies.length === 0 || scrollToBottomPhaseRef.current !== 'idle') return;
    scrollToBottomPhaseRef.current = 'loading_all';
    setVisibleCount(typologies.length);
  }, [isLoading, typologies]);

  useEffect(() => {
    if (scrollToBottomPhaseRef.current !== 'loading_all') return;
    if (visibleCount < typologies.length) return;
    scrollToBottomPhaseRef.current = 'done';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (contentScrollRef.current) {
          contentScrollRef.current.scrollTop = contentScrollRef.current.scrollHeight;
        }
      });
    });
  }, [visibleCount, typologies.length]);

  const [zoomLevel, setZoomLevel] = useState(100);
  const [showZoomPopup, setShowZoomPopup] = useState(false);
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(50, Math.min(150, newZoom));
    setZoomLevel(clampedZoom);
    setShowZoomPopup(true);
    
    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
    }
    
    zoomTimeoutRef.current = setTimeout(() => {
      setShowZoomPopup(false);
    }, 2000);
  };

  const zoomIn = () => handleZoomChange(zoomLevel + 5);
  const zoomOut = () => handleZoomChange(zoomLevel - 5);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const mediaInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  useEffect(() => {
    if (scrollToBottomPhaseRef.current !== 'done') return;
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
          const fieldValue = key === "active"
            ? (row.active === null || row.active === undefined ? "null" : String(row.active))
            : String(row[key as keyof Typology] ?? "");
          return values.has(fieldValue);
        });
      });
      
      const availableValues = new Set<string>();
      filteredData.forEach((row) => {
        if (col.key === "active") {
          const activeVal = row.active;
          availableValues.add(activeVal === null || activeVal === undefined ? "null" : String(activeVal));
        } else {
          const val = row[col.key as keyof Typology];
          if (val !== null && val !== undefined && val !== "") {
            availableValues.add(String(val));
          }
        }
      });
      map[col.key] = availableValues;
    });
    
    return map;
  }, [typologies, columnFilters]);
  
  const mergedRowCacheRef = useRef<Map<string, { source: Typology; result: Typology }>>(new Map());
  
  const getMergedRow = (row: Typology): Typology => {
    const pending = pendingChanges.get(row.id);
    
    if (!pending) {
      const cached = mergedRowCacheRef.current.get(row.id);
      if (cached && cached.source === row) {
        return cached.result;
      }
    }
    
    const merged = pending ? { ...row, ...pending } : row;
    
    let autoDeliveryDate: string | null = null;
    let displayCity = merged.city;
    let displayZone = merged.zone;
    let displayNivelMantenimiento = merged.nivelMantenimiento;
    if (merged.development && dbDevelopments.length > 0) {
      const dev = dbDevelopments.find(d => d.name === merged.development);
      if (dev) {
        if (dev.city) displayCity = dev.city;
        if (dev.zone) displayZone = dev.zone;
        if (!displayNivelMantenimiento && (dev as any).nivel) displayNivelMantenimiento = (dev as any).nivel;
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
    
    const mergedWithInherited = { ...merged, nivelMantenimiento: displayNivelMantenimiento } as Typology;
    const defaults = getDefaultsForRow(mergedWithInherited);
    const calculated = calculateFields(mergedWithInherited, defaults, nivelMantenimientoLookup);
    
    let maintenanceStartDate: string | null = null;
    let maintenanceEndDate: string | null = null;
    if (autoDeliveryDate && merged.development && dbDevelopments.length > 0) {
      const dev = dbDevelopments.find(d => d.name === merged.development);
      if (dev?.entregaProyectada) {
        maintenanceStartDate = autoDeliveryDate;
        const mortgageYrs = (calculated.mortgageYears as number) || (merged.mortgageYears as number) || defaults?.['mortgageYears'] || 15;
        const deliveryDateObj = new Date(dev.entregaProyectada);
        const endDateObj = new Date(deliveryDateObj);
        endDateObj.setFullYear(endDateObj.getFullYear() + mortgageYrs);
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        maintenanceEndDate = `${months[endDateObj.getMonth()]}/${endDateObj.getFullYear().toString().slice(-2)}`;
      }
    }

    let rentStartDateCalc: string | null = null;
    let rentEndDateCalc: string | null = null;
    if (merged.development && dbDevelopments.length > 0) {
      const dev = dbDevelopments.find(d => d.name === merged.development);
      if (dev?.entregaProyectada) {
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const startObj = new Date(dev.entregaProyectada);
        startObj.setMonth(startObj.getMonth() + 2);
        rentStartDateCalc = `${months[startObj.getMonth()]}/${startObj.getFullYear().toString().slice(-2)}`;
        const mortgageYrs = (calculated.mortgageYears as number) || (merged.mortgageYears as number) || defaults?.['mortgageYears'] || 15;
        const endObj = new Date(startObj);
        endObj.setFullYear(endObj.getFullYear() + mortgageYrs);
        rentEndDateCalc = `${months[endObj.getMonth()]}/${endObj.getFullYear().toString().slice(-2)}`;
      }
    }
    
    const result = { ...merged, ...calculated, city: displayCity, zone: displayZone, nivelMantenimiento: displayNivelMantenimiento, deliveryDate: autoDeliveryDate, maintenanceStartDate, maintenanceEndDate, rentStartDate: rentStartDateCalc, rentEndDate: rentEndDateCalc } as Typology;
    
    if (!pending) {
      mergedRowCacheRef.current.set(row.id, { source: row, result });
    }
    
    return result;
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
          {isSaving && (
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Guardando...
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{filteredAndSortedTypologies.length} tipologías</span>
          <Button 
            onClick={async () => {
              await saveAllPendingRows();
            }}
            size="sm"
            disabled={pendingRowCount === 0 || isSaving}
            className={cn(
              "transition-all duration-300",
              saveFlash 
                ? "text-white shadow-lg scale-105" 
                : "bg-blue-600 hover:bg-blue-700 text-white"
            )}
            style={saveFlash ? { backgroundColor: "rgb(255, 181, 73)", borderColor: "rgb(255, 181, 73)" } : undefined}
            data-testid="button-save-row"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            Guardar{pendingRowCount > 1 ? ` (${pendingRowCount})` : ""}
          </Button>
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
            <div className="flex spreadsheet-header-row1">
              <div className="w-[60px] flex-shrink-0 sticky left-0 z-30" style={{ backgroundColor: getSectionColor(0), borderRight: `1px solid ${SECTION_BORDER_COLOR}`, borderBottom: '1px solid rgba(255,255,255,0.15)' }} />
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
                  const groupKey = group.sections.map(s => s.section.id).join("-");
                  const isGroupCollapsed = collapsedGroups.has(groupKey);
                  const anyExpanded = group.sections.some(s => expandedSections.has(s.section.id));
                  
                  const displayLabel = (group.label === "" || group.label === " ") ? "" : group.label;

                  let totalWidth = 0;
                  if (isGroupCollapsed) {
                    totalWidth = COLLAPSED_COL_WIDTH;
                  } else {
                    for (const { section } of group.sections) {
                      const isExp = expandedSections.has(section.id);
                      if (!isExp) {
                        totalWidth += COLLAPSED_COL_WIDTH;
                      } else {
                        totalWidth += section.columns.reduce((sum, col) => sum + getColWidth(col), 0);
                      }
                    }
                    if (!anyExpanded && displayLabel) {
                      const minLabelWidth = displayLabel.length * 8 + 44;
                      totalWidth = Math.max(totalWidth, minLabelWidth);
                    }
                  }

                  const allColsInGroupCollapsed = !isGroupCollapsed && anyExpanded && group.sections.every(({ section }) => {
                    const isExp = expandedSections.has(section.id);
                    if (!isExp) return true;
                    return section.columns.length > 0 && section.columns.every(col => collapsedColumns.has(col.key));
                  });

                  const showLabel = !isGroupCollapsed;
                  const allSectionsIndivCollapsedR1 = !anyExpanded && !isGroupCollapsed;
                  const showMinus = !isGroupCollapsed && (allSectionsIndivCollapsedR1 || (anyExpanded && !allColsInGroupCollapsed));
                  
                  const hasMergeHeaders = group.sections.some(s => s.section.mergeHeaders);
                  return (
                    <div 
                      key={groupKey} 
                      className={cn("flex-shrink-0 flex items-center h-full text-white overflow-hidden", showLabel ? "justify-between" : "justify-center")}
                      style={{ 
                        backgroundColor: getSectionGroupColor(SECTIONS, firstIndex),
                        width: totalWidth,
                        borderRight: 'none',
                        borderBottom: hasMergeHeaders ? 'none' : '1px solid rgba(255,255,255,0.15)',
                      }}
                    >
                      {showLabel && (
                        <div className="pointer-events-none" style={{ width: 20 }} />
                      )}
                      {showLabel && (
                        <TruncatedLabel 
                          label={displayLabel.toUpperCase()} 
                          columnKey={groupKey} 
                          uppercaseTooltip={true}
                        />
                      )}
                      {isGroupCollapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => {
                                setCollapsedGroups(prev => {
                                  const next = new Set(prev);
                                  next.delete(groupKey);
                                  return next;
                                });
                                setExpandedSections(prev => {
                                  const n = new Set(prev);
                                  for (const { section } of group.sections) {
                                    n.add(section.id);
                                  }
                                  return n;
                                });
                              }}
                              className="flex items-center justify-center h-full w-full cursor-pointer flex-shrink-0"
                              data-testid={`section-toggle-${group.sections[0].section.id}`}
                            >
                              <Plus className="w-3 h-3" style={{ color: 'white' }} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {group.label.toUpperCase()}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <button
                          onClick={() => {
                            if (allColsInGroupCollapsed) {
                              setCollapsedColumns(prev => {
                                const next = new Set(prev);
                                for (const { section } of group.sections) {
                                  for (const col of section.columns) {
                                    next.delete(col.key);
                                  }
                                }
                                return next;
                              });
                            } else if (!anyExpanded) {
                              setCollapsedGroups(prev => {
                                const next = new Set(prev);
                                next.add(groupKey);
                                return next;
                              });
                            } else {
                              setCollapsedGroups(prev => {
                                const next = new Set(prev);
                                next.add(groupKey);
                                return next;
                              });
                              setExpandedSections(prev => {
                                const n = new Set(prev);
                                for (const { section } of group.sections) {
                                  n.delete(section.id);
                                }
                                return n;
                              });
                            }
                          }}
                          className="flex items-center justify-center h-full flex-shrink-0 cursor-pointer"
                          style={{ width: 20 }}
                          data-testid={`section-toggle-${group.sections[0].section.id}`}
                        >
                          {showMinus ? (
                            <Minus className="w-3 h-3" style={{ color: 'white' }} />
                          ) : (
                            <Plus className="w-3 h-3" style={{ color: 'white' }} />
                          )}
                        </button>
                      )}
                    </div>
                  );
                });
              })()}
              {collapsedColumns.has("medios") ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setCollapsedColumns(prev => { const n = new Set(prev); n.delete("medios"); return n; })}
                      className="flex-shrink-0 flex items-center justify-center h-full cursor-pointer"
                      style={{ backgroundColor: getSectionGroupColor(SECTIONS, SECTIONS.length), width: COLLAPSED_COL_WIDTH }}
                      data-testid="section-toggle-medios"
                    >
                      <Plus className="w-3 h-3" style={{ color: 'white' }} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">MEDIOS</TooltipContent>
                </Tooltip>
              ) : (
                <div className="w-24 flex-shrink-0 flex items-center justify-between h-full text-white" style={{ backgroundColor: getSectionGroupColor(SECTIONS, SECTIONS.length) }}>
                  <div className="pointer-events-none" style={{ width: 20 }} />
                  <TruncatedLabel label="MEDIOS" columnKey="medios" uppercaseTooltip={true} />
                  <button
                    onClick={() => setCollapsedColumns(prev => { const n = new Set(prev); n.add("medios"); return n; })}
                    className="flex items-center justify-center h-full flex-shrink-0 cursor-pointer"
                    style={{ width: 20 }}
                    data-testid="section-toggle-medios"
                  >
                    <Minus className="w-3 h-3" style={{ color: 'white' }} />
                  </button>
                </div>
              )}
            </div>
            
            {/* Row 2: Section/column labels */}
            <div className="flex spreadsheet-header-row2">
              <div className="w-[60px] h-full flex-shrink-0 flex items-center justify-center sticky left-0 z-30" style={{ backgroundColor: getSectionColor(0), borderRight: `1px solid ${SECTION_BORDER_COLOR}`, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                <span className="text-xs font-medium text-white">ID</span>
              </div>
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

                return groups.flatMap((group) => {
                  const groupKey = group.sections.map(s => s.section.id).join("-");
                  const isGroupCollapsed = collapsedGroups.has(groupKey);
                  const anySectionExpanded = group.sections.some(s => expandedSections.has(s.section.id));
                  const displayLabel2 = (group.label === "" || group.label === " ") ? "" : group.label;
                  if (isGroupCollapsed) {
                    return [(
                      <div 
                        key={`group-collapsed-${group.label}`}
                        className="flex-shrink-0 flex items-center justify-center text-xs h-full text-white"
                        style={{ backgroundColor: getSectionGroupColor(SECTIONS, group.sections[0].index), width: COLLAPSED_COL_WIDTH }}
                      />
                    )];
                  }
                  const allSectionsIndividuallyCollapsed = !anySectionExpanded && !isGroupCollapsed;
                  let perSectionCollapsedWidth = COLLAPSED_COL_WIDTH;
                  if (allSectionsIndividuallyCollapsed && displayLabel2 && group.sections.length > 0) {
                    const minLabelWidth = displayLabel2.length * 8 + 44;
                    const totalNeeded = Math.max(group.sections.length * COLLAPSED_COL_WIDTH, minLabelWidth);
                    perSectionCollapsedWidth = Math.ceil(totalNeeded / group.sections.length);
                  }

                  return group.sections.flatMap(({ section, index: sectionIndex }, groupSectionIdx) => {
                    const isSectionExpanded = expandedSections.has(section.id);
                    const isFirstSection = sectionIndex === 0;
                    const isFirstInGroup = groupSectionIdx === 0;
                    const isLastInParentGroup = !section.parentLabel || sectionIndex === SECTIONS.length - 1 || SECTIONS[sectionIndex + 1]?.parentLabel !== section.parentLabel;
                    
                    if (!isSectionExpanded || (section as any).hideInRow2) {
                      if ((section as any).hideInRow2) return [];
                      return [(
                        <div 
                          key={`collapsed-${section.id}`}
                          className="flex-shrink-0 flex items-center justify-center text-xs h-full text-white border-r border-white/20"
                          style={{ backgroundColor: getSectionGroupColor(SECTIONS, sectionIndex), width: allSectionsIndividuallyCollapsed ? perSectionCollapsedWidth : COLLAPSED_COL_WIDTH, borderBottom: '1px solid rgba(255,255,255,0.15)' }}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => toggleSection(section.id)}
                                className="flex items-center justify-center w-full h-full cursor-pointer hover:bg-white/10"
                                data-testid={`section-expand-${section.id}`}
                              >
                                <Plus className="w-3 h-3" style={{ color: 'white' }} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              {section.label || section.subheader}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )];
                    }

                    // Check if ALL columns in this section are manually collapsed in Row 3
                    const allColumnsCollapsed = section.columns.length > 0 && section.columns.every(col => collapsedColumns.has(col.key));

                    if (allColumnsCollapsed) {
                      // Show '+' buttons for each collapsed column in Row 2 when they are all collapsed
                      // This ensures consistency with Row 3 and allows re-expansion
                      // AND show the section label in the first collapsed column
                      return section.columns.map((col, idx) => {
                        const isFirstCol = idx === 0;
                        return (
                          <div
                            key={`all-cols-collapsed-${section.id}-${col.key}`}
                            className={cn(
                              "flex-shrink-0 h-full flex items-center justify-center text-white border-r border-white/10",
                            )}
                            style={{ 
                              backgroundColor: getSectionGroupColor(SECTIONS, sectionIndex), 
                              width: COLLAPSED_COL_WIDTH,
                              borderBottom: '1px solid rgba(255,255,255,0.15)',
                            }}
                          >
                            <div className="flex items-center justify-center w-full h-full relative">
                              {isFirstCol && (
                                <span 
                                  className="absolute left-1 top-0 bottom-0 flex items-center text-[8px] font-bold truncate uppercase opacity-30 z-20 cursor-default" 
                                  style={{ maxWidth: COLLAPSED_COL_WIDTH - 15 }}
                                  title={section.label.toUpperCase()}
                                >
                                  {section.label}
                                </span>
                              )}
                              <button
                                onClick={() => toggleColumn(col.key)}
                                className="flex items-center justify-center w-full h-full cursor-pointer hover:bg-white/10"
                                data-testid={`col-expand-all-${col.key}`}
                                title={col.fullLabel || col.label}
                              >
                                <Plus className="w-3 h-3" style={{ color: 'white' }} />
                              </button>
                            </div>
                          </div>
                        );
                      });
                    }

                    if (section.mergeHeaders) {
                      const sectionWidth = section.columns.reduce((sum, col) => sum + getColWidth(col), 0);
                      return [(
                        <div
                          key={`merged-${section.id}`}
                          className="flex-shrink-0 text-white"
                          style={{ 
                            backgroundColor: getSectionGroupColor(SECTIONS, sectionIndex), 
                            width: sectionWidth,
                            height: '100%',
                          }}
                        />
                      )];
                    }

                    // UNIFIED TITLES for Balcón and Terraza in Row 2
                    if (section.id === "distribucion") {
                      const balconyCol = section.columns.find(c => c.key === "hasBalcony")!;
                      const balconySizeCol = section.columns.find(c => c.key === "balconySize")!;
                      const terraceCol = section.columns.find(c => c.key === "hasTerrace")!;
                      const terraceSizeCol = section.columns.find(c => c.key === "terraceSize")!;
                      
                      const otherColsBefore = section.columns.filter(c => c.key === "bedrooms" || c.key === "bathrooms" || c.key === "areas");
                      const otherColsAfter = section.columns.filter(c => c.key === "lockOff");

                      return [
                        ...otherColsBefore.map((col, idx) => renderStandardCol(col, idx === 0 && sectionIndex === 0, false, sectionIndex, idx === 0)),
                        renderUnifiedCol("balcon", "Balcón", [balconyCol, balconySizeCol], sectionIndex, false),
                        renderUnifiedCol("terraza", "Terraza", [terraceCol, terraceSizeCol], sectionIndex, false),
                        ...otherColsAfter.map(col => renderStandardCol(col, false, isLastInParentGroup, sectionIndex, false))
                      ];
                    }

                    if (section.id === "credito" || section.id === "mantenimiento" || section.id === "tasa_renta" || section.id === "meses") {
                      return section.columns.map((col, idx) => {
                        const isLastCol = idx === section.columns.length - 1;
                        return renderStandardCol(col, idx === 0 && sectionIndex === 0, isLastCol && isLastInParentGroup, sectionIndex, idx === 0 && isFirstInGroup);
                      });
                    }

                    if (section.id === "impuestos") {
                      const isaPercentCol = section.columns.find(c => c.key === "isaPercent")!;
                      const isaAmountCol = section.columns.find(c => c.key === "isaAmount")!;
                      return [renderUnifiedCol("impuestos", "Impuestos", [isaPercentCol, isaAmountCol], sectionIndex, isFirstInGroup)];
                    }

                    if (section.id === "notaria") {
                      const notaryPercentCol = section.columns.find(c => c.key === "notaryPercent")!;
                      const notaryAmountCol = section.columns.find(c => c.key === "notaryAmount")!;
                      return [renderUnifiedCol("notaria", "Notaría", [notaryPercentCol, notaryAmountCol], sectionIndex, isFirstInGroup)];
                    }

                    if (section.id === "gastos_extra") {
                      const equipmentCol = section.columns.find(c => c.key === "equipmentCost")!;
                      const furnitureCol = section.columns.find(c => c.key === "furnitureCost")!;
                      const totalCol = section.columns.find(c => c.key === "totalPostDeliveryCosts")!;
                      return [
                        renderUnifiedCol("equipo", "Equipo", [equipmentCol], sectionIndex, isFirstInGroup),
                        renderUnifiedCol("muebles", "Muebles", [furnitureCol], sectionIndex, false),
                        renderUnifiedCol("total-post", "Total", [totalCol], sectionIndex, false)
                      ];
                    }

                    if (section.id === "lockoff") {
                      const balconyCol = section.columns.find(c => c.key === "hasBalcony2")!;
                      const balconySizeCol = section.columns.find(c => c.key === "balconySize2")!;
                      const terraceCol = section.columns.find(c => c.key === "hasTerrace2")!;
                      const terraceSizeCol = section.columns.find(c => c.key === "terraceSize2")!;
                      
                      const otherColsBefore = section.columns.filter(c => c.key === "bedrooms2" || c.key === "bathrooms2" || c.key === "areas2");

                      return [
                        ...otherColsBefore.map((col, idx) => renderStandardCol(col, idx === 0 && sectionIndex === 0, false, sectionIndex, idx === 0)),
                        renderUnifiedCol("balcon2", "Balcón", [balconyCol, balconySizeCol], sectionIndex, false),
                        renderUnifiedCol("terraza2", "Terraza", [terraceCol, terraceSizeCol], sectionIndex, false)
                      ];
                    }

                    if (section.id === "entrega") {
                      return [renderStandardCol(section.columns[0], isFirstSection, false, sectionIndex, isFirstInGroup)];
                    }

                    if (section.parentLabel && !section.subSections && section.id !== "generales") {
                      const sectionWidth = section.columns.reduce((sum, col) => sum + getColWidth(col), 0);
                      const allColsCollapsedInSection = section.columns.length > 0 && section.columns.every(col => collapsedColumns.has(col.key));
                      const sectionColKeys = section.columns.map(c => c.key);

                      return [(
                        <div
                          key={`subsec-${section.id}`}
                          className="flex-shrink-0 h-full flex items-center justify-between text-white"
                          style={{ 
                            backgroundColor: getSectionGroupColor(SECTIONS, sectionIndex), 
                            width: sectionWidth,
                            borderBottom: '1px solid rgba(255,255,255,0.15)',
                            borderLeft: !isFirstInGroup ? '1px solid rgba(255,255,255,0.15)' : undefined,
                          }}
                        >
                          <div className="flex items-center justify-between w-full h-full">
                            <div className="pointer-events-none" style={{ width: 20 }} />
                            <TruncatedLabel label={section.label} columnKey={section.id} />
                            {allColsCollapsedInSection ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => toggleColumns(sectionColKeys)}
                                    className="flex items-center justify-center h-full flex-shrink-0 cursor-pointer hover:bg-white/10"
                                    style={{ width: 20 }}
                                    data-testid={`section-toggle-${section.id}`}
                                  >
                                    <Plus className="w-3 h-3" style={{ color: 'white' }} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                  {section.label}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <button
                                onClick={() => toggleSection(section.id)}
                                className="flex items-center justify-center h-full flex-shrink-0 cursor-pointer hover:bg-white/10"
                                style={{ width: 20 }}
                                data-testid={`section-toggle-${section.id}`}
                              >
                                <Minus className="w-3 h-3" style={{ color: 'white' }} />
                              </button>
                            )}
                          </div>
                        </div>
                      )];
                    }

                    return section.columns.map((col, colIndex) => {
                      return renderStandardCol(col, colIndex === 0 && isFirstSection, true, sectionIndex, colIndex === 0 && isFirstInGroup);
                    });
                  });
                });

                function renderStandardCol(col: ColumnDef, _isSticky: boolean, _showBorder: boolean = true, sectionIndex: number, isFirstInSection: boolean = true) {
                  const isColCollapsed = collapsedColumns.has(col.key);
                  const colW = getColWidth(col);
                  return (
                    <div
                      key={`name-${col.key}`}
                      className={cn(
                        "flex-shrink-0 h-full flex items-center text-white",
                        isColCollapsed ? "justify-center" : "justify-between",
                      )}
                      style={{ 
                        backgroundColor: getSectionGroupColor(SECTIONS, sectionIndex), 
                        width: colW,
                        borderLeft: !isFirstInSection && !isColCollapsed ? '1px solid rgba(255,255,255,0.15)' : undefined,
                        borderBottom: '1px solid rgba(255,255,255,0.15)',
                      }}
                    >
                      {isColCollapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => toggleColumn(col.key)} className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-white/10">
                              <Plus className="w-3 h-3 text-white" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {col.fullLabel || col.label}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <>
                          <div style={{ width: 20 }} />
                          <TruncatedLabel label={col.label} fullLabel={col.fullLabel} columnKey={col.key} />
                          <button onClick={() => toggleColumn(col.key)} className="w-4 h-full flex items-center justify-center cursor-pointer hover:bg-white/10"><Minus className="w-3 h-3 text-white" /></button>
                        </>
                      )}
                    </div>
                  );
                }

                function renderUnifiedCol(key: string, label: string, cols: ColumnDef[], sectionIndex: number, isFirstInSection: boolean = true) {
                  const colKeys = cols.map(c => c.key);
                  const allCollapsed = colKeys.every(k => collapsedColumns.has(k));
                  const totalW = cols.reduce((sum, c) => sum + getColWidth(c), 0);
                  if (allCollapsed) {
                    return (
                      <div key={`unified-${key}`} className="flex-shrink-0 h-full flex items-center justify-center text-white" style={{ backgroundColor: getSectionGroupColor(SECTIONS, sectionIndex), width: totalW, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => toggleColumns(colKeys)} className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-white/10" data-testid={`unified-expand-${key}`}>
                              <Plus className="w-3 h-3 text-white" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
                        </Tooltip>
                      </div>
                    );
                  }
                  return (
                    <div key={`unified-${key}`} className="flex-shrink-0 h-full flex items-center justify-between text-white" style={{ backgroundColor: getSectionGroupColor(SECTIONS, sectionIndex), width: totalW, borderLeft: !isFirstInSection ? '1px solid rgba(255,255,255,0.15)' : undefined, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                      <div style={{ width: 20 }} />
                      <TruncatedLabel label={label} columnKey={key} />
                      <button onClick={() => toggleColumns(colKeys)} className="flex items-center justify-center h-full flex-shrink-0 cursor-pointer hover:bg-white/10" style={{ width: 20 }} data-testid={`unified-collapse-${key}`}>
                        <Minus className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  );
                }
              })()}
              <div className="h-full flex-shrink-0" style={{ backgroundColor: getSectionGroupColor(SECTIONS, SECTIONS.length), borderBottom: '1px solid rgba(255,255,255,0.15)', width: collapsedColumns.has("medios") ? COLLAPSED_COL_WIDTH : 96 }} />
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

                return groups.flatMap((group) => {
                  const groupKey = group.sections.map(s => s.section.id).join("-");
                  const isGroupCollapsed = collapsedGroups.has(groupKey);
                  const anyExpanded = group.sections.some(s => expandedSections.has(s.section.id));
                  const isFirstSectionGlobal = group.sections[0].index === 0;

                  if (isGroupCollapsed) {
                    return [(
                      <div 
                        key={`group-collapsed-filter-${group.label}`}
                        className="flex-shrink-0 h-full"
                        style={{ 
                          backgroundColor: getSectionGroupColor(SECTIONS, group.sections[0].index), 
                          width: COLLAPSED_COL_WIDTH,
                        }}
                      />
                    )];
                  }
                  const allSectionsIndivCollapsed3 = !anyExpanded && !isGroupCollapsed;
                  const displayLabel3 = (group.label === "" || group.label === " ") ? "" : group.label;
                  let perSectionCollapsedWidth3 = COLLAPSED_COL_WIDTH;
                  if (allSectionsIndivCollapsed3 && displayLabel3 && group.sections.length > 0) {
                    const minLabelWidth = displayLabel3.length * 8 + 44;
                    const totalNeeded = Math.max(group.sections.length * COLLAPSED_COL_WIDTH, minLabelWidth);
                    perSectionCollapsedWidth3 = Math.ceil(totalNeeded / group.sections.length);
                  }

                  return group.sections.flatMap(({ section, index: sectionIndex }) => {
                    const isExpanded = expandedSections.has(section.id);
                    const isFirstSection = sectionIndex === 0;
                    if (!isExpanded) {
                      return [(
                        <div 
                          key={`collapsed-filter-${section.id}`}
                          className="flex-shrink-0 h-full"
                          style={{ backgroundColor: getSectionGroupColor(SECTIONS, sectionIndex), width: allSectionsIndivCollapsed3 ? perSectionCollapsedWidth3 : COLLAPSED_COL_WIDTH }}
                        />
                      )];
                    }
                    return section.columns.map((col, colIndex) => {
                      const isColCollapsed = collapsedColumns.has(col.key);
                      const isFirstColInRow3 = colIndex === 0;
                      const colW = getColWidth(col);
                      return (
                        <div
                          key={`filter-${col.key}`}
                          className={cn(
                            "flex-shrink-0 h-full overflow-hidden",
                          )}
                          style={{ 
                            backgroundColor: getSectionGroupColor(SECTIONS, sectionIndex),
                            width: colW,
                            borderLeft: !isFirstColInRow3 && !isColCollapsed ? '1px solid rgba(255,255,255,0.15)' : undefined,
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
                              availableValues={col.key === "active" ? undefined : availableValuesMap[col.key]}
                              rangeFilter={rangeFilters[col.key]}
                              onRangeFilterChange={(range) => handleRangeFilterChange(col.key, range)}
                              groupedOptions={
                                col.key === "zone" ? zoneGroupedOptions :
                                col.key === "development" ? developmentGroupedOptions :
                                undefined
                              }
                              columnWidth={col.width}
                              hideLabel={true}
                              fullLabel={col.hideLabel ? (col.fullLabel || col.label) : (section.parentLabel ? (col.fullLabel || col.label) : undefined)}
                              disabledMessage={col.key === "view" ? vistaFilterState.disabledMessage : undefined}
                              overrideUniqueValues={col.key === "active" ? ["true", "false", "null"] : col.key === "view" ? vistaFilterState.overrideValues : undefined}
                              dotColorMap={col.key === "active" ? { "true": "#15803d", "false": "#dc2626", "null": "#1f2937" } : undefined}
                              labelMap={col.key === "active" ? { "true": "Sí", "false": "No", "null": "Deshabilitado" } : undefined}
                              hasParentGroup={!!section.parentLabel}
                            />
                          )}
                        </div>
                      );
                    });
                  });
                });
              })()}
              <div className="h-full flex-shrink-0 overflow-hidden" style={{ backgroundColor: getSectionGroupColor(SECTIONS, SECTIONS.length), width: collapsedColumns.has("medios") ? COLLAPSED_COL_WIDTH : 96 }}>
                {!collapsedColumns.has("medios") && (
                  <ColumnFilter
                    column={{ key: "mediaCount" as any, label: "Medios", type: "number", width: 96 }}
                    data={typologiesWithMediaCount as any}
                    selectedValues={columnFilters["mediaCount"] || new Set()}
                    sortDirection={columnSorts["mediaCount"] || null}
                    onFilterChange={(values) => handleColumnFilterChange("mediaCount", values)}
                    onSortChange={(dir) => handleColumnSortChange("mediaCount", dir)}
                    sectionColor={getSectionGroupColor(SECTIONS, SECTIONS.length)}
                    hideLabel={true}
                    columnWidth={96}
                  />
                )}
              </div>
            </div>
          </div>
          
          {visibleData.map((row, rowIndex) => {
            const mergedRow = getMergedRow(row);
            
            const isActiveRow = activeEditingRowId === row.id;
            const hasRowPending = pendingChanges.has(row.id);
            
            const isRowDisabled = mergedRow.active === null;
            return (
              <div
                key={row.id}
                className={cn(
                  "flex border-b cursor-pointer",
                  isRowDisabled
                    ? ""
                    : isActiveRow 
                      ? "ring-1 ring-blue-400/50 bg-blue-50/30 dark:bg-blue-950/20" 
                      : rowIndex % 2 === 0 ? "bg-background" : "bg-muted/10"
                )}
                style={{ height: '32px', maxHeight: '32px', ...(isRowDisabled ? { backgroundColor: '#9ca3af' } : {}) }}
                onClick={() => handleRowClick(row.id)}
                data-testid={`row-typology-${row.id}`}
              >
                <div 
                  className="spreadsheet-cell w-[60px] flex-shrink-0 justify-center text-xs text-white sticky left-0 z-10 relative cursor-default"
                  style={{ backgroundColor: getSectionColor(0), borderRight: `1px solid ${SECTION_BORDER_COLOR}` }}
                  data-testid={`cell-index-${row.id}`}
                >
                  {stableRowNumberMap.get(row.id) ?? rowIndex + 1}
                  <span
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: mergedRow.active === null
                        ? "#6b7280"
                        : isTypologyComplete(mergedRow as Partial<Typology>, validEntities)
                          ? (mergedRow.active === true ? "#22c55e" : "#f59e0b")
                          : "#ef4444"
                    }}
                    data-testid={`status-dot-${row.id}`}
                  />
                </div>
                
                {/* Flat cell structure for perfect row alignment */}
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

                  return groups.flatMap((group) => {
                    const groupKey = group.sections.map(s => s.section.id).join("-");
                    const isGroupCollapsed = collapsedGroups.has(groupKey);
                    const anySectionExpanded = group.sections.some(s => expandedSections.has(s.section.id));
                    const isFirstSectionGlobal = group.sections[0].index === 0;

                    if (isGroupCollapsed) {
                      return [(
                        <div 
                          key={`group-collapsed-row-${row.id}-${group.label}`}
                          className="spreadsheet-cell h-full"
                          style={{ 
                            backgroundColor: rowIndex % 2 === 0 ? "rgba(0,0,0,0.01)" : "rgba(0,0,0,0.03)", 
                            width: COLLAPSED_COL_WIDTH,
                          }}
                        />
                      )];
                    }
                    const allSectionsIndivCollapsedRow = !anySectionExpanded && !isGroupCollapsed;
                    const displayLabelRow = (group.label === "" || group.label === " ") ? "" : group.label;
                    let perSectionCollapsedWidthRow = COLLAPSED_COL_WIDTH;
                    if (allSectionsIndivCollapsedRow && displayLabelRow && group.sections.length > 0) {
                      const minLabelWidth = displayLabelRow.length * 8 + 44;
                      const totalNeeded = Math.max(group.sections.length * COLLAPSED_COL_WIDTH, minLabelWidth);
                      perSectionCollapsedWidthRow = Math.ceil(totalNeeded / group.sections.length);
                    }

                    return group.sections.flatMap(({ section, index: sectionIndex }) => {
                      const isSectionExpanded = expandedSections.has(section.id);
                      const isFirstSection = sectionIndex === 0;
                      if (!isSectionExpanded) {
                        return [(
                          <div 
                            key={`collapsed-row-${row.id}-${section.id}`}
                            className="spreadsheet-cell h-full"
                            style={{ 
                              backgroundColor: rowIndex % 2 === 0 ? "rgba(0,0,0,0.01)" : "rgba(0,0,0,0.03)", 
                              width: allSectionsIndivCollapsedRow ? perSectionCollapsedWidthRow : COLLAPSED_COL_WIDTH,
                            }}
                          />
                        )];
                      }

                      return section.columns.map((col, colIndex) => {
                        const isColCollapsed = collapsedColumns.has(col.key);
                        const isLastCol = colIndex === section.columns.length - 1;
                        const isLastInSection = isLastCol && sectionIndex === SECTIONS.length - 1;

                        if (isColCollapsed) {
                          return (
                            <div 
                              key={`${row.id}-${col.key}`}
                              className="spreadsheet-cell h-full"
                              style={{ 
                                backgroundColor: rowIndex % 2 === 0 ? "rgba(0,0,0,0.01)" : "rgba(0,0,0,0.03)", 
                                width: COLLAPSED_COL_WIDTH,
                              }}
                            />
                          );
                        }

                        if (col.key === "createdDate") {
                          return (
                            <div
                              key={col.key}
                              className={cn(
                                "spreadsheet-cell px-2 text-xs truncate justify-center text-center cursor-default",
                                !isRowDisabled && section.cellColor
                              )}
                              style={{ width: (col.width || 75) + SORT_ICON_WIDTH, ...(isRowDisabled ? { backgroundColor: '#9ca3af' } : {}) }}
                              data-testid={`cell-createdDate-${row.id}`}
                            >
                              {row.createdAt ? new Date(row.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' }) : "-"}
                            </div>
                          );
                        }

                        if (col.key === "createdTime") {
                          return (
                            <div
                              key={col.key}
                              className={cn(
                                "spreadsheet-cell px-2 text-xs truncate justify-center text-center cursor-default",
                                !isRowDisabled && section.cellColor
                              )}
                              style={{ width: (col.width || 40) + SORT_ICON_WIDTH, ...(isRowDisabled ? { backgroundColor: '#9ca3af' } : {}) }}
                              data-testid={`cell-createdTime-${row.id}`}
                            >
                              {formatTime(row.createdAt)}
                            </div>
                          );
                        }

                        let val = mergedRow[col.key as keyof Typology];
                        let dynamicOpts: string[] | undefined;
                        if (col.key === "developer") dynamicOpts = developerOptions;
                        if (col.key === "development") dynamicOpts = developmentOptions;
                        if (col.key === "nivelMantenimiento") dynamicOpts = catalogNivelMantenimiento.filter((n: any) => n.active !== false).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)).map((n: any) => n.name);
                        if (col.key === "view") {
                          const devVistas = vistasByDevelopment[mergedRow.development || ""] || [];
                          dynamicOpts = devVistas.length > 0 ? devVistas : vistaOptions;
                        }
                        if (col.key === "developmentType") {
                          const devTypes = typesByDevelopment[mergedRow.development || ""] || [];
                          dynamicOpts = devTypes.length > 0 ? devTypes : tipologiaOptions;
                        }

                        const conditionalField = section.conditionalFields?.find(cf => cf.field === (col.key as TypologyField));
                        let isConditionallyDisabled = false;
                        if (conditionalField) {
                          const deps = Array.isArray(conditionalField.dependsOn) 
                            ? conditionalField.dependsOn 
                            : [conditionalField.dependsOn];
                          isConditionallyDisabled = deps.some(dep => {
                            const val = mergedRow[dep as keyof Typology];
                            return val === false || val === null || val === undefined;
                          });
                        }

                        const ALWAYS_UNLOCKED = new Set(["active", "createdDate", "createdTime", "city", "zone", "developer", "development", "tipoDesarrollo"]);
                        const hasDevelopment = !!(mergedRow.development);
                        const hasTipoDesarrollo = !!(mergedRow.tipoDesarrollo && (Array.isArray(mergedRow.tipoDesarrollo) ? mergedRow.tipoDesarrollo.length > 0 : true));
                        const hasType = !!(mergedRow.type);
                        let isLockedByFlow = false;
                        if (!ALWAYS_UNLOCKED.has(col.key) && !col.calculated) {
                          if (!hasDevelopment) {
                            isLockedByFlow = true;
                          } else if (!hasTipoDesarrollo && col.key !== "tipoDesarrollo") {
                            isLockedByFlow = true;
                          } else if (!hasType && col.key !== "type") {
                            isLockedByFlow = true;
                          }
                        }
                        
                        const rowGrayState = dynamicGray[row.id];
                        const isDynCalc = rowGrayState?.[col.key] === "calculated";

                        const cell = (
                          <EditableCell
                            key={`${row.id}-${col.key}`}
                            value={val}
                            column={col}
                            rowId={row.id}
                            city={mergedRow.city || undefined}
                            developer={mergedRow.developer || undefined}
                            onChange={(newVal) => handleCellChange(row.id, col.key, newVal)}
                            disabled={isConditionallyDisabled || isLockedByFlow}
                            dynamicOptions={dynamicOpts}
                            allDevelopments={dbDevelopments}
                            allDevelopers={dbDevelopers}
                            vistaOptions={vistaOptions}
                            vistasByDevelopment={vistasByDevelopment}
                            areaOptions={areaOptions}
                            incluyeOptions={incluyeOptions}
                            tipologiaOptions={tipologiaOptions}
                            typesByDevelopment={typesByDevelopment}
                            tipologiasConfigByDevelopment={tipologiasConfigByDevelopment}
                            recamaraOptions={recamaraOptions}
                            banoOptions={banoOptions}
                            cajonOptions={cajonOptions}
                            developerSelectOptions={developerOptions}
                            zoneOptionsByCity={zoneOptionsByCity}
                            isLastInSection={isLastInSection}
                            row={mergedRow as Typology}
                            sectionCellColor={section.cellColor}
                            isDynamicCalculated={isDynCalc}
                            filteredDevelopmentName={filteredDevelopmentName}
                            linkedSizeValue={col.linkedSizeField ? mergedRow[col.linkedSizeField as keyof Typology] : undefined}
                            onLinkedSizeChange={col.linkedSizeField ? (newVal) => handleCellChange(row.id, col.linkedSizeField!, newVal) : undefined}
                            isComplete={col.key === "active" ? isTypologyComplete(mergedRow as Partial<Typology>, validEntities) : undefined}
                            validEntities={col.key === "active" ? validEntities : undefined}
                            isRowDisabled={isRowDisabled}
                          />
                        );

                        return cell;
                      });
                    });
                  });
                })()}
                
                {collapsedColumns.has("medios") ? (
                  <div className="spreadsheet-cell flex-shrink-0" style={{ width: COLLAPSED_COL_WIDTH }} data-testid={`cell-media-collapsed-${row.id}`} />
                ) : (
                  <div 
                    className="spreadsheet-cell w-24 flex-shrink-0 justify-center gap-0.5"
                    data-testid={`cell-media-${row.id}`}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => {
                            mediaInputRefs.current.get(row.id)?.click();
                          }}
                          data-testid={`button-upload-media-${row.id}`}
                        >
                          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Subir fotos/videos</p>
                      </TooltipContent>
                    </Tooltip>
                    <input
                      ref={(el) => {
                        if (el) mediaInputRefs.current.set(row.id, el);
                        else mediaInputRefs.current.delete(row.id);
                      }}
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
                          {getTypologyDocCount(row.id) > 0 && (
                            <span className="text-xs font-medium mr-0.5">{getTypologyDocCount(row.id)}</span>
                          )}
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{getTypologyDocCount(row.id) > 0 ? `Ver/editar ${getTypologyDocCount(row.id)} medios` : "Ver medios"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
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
      
      {showZoomPopup && (
        <div className="fixed bottom-4 right-12 z-[100] bg-black/80 text-white px-2 py-1 rounded-md text-[10px] font-medium animate-in fade-in slide-in-from-right-1 duration-200 shadow-sm border border-white/10">
          {zoomLevel}%
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-center bg-background border rounded-md shadow-md p-0" data-testid="zoom-controls">
        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-b-none" onClick={zoomIn} disabled={zoomLevel >= 150} data-testid="zoom-in">
          <Plus className="h-3 w-3" />
        </Button>
        <div className="h-px w-3 bg-border" />
        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-t-none" onClick={zoomOut} disabled={zoomLevel <= 50} data-testid="zoom-out">
          <Minus className="h-3 w-3" />
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

      <AlertDialog open={!!avisoWarning} onOpenChange={(open) => {
        if (!open) {
          avisoResolveRef.current?.(false);
          avisoResolveRef.current = null;
          setAvisoWarning(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Aviso
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {avisoWarning?.messages.map((msg, i) => (
                  <p key={i} className="text-sm">{msg}</p>
                ))}
                <p className="text-sm font-medium mt-2">¿Deseas guardar de todos modos?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              avisoResolveRef.current?.(false);
              avisoResolveRef.current = null;
              setAvisoWarning(null);
            }} data-testid="aviso-cancel">
              No
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              avisoResolveRef.current?.(true);
              avisoResolveRef.current = null;
              setAvisoWarning(null);
            }} data-testid="aviso-confirm">
              Sí
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
