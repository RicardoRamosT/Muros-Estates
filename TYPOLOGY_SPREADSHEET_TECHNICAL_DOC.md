# Typology Spreadsheet - Technical Specification Document

## File Location
`client/src/components/typology-spreadsheet.tsx`

## Architecture Overview

The typology spreadsheet is a custom Excel-like component built in React/TypeScript for managing real estate property units (typologies). It features inline editing, calculated fields, conditional visibility, bidirectional calculations, dynamic dropdowns, and real-time WebSocket synchronization.

---

## 1. Data Structures

### ColumnDef Interface
```typescript
interface ColumnDef {
  key: TypologyField;        // Database field name (keyof Typology)
  label: string;             // Display label in column header
  type: "text" | "number" | "decimal" | "select" | "multiselect" | "boolean" | "date" | "development-type-select";
  options?: readonly string[]; // Options for select/multiselect types
  width?: number;            // Column width in pixels (excluding sort icon)
  calculated?: boolean;      // If true: bg-gray-350, read-only, no editing
  format?: "currency" | "percent" | "area"; // Display formatting
  hideLabel?: boolean;       // If true: label hidden, tooltip always shown on filter button
  fullLabel?: string;        // Full text for tooltip (used by hideLabel or TruncatedLabel)
  centerCells?: boolean;     // If true: cell content is text-center aligned
}
```

### SectionDef Interface
```typescript
interface SectionDef {
  id: string;                // Unique section identifier
  label: string;             // Section header text (empty string = no header)
  headerColor: string;       // Tailwind classes for section header row
  columnHeaderColor?: string; // Tailwind classes for column name/filter row
  cellColor?: string;        // Tailwind classes for calculated/disabled cells
  columns: ColumnDef[];      // Array of column definitions
  subheader?: string;        // Small text below section label (e.g., "10.5% | 15")
  conditionalFields?: {      // Fields that show/hide based on other fields
    field: TypologyField;
    dependsOn: TypologyField | TypologyField[];
  }[];
}
```

---

## 2. Section Definitions (SECTIONS array)

| Section ID | Label | Header Color | Columns |
|---|---|---|---|
| basico | (empty) | gray-500 | Activo |
| fechahora | FECHA/HORA | teal-200 | Fecha, Hora |
| ubicacion | (empty) | gray-500 | Ciudad, Zona, Desarrollador, Desarrollo, Tipo |
| generales | GENERALES | blue-200 | Tipología, Nivel, Vista |
| precio_tamano | TAMAÑO | yellow-300 | Unidad (m²), Total (m²) |
| precio_valores | PRECIO | green-200 | Precio, Bono, %, Monto, Final*, $ / m²*, Cap..., Promo |
| distribucion | DISTRIBUCIÓN | purple-200 | Lock-Off, Rec..., B..., Area, Balcon, Tam..., Terr..., Tam..., (repeat for Lock-Off unit 2) |
| cajones | CAJONES | amber-200 | Incl., Opc., Precio |
| bodega | BODEGA | rose-200 | Incl., Tam., Opc., Tam., Precio |
| pago | ESQUEMA DE PAGO | yellow-200 | Inicial, Monto, Plazo %, Monto, Meses, Mens.*, Tot.Eng.*, Resto%*, Monto* |
| entrega | (empty) | yellow-200 | Entrega* |
| gastos | GASTOS POST-ENTREGA | red-200 | ISAI%, ISAI$*, Not.%, Not.$*, Equipo, Muebles, Total* |
| pre_credito | (empty, subheader: "10.5% \| 15") | orange-200 | Monto, Inicia, Tasa, Años |
| credito | CRÉDITO HIPOTECARIO | orange-200 | Mens.*, Termina, Total* |
| mantenimiento | MANTENIMIENTO | teal-200 | m², Inicial, Fecha, Final, Fecha, Total* |
| renta1 | RENTA | indigo-200 | Inicial, Fecha |
| tasa_renta | (empty, subheader: "7.0%") | indigo-200 | Tasa |
| renta2 | RENTA | indigo-200 | Final, Fecha |
| meses | (empty, subheader: "11.0") | indigo-200 | Meses |
| total_renta | TOTAL | indigo-200 | Total* |
| inversion | INVERSIÓN | pink-200 | Total*, Neta*, Mens.*, Tasa* |
| tasa_plusvalia | (empty, subheader: "7.0%") | cyan-200 | Tasa |
| plusvalia | PLUSVALÍA | cyan-200 | Días, Meses, Años, Total*, M. Final* |

