import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { UniRateClient, UniRateError, type UniRateClientOptions } from "./client.js";

interface ContextValue {
  client: UniRateClient;
}

const UniRateContext = createContext<ContextValue | null>(null);

export interface UniRateProviderProps extends UniRateClientOptions {
  children: ReactNode;
}

// Wrap your app once. All hooks below read their client from context;
// you can also pass `client` to a hook directly to override per-call
// (handy for tests or for hitting a second UniRate base URL).
export function UniRateProvider({ children, ...opts }: UniRateProviderProps) {
  const client = useMemo(
    () => new UniRateClient(opts),
    [opts.apiKey, opts.baseUrl, opts.fetch, opts.timeoutMs, opts.userAgent],
  );
  const value = useMemo<ContextValue>(() => ({ client }), [client]);
  return <UniRateContext.Provider value={value}>{children}</UniRateContext.Provider>;
}

export function useUniRateClient(override?: UniRateClient): UniRateClient {
  const ctx = useContext(UniRateContext);
  if (override) return override;
  if (!ctx) {
    throw new UniRateError(
      "useUniRateClient: no <UniRateProvider> in tree — wrap your app or pass `client` to the hook directly.",
    );
  }
  return ctx.client;
}
