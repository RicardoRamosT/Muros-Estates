import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, ChevronRight, Plus, Trash2, Filter, Save, X, 
  Loader2, RefreshCw, AlertCircle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Typology } from "@shared/schema";
import { CITIES, ZONES_MONTERREY, ZONES_CDMX, DEVELOPERS, DEVELOPMENTS } from "@shared/constants";
import { cn } from "@/lib/utils";

type TypologyField = keyof Typology;

interface ColumnDef {
  key: TypologyField;
  label: string;
  type: "text" | "number" | "decimal" | "select" | "boolean" | "date";
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
}

const SECTIONS: SectionDef[] = [
  {
    id: "generales",
    label: "Generales",
    color: "bg-blue-100 dark:bg-blue-900/30",
    columns: [
      { key: "city", label: "Ciudad", type: "select", options: CITIES, width: 100 },
      { key: "zone", label: "Zona", type: "select", options: [], width: 120 },
      { key: "developer", label: "Desarrollador", type: "select", options: DEVELOPERS, width: 120 },
      { key: "development", label: "Desarrollo", type: "select", options: DEVELOPMENTS, width: 130 },
      { key: "type", label: "Tipo", type: "text", width: 60 },
      { key: "level", label: "Nivel", type: "number", width: 60 },
      { key: "view", label: "Vista", type: "select", options: ["Norte", "Sur", "Este", "Oeste", "N/A"] as const, width: 80 },
    ],
  },
  {
    id: "precio",
    label: "Precio",
    color: "bg-green-100 dark:bg-green-900/30",
    columns: [
      { key: "size", label: "M²", type: "decimal", width: 70, format: "area" },
      { key: "price", label: "Precio", type: "decimal", width: 120, format: "currency" },
      { key: "discountPercent", label: "Desc%", type: "decimal", width: 60, format: "percent" },
      { key: "discountAmount", label: "Monto Desc", type: "decimal", width: 100, format: "currency" },
      { key: "finalPrice", label: "Precio Final", type: "decimal", width: 120, format: "currency", calculated: true },
      { key: "pricePerM2", label: "$/M²", type: "decimal", width: 100, format: "currency", calculated: true },
    ],
  },
  {
    id: "distribucion",
    label: "Distribución",
    color: "bg-purple-100 dark:bg-purple-900/30",
    columns: [
      { key: "bedrooms", label: "Rec", type: "number", width: 50 },
      { key: "flex", label: "Flex", type: "number", width: 50 },
      { key: "bathrooms", label: "Baños", type: "decimal", width: 60 },
      { key: "livingRoom", label: "Sala", type: "boolean", width: 50 },
      { key: "diningRoom", label: "Comedor", type: "boolean", width: 60 },
      { key: "kitchen", label: "Cocina", type: "boolean", width: 60 },
      { key: "balcony", label: "Balcón", type: "decimal", width: 60, format: "area" },
      { key: "terrace", label: "Terraza", type: "decimal", width: 70, format: "area" },
      { key: "laundry", label: "Lavand", type: "boolean", width: 60 },
      { key: "serviceRoom", label: "Servicio", type: "boolean", width: 60 },
      { key: "parkingSpots", label: "Cajones", type: "number", width: 60 },
      { key: "storage", label: "Bodega", type: "boolean", width: 60 },
    ],
  },
  {
    id: "pago",
    label: "Esquema de Pago",
    color: "bg-yellow-100 dark:bg-yellow-900/30",
    columns: [
      { key: "initialPercent", label: "Inicial%", type: "decimal", width: 70, format: "percent" },
      { key: "initialAmount", label: "Monto Inicial", type: "decimal", width: 110, format: "currency" },
      { key: "duringConstructionPercent", label: "Plazo%", type: "decimal", width: 70, format: "percent" },
      { key: "duringConstructionAmount", label: "Monto Plazo", type: "decimal", width: 110, format: "currency" },
      { key: "paymentMonths", label: "Meses", type: "number", width: 60 },
      { key: "monthlyPayment", label: "Mensualidad", type: "decimal", width: 110, format: "currency" },
      { key: "downPaymentPercent", label: "Enganche%", type: "decimal", width: 80, format: "percent" },
      { key: "remainingAmount", label: "Resto", type: "decimal", width: 110, format: "currency" },
      { key: "deliveryDate", label: "Entrega", type: "date", width: 100 },
    ],
  },
  {
    id: "gastos",
    label: "Gastos Post-Entrega",
    color: "bg-red-100 dark:bg-red-900/30",
    columns: [
      { key: "isaPercent", label: "ISA%", type: "decimal", width: 60, format: "percent" },
      { key: "notaryFees", label: "Notaría", type: "decimal", width: 100, format: "currency" },
      { key: "equipmentCost", label: "Equipo", type: "decimal", width: 100, format: "currency" },
      { key: "furnitureCost", label: "Muebles", type: "decimal", width: 100, format: "currency" },
      { key: "totalPostDeliveryCosts", label: "Total", type: "decimal", width: 110, format: "currency", calculated: true },
    ],
  },
  {
    id: "credito",
    label: "Crédito Hipotecario",
    color: "bg-orange-100 dark:bg-orange-900/30",
    columns: [
      { key: "mortgageAmount", label: "Monto", type: "decimal", width: 120, format: "currency" },
      { key: "mortgageStartDate", label: "Inicia", type: "date", width: 100 },
      { key: "mortgageYears", label: "Años", type: "number", width: 60 },
      { key: "mortgageInterestPercent", label: "Tasa%", type: "decimal", width: 60, format: "percent" },
      { key: "mortgageMonthlyPayment", label: "Mensualidad", type: "decimal", width: 110, format: "currency" },
      { key: "mortgageEndDate", label: "Termina", type: "date", width: 100 },
      { key: "mortgageTotal", label: "Total", type: "decimal", width: 120, format: "currency", calculated: true },
    ],
  },
  {
    id: "mantenimiento",
    label: "Mantenimiento",
    color: "bg-teal-100 dark:bg-teal-900/30",
    columns: [
      { key: "maintenanceM2", label: "$/M²", type: "decimal", width: 70, format: "currency" },
      { key: "maintenanceInitial", label: "Inicial", type: "decimal", width: 100, format: "currency" },
      { key: "maintenanceDate", label: "Fecha", type: "date", width: 100 },
      { key: "maintenanceTotal", label: "Total", type: "decimal", width: 110, format: "currency", calculated: true },
    ],
  },
  {
    id: "renta",
    label: "Renta",
    color: "bg-indigo-100 dark:bg-indigo-900/30",
    columns: [
      { key: "rentInitial", label: "Inicial", type: "decimal", width: 100, format: "currency" },
      { key: "rentStartDate", label: "Inicio", type: "date", width: 100 },
      { key: "rentRatePercent", label: "Tasa%", type: "decimal", width: 60, format: "percent" },
      { key: "rentFinal", label: "Final", type: "decimal", width: 100, format: "currency" },
      { key: "rentEndDate", label: "Fin", type: "date", width: 100 },
      { key: "rentMonths", label: "Meses", type: "number", width: 60 },
      { key: "rentTotal", label: "Total", type: "decimal", width: 110, format: "currency", calculated: true },
    ],
  },
  {
    id: "inversion",
    label: "Inversión",
    color: "bg-pink-100 dark:bg-pink-900/30",
    columns: [
      { key: "investmentTotal", label: "Total", type: "decimal", width: 120, format: "currency", calculated: true },
      { key: "investmentNet", label: "Neta", type: "decimal", width: 110, format: "currency", calculated: true },
      { key: "investmentMonthly", label: "Mensual", type: "decimal", width: 100, format: "currency", calculated: true },
      { key: "investmentRate", label: "Tasa%", type: "decimal", width: 60, format: "percent", calculated: true },
    ],
  },
  {
    id: "plusvalia",
    label: "Plusvalía",
    color: "bg-cyan-100 dark:bg-cyan-900/30",
    columns: [
      { key: "appreciationRate", label: "Tasa%", type: "decimal", width: 60, format: "percent" },
      { key: "appreciationDays", label: "Días", type: "number", width: 60 },
      { key: "appreciationYears", label: "Años", type: "number", width: 60 },
      { key: "appreciationMonths", label: "Meses", type: "number", width: 60 },
      { key: "appreciationTotalYears", label: "Años Tot", type: "decimal", width: 70 },
      { key: "appreciationTotal", label: "Total", type: "decimal", width: 110, format: "currency", calculated: true },
      { key: "finalValue", label: "Valor Final", type: "decimal", width: 120, format: "currency", calculated: true },
    ],
  },
  {
    id: "promo",
    label: "Cap/Promo",
    color: "bg-amber-100 dark:bg-amber-900/30",
    columns: [
      { key: "hasSeedCapital", label: "Capital Semilla", type: "boolean", width: 100 },
      { key: "hasPromo", label: "Promo", type: "boolean", width: 60 },
    ],
  },
];