\* = calculated field (read-only, bg-gray-350)

---

## 3. Color System

### Section Color Hierarchy (3 tiers)
Each section uses three color tiers:
1. **headerColor** (strongest): Section header row background
2. **columnHeaderColor** (medium): Column name row and filter popover backgrounds
3. **cellColor** (lightest): Background for calculated/disabled cells

### Cell Type Colors
| Cell Type | Background | Border/Appearance |
|---|---|---|
| Editable input | `bg-white` (white) | Standard input |
| Select/Dropdown | `bg-gray-50` (light gray) | Select trigger |
| Boolean/Checkbox | `bg-gray-50` (light gray) | Centered checkbox |
| Calculated (read-only) | `bg-gray-350` (custom midpoint gray-300/gray-400) | Gray text, not editable |
| Disabled (conditional hidden) | `bg-gray-200 dark:bg-gray-700` with diagonal stripe pattern | Not editable, striped overlay |

### Custom Tailwind Color: bg-gray-350
Defined in `tailwind.config.ts`:
```typescript
colors: {
  gray: {
    350: '#b0b5bd', // midpoint between gray-300 (#d1d5db) and gray-400 (#9ca3af)
  },
}
```

### BODEGA vs CAJONES Color Differentiation
- **CAJONES**: `amber-200/100/50` (warm yellow-orange)
- **BODEGA**: `rose-200/100/50` (pink-red) — deliberately different to avoid confusion

---

## 4. Tooltip System

### Two Tooltip Modes

#### Mode 1: hideLabel Columns
Columns with `hideLabel: true`:
- Activo (Act.), Hora, Nivel, Incl. (Bodega), Opc. (Bodega), % (Bono)

Behavior: Label is completely hidden (0px width). The filter/sort button always shows a tooltip with `fullLabel` text.

#### Mode 2: TruncatedLabel Component
All other columns with `fullLabel` set use `TruncatedLabel`:
- Rec... → "Recámaras", B... → "Baños", Tam... → "Tamaño", Terr... → "Terraza", Cap... → "Capital Semilla"

Behavior: Tooltip only appears when `scrollWidth > clientWidth` (text is actually truncated). Uses `ResizeObserver`-equivalent via `window.addEventListener("resize")`.

### TruncatedLabel Component
```typescript
function TruncatedLabel({ label, fullLabel, columnKey }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const checkTruncation = () => {
      const el = spanRef.current;
      if (el) setIsTruncated(el.scrollWidth > el.clientWidth);
    };
    checkTruncation();
    window.addEventListener("resize", checkTruncation);
    return () => window.removeEventListener("resize", checkTruncation);
  }, [label]);

  // Returns Tooltip-wrapped span if truncated, plain span otherwise
  // Same ref used in both paths for consistency
}
```

### Removed Tooltips
- **FormulaTooltip**: Completely removed from calculated field headers (no hover formula display)
- **"Ordenar" tooltip**: Removed from sort arrow buttons
- **Asterisks**: Removed from all calculated field header labels

---

## 5. Column Width Strategy

### Sort Icon Width Constant
```typescript
const SORT_ICON_WIDTH = 18; // Added to every column's width for the sort arrow
```

Total rendered width = `column.width + SORT_ICON_WIDTH`

