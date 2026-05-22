import { act, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { UniRateClient } from "../src/client.js";
import {
  useConvert,
  useCurrencies,
  useExchangeRate,
  useHistoricalRate,
  useRates,
} from "../src/hooks.js";
import { UniRateProvider } from "../src/provider.js";
import { makeFetch } from "./mock-fetch.js";

interface Wrapper {
  client: UniRateClient;
  wrap: React.FC<{ children: React.ReactNode }>;
}

function wrapperFor(routes: Parameters<typeof makeFetch>[0]): Wrapper & { calls: string[] } {
  const { fetch, calls } = makeFetch(routes);
  const client = new UniRateClient({ apiKey: "k", fetch });
  const wrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <UniRateProvider apiKey="k" fetch={fetch}>
      {children}
    </UniRateProvider>
  );
  return { client, wrap, calls };
}

function HookHarness<T>({
  use,
  onState,
}: {
  use: () => { data: T | undefined; error: Error | undefined; isLoading: boolean };
  onState: (s: { data: T | undefined; error: Error | undefined; isLoading: boolean }) => void;
}) {
  const state = use();
  useEffect(() => {
    onState(state);
  });
  return null;
}

describe("useExchangeRate", () => {
  it("resolves to a number", async () => {
    const { wrap } = wrapperFor({
      "/api/rates": { body: { rate: "0.92" } },
    });
    let last: { data: number | undefined; error: Error | undefined; isLoading: boolean } = {
      data: undefined,
      error: undefined,
      isLoading: true,
    };
    render(
      <HookHarness<number>
        use={() => useExchangeRate("USD", "EUR")}
        onState={(s) => {
          last = s;
        }}
      />,
      { wrapper: wrap },
    );
    await waitFor(() => expect(last.isLoading).toBe(false));
    expect(last.data).toBe(0.92);
    expect(last.error).toBeUndefined();
  });

  it("surfaces errors", async () => {
    const { wrap } = wrapperFor({
      "/api/rates": { status: 401, body: { error: "bad" } },
    });
    let last: { data: number | undefined; error: Error | undefined; isLoading: boolean } = {
      data: undefined,
      error: undefined,
      isLoading: true,
    };
    render(
      <HookHarness<number>
        use={() => useExchangeRate("USD", "EUR")}
        onState={(s) => {
          last = s;
        }}
      />,
      { wrapper: wrap },
    );
    await waitFor(() => expect(last.isLoading).toBe(false));
    expect(last.error?.name).toBe("AuthenticationError");
    expect(last.data).toBeUndefined();
  });

  it("respects enabled=false", async () => {
    const { wrap, calls } = wrapperFor({
      "/api/rates": { body: { rate: "1" } },
    });
    render(
      <HookHarness<number>
        use={() => useExchangeRate("USD", "EUR", { enabled: false })}
        onState={() => {}}
      />,
      { wrapper: wrap },
    );
    // Give React a tick to confirm no fetch fires.
    await new Promise((r) => setTimeout(r, 50));
    expect(calls).toHaveLength(0);
  });

  it("refetches when from/to change", async () => {
    const { wrap, calls } = wrapperFor({
      "/api/rates": { body: { rate: "0.92" } },
    });
    function Switcher({ to }: { to: string }) {
      useExchangeRate("USD", to);
      return null;
    }
    const { rerender } = render(<Switcher to="EUR" />, { wrapper: wrap });
    await waitFor(() => expect(calls.length).toBeGreaterThanOrEqual(1));
    rerender(<Switcher to="GBP" />);
    await waitFor(() => expect(calls.length).toBeGreaterThanOrEqual(2));
    expect(calls[0]).toMatch(/to=EUR/);
    expect(calls[1]).toMatch(/to=GBP/);
  });
});

describe("useRates", () => {
  it("returns the full map for a base", async () => {
    const { wrap } = wrapperFor({
      "/api/rates": { body: { rates: { EUR: "0.92", GBP: "0.80" } } },
    });
    let last: { data: Record<string, number> | undefined; isLoading: boolean; error: Error | undefined } = {
      data: undefined,
      isLoading: true,
      error: undefined,
    };
    render(
      <HookHarness<Record<string, number>>
        use={() => useRates("USD")}
        onState={(s) => {
          last = s;
        }}
      />,
      { wrapper: wrap },
    );
    await waitFor(() => expect(last.isLoading).toBe(false));
    expect(last.data).toEqual({ EUR: 0.92, GBP: 0.8 });
  });
});

