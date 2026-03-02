import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

export interface FilterState {
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
  dotColorMap?: Record<string, string>;
  hideLabel?: boolean;
}

export function ColumnFilter({
  columnKey,
  columnLabel,
  uniqueValues,
  availableValues,
  sortDirection,
  filterState,
  onSort,
  onFilter,
  onClear,
  labelMap,
  groupMap,
  dotColorMap,
  hideLabel = false,
}: ColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedValues = filterState.selectedValues;
  const noneSelected = selectedValues.size === 1 && selectedValues.has("__none__");
  const allSelected = selectedValues.size === 0 || (selectedValues.size === uniqueValues.length && !selectedValues.has("__none__"));
  const isFiltered = noneSelected || (selectedValues.size > 0 && selectedValues.size < uniqueValues.length);
  const isSorted = sortDirection !== null;
  const hasActiveFilter = isFiltered;

  const filteredValues = useMemo(() => {
    if (!search) return uniqueValues;
    const s = search.toLowerCase();
    return uniqueValues.filter(v => {
      const display = labelMap?.[v] ?? v;
      return display?.toLowerCase().includes(s);
    });
  }, [uniqueValues, search, labelMap]);

  const handleSelectAll = () => {
    onFilter({ selectedValues: new Set() });
  };

  const handleDeselectAll = () => {
    onFilter({ selectedValues: new Set(["__none__"]) });
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
      onFilter({ selectedValues: new Set() });
    } else if (newSet.size === 0) {
      onFilter({ selectedValues: new Set(["__none__"]) });
    } else {
      onFilter({ selectedValues: newSet });
    }
  };

  const handleClearFilter = () => {
    onFilter({ selectedValues: new Set() });
    onSort(null);
    onClear();
    setOpen(false);
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

  const isChecked = (value: string) => selectedValues.size === 0 || selectedValues.has(value);

  return (
    <div className="w-full h-full relative flex items-center text-white">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center justify-center h-full cursor-pointer rounded flex-shrink-0 z-10"
            style={{ width: 28, ...(hasActiveFilter ? { backgroundColor: '#f4b942' } : {}) }}
            data-testid={`filter-${columnKey}`}
          >
            <ChevronDown className="w-3 h-3 flex-shrink-0 text-white" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-56 p-0" align="start">
          <div className="flex flex-col">
            <div className="px-3 py-2 border-b bg-muted/50">
              <span className="text-xs font-semibold">{columnLabel}</span>
            </div>

            {(hasActiveFilter || isSorted) && (
              <>
                <button
                  className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted text-left text-muted-foreground"
                  onClick={handleClearFilter}
                  data-testid={`clear-filter-${columnKey}`}
                >
                  <X className="w-4 h-4" />
                  Borrar filtro de "{columnLabel}"
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
                data-testid={`search-filter-${columnKey}`}
              />
            </div>

            <div className="max-h-48 overflow-y-auto px-2 pb-2">
              {groupMap && Object.keys(groupMap).length > 0 ? (
                <>
                  <label className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-muted px-1 rounded">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      data-testid={`select-all-${columnKey}`}
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
                  {Object.entries(groupMap).map(([group, values]) => {
                    const groupFiltered = values.filter(v =>
                      v && (!search || (labelMap?.[v] ?? v).toLowerCase().includes(search.toLowerCase()))
                    );
                    if (groupFiltered.length === 0) return null;
                    return (
                      <div key={group} className="mb-2">
                        <div className="text-xs font-semibold text-muted-foreground px-1 py-1 bg-muted/50 rounded mb-1">
                          {group}
                        </div>
                        {groupFiltered.map((value) => {
                          const isAvailable = !availableValues || availableValues.has(value);
                          const displayValue = labelMap?.[value] ?? value;
                          const dotColor = dotColorMap?.[value];
                          return (
                            <label
                              key={value}
                              className={cn(
                                "flex items-center gap-2 py-1 px-1 rounded ml-2",
                                isAvailable ? "cursor-pointer hover:bg-muted" : "opacity-40 cursor-not-allowed"
                              )}
                            >
                              <Checkbox
                                checked={isChecked(value)}
                                onCheckedChange={() => handleToggleValue(value)}
                                disabled={!isAvailable}
                                data-testid={`filter-value-${columnKey}-${value}`}
                              />
                              <span className={cn("flex items-center gap-1.5 text-xs truncate", !isAvailable && "text-muted-foreground line-through")}>
                                {dotColor && <span style={{ color: dotColor }} className="text-[8px] leading-none flex-shrink-0">●</span>}
                                <span style={dotColor ? { color: dotColor, fontWeight: 500 } : undefined}>{displayValue}</span>
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
                      data-testid={`select-all-${columnKey}`}
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
                    const isAvailable = !availableValues || availableValues.has(value);
                    const displayValue = labelMap?.[value] ?? value;
                    const dotColor = dotColorMap?.[value];
                    return (
                      <label
                        key={value}
                        className={cn(
                          "flex items-center gap-2 py-1 px-1 rounded",
                          isAvailable ? "cursor-pointer hover:bg-muted" : "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <Checkbox
                          checked={isChecked(value)}
                          onCheckedChange={() => handleToggleValue(value)}
                          disabled={!isAvailable}
                          data-testid={`filter-value-${columnKey}-${value}`}
                        />
                        <span className={cn("flex items-center gap-1.5 text-xs truncate", !isAvailable && "text-muted-foreground line-through")}>
                          {dotColor && <span style={{ color: dotColor }} className="text-[8px] leading-none flex-shrink-0">●</span>}
                          <span style={dotColor ? { color: dotColor, fontWeight: 500 } : undefined}>{displayValue}</span>
                        </span>
                      </label>
                    );
                  })}

                  {filteredValues.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2 text-center">Sin resultados</p>
                  )}
                </>
              )}
            </div>

            <div className="border-t p-2 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={() => setOpen(false)} data-testid={`apply-filter-${columnKey}`}>
                Aceptar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {hideLabel ? (
        <div className="flex-1 h-full cursor-default" style={{ minWidth: 4 }} />
      ) : (
        <span className="flex-1 text-xs font-medium truncate pointer-events-none text-center min-w-0" title={columnLabel}>
          {columnLabel}
        </span>
      )}

      <button
        onClick={handleSortClick}
        className="flex items-center justify-center h-full cursor-pointer rounded flex-shrink-0 z-10"
        style={{ width: 28, ...(isSorted ? { backgroundColor: '#f4b942' } : {}) }}
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
    if (selectedValues.has("__none__")) return false;
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
        if (filter.selectedValues.size > 0) {
          filteredData = filteredData.filter((row) => matchesFilter(row[key], filter.selectedValues));
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
      if (filter.selectedValues.size > 0) {
        result = result.filter((row) => matchesFilter(row[key], filter.selectedValues));
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
          ? aStr.localeCompare(bStr, "es")
          : bStr.localeCompare(aStr, "es");
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