### Column Widths (in pixels, excluding sort icon)
| Column | Width | Notes |
|---|---|---|
| active (Act.) | 40 | hideLabel |
| createdDate (Fecha) | 75 | centerCells |
| createdTime (Hora) | 55 | hideLabel, centerCells |
| city | 80 | |
| zone | 100 | calculated |
| developer | 105 | calculated |
| development | 110 | |
| tipoDesarrollo | 100 | |
| type | 90 | |
| level (Nivel) | 50 | hideLabel, centerCells, dynamic options |
| view | 80 | |
| size (Unidad) | 85 | area format |
| sizeFinal (Total) | 100 | area format |
| price | 105 | currency |
| hasDiscount (Bono) | 40 | boolean |
| discountPercent (%) | 50 | hideLabel, centerCells, percent |
| discountAmount (Monto) | 100 | currency, editable (bidirectional) |
| finalPrice (Final) | 110 | calculated, currency |
| pricePerM2 ($ / m²) | 100 | calculated, currency |
| hasSeedCapital (Cap...) | 40 | boolean |
| hasPromo | 40 | boolean |
| lockOff | 55 | boolean |
| bedrooms (Rec...) | 55 | select |
| bathrooms (B...) | 50 | select |
| areas (Area) | 70 | multiselect |
| hasBalcony (Balcon) | 50 | boolean |
| balconySize (Tam...) | 70 | area, conditional |
| hasTerrace (Terr...) | 40 | boolean |
| terraceSize (Tam...) | 70 | area, conditional |
| parkingIncluded (Incl.) | 90 | select, widened for "2 en T..." |
| hasParkingOptional (Opc.) | 40 | boolean |
| parkingOptionalPrice | 100 | currency, conditional |
| hasStorage (Incl.) | 40 | hideLabel, boolean |
| storageSize (Tam.) | 75 | area, conditional |
| hasStorageOptional (Opc.) | 40 | hideLabel, boolean |
| storageSize2 (Tam.) | 75 | area, conditional |
| storagePrice | 100 | currency, conditional |
| initialPercent (Inicial) | 60 | percent, centerCells |
| initialAmount (Monto) | 100 | currency, bidirectional |
| duringConstructionPercent | 60 | percent |
| duringConstructionAmount | 100 | currency, bidirectional |
| paymentMonths (Meses) | 50 | number, editable |
| monthlyPayment (Mens.) | 100 | calculated, currency |
| totalEnganche (Tot.Eng.) | 105 | calculated, currency |
| remainingPercent (Resto%) | 60 | calculated, percent |
| remainingAmount (Monto) | 100 | calculated, currency |

---

## 6. Formatting Functions

### formatValue(value, format)
```typescript
function formatValue(value: any, format?: string): string {
  switch (format) {
    case "currency":
      // es-MX locale, MXN currency, 0 decimal places
      // Example: $1,250,000
      return new Intl.NumberFormat("es-MX", {
        style: "currency", currency: "MXN", maximumFractionDigits: 0
      }).format(num);
    case "percent":
      // 1 decimal place + %
      // Example: 15.0%
      return `${num.toFixed(1)}%`;
    case "area":
      // 2 decimal places + m²
      // Example: 85.50 m²
      return `${num.toFixed(2)} m²`;
  }
}
```

---

## 7. Calculated Fields & Formulas

### calculateFields(row) Function
Returns an object with all calculated field values. Key formulas:

| Field | Formula |
|---|---|
| finalPrice | price - discountAmount |
| pricePerM2 | finalPrice / size |
| monthlyPayment | duringConstructionAmount / paymentMonths |
| totalEnganche | initialAmount + duringConstructionAmount |
| remainingPercent | 100 - initialPercent - duringConstructionPercent |
| remainingAmount | finalPrice × remainingPercent / 100 |
| isaAmount | finalPrice × isaPercent / 100 |
| notaryAmount | finalPrice × notaryPercent / 100 |
| totalPostDeliveryCosts | isaAmount + notaryAmount + equipmentCost + furnitureCost |
| mortgageMonthlyPayment | Standard amortization formula with monthly compound interest |
| mortgageTotal | mortgageMonthlyPayment × (mortgageYears × 12) |
| maintenanceTotal | maintenanceM2 × size × 12 |
| rentTotal | rentInitial × rentMonths |
| investmentTotal | finalPrice + totalPostDeliveryCosts |
| investmentNet | rentTotal - maintenanceTotal |
| investmentMonthly | investmentNet / rentMonths |
| investmentRate | (investmentNet / investmentTotal) × 100 |
| appreciationTotal | finalPrice × (1 + appreciationRate/100)^totalYears - finalPrice |
| finalValue | finalPrice + appreciationTotal |

