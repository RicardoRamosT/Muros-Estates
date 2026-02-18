import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  ChevronDown, Check, X, Search
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
  groupMap?: Record<string, string[]>;
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
  groupMap,
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

  const handleSortClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sortDirection === null) {
      onSort("asc");
    } else if (sortDirection === "asc") {
      onSort("desc");
    } else {
      onSort(null);
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
    <div className="w-full h-full relative flex items-center">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center justify-center h-full text-xs font-medium cursor-pointer flex-shrink-0",
              hasActiveFilter && "text-primary"
            )}
            style={{ width: 28 }}
            data-testid={`filter-${columnKey}`}
          >
            <ChevronDown className={cn(
              "w-3 h-3 flex-shrink-0",
              hasActiveFilter ? "text-primary" : "text-white"
            )} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="flex flex-col">
            <div className="px-3 py-2 border-b bg-muted/50">
              <span className="text-xs font-semibold">{columnLabel}</span>
            </div>

            {hasActiveFilter && (
              <>
                <button
                  className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted text-left text-muted-foreground"
                  onClick={handleClear}
                  data-testid={`clear-filter-${columnKey}`}
                >
                  <X className="w-4 h-4" />
                  Borrar filtro de "{columnLabel}"
                </button>
                <div className="border-t" />
              </>
            )}

            <div className="px-3 py-2">
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
                ) : groupMap ? (
                  (() => {
                    const filteredSet = new Set(filteredValues);
                    const groupedEntries = Object.entries(groupMap)
                      .map(([group, values]) => [group, values.filter(v => filteredSet.has(v))] as const)
                      .filter(([, values]) => values.length > 0);
                    const groupedValues = new Set(groupedEntries.flatMap(([, values]) => values));
                    const ungrouped = filteredValues.filter(v => !groupedValues.has(v));

                    return (
                      <>
                        {groupedEntries.map(([group, values]) => (
                          <div key={group}>
                            <div className="text-[10px] font-semibold text-muted-foreground uppercase px-1 pt-1 pb-0.5">
                              {group}
                            </div>
                            {values.map((value) => {
                              const isAvailable = !availableValues || availableValues.has(value);
                              return (
                                <label
                                  key={value}
                                  className={cn(
                                    "flex items-center gap-2 px-1 pl-3 py-0.5 rounded",
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
                            })}
                          </div>
                        ))}
                        {ungrouped.map((value) => {
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
                        })}
                      </>
                    );
                  })()
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

            <div className="flex gap-2 p-2 border-t">
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
      <span className="flex-1 text-xs font-medium truncate pointer-events-none text-center min-w-0">
        {columnLabel}
      </span>
      <button
        onClick={handleSortClick}
        className="flex items-center justify-center h-full cursor-pointer rounded flex-shrink-0"
        style={{ width: 28 }}
        data-testid={`sort-${columnKey}`}
      >
        <SortIcon />
      </button>
    </div>
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
