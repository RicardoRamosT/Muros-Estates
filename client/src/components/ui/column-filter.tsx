import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  ArrowUpAZ, ArrowDownAZ, ArrowUp01, ArrowDown10, 
  Filter, Check, X, Search
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

export interface FilterState {
  search: string;
  selectedValues: Set<string>;
}

export interface ColumnFilterProps {
  columnKey: string;
  columnLabel: string;
  columnType?: "text" | "number" | "date" | "select" | "boolean";
  uniqueValues: string[];
  availableValues?: Set<string>;
  sortDirection: SortDirection;
  filterState: FilterState;
  onSort: (direction: SortDirection) => void;
  onFilter: (state: FilterState) => void;
  onClear: () => void;
  labelMap?: Record<string, string>;
}

export function ColumnFilter({
  columnKey,
  columnLabel,
  columnType = "text",
  uniqueValues,
  availableValues,
  sortDirection,
  filterState,
  onSort,
  onFilter,
  onClear,
  labelMap,
}: ColumnFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(filterState.search);
  const [localSelected, setLocalSelected] = useState<Set<string>>(filterState.selectedValues);

  const isNumeric = columnType === "number" || columnType === "date";
  const hasActiveFilter = filterState.search || filterState.selectedValues.size > 0;
  const hasActiveSort = sortDirection !== null;

  const filteredValues = useMemo(() => {
    if (!localSearch) return uniqueValues;
    const search = localSearch.toLowerCase();
    return uniqueValues.filter(v => {
      const displayValue = labelMap?.[v] ?? v;
      return displayValue?.toLowerCase().includes(search);
    });
  }, [uniqueValues, localSearch, labelMap]);

  const handleSort = (dir: SortDirection) => {
    onSort(dir);
  };

  const handleSelectAll = () => {
    setLocalSelected(new Set(uniqueValues));
  };

  const handleDeselectAll = () => {
    setLocalSelected(new Set());
  };

  const handleToggleValue = (value: string) => {
    const newSet = new Set(localSelected);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    setLocalSelected(newSet);
  };

  const handleApply = () => {
    onFilter({
      search: localSearch,
      selectedValues: localSelected,
    });
    setIsOpen(false);
  };

  const handleClear = () => {
    setLocalSearch("");
    setLocalSelected(new Set());
    onClear();
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 w-6 p-0 ml-1",
            (hasActiveFilter || hasActiveSort) && "text-primary"
          )}
          data-testid={`filter-${columnKey}`}
        >
          <Filter className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Ordenar
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              variant={sortDirection === "asc" ? "default" : "outline"}
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => handleSort(sortDirection === "asc" ? null : "asc")}
            >
              {isNumeric ? (
                <ArrowUp01 className="h-3 w-3 mr-1" />
              ) : (
                <ArrowUpAZ className="h-3 w-3 mr-1" />
              )}
              {isNumeric ? "0-9" : "A-Z"}
            </Button>
            <Button
              variant={sortDirection === "desc" ? "default" : "outline"}
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => handleSort(sortDirection === "desc" ? null : "desc")}
            >
              {isNumeric ? (
                <ArrowDown10 className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownAZ className="h-3 w-3 mr-1" />
              )}
              {isNumeric ? "9-0" : "Z-A"}
            </Button>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Filtrar
              </span>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 px-1 text-xs"
                  onClick={handleSelectAll}
                >
                  Todos
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 px-1 text-xs"
                  onClick={handleDeselectAll}
                >
                  Ninguno
                </Button>
              </div>
            </div>
            
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="h-7 pl-7 text-xs"
              />
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1 border rounded p-1">
              {filteredValues.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-2">
                  Sin resultados
                </div>
              ) : (
                filteredValues.map((value) => {
                  const isAvailable = !availableValues || availableValues.has(value);
                  return (
                    <label
                      key={value}
                      className={cn(
                        "flex items-center gap-2 px-1 py-0.5 rounded",
                        isAvailable 
                          ? "hover:bg-muted cursor-pointer" 
                          : "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <Checkbox
                        checked={localSelected.has(value)}
                        onCheckedChange={() => handleToggleValue(value)}
                        disabled={!isAvailable}
                        className="h-3 w-3"
                      />
                      <span className={cn(
                        "text-xs truncate flex-1",
                        !isAvailable && "text-muted-foreground line-through"
                      )}>
                        {(labelMap?.[value] ?? value) || "(vacío)"}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={handleClear}
            >
              <X className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
            <Button
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={handleApply}
            >
              <Check className="h-3 w-3 mr-1" />
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function useColumnFilters<T extends Record<string, any>>(
  data: T[],
  columns: { key: string; type?: string }[],
  orderMaps?: Record<string, Record<string, number>>
) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>({
    key: "",
    direction: null,
  });
  const [filterConfigs, setFilterConfigs] = useState<Record<string, FilterState>>({});

  const extractValues = (value: any): string[] => {
    if (value === null || value === undefined) return [];
    if (Array.isArray(value)) {
      return value.filter(v => v !== null && v !== undefined).map(String);
    }
    return [String(value)];
  };

  const matchesFilter = (value: any, selectedValues: Set<string>): boolean => {
    if (selectedValues.size === 0) return true;
    if (Array.isArray(value)) {
      return value.some(v => selectedValues.has(String(v ?? "")));
    }
    return selectedValues.has(String(value ?? ""));
  };

  const uniqueValuesMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    columns.forEach((col) => {
      const values = new Set<string>();
      data.forEach((row) => {
        const rowValues = extractValues(row[col.key]);
        rowValues.forEach(v => values.add(v));
      });
      map[col.key] = Array.from(values).sort();
    });
    return map;
  }, [data, columns]);

  const availableValuesMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    columns.forEach((col) => {
      let filteredData = [...data];
      Object.entries(filterConfigs).forEach(([key, filter]) => {
        if (key === col.key) return;
        if (filter.search) {
          const search = filter.search.toLowerCase();
          filteredData = filteredData.filter((row) => {
            const value = row[key];
            if (Array.isArray(value)) {
              return value.some(v => String(v ?? "").toLowerCase().includes(search));
            }
            return value?.toString().toLowerCase().includes(search);
          });
        }
        if (filter.selectedValues.size > 0) {
          filteredData = filteredData.filter((row) => {
            return matchesFilter(row[key], filter.selectedValues);
          });
        }
      });
      const availableValues = new Set<string>();
      filteredData.forEach((row) => {
        const rowValues = extractValues(row[col.key]);
        rowValues.forEach(v => availableValues.add(v));
      });
      map[col.key] = availableValues;
    });
    return map;
  }, [data, columns, filterConfigs]);

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    Object.entries(filterConfigs).forEach(([key, filter]) => {
      if (filter.search) {
        const search = filter.search.toLowerCase();
        result = result.filter((row) => {
          const value = row[key];
          if (Array.isArray(value)) {
            return value.some(v => String(v ?? "").toLowerCase().includes(search));
          }
          return value?.toString().toLowerCase().includes(search);
        });
      }
      if (filter.selectedValues.size > 0) {
        result = result.filter((row) => {
          return matchesFilter(row[key], filter.selectedValues);
        });
      }
    });

    if (sortConfig.key && sortConfig.direction) {
      const { key, direction } = sortConfig;
      const orderMap = orderMaps?.[key];
      result.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        
        if (aVal === null || aVal === undefined) return direction === "asc" ? 1 : -1;
        if (bVal === null || bVal === undefined) return direction === "asc" ? -1 : 1;
        
        // Use order map if available (for options-select fields)
        if (orderMap) {
          const aIdx = orderMap[String(aVal)] ?? 9999;
          const bIdx = orderMap[String(bVal)] ?? 9999;
          return direction === "asc" ? aIdx - bIdx : bIdx - aIdx;
        }
        
        if (typeof aVal === "number" && typeof bVal === "number") {
          return direction === "asc" ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        return direction === "asc" 
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }

    return result;
  }, [data, sortConfig, filterConfigs, orderMaps]);

  const handleSort = (key: string, direction: SortDirection) => {
    setSortConfig({ key, direction });
  };

  const handleFilter = (key: string, state: FilterState) => {
    setFilterConfigs((prev) => ({ ...prev, [key]: state }));
  };

  const handleClearFilter = (key: string) => {
    setFilterConfigs((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const clearAllFilters = () => {
    setSortConfig({ key: "", direction: null });
    setFilterConfigs({});
  };

  return {
    sortConfig,
    filterConfigs,
    uniqueValuesMap,
    availableValuesMap,
    filteredAndSortedData,
    handleSort,
    handleFilter,
    handleClearFilter,
    clearAllFilters,
  };
}