### Mortgage Monthly Payment Formula
```
M = P × [r(1+r)^n] / [(1+r)^n - 1]
where:
  P = mortgageAmount
  r = mortgageInterestPercent / 100 / 12 (monthly rate)
  n = mortgageYears × 12 (total payments)
```

---

## 8. Bidirectional Calculations

### handleCellChange Logic
When a user edits one field of a paired set, the counterpart is automatically computed:

| Trigger Field | Computed Field | Formula |
|---|---|---|
| discountPercent → | discountAmount | price × discountPercent / 100 |
| discountAmount → | discountPercent | (discountAmount / price) × 100 |
| initialPercent → | initialAmount | finalPrice × initialPercent / 100 |
| initialAmount → | initialPercent | (initialAmount / finalPrice) × 100 |
| duringConstructionPercent → | duringConstructionAmount | finalPrice × duringConstructionPercent / 100 |
| duringConstructionAmount → | duringConstructionPercent | (duringConstructionAmount / finalPrice) × 100 |

**Note**: `remainingPercent` and `remainingAmount` are BOTH calculated (read-only). They are derived fields: `remainingPercent = 100 - initialPercent - duringConstructionPercent`, and `remainingAmount = finalPrice × remainingPercent / 100`.

### Field Editability Matrix (Payment Section)
| Field | Editable? | Bidirectional? |
|---|---|---|
| discountPercent | Yes (when hasDiscount=true) | Yes ↔ discountAmount |
| discountAmount | Yes (when hasDiscount=true) | Yes ↔ discountPercent |
| initialPercent | Yes | Yes ↔ initialAmount |
| initialAmount | Yes | Yes ↔ initialPercent |
| duringConstructionPercent | Yes | Yes ↔ duringConstructionAmount |
| duringConstructionAmount | Yes | Yes ↔ duringConstructionPercent |
| paymentMonths | Yes | No (input only) |
| monthlyPayment | No (calculated) | — |
| totalEnganche | No (calculated) | — |
| remainingPercent | No (calculated) | — |
| remainingAmount | No (calculated) | — |

---

## 9. Conditional Fields

Conditional fields are hidden/disabled based on boolean toggle fields:

| Section | Toggle Field | Dependent Fields |
|---|---|---|
| PRECIO | hasDiscount | discountPercent, discountAmount |
| DISTRIBUCIÓN | hasBalcony | balconySize |
| DISTRIBUCIÓN | hasTerrace | terraceSize |
| DISTRIBUCIÓN | lockOff | bedrooms2, bathrooms2, areas2, hasBalcony2, hasTerrace2 |
| DISTRIBUCIÓN | lockOff + hasBalcony2 | balconySize2 |
| DISTRIBUCIÓN | lockOff + hasTerrace2 | terraceSize2 |
| CAJONES | hasParkingOptional | parkingOptionalPrice |
| BODEGA | hasStorage | storageSize |
| BODEGA | hasStorageOptional | storageSize2, storagePrice |

When disabled: cells show `bg-gray-200` with diagonal stripe CSS pattern overlay, not editable.

---

## 10. Dynamic Dropdowns

### Level (Nivel) Dropdown
- **Type**: `select` (not number input)
- **Options Source**: Development's `niveles` field from `allDevelopments` query
- **Logic**: Find development entity by matching `row.development` name → generate array `["1", "2", ..., niveles.toString()]`
- **Fallback**: If development not found or `niveles` is null/0, returns empty options array
- **Current value preservation**: If the row already has a level value not in the options, it's prepended to the options array

### Development Type (Tipo) Dropdown
- **Type**: `development-type-select`
- **Options Source**: Filtered from development entity's associated type catalog

### Other Selects
- Ciudad: Static CITIES constant
- Desarrollo: Static DEVELOPMENTS constant
- Tipología, Vista, Recámaras, Baños, Cajones Incl.: Empty arrays (to be populated from catalogs)

---

## 11. centerCells Property