describe("useConvert", () => {
  it("returns the converted amount", async () => {
    const { wrap } = wrapperFor({
      "/api/convert": { body: { result: "92.50" } },
    });
    let last: { data: number | undefined; isLoading: boolean; error: Error | undefined } = {
      data: undefined,
      isLoading: true,
      error: undefined,
    };
    render(
      <HookHarness<number>
        use={() => useConvert("USD", "EUR", 100)}
        onState={(s) => {
          last = s;
        }}
      />,
      { wrapper: wrap },
    );
    await waitFor(() => expect(last.isLoading).toBe(false));
    expect(last.data).toBe(92.5);
  });
});

describe("useCurrencies", () => {
  it("returns the array", async () => {
    const { wrap } = wrapperFor({
      "/api/currencies": { body: { currencies: ["USD", "EUR"] } },
    });
    let last: { data: string[] | undefined; isLoading: boolean; error: Error | undefined } = {
      data: undefined,
      isLoading: true,
      error: undefined,
    };
    render(
      <HookHarness<string[]>
        use={() => useCurrencies()}
        onState={(s) => {
          last = s;
        }}
      />,
      { wrapper: wrap },
    );
    await waitFor(() => expect(last.isLoading).toBe(false));
    expect(last.data).toEqual(["USD", "EUR"]);
  });
});

describe("useHistoricalRate", () => {
  it("returns the rate at a date", async () => {
    const { wrap } = wrapperFor({
      "/api/historical/rates": { body: { rate: "0.85" } },
    });
    let last: { data: number | undefined; isLoading: boolean; error: Error | undefined } = {
      data: undefined,
      isLoading: true,
      error: undefined,
    };
    render(
      <HookHarness<number>
        use={() => useHistoricalRate("2024-01-01", "USD", "EUR")}
        onState={(s) => {
          last = s;
        }}
      />,
      { wrapper: wrap },
    );
    await waitFor(() => expect(last.isLoading).toBe(false));
    expect(last.data).toBe(0.85);
  });

  it("propagates Pro-required errors", async () => {
    const { wrap } = wrapperFor({
      "/api/historical/rates": { status: 403, body: { error: "Pro only" } },
    });
    let last: { data: number | undefined; isLoading: boolean; error: Error | undefined } = {
      data: undefined,
      isLoading: true,
      error: undefined,
    };
    render(
      <HookHarness<number>
        use={() => useHistoricalRate("2020-01-01", "USD", "EUR")}
        onState={(s) => {
          last = s;
        }}
      />,
      { wrapper: wrap },
    );
    await waitFor(() => expect(last.isLoading).toBe(false));
    expect(last.error?.name).toBe("ProRequiredError");
  });
});

describe("UniRateProvider", () => {
  it("throws if a hook is used without a provider and no override", () => {
    const errors: Error[] = [];
    const orig = console.error;
    console.error = () => {};
    try {
      expect(() =>
        render(
          <HookHarness<number>
            use={() => useExchangeRate("USD", "EUR")}
            onState={() => {}}
          />,
        ),
      ).toThrow(/no <UniRateProvider>/);
    } finally {
      console.error = orig;
      errors.length;
    }
  });

  it("accepts an override client per hook", async () => {
    const { fetch } = makeFetch({
      "/api/rates": { body: { rate: "1.5" } },
    });
    const client = new UniRateClient({ apiKey: "override", fetch });
    let last: { data: number | undefined; isLoading: boolean } = {
      data: undefined,
      isLoading: true,
    };
    render(
      <HookHarness<number>
        use={() => useExchangeRate("USD", "EUR", { client })}
        onState={(s) => {
          last = s;
        }}
      />,
    );
    await waitFor(() => expect(last.isLoading).toBe(false));
    expect(last.data).toBe(1.5);
  });
});

describe("refetch()", () => {
  it("re-runs the request when called", async () => {
    let counter = 0;
    const { fetch } = makeFetch({});
    // Custom fetch that returns sequential values
    const sequentialFetch = (async (_input: string | URL) => {
      counter += 1;
      return new Response(JSON.stringify({ rate: counter }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;
    void fetch;
    const client = new UniRateClient({ apiKey: "k", fetch: sequentialFetch });
    let lastState: { data: number | undefined; isLoading: boolean; refetch: () => void } = {
      data: undefined,
      isLoading: true,
      refetch: () => {},
    };
    function Capture() {
      const state = useExchangeRate("USD", "EUR", { client });
      lastState = state;
      return null;
    }
    render(<Capture />);
    await waitFor(() => expect(lastState.isLoading).toBe(false));
    expect(lastState.data).toBe(1);
    act(() => lastState.refetch());
    await waitFor(() => expect(lastState.data).toBe(2));
  });
});
