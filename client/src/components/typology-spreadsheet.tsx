import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  ChevronDown, ChevronRight, Plus, Trash2, Save, X, 
  Loader2, RefreshCw, AlertCircle, ArrowUpAZ, ArrowDownAZ,
  ArrowUp01, ArrowDown10, Filter, Check, CornerDownRight, ImagePlus, Images, Video, Eye, GripVertical
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
import { FormulaTooltip } from "@/components/ui/formula-tooltip";
import { TYPOLOGY_FORMULAS } from "@/lib/spreadsheet-utils";

type TypologyField = keyof Typology;

interface ColumnDef {
  key: TypologyField;
  label: string;
  type: "text" | "number" | "decimal" | "select" | "multiselect" | "boolean" | "date";
  options?: readonly string[];
  width?: number;
  calculated?: boolean;
  format?: "currency" | "percent" | "area";
}

interface SectionDef {
  id: string;
  label: string;
  color: string;
  columns: ColumnDef[];
  subheader?: string;
  conditionalFields?: { field: TypologyField; dependsOn: TypologyField | TypologyField[] }[];
}

const SECTIONS: SectionDef[] = [
  {
    id: "basico",
    label: "",
    color: "bg-gray-50 dark:bg-gray-900/20",
    columns: [
      { key: "active", label: "Activo", type: "boolean", width: 60 },
    ],
  },
  {
    id: "ubicacion",
    label: "",
    color: "bg-gray-100 dark:bg-gray-900/30",
    columns: [
      { key: "city", label: "Ciudad", type: "select", options: CITIES, width: 100 },
      { key: "zone", label: "Zona", type: "text", width: 120, calculated: true },
      { key: "developer", label: "Desarrollador", type: "text", width: 120, calculated: true },
      { key: "development", label: "Desarrollo", type: "select", options: DEVELOPMENTS, width: 130 },
    ],
  },
  {
    id: "generales",
    label: "GENERALES",
    color: "bg-blue-100 dark:bg-blue-900/30",
    columns: [
      { key: "type", label: "Tipología", type: "select", options: [], width: 100 },
      { key: "level", label: "Nivel", type: "number", width: 60 },
      { key: "view", label: "Vista", type: "select", options: [], width: 100 },
    ],
  },
  {
    id: "precio_tamano",
    label: "TAMAÑO",
    color: "bg-yellow-200 dark:bg-yellow-900/40",
    columns: [
      { key: "size", label: "Unidad", type: "decimal", width: 70, format: "area" },
      { key: "sizeFinal", label: "Total", type: "decimal", width: 70, format: "area" },
    ],
  },
  {
    id: "precio_valores",
    label: "PRECIO",
    color: "bg-green-50 dark:bg-green-900/20",
    columns: [
      { key: "price", label: "Precio", type: "decimal", width: 120, format: "currency" },
      { key: "hasDiscount", label: "Bono", type: "boolean", width: 60 },
      { key: "discountPercent", label: "%", type: "decimal", width: 60, format: "percent" },
      { key: "discountAmount", label: "Monto", type: "decimal", width: 100, format: "currency", calculated: true },
      { key: "finalPrice", label: "Precio Final", type: "decimal", width: 120, format: "currency", calculated: true },
      { key: "pricePerM2", label: "Precio/m²", type: "decimal", width: 100, format: "currency", calculated: true },
    ],
    conditionalFields: [
      { field: "discountPercent", dependsOn: "hasDiscount" },
      { field: "discountAmount", dependsOn: "hasDiscount" },
    ],
  },
  {
    id: "capital_promo",
    label: "",
    color: "bg-green-50 dark:bg-green-900/20",
    columns: [
      { key: "hasSeedCapital", label: "Cap. Semilla", type: "boolean", width: 70 },
      { key: "hasPromo", label: "Promo", type: "boolean", width: 60 },
    ],
  },
  {
    id: "distribucion",
    label: "DISTRIBUCIÓN",
    color: "bg-purple-100 dark:bg-purple-900/30",
    columns: [
      { key: "lockOff", label: "LockOff", type: "boolean", width: 60 },
      { key: "bedrooms", label: "Recamaras", type: "select", options: ["1", "1 + Flex", "2", "2 + Flex", "3", "3 + Flex", "4", "4 + Flex"] as const, width: 90 },
      { key: "bathrooms", label: "Baños", type: "select", options: ["1", "1.5", "2", "2.5", "3", "3.5"] as const, width: 70 },
      { key: "areas", label: "Áreas", type: "multiselect", options: [], width: 80 },
      { key: "hasBalcony", label: "Balcón", type: "boolean", width: 60 },
      { key: "balconySize", label: "Tam", type: "decimal", width: 55, format: "area" },
      { key: "hasTerrace", label: "Terraza", type: "boolean", width: 60 },
      { key: "terraceSize", label: "Tam", type: "decimal", width: 55, format: "area" },
      { key: "bedrooms2", label: "Recamaras", type: "select", options: ["1", "1 + Flex", "2", "2 + Flex", "3", "3 + Flex", "4", "4 + Flex"] as const, width: 90 },
      { key: "bathrooms2", label: "Baños", type: "select", options: ["1", "1.5", "2", "2.5", "3", "3.5"] as const, width: 70 },
      { key: "areas2", label: "Áreas", type: "multiselect", options: [], width: 80 },
      { key: "hasBalcony2", label: "Balcón", type: "boolean", width: 60 },
      { key: "balconySize2", label: "Tam", type: "decimal", width: 55, format: "area" },
      { key: "hasTerrace2", label: "Terraza", type: "boolean", width: 60 },
      { key: "terraceSize2", label: "Tam", type: "decimal", width: 55, format: "area" },
    ],
    conditionalFields: [
      { field: "balconySize", dependsOn: "hasBalcony" },
      { field: "terraceSize", dependsOn: "hasTerrace" },
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
    label: "CAJONES",
    color: "bg-amber-100 dark:bg-amber-900/30",
    columns: [
      { key: "parkingIncluded", label: "Incluidos", type: "select", options: ["No", "1", "2", "3", "Tandem"] as const, width: 80 },
      { key: "hasParkingOptional", label: "Opcional", type: "boolean", width: 60 },
      { key: "parkingOptionalPrice", label: "Precio", type: "decimal", width: 90, format: "currency" },
    ],
    conditionalFields: [
      { field: "parkingOptionalPrice", dependsOn: "hasParkingOptional" },
    ],
  },
  {
    id: "bodega",
    label: "BODEGA",
    color: "bg-amber-50 dark:bg-amber-900/20",
    columns: [
      { key: "hasStorage", label: "Incluida", type: "boolean", width: 60 },
      { key: "storageSize", label: "Tamaño", type: "decimal", width: 60, format: "area" },
      { key: "hasStorageOptional", label: "Opcional", type: "boolean", width: 60 },
      { key: "storageSize2", label: "Tamaño", type: "decimal", width: 60, format: "area" },
      { key: "storagePrice", label: "Precio", type: "decimal", width: 90, format: "currency" },
    ],
    conditionalFields: [
      { field: "storageSize", dependsOn: "hasStorage" },
      { field: "storageSize2", dependsOn: "hasStorageOptional" },
      { field: "storagePrice", dependsOn: "hasStorageOptional" },
    ],
  },
  {
    id: "pago",
    label: "ESQUEMA DE PAGO",
    color: "bg-yellow-100 dark:bg-yellow-900/30",
    columns: [
      { key: "initialPercent", label: "Inicial %", type: "decimal", width: 65, format: "percent" },
      { key: "initialAmount", label: "Monto", type: "decimal", width: 100, format: "currency", calculated: true },
      { key: "duringConstructionPercent", label: "En Plazo %", type: "decimal", width: 70, format: "percent" },
      { key: "duringConstructionAmount", label: "Monto", type: "decimal", width: 100, format: "currency", calculated: true },
      { key: "paymentMonths", label: "Meses", type: "number", width: 55 },
      { key: "monthlyPayment", label: "Mens.", type: "decimal", width: 100, format: "currency", calculated: true },
      { key: "totalEnganche", label: "Tot. Eng.", type: "decimal", width: 100, format: "currency", calculated: true },
      { key: "remainingPercent", label: "Resto %", type: "decimal", width: 65, format: "percent", calculated: true },
    ],
  },
  {
    id: "entrega",
    label: "",
    color: "bg-yellow-50 dark:bg-yellow-900/20",
    columns: [
      { key: "deliveryDate", label: "Entrega", type: "date", width: 100 },
    ],
  },
  {
    id: "gastos",
    label: "GASTOS POST-ENTREGA",
    color: "bg-red-100 dark:bg-red-900/30",
    columns: [
      { key: "isaPercent", label: "ISAI %", type: "decimal", width: 55, format: "percent" },
      { key: "isaAmount", label: "ISAI $", type: "decimal", width: 90, format: "currency", calculated: true },
      { key: "notaryPercent", label: "Notario %", type: "decimal", width: 60, format: "percent" },
      { key: "notaryAmount", label: "Notario $", type: "decimal", width: 90, format: "currency", calculated: true },
      { key: "equipmentCost", label: "Equipo", type: "decimal", width: 90, format: "currency" },
      { key: "furnitureCost", label: "Muebles", type: "decimal", width: 90, format: "currency" },
      { key: "totalPostDeliveryCosts", label: "Total", type: "decimal", width: 100, format: "currency", calculated: true },
    ],
  },
  {
    id: "pre_credito",
    label: "",
    subheader: "10.5% | 15",
    color: "bg-orange-50 dark:bg-orange-900/20",
    columns: [
      { key: "mortgageAmount", label: "Monto", type: "decimal", width: 110, format: "currency" },
      { key: "mortgageStartDate", label: "Inicia", type: "date", width: 90 },
      { key: "mortgageInterestPercent", label: "Tasa", type: "decimal", width: 60, format: "percent" },
      { key: "mortgageYears", label: "Años", type: "number", width: 50 },
    ],
  },
  {
    id: "credito",
    label: "CRÉDITO HIPOTECARIO",
    color: "bg-orange-100 dark:bg-orange-900/30",
    columns: [
      { key: "mortgageMonthlyPayment", label: "Mensualidad", type: "decimal", width: 110, format: "currency", calculated: true },
      { key: "mortgageEndDate", label: "Termina", type: "date", width: 90 },
      { key: "mortgageTotal", label: "Total", type: "decimal", width: 110, format: "currency", calculated: true },
    ],
  },
  {
    id: "mantenimiento",
    label: "MANTENIMIENTO",
    color: "bg-teal-100 dark:bg-teal-900/30",
    columns: [
      { key: "maintenanceM2", label: "m²", type: "decimal", width: 60, format: "area" },
      { key: "maintenanceInitial", label: "Inicial", type: "decimal", width: 90, format: "currency" },
      { key: "maintenanceStartDate", label: "Fecha", type: "date", width: 90 },
      { key: "maintenanceFinal", label: "Final", type: "decimal", width: 90, format: "currency" },
      { key: "maintenanceEndDate", label: "Fecha", type: "date", width: 90 },
      { key: "maintenanceTotal", label: "Total", type: "decimal", width: 100, format: "currency", calculated: true },
    ],
  },
  {
    id: "renta1",
    label: "RENTA",
    color: "bg-indigo-100 dark:bg-indigo-900/30",
    columns: [
      { key: "rentInitial", label: "Inicial", type: "decimal", width: 90, format: "currency" },
      { key: "rentStartDate", label: "Fecha", type: "date", width: 90 },
    ],
  },
  {
    id: "tasa_renta",
    label: "",
    subheader: "7.0%",
    color: "bg-indigo-50 dark:bg-indigo-900/20",
    columns: [
      { key: "rentRatePercent", label: "Tasa", type: "decimal", width: 60, format: "percent" },
    ],
  },
  {
    id: "renta2",
    label: "RENTA",
    color: "bg-indigo-100 dark:bg-indigo-900/30",
    columns: [
      { key: "rentFinal", label: "Final", type: "decimal", width: 90, format: "currency" },
      { key: "rentEndDate", label: "Fecha", type: "date", width: 90 },
    ],
  },
  {
    id: "meses",
    label: "",
    subheader: "11.0",
    color: "bg-indigo-50 dark:bg-indigo-900/20",
    columns: [
      { key: "rentMonths", label: "Meses", type: "number", width: 55 },
    ],
  },
  {
    id: "total_renta",
    label: "TOTAL",
    color: "bg-indigo-100 dark:bg-indigo-900/30",
    columns: [
      { key: "rentTotal", label: "Total", type: "decimal", width: 100, format: "currency", calculated: true },
    ],
  },
  {
    id: "inversion",
    label: "INVERSIÓN",
    color: "bg-pink-100 dark:bg-pink-900/30",
    columns: [
      { key: "investmentTotal", label: "Total", type: "decimal", width: 100, format: "currency", calculated: true },
      { key: "investmentNet", label: "Neta", type: "decimal", width: 100, format: "currency", calculated: true },
      { key: "investmentMonthly", label: "Mensual", type: "decimal", width: 90, format: "currency", calculated: true },
      { key: "investmentRate", label: "Tasa", type: "decimal", width: 60, format: "percent", calculated: true },
    ],
  },
  {
    id: "tasa_plusvalia",
    label: "",
    subheader: "7.0%",
    color: "bg-cyan-50 dark:bg-cyan-900/20",
    columns: [
      { key: "appreciationRate", label: "Tasa", type: "decimal", width: 60, format: "percent" },
    ],
  },
  {
    id: "plusvalia",
    label: "PLUSVALÍA",
    color: "bg-cyan-100 dark:bg-cyan-900/30",
    columns: [
      { key: "appreciationDays", label: "Días", type: "number", width: 55 },
      { key: "appreciationMonths", label: "Meses", type: "number", width: 55 },
      { key: "appreciationYears", label: "Años", type: "number", width: 55 },
      { key: "appreciationTotal", label: "Total", type: "decimal", width: 100, format: "currency", calculated: true },
      { key: "finalValue", label: "Monto Final", type: "decimal", width: 110, format: "currency", calculated: true },
    ],
  },
  ];

function calculateFields(row: Partial<Typology>): Partial<Typology> {
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
  const initialAmount = finalPrice * (initialPercent / 100);
  const duringConstructionAmount = finalPrice * (duringConstructionPercent / 100);
  const monthlyPayment = paymentMonths > 0 ? duringConstructionAmount / paymentMonths : 0;
  const totalEnganche = initialAmount + duringConstructionAmount;
  const remainingPercent = 100 - initialPercent - duringConstructionPercent;
  
  const isaPercent = parseFloat(row.isaPercent as string) || 3.0;
  const notaryPercent = parseFloat(row.notaryPercent as string) || 2.5;
  const equipmentCost = parseFloat(row.equipmentCost as string) || 0;
  const furnitureCost = parseFloat(row.furnitureCost as string) || 0;
  const isaAmount = finalPrice * (isaPercent / 100);
  const notaryAmount = finalPrice * (notaryPercent / 100);
  const totalPostDeliveryCosts = isaAmount + notaryAmount + equipmentCost + furnitureCost;
  
  const mortgageAmount = parseFloat(row.mortgageAmount as string) || 0;
  const mortgageYears = (row.mortgageYears as number) || 15;
  const mortgageInterestPercent = parseFloat(row.mortgageInterestPercent as string) || 10.5;
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
  
  const maintenanceM2 = parseFloat(row.maintenanceM2 as string) || 0;
  const maintenanceTotal = maintenanceM2 * size * 12;
  
  const rentInitial = parseFloat(row.rentInitial as string) || 0;
  const rentRatePercent = parseFloat(row.rentRatePercent as string) || 7.0;
  const rentMonths = (row.rentMonths as number) || 11;
  const rentTotal = rentInitial * rentMonths;
  
  const investmentTotal = finalPrice + totalPostDeliveryCosts;
  const investmentNet = rentTotal - maintenanceTotal;
  const investmentMonthly = rentMonths > 0 ? investmentNet / rentMonths : 0;
  const investmentRate = investmentTotal > 0 ? (investmentNet / investmentTotal) * 100 : 0;
  
  const appreciationRate = parseFloat(row.appreciationRate as string) || 7.0;
  const appreciationYears = (row.appreciationYears as number) || 0;
  const appreciationTotal = finalPrice * Math.pow(1 + appreciationRate / 100, appreciationYears) - finalPrice;
  const finalValue = finalPrice + appreciationTotal;
  
  return {
    // discountAmount is calculated bidirectionally in handleCellChange, not here
    finalPrice: finalPrice.toFixed(2),
    pricePerM2: pricePerM2.toFixed(2),
    initialAmount: initialAmount.toFixed(2),
    duringConstructionAmount: duringConstructionAmount.toFixed(2),
    monthlyPayment: monthlyPayment.toFixed(2),
    totalEnganche: totalEnganche.toFixed(2),
    remainingPercent: remainingPercent.toFixed(2),
    isaAmount: isaAmount.toFixed(2),
    notaryAmount: notaryAmount.toFixed(2),
    totalPostDeliveryCosts: totalPostDeliveryCosts.toFixed(2),
    mortgageMonthlyPayment: mortgageMonthlyPayment.toFixed(2),
    mortgageTotal: mortgageTotal.toFixed(2),
    maintenanceTotal: maintenanceTotal.toFixed(2),
    rentTotal: rentTotal.toFixed(2),
    investmentTotal: investmentTotal.toFixed(2),
    investmentNet: investmentNet.toFixed(2),
    investmentMonthly: investmentMonthly.toFixed(2),
    investmentRate: investmentRate.toFixed(2),
    appreciationTotal: appreciationTotal.toFixed(2),
    finalValue: finalValue.toFixed(2),
  } as Partial<Typology>;
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
      return `${num.toFixed(1)} m²`;
    default:
      return num.toString();
  }
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

interface ColumnFilterProps {
  column: ColumnDef;
  data: Typology[];
  selectedValues: Set<string>;
  sortDirection: "asc" | "desc" | null;
  onFilterChange: (values: Set<string>) => void;
  onSortChange: (direction: "asc" | "desc" | null) => void;
  sectionColor: string;
  availableValues?: Set<string>;
}

function ColumnFilter({ column, data, selectedValues, sortDirection, onFilterChange, onSortChange, sectionColor, availableValues }: ColumnFilterProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  
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
    setOpen(false);
  };
  
  const isFiltered = selectedValues.size > 0 && selectedValues.size < uniqueValues.length;
  const isSorted = sortDirection !== null;
  const isNumeric = column.type === "number" || column.type === "decimal";
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-between gap-1 w-full h-full px-2 py-1 text-xs font-medium text-left",
            sectionColor,
            "hover-elevate cursor-pointer",
            (isFiltered || isSorted) && "bg-primary/20"
          )}
          data-testid={`filter-trigger-${column.key}`}
        >
          <span className="truncate">
            {column.label}
            {column.calculated && <span className="text-muted-foreground ml-0.5">*</span>}
          </span>
          <ChevronDown className={cn(
            "w-3 h-3 flex-shrink-0",
            (isFiltered || isSorted) && "text-primary"
          )} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="flex flex-col">
          <div className="px-3 py-2 border-b bg-muted/50">
            <span className="text-sm font-semibold">{column.label}</span>
            {column.calculated && <span className="text-xs text-muted-foreground ml-1">(calculado)</span>}
          </div>
          <button
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
            onClick={() => { onSortChange("asc"); setOpen(false); }}
            data-testid={`sort-asc-${column.key}`}
          >
            {isNumeric ? <ArrowUp01 className="w-4 h-4" /> : <ArrowUpAZ className="w-4 h-4" />}
            {isNumeric ? "Ordenar de menor a mayor" : "Ordenar de A a Z"}
            {sortDirection === "asc" && <Check className="w-4 h-4 ml-auto text-primary" />}
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
            onClick={() => { onSortChange("desc"); setOpen(false); }}
            data-testid={`sort-desc-${column.key}`}
          >
            {isNumeric ? <ArrowDown10 className="w-4 h-4" /> : <ArrowDownAZ className="w-4 h-4" />}
            {isNumeric ? "Ordenar de mayor a menor" : "Ordenar de Z a A"}
            {sortDirection === "desc" && <Check className="w-4 h-4 ml-auto text-primary" />}
          </button>
          
          <div className="border-t" />
          
          {(isFiltered || isSorted) && (
            <>
              <button
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left text-muted-foreground"
                onClick={handleClearFilter}
                data-testid={`clear-filter-${column.key}`}
              >
                <X className="w-4 h-4" />
                Borrar filtro de "{column.label}"
              </button>
              <div className="border-t" />
            </>
          )}
          
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
            <label className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-muted px-1 rounded">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                data-testid={`select-all-${column.key}`}
              />
              <span className="text-sm font-medium">(Seleccionar todo)</span>
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
                    "text-sm truncate",
                    !isAvailable && "text-muted-foreground line-through"
                  )}>
                    {displayValue}
                  </span>
                </label>
              );
            })}
            
            {filteredValues.length === 0 && (
              <p className="text-sm text-muted-foreground py-2 text-center">
                Sin resultados
              </p>
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
        </div>
      </PopoverContent>
    </Popover>
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
  areaOptions?: string[];
  tipologiaOptions?: string[];
  isLastInSection?: boolean;
}

function EditableCell({ value, column, rowId, city, developer, onChange, disabled, dynamicOptions, allDevelopments, allDevelopers, vistaOptions, areaOptions, tipologiaOptions, isLastInSection }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  
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
  
  // Get formula info if this is a calculated field
  const formulaInfo = column.calculated ? TYPOLOGY_FORMULAS.find(f => f.field === column.key) : null;
  
  if (column.calculated || disabled) {
    const content = (
      <div 
        className={cn(
          "spreadsheet-cell px-2 text-sm truncate",
          column.calculated && "bg-blue-50 dark:bg-blue-950/30 text-muted-foreground",
          disabled && !column.calculated && "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
        )}
        style={{ width: column.width }}
        title={disabled && !column.calculated ? "Campo deshabilitado - active la opción correspondiente" : undefined}
        data-testid={`cell-${column.key}-disabled`}
      >
        {formatValue(value, column.format) || ""}
      </div>
    );
    
    // Wrap calculated fields with formula tooltip
    if (column.calculated && formulaInfo) {
      return (
        <FormulaTooltip field={column.key as string}>
          {content}
        </FormulaTooltip>
      );
    }
    
    return content;
  }
  
  if (column.type === "boolean") {
    return (
      <div 
        className="spreadsheet-cell justify-center px-2 bg-gray-50 dark:bg-gray-800/50" 
        style={{ width: column.width }}
      >
        <Select
          value={value === true ? "si" : value === false ? "no" : ""}
          onValueChange={(val) => onChange(val === "si")}
        >
          <SelectTrigger className="h-6 text-xs border-0 bg-transparent px-1" data-testid={`boolean-${column.key}-${rowId}`}>
            <SelectValue>
              {value === true ? (
                <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs px-1.5 py-0">Sí</Badge>
              ) : value === false ? (
                <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs px-1.5 py-0">No</Badge>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="si">
              <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs">Sí</Badge>
            </SelectItem>
            <SelectItem value="no">
              <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs">No</Badge>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }
  
  // Multi-select with checkboxes (for areas)
  if (column.type === "multiselect") {
    // Use areaOptions if available, fallback to column.options
    const baseOptions: string[] = areaOptions && areaOptions.length > 0 
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
      ? currentValues.length === 1 
        ? currentValues[0] 
        : `${currentValues.length} sel.`
      : "-";
    
    return (
      <div 
        className="spreadsheet-cell px-1 bg-gray-50 dark:bg-gray-800/50" 
        style={{ width: column.width }}
      >
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
                  className="flex items-center gap-2 px-2 py-1 text-sm rounded hover:bg-accent cursor-pointer"
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
      </div>
    );
  }
  
  if (column.type === "select") {
    let options: readonly string[] = dynamicOptions || column.options || [];
    if (column.key === "zone" && city) {
      options = city === "Monterrey" ? ZONES_MONTERREY : city === "CDMX" ? ZONES_CDMX : [];
    }
    
    if (column.key === "development" && city && allDevelopments) {
      const filteredDevs = allDevelopments
        .filter(d => d.city === city)
        .map(d => d.name)
        .filter(Boolean);
      if (filteredDevs.length > 0) {
        options = filteredDevs;
      }
    }
    
    // Use catalog options for specific columns
    if (column.key === "view" && vistaOptions && vistaOptions.length > 0) {
      options = vistaOptions;
    }
    
    if (column.key === "type" && tipologiaOptions && tipologiaOptions.length > 0) {
      options = tipologiaOptions;
    }
    
    // Ensure current value is always in options to prevent disappearing values
    const currentValue = value?.toString() || "";
    let finalOptions = [...options];
    if (currentValue && !finalOptions.includes(currentValue)) {
      finalOptions = [currentValue, ...finalOptions];
    }
    
    return (
      <div 
        className="spreadsheet-cell px-1 bg-gray-50 dark:bg-gray-800/50" 
        style={{ width: column.width }}
      >
        <Select 
          value={currentValue} 
          onValueChange={onChange}
        >
          <SelectTrigger 
            className="h-6 w-full text-xs border-0 focus:ring-0 shadow-none bg-transparent justify-start text-left"
            data-testid={`select-${column.key}-${rowId}`}
          >
            <SelectValue placeholder="-" className="text-left" />
          </SelectTrigger>
          <SelectContent>
            {finalOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  
  if (isEditing) {
    return (
      <div 
        className="spreadsheet-cell px-1 bg-white dark:bg-gray-900 ring-1 ring-primary" 
        style={{ width: column.width }}
      >
        <Input
          ref={inputRef}
          type={column.type === "number" || column.type === "decimal" ? "number" : "text"}
          step={column.type === "decimal" ? "0.01" : "1"}
          value={localValue ?? ""}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="h-6 w-full text-xs border-0 focus:ring-0 shadow-none p-1 bg-transparent"
          data-testid={`input-${column.key}-${rowId}`}
        />
      </div>
    );
  }
  
  return (
    <div
      className="spreadsheet-cell px-2 text-sm truncate cursor-pointer bg-white dark:bg-gray-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/30"
      style={{ width: column.width }}
      onClick={() => setIsEditing(true)}
      title={formatValue(value, column.format)}
      data-testid={`cell-${column.key}-${rowId}`}
    >
      {formatValue(value, column.format) || ""}
    </div>
  );
}

type ColumnFilters = Record<string, Set<string>>;
type ColumnSorts = Record<string, "asc" | "desc" | null>;

export function TypologySpreadsheet() {
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(SECTIONS.map(s => s.id))
  );
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});
  const [columnSorts, setColumnSorts] = useState<ColumnSorts>({});
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<Typology>>>(new Map());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [selectedTypologyForMedia, setSelectedTypologyForMedia] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  
  const syncScrollFromTop = useCallback(() => {
    if (topScrollRef.current && contentScrollRef.current) {
      contentScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  }, []);
  
  const syncScrollFromContent = useCallback(() => {
    if (topScrollRef.current && contentScrollRef.current) {
      topScrollRef.current.scrollLeft = contentScrollRef.current.scrollLeft;
    }
  }, []);
  
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
  
  const vistaOptions = useMemo(() => {
    return catalogVistas.map(v => v.name).filter(Boolean);
  }, [catalogVistas]);
  
  const areaOptions = useMemo(() => {
    return catalogAreas.map(a => a.name).filter(Boolean);
  }, [catalogAreas]);
  
  const tipologiaOptions = useMemo(() => {
    return catalogTipologias.map(t => t.name).filter(Boolean);
  }, [catalogTipologias]);
  
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
      return res.json();
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
    const updateWidth = () => {
      if (contentScrollRef.current) {
        const width = contentScrollRef.current.scrollWidth;
        if (width > 0) {
          setContentWidth(width);
        }
      }
    };
    
    const timer = setTimeout(updateWidth, 100);
    updateWidth();
    
    const observer = new ResizeObserver(updateWidth);
    if (contentScrollRef.current) {
      observer.observe(contentScrollRef.current);
    }
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [expandedSections, typologies]);
  
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
    
    const updatedRow = { ...currentRow, [field]: value };
    
    // Auto-populate zone and developer when development changes
    const autoPopulatedFields: Record<string, any> = {};
    if (field === "development" && dbDevelopments) {
      const selectedDev = dbDevelopments.find(d => d.name === value);
      if (selectedDev) {
        autoPopulatedFields.zone = selectedDev.zone || "";
        // Find developer name from developerId
        const developerRecord = dbDevelopers.find((dev: any) => dev.id === selectedDev.developerId);
        autoPopulatedFields.developer = developerRecord?.name || "";
        (updatedRow as any).zone = autoPopulatedFields.zone;
        (updatedRow as any).developer = autoPopulatedFields.developer;
      }
    }
    
    // Clear development, zone, and developer when city changes
    if (field === "city") {
      autoPopulatedFields.development = null;
      autoPopulatedFields.zone = "";
      autoPopulatedFields.developer = "";
      (updatedRow as any).development = null;
      (updatedRow as any).zone = "";
      (updatedRow as any).developer = "";
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
    
    if (dependentFieldsToClear[field] && value === false) {
      dependentFieldsToClear[field].forEach(depField => {
        (updatedRow as any)[depField] = null;
      });
    }
    
    // Bidirectional calculation for discount: if user edits %, calculate Monto and vice versa
    const price = parseFloat(updatedRow.price as string) || 0;
    if (field === "discountPercent" && price > 0) {
      const percent = parseFloat(value as string) || 0;
      (updatedRow as any).discountAmount = (price * percent / 100).toFixed(2);
    } else if (field === "discountAmount" && price > 0) {
      const amount = parseFloat(value as string) || 0;
      (updatedRow as any).discountPercent = ((amount / price) * 100).toFixed(2);
    }
    
    const calculatedFields = calculateFields(updatedRow);
    const fullUpdate = { ...updatedRow, ...calculatedFields };
    
    const clearedFields: Record<string, null> = {};
    if (dependentFieldsToClear[field] && value === false) {
      dependentFieldsToClear[field].forEach(depField => {
        clearedFields[depField] = null;
      });
    }
    
    // Include bidirectional discount fields if they were calculated
    const bidirectionalFields: Record<string, any> = {};
    if (field === "discountPercent" && price > 0) {
      bidirectionalFields.discountAmount = (updatedRow as any).discountAmount;
    } else if (field === "discountAmount" && price > 0) {
      bidirectionalFields.discountPercent = (updatedRow as any).discountPercent;
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
  }, [typologies, updateMutation, dbDevelopments, dbDevelopers]);
  
  const handleAddRow = () => {
    createMutation.mutate({
      city: "Monterrey",
      zone: "Centro",
      developer: developerOptions[0] || "",
      development: developmentOptions[0] || "",
    });
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
  
  const filteredAndSortedTypologies = useMemo(() => {
    let result = typologies.filter(t => {
      return Object.entries(columnFilters).every(([key, values]) => {
        if (values.size === 0) return true;
        const fieldValue = String(t[key as keyof Typology] ?? "");
        return values.has(fieldValue);
      });
    });
    
    const sortEntries = Object.entries(columnSorts).filter(([_, dir]) => dir !== null);
    if (sortEntries.length > 0) {
      const [sortKey, sortDir] = sortEntries[0];
      const column = SECTIONS.flatMap(s => s.columns).find(c => c.key === sortKey);
      const isNumeric = column?.type === "number" || column?.type === "decimal";
      
      result = [...result].sort((a, b) => {
        const aVal = a[sortKey as keyof Typology];
        const bVal = b[sortKey as keyof Typology];
        
        if (isNumeric) {
          const aNum = parseFloat(String(aVal)) || 0;
          const bNum = parseFloat(String(bVal)) || 0;
          return sortDir === "asc" ? aNum - bNum : bNum - aNum;
        }
        
        const aStr = String(aVal ?? "");
        const bStr = String(bVal ?? "");
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
  }, [typologies, columnFilters, columnSorts]);

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
    
    // Auto-populate zone and developer from selected development
    // Use same logic as handleCellChange: zone from development.zone, developer from developerId lookup
    let autoZone = merged.zone;
    let autoDeveloper = merged.developer;
    if (merged.development && dbDevelopments.length > 0) {
      const dev = dbDevelopments.find(d => d.name === merged.development);
      if (dev) {
        autoZone = dev.zone || merged.zone;
        // Find developer name from developerId
        const developerRecord = dbDevelopers.find((d: any) => d.id === dev.developerId);
        autoDeveloper = developerRecord?.name || merged.developer;
      }
    }
    
    const calculated = calculateFields(merged);
    return { ...merged, ...calculated, zone: autoZone, developer: autoDeveloper } as Typology;
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
      <div className="flex items-center justify-between gap-4 p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleAddRow} 
            size="sm"
            disabled={createMutation.isPending}
            data-testid="button-add-typology"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nueva Fila
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          {(activeFilterCount > 0 || activeSortKey) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setColumnFilters({});
                setColumnSorts({});
              }}
              data-testid="button-clear-all-filters"
            >
              <X className="w-4 h-4 mr-1" />
              Limpiar filtros
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Badge variant="secondary">
              <Filter className="w-3 h-3 mr-1" />
              {activeFilterCount} filtro{activeFilterCount > 1 ? "s" : ""}
            </Badge>
          )}
          <Badge variant="outline">
            {filteredAndSortedTypologies.length} tipologías
          </Badge>
          {pendingChanges.size > 0 && (
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Guardando...
            </Badge>
          )}
        </div>
      </div>
      
      <div 
        ref={topScrollRef}
        onScroll={syncScrollFromTop}
        className="overflow-x-scroll overflow-y-hidden border-b bg-muted/20 scrollbar-thin"
        style={{ height: "16px", minHeight: "16px" }}
      >
        <div style={{ width: contentWidth || 2000, height: "1px" }} />
      </div>
      
      <div 
        ref={contentScrollRef}
        onScroll={syncScrollFromContent}
        className="flex-1 overflow-auto"
      >
        <div className="min-w-max">
          {/* Header: Two-row structure for consistent alignment */}
          <div className="sticky top-0 z-20 bg-background">
            {/* Row 1: Section toggle triggers */}
            <div className="flex border-b spreadsheet-header-row1">
              <div className="w-12 flex-shrink-0 border-r bg-muted/50" />
              {SECTIONS.map((section) => {
                const sectionWidth = section.columns.reduce((sum, col) => {
                  const w = typeof col.width === 'number' ? col.width : parseInt(String(col.width || 100));
                  return sum + w;
                }, 0);
                const isExpanded = expandedSections.has(section.id);
                const collapsedWidth = 40;
                return (
                  <div 
                    key={section.id} 
                    className="border-r flex-shrink-0"
                    style={{ width: isExpanded ? sectionWidth : collapsedWidth }}
                  >
                    <button
                      onClick={() => toggleSection(section.id)}
                      className={cn(
                        "w-full h-full flex items-center justify-center gap-1 px-2 text-sm font-medium",
                        section.color,
                        "hover-elevate cursor-pointer"
                      )}
                      data-testid={`section-toggle-${section.id}`}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      {isExpanded && section.label}
                    </button>
                  </div>
                );
              })}
              <div className="w-24 flex-shrink-0 bg-muted/50" />
            </div>
            
            {/* Row 2: Column headers - flat structure for perfect alignment */}
            <div className="flex border-b spreadsheet-header-row2">
              <div className="w-12 h-full flex-shrink-0 border-r bg-muted/50 flex items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground">#</span>
              </div>
              {SECTIONS.flatMap((section) => {
                const collapsedWidth = 40;
                const isExpanded = expandedSections.has(section.id);
                if (!isExpanded) {
                  return [(
                    <div 
                      key={`collapsed-${section.id}`}
                      className={cn("border-r flex-shrink-0 flex items-center justify-center text-xs text-muted-foreground h-full", section.color)}
                      style={{ width: collapsedWidth }}
                    />
                  )];
                }
                return section.columns.map((col, colIndex) => (
                  <div
                    key={col.key}
                    className={cn(
                      "flex-shrink-0 h-full",
                      colIndex === section.columns.length - 1 ? "border-r" : "border-r"
                    )}
                    style={{ width: col.width }}
                  >
                    <ColumnFilter
                      column={col}
                      data={typologies}
                      selectedValues={columnFilters[col.key] || new Set()}
                      sortDirection={columnSorts[col.key] || null}
                      onFilterChange={(values) => handleColumnFilterChange(col.key, values)}
                      onSortChange={(dir) => handleColumnSortChange(col.key, dir)}
                      sectionColor={section.color}
                      availableValues={availableValuesMap[col.key]}
                    />
                  </div>
                ));
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
          </div>
          
          {filteredAndSortedTypologies.map((row, rowIndex) => {
            const mergedRow = getMergedRow(row);
            
            return (
              <div
                key={row.id}
                className={cn(
                  "flex border-b hover:bg-muted/30",
                  rowIndex % 2 === 0 ? "bg-background" : "bg-muted/10"
                )}
                data-testid={`row-typology-${row.id}`}
              >
                <div 
                  className="spreadsheet-cell w-12 flex-shrink-0 justify-center text-sm text-muted-foreground bg-muted/30"
                  data-testid={`cell-index-${row.id}`}
                >
                  {rowIndex + 1}
                </div>
                
                {/* Flat cell structure for perfect row alignment */}
                {SECTIONS.flatMap((section) => {
                  const collapsedWidth = 40;
                  const isExpanded = expandedSections.has(section.id);
                  if (!isExpanded) {
                    return [(
                      <div 
                        key={`collapsed-${section.id}`}
                        className="spreadsheet-cell bg-muted/20 border-r"
                        style={{ width: collapsedWidth }}
                      />
                    )];
                  }
                  return section.columns.map((col, colIndex) => {
                    let dynamicOpts: string[] | undefined;
                    if (col.key === "developer") dynamicOpts = developerOptions;
                    if (col.key === "development") dynamicOpts = developmentOptions;
                    
                    const conditionalField = section.conditionalFields?.find(cf => cf.field === col.key);
                    let isConditionallyDisabled = false;
                    if (conditionalField) {
                      const deps = Array.isArray(conditionalField.dependsOn) 
                        ? conditionalField.dependsOn 
                        : [conditionalField.dependsOn];
                      isConditionallyDisabled = deps.some(dep => !mergedRow[dep]);
                    }
                    
                    return (
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
                        areaOptions={areaOptions}
                        tipologiaOptions={tipologiaOptions}
                        isLastInSection={colIndex === section.columns.length - 1}
                      />
                    );
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
