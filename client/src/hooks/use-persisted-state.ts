import { useState, useEffect, useRef, useCallback } from "react";

export function usePersistedState<T>(
  key: string,
  defaultValue: T | (() => T),
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (raw: string) => T;
    debounceMs?: number;
  }
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const serialize = options?.serialize ?? JSON.stringify;
  const deserialize = options?.deserialize ?? JSON.parse;
  const debounceMs = options?.debounceMs ?? 300;

  const resolveDefault = (): T =>
    typeof defaultValue === "function" ? (defaultValue as () => T)() : defaultValue;

  const readFromStorage = useCallback((): T => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return resolveDefault();
      return deserialize(raw);
    } catch {
      return resolveDefault();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const [state, setState] = useState<T>(readFromStorage);

  // Re-read from storage when key changes (e.g. user switch)
  const prevKeyRef = useRef(key);
  useEffect(() => {
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key;
      setState(readFromStorage());
    }
  }, [key, readFromStorage]);

  // Debounced write to localStorage
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const serialized = serialize(state);
        // If state equals default, remove the key to keep storage clean
        const defaultSerialized = serialize(resolveDefault());
        if (serialized === defaultSerialized) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, serialized);
        }
      } catch {
        // Silently fail on quota exceeded or serialization error
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, key, debounceMs]);

  return [state, setState];
}