Columns with `centerCells: true`:
- createdDate (Fecha)
- createdTime (Hora)
- level (Nivel)
- discountPercent (%)
- initialPercent (Inicial)

Applied to: input fields (`text-center` class), select triggers (`text-center` class), and formatted display values (`text-center` class).

---

## 12. Layout Architecture

### Row Structure (4 header rows)
1. **Row 1**: Section headers (merged across section columns) — strongest color
2. **Row 2**: Subheaders (e.g., "10.5% | 15") — text-xs, medium color
3. **Row 3**: Column labels — text-xs font-medium, medium color
4. **Row 4**: Filter/sort buttons — medium color

### Sticky Elements
- Row index column: `sticky left-0 z-20`
- All 4 header rows: `sticky top-0 z-30`
- Sort icon width constant: `SORT_ICON_WIDTH = 18px` added to each column

### Text Sizing
- All section headers: `text-xs` (previously text-sm, changed for compactness)
- All column labels: `text-xs font-medium`
- All cell values: `text-xs`
- Sort buttons: Small icon size

---

## 13. remainingAmount Implementation Note

`remainingAmount` is a purely derived field:
- **Not in Typology schema** (not persisted to database)
- Used `as any` TypeScript cast in column definition: `{ key: "remainingAmount" as any, ... }`
- Computed in `calculateFields()` as `finalPrice × remainingPercent / 100`
- Marked `calculated: true` (read-only, gray background)
- This is a UI-only field that updates reactively when initialPercent or duringConstructionPercent change

---

## 14. File Dependencies

| Import | Source | Purpose |
|---|---|---|
| React hooks | react | useState, useEffect, useCallback, useMemo, useRef |
| TanStack Query | @tanstack/react-query | useQuery, useMutation for API calls |
| Shadcn UI | @/components/ui/* | Input, Button, Select, Checkbox, Popover, Tooltip, Dialog, Collapsible, Badge |
| Lucide Icons | lucide-react | ChevronDown, Plus, Minus, Trash2, Save, Lock, Filter, etc. |
| DnD Kit | @dnd-kit/* | Drag-and-drop for media reordering |
| Schema | @shared/schema | Typology type definition |
| Constants | @shared/constants | CITIES, ZONES, DEVELOPERS, DEVELOPMENTS |
| Utils | @/lib/utils | cn() classname utility |
| Spreadsheet Utils | @/lib/spreadsheet-utils | formatDate, formatTime |
| Query Client | @/lib/queryClient | apiRequest, queryClient for mutations |

---

## 15. Key Implementation Patterns

### Progressive Row Loading
Rows load in batches for performance with large datasets.

### WebSocket Synchronization
Real-time updates broadcast typology create/update/delete events to all connected clients.

### Cell Change Flow
1. User edits cell → `handleCellChange(rowId, field, value)` fires
2. Bidirectional pair computed if applicable (e.g., % ↔ amount)
3. `calculateFields(updatedRow)` runs to update all derived fields
4. Row state updated locally (optimistic)
5. Debounced API mutation saves to database
6. WebSocket broadcasts change to other clients

### Conditional Field Rendering
For each cell, the system checks if it depends on a toggle field. If the toggle is `false`, the cell renders as disabled with a striped pattern overlay instead of the normal input/select/checkbox.

---

## 16. Design Decisions Summary

1. **No asterisks on calculated headers** — cleaner appearance
2. **No formula tooltips on hover** — removed FormulaTooltip component usage
3. **No "Ordenar" tooltip on sort buttons** — less visual noise
4. **bg-gray-350 for calculated cells** — custom color between gray-300 and gray-400 for subtle differentiation
5. **BODEGA uses rose colors** — differentiates from CAJONES (amber) which were visually similar
6. **discountAmount is editable** — enables bidirectional Bono % ↔ Monto workflow
7. **Level uses select dropdown** — options dynamically generated from development's niveles, not free-form number input
8. **Column labels abbreviated with fullLabel tooltips** — maximizes horizontal space while preserving discoverability
9. **centerCells for numeric/percentage columns** — improves readability of short values in narrow columns
10. **hideLabel for very narrow columns** — label hidden entirely, tooltip always shown on hover of filter button