function calculateFields(row: Partial<Typology>): Partial<Typology> {
  const price = parseFloat(row.price as string) || 0;
  const size = parseFloat(row.size as string) || 0;
  const discountPercent = parseFloat(row.discountPercent as string) || 0;
  const discountAmount = price * (discountPercent / 100);
  const finalPrice = price - discountAmount;
  const pricePerM2 = size > 0 ? finalPrice / size : 0;
  
  const isaPercent = parseFloat(row.isaPercent as string) || 0;
  const notaryFees = parseFloat(row.notaryFees as string) || 0;
  const equipmentCost = parseFloat(row.equipmentCost as string) || 0;
  const furnitureCost = parseFloat(row.furnitureCost as string) || 0;
  const isaAmount = finalPrice * (isaPercent / 100);
  const totalPostDeliveryCosts = isaAmount + notaryFees + equipmentCost + furnitureCost;
  
  const mortgageAmount = parseFloat(row.mortgageAmount as string) || 0;
  const mortgageYears = (row.mortgageYears as number) || 0;
  const mortgageInterestPercent = parseFloat(row.mortgageInterestPercent as string) || 0;
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
  const rentMonths = (row.rentMonths as number) || 0;
  const rentTotal = rentInitial * rentMonths;
  
  const investmentTotal = finalPrice + totalPostDeliveryCosts;
  const investmentNet = rentTotal - (maintenanceTotal);
  const investmentMonthly = rentMonths > 0 ? investmentNet / rentMonths : 0;
  const investmentRate = investmentTotal > 0 ? (investmentNet / investmentTotal) * 100 : 0;
  
  const appreciationRate = parseFloat(row.appreciationRate as string) || 0;
  const appreciationYears = (row.appreciationYears as number) || 0;
  const appreciationTotal = finalPrice * Math.pow(1 + appreciationRate / 100, appreciationYears) - finalPrice;
  const finalValue = finalPrice + appreciationTotal;
  
  return {
    discountAmount: discountAmount.toFixed(2),
    finalPrice: finalPrice.toFixed(2),
    pricePerM2: pricePerM2.toFixed(2),
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

interface EditableCellProps {
  value: any;
  column: ColumnDef;
  rowId: string;
  city?: string;
  onChange: (value: any) => void;
  disabled?: boolean;
}

function EditableCell({ value, column, rowId, city, onChange, disabled }: EditableCellProps) {
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
  
  if (column.calculated || disabled) {
    return (
      <div 
        className={cn(
          "px-2 py-1 text-sm truncate",
          column.calculated && "bg-muted/50 text-muted-foreground italic"
        )}
        style={{ width: column.width }}
        title={formatValue(value, column.format)}
      >
        {formatValue(value, column.format)}
      </div>
    );
  }
  
  if (column.type === "boolean") {
    return (
      <div className="flex items-center justify-center px-2 py-1" style={{ width: column.width }}>
        <Checkbox
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(checked)}
          data-testid={`checkbox-${column.key}-${rowId}`}
        />
      </div>
    );
  }
  
  if (column.type === "select") {
    let options = column.options || [];
    if (column.key === "zone" && city) {
      options = city === "Monterrey" ? ZONES_MONTERREY : city === "CDMX" ? ZONES_CDMX : [];
    }
    
    return (
      <div className="px-1 py-0.5" style={{ width: column.width }}>
        <Select 
          value={value || ""} 
          onValueChange={onChange}
        >
          <SelectTrigger 
            className="h-7 text-xs border-0 focus:ring-0 shadow-none"
            data-testid={`select-${column.key}-${rowId}`}
          >
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  
  if (isEditing) {
    return (
      <div className="px-1 py-0.5" style={{ width: column.width }}>
        <Input
          ref={inputRef}
          type={column.type === "number" || column.type === "decimal" ? "number" : "text"}
          step={column.type === "decimal" ? "0.01" : "1"}
          value={localValue ?? ""}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="h-7 text-xs border-0 focus:ring-1 shadow-none p-1"
          data-testid={`input-${column.key}-${rowId}`}
        />
      </div>
    );
  }
  
  return (
    <div
      className="px-2 py-1 text-sm truncate cursor-pointer hover-elevate"
      style={{ width: column.width }}
      onClick={() => setIsEditing(true)}
      title={formatValue(value, column.format)}
      data-testid={`cell-${column.key}-${rowId}`}
    >
      {formatValue(value, column.format) || <span className="text-muted-foreground">-</span>}
    </div>
  );
}

export function TypologySpreadsheet() {
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(SECTIONS.map(s => s.id))
  );
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<Typology>>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  
  const { data: typologies = [], isLoading, refetch } = useQuery<Typology[]>({
    queryKey: ["/api/typologies"],
  });
  
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
    const calculatedFields = calculateFields(updatedRow);
    const fullUpdate = { ...updatedRow, ...calculatedFields };
    
    setPendingChanges(prev => {
      const next = new Map(prev);
      const existing = next.get(rowId) || {};
      next.set(rowId, { ...existing, [field]: value, ...calculatedFields });
      return next;
    });
    
    const debounceId = setTimeout(() => {
      updateMutation.mutate({ id: rowId, data: { [field]: value, ...calculatedFields } });
    }, 500);
    
    return () => clearTimeout(debounceId);
  }, [typologies, updateMutation]);
  
  const handleAddRow = () => {
    createMutation.mutate({
      city: "Monterrey",
      zone: "Centro",
      developer: DEVELOPERS[0],
      development: DEVELOPMENTS[0],
    });
  };
  
  const handleDeleteRow = (id: string) => {
    if (confirm("¿Eliminar esta tipología?")) {
      deleteMutation.mutate(id);
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
  
  const filteredTypologies = useMemo(() => {
    return typologies.filter(t => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const fieldValue = String(t[key as keyof Typology] || "").toLowerCase();
        return fieldValue.includes(value.toLowerCase());
      });
    });
  }, [typologies, filters]);
  
  const getMergedRow = (row: Typology): Typology => {
    const pending = pendingChanges.get(row.id);
    return pending ? { ...row, ...pending } as Typology : row;
  };
  
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
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <Filter className="w-4 h-4 mr-1" />
            Filtros
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {filteredTypologies.length} tipologías
          </Badge>
          {pendingChanges.size > 0 && (
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Guardando...
            </Badge>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="min-w-max">
          <div className="sticky top-0 z-20 flex bg-background border-b">
            <div className="w-12 flex-shrink-0 border-r bg-muted/50" />
            
            {SECTIONS.map((section) => (
              <Collapsible
                key={section.id}
                open={expandedSections.has(section.id)}
                onOpenChange={() => toggleSection(section.id)}
              >
                <div className="flex flex-col border-r">
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-1 px-2 py-2 text-sm font-medium",
                        section.color,
                        "hover-elevate cursor-pointer"
                      )}
                      data-testid={`section-toggle-${section.id}`}
                    >
                      {expandedSections.has(section.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      {section.label}
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="flex">
                      {section.columns.map((col) => (
                        <div
                          key={col.key}
                          className="flex flex-col border-r last:border-r-0"
                          style={{ width: col.width }}
                        >
                          <div className={cn("px-2 py-1 text-xs font-medium text-center", section.color)}>
                            {col.label}
                            {col.calculated && <span className="text-muted-foreground ml-1">*</span>}
                          </div>
                          {showFilters && (
                            <div className="px-1 py-1 bg-muted/30">
                              <Input
                                placeholder="Filtrar..."
                                className="h-6 text-xs"
                                value={filters[col.key] || ""}
                                onChange={(e) => setFilters(prev => ({ ...prev, [col.key]: e.target.value }))}
                                data-testid={`filter-${col.key}`}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
          
          {filteredTypologies.map((row, rowIndex) => {
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
                <div className="w-12 flex-shrink-0 border-r flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteRow(row.id)}
                    data-testid={`button-delete-${row.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                
                {SECTIONS.map((section) => (
                  <Collapsible
                    key={section.id}
                    open={expandedSections.has(section.id)}
                  >
                    <CollapsibleContent className="flex border-r">
                      {section.columns.map((col) => (
                        <EditableCell
                          key={col.key}
                          value={mergedRow[col.key]}
                          column={col}
                          rowId={row.id}
                          city={mergedRow.city}
                          onChange={(value) => handleCellChange(row.id, col.key, value)}
                        />
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            );
          })}
          
          {filteredTypologies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p>No hay tipologías</p>
              <Button variant="ghost" onClick={handleAddRow} className="mt-2">
                Crear la primera
              </Button>
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
