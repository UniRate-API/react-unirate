import { useCallback, useEffect, useReducer, useRef } from "react";
import type { UniRateClient } from "./client.js";
import { useUniRateClient } from "./provider.js";

export interface QueryState<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
}

type Action<T> =
  | { type: "fetch" }
  | { type: "success"; data: T }
  | { type: "error"; error: Error }
  | { type: "reset" };

interface InternalState<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isFetching: boolean;
}

const initialState: InternalState<unknown> = {
  data: undefined,
  error: undefined,
  isLoading: true,
  isFetching: true,
};

function reducer<T>(state: InternalState<T>, action: Action<T>): InternalState<T> {
  switch (action.type) {
    case "fetch":
      return { ...state, error: undefined, isFetching: true };
    case "success":
      return { data: action.data, error: undefined, isLoading: false, isFetching: false };
    case "error":
      return { ...state, error: action.error, isLoading: false, isFetching: false };
    case "reset":
      return initialState as InternalState<T>;
  }
}

export interface HookOptions {
  // Override the client for this hook call. Useful in tests, or when
  // you genuinely need to hit two different UniRate accounts/proxies
  // from the same component tree.
  client?: UniRateClient;
  // If false, skip the request entirely until set to true. Mirrors
  // react-query's `enabled` knob so callers can defer fetching until
  // dependent state is ready (e.g. another hook's `data` arrives).
  enabled?: boolean;
}

function useQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: ReadonlyArray<unknown>,
  enabled = true,
): QueryState<T> {
  const [state, dispatch] = useReducer(reducer<T>, initialState as InternalState<T>);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Bumping this counter is how `refetch()` triggers a new effect run
  // without changing the externally-visible deps. Without it, refetch
  // either has to live in a separate useEffect (race-prone) or rely on
  // calling fetcher() outside React's lifecycle (loses cleanup).
  const [refetchCounter, bumpRefetch] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: "reset" });
      return;
    }
    const ctrl = new AbortController();
    dispatch({ type: "fetch" });
    fetcherRef.current(ctrl.signal).then(
      (data) => {
        if (!ctrl.signal.aborted) dispatch({ type: "success", data });
      },
      (err: unknown) => {
        if (ctrl.signal.aborted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        dispatch({ type: "error", error });
      },
    );
    return () => ctrl.abort();
    // The fetcher itself is intentionally not a dep: stale-closure-safe
    // via fetcherRef, and listing it would re-fire on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, refetchCounter]);

  const refetch = useCallback(() => bumpRefetch(), []);
  return { ...state, refetch };
}

export function useExchangeRate(
  from: string,
  to: string,
  options: HookOptions = {},
): QueryState<number> {
  const client = useUniRateClient(options.client);
  return useQuery<number>(
    async (signal) => {
      const r = await client.getRate(from, to, signal);
      return r as number;
    },
    [client, from, to],
    options.enabled,
  );
}

export function useRates(
  from: string,
  options: HookOptions = {},
): QueryState<Record<string, number>> {
  const client = useUniRateClient(options.client);
  return useQuery<Record<string, number>>(
    async (signal) => {
      const r = await client.getRate(from, undefined, signal);
      return r as Record<string, number>;
    },
    [client, from],
    options.enabled,
  );
}

export function useConvert(
  from: string,
  to: string,
  amount: number,
  options: HookOptions = {},
): QueryState<number> {
  const client = useUniRateClient(options.client);
  return useQuery<number>(
    async (signal) => client.convert(to, amount, from, signal),
    [client, from, to, amount],
    options.enabled,
  );
}

export function useCurrencies(options: HookOptions = {}): QueryState<string[]> {
  const client = useUniRateClient(options.client);
  return useQuery<string[]>(
    (signal) => client.listCurrencies(signal),
    [client],
    options.enabled,
  );
}

export function useHistoricalRate(
  date: string,
  from: string,
  to: string,
  amount = 1,
  options: HookOptions = {},
): QueryState<number> {
  const client = useUniRateClient(options.client);
  return useQuery<number>(
    async (signal) => {
      const r = await client.getHistoricalRate(date, amount, from, to, signal);
      return r as number;
    },
    [client, date, from, to, amount],
    options.enabled,
  );
}
