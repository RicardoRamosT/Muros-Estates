import type { FilterState } from "@/components/ui/column-filter";

export function spreadsheetKey(userId: string, spreadsheet: string, field: string): string {
  return `muros_prefs_${userId}_${spreadsheet}_${field}`;
}

/** Serializer for Set<string> ↔ string[] */
export const setSerializer = {
  serialize: (value: Set<string>): string => JSON.stringify(Array.from(value)),
  deserialize: (raw: string): Set<string> => new Set(JSON.parse(raw) as string[]),
};

/** Serializer for Record<string, FilterState> where FilterState.selectedValues is a Set */
export const filterConfigsSerializer = {
  serialize: (value: Record<string, FilterState>): string => {
    const obj: Record<string, { selectedValues: string[] }> = {};
    for (const [k, v] of Object.entries(value)) {
      obj[k] = { selectedValues: Array.from(v.selectedValues) };
    }
    return JSON.stringify(obj);
  },
  deserialize: (raw: string): Record<string, FilterState> => {
    const obj = JSON.parse(raw) as Record<string, { selectedValues: string[] }>;
    const result: Record<string, FilterState> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = { selectedValues: new Set(v.selectedValues) };
    }
    return result;
  },
};

/** Serializer for Typology's ColumnFilters: Record<string, Set<string>> */
export const columnFiltersSerializer = {
  serialize: (value: Record<string, Set<string>>): string => {
    const obj: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(value)) {
      obj[k] = Array.from(v);
    }
    return JSON.stringify(obj);
  },
  deserialize: (raw: string): Record<string, Set<string>> => {
    const obj = JSON.parse(raw) as Record<string, string[]>;
    const result: Record<string, Set<string>> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = new Set(v);
    }
    return result;
  },
};
