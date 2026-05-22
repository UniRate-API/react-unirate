# react-unirate

[![npm](https://img.shields.io/npm/v/react-unirate.svg)](https://www.npmjs.com/package/react-unirate)
[![ci](https://github.com/UniRate-API/react-unirate/actions/workflows/ci.yml/badge.svg)](https://github.com/UniRate-API/react-unirate/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

React hooks and components for the [UniRate](https://unirateapi.com) currency-exchange API.

- `useExchangeRate(from, to)` — single rate
- `useRates(from)` — full rate table for a base
- `useConvert(from, to, amount)` — converted amount
- `useCurrencies()` — list of supported codes (~600)
- `useHistoricalRate(date, from, to)` — historical rate (Pro)
- `<Currency amount from to />` — drop-in `€92.50` JSX
- `<Rate from to />` — drop-in `1.0823` JSX
- `<UniRateProvider>` — one client for the whole tree
- Zero runtime deps. Native `fetch`. AbortController cleanup on unmount.

## Install

```sh
npm install react-unirate
# or
pnpm add react-unirate
# or
yarn add react-unirate
```

Peer dep: `react ^18 || ^19`. Requires Node 18.17+ for build/server use.

## Quickstart

```tsx
import { UniRateProvider, useExchangeRate, Currency } from "react-unirate";

function App() {
  return (
    <UniRateProvider apiKey={process.env.NEXT_PUBLIC_UNIRATE_API_KEY!}>
      <Cart />
    </UniRateProvider>
  );
}

function Cart() {
  const { data: rate, isLoading } = useExchangeRate("USD", "EUR");
  if (isLoading) return <p>Loading…</p>;
  return (
    <p>
      1 USD = {rate} EUR. Your total:{" "}
      <Currency amount={42.99} from="USD" to="EUR" />
    </p>
  );
}
```

Get a free API key at [unirateapi.com](https://unirateapi.com) — the free tier covers latest rates and conversions for ~600 currencies including crypto. Historical rates, time-series, and commodity feeds require Pro.

## Hooks

Every hook returns the same shape:

```ts
interface QueryState<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;  // true on the very first fetch only
  isFetching: boolean; // true on every refetch including the first
  refetch: () => void; // re-run the request manually
}
```

Every hook also accepts an options object:

```ts
{
  client?: UniRateClient;  // override the provider's client
  enabled?: boolean;       // skip the fetch until true (default true)
}
```

### `useExchangeRate(from, to, options?)`

```tsx
const { data, error, isLoading } = useExchangeRate("USD", "EUR");
// data: 0.92
```

### `useRates(from, options?)`

Returns the full rate table for a base.

```tsx
const { data } = useRates("USD");
// data: { EUR: 0.92, GBP: 0.80, JPY: 154.21, ... }
```

### `useConvert(from, to, amount, options?)`

```tsx
const { data } = useConvert("USD", "EUR", 100);
// data: 92.50
```

### `useCurrencies(options?)`

```tsx
const { data: codes } = useCurrencies();
// data: ["USD", "EUR", "GBP", "JPY", "BTC", ...]
```

### `useHistoricalRate(date, from, to, amount?, options?)`

> **Pro endpoint.** Returns `ProRequiredError` on the free tier.

```tsx
const { data } = useHistoricalRate("2025-01-01", "USD", "EUR");
// data: 0.851
```

## Components

### `<Currency amount from? to decimals? locale? loading? fallback? />`

Renders one converted, locale-formatted amount.

```tsx
<Currency amount={1234.56} from="USD" to="EUR" />
// → "€1,141.97"

<Currency amount={100} to="EUR" loading="Converting…" />
// from defaults to "USD"; renders "Converting…" until the rate arrives

<Currency
  amount={100}
  from="USD"
  to="EUR"
  fallback={(err) => <span title={err.message}>n/a</span>}
/>
```

On error with no `fallback` prop, `<Currency>` falls back to the unconverted amount in the source currency so layouts don't collapse.

### `<Rate from to decimals? locale? />`

Renders a bare exchange-rate number.

```tsx
<Rate from="EUR" to="USD" />          // → "1.0823"
<Rate from="EUR" to="USD" decimals={2} /> // → "1.08"
```

## Browser security

Putting an API key directly in client-side React means the key ships to every visitor's browser. For production deployments you have two options:

1. **Proxy through your backend.** Point `baseUrl` at your own endpoint and have that endpoint hold the real `UNIRATE_API_KEY`:
   ```tsx
   <UniRateProvider apiKey="placeholder" baseUrl="/api/unirate" />
   ```
   The placeholder still passes the client's "apiKey is required" check; your server inspects requests and inserts the real key before forwarding to `api.unirateapi.com`.

2. **Free-tier-only public key.** Free-tier UniRate keys are rate-limited per key; if a leaked key only unlocks endpoints you don't mind being shared, shipping it client-side is acceptable.

Server-only React (RSC, Remix loaders, server actions): you can use the raw `UniRateClient` directly without the provider, since there's no client component involved.

```ts
import { UniRateClient } from "react-unirate/client";

// in a server action / loader:
const client = new UniRateClient({ apiKey: process.env.UNIRATE_API_KEY! });
const rate = await client.getRate("USD", "EUR");
```

## Errors

The same error classes the hooks expose are also exported for `instanceof` checks:

- `AuthenticationError` — 401, bad / missing key
- `RateLimitError` — 429
- `InvalidCurrencyError` — 404, unknown currency code
- `InvalidRequestError` — 400, bad params
- `ProRequiredError` — 403, endpoint requires a Pro subscription
- `UniRateError` — base class for any other failure

```tsx
const { error } = useExchangeRate("USD", "XYZ");
if (error instanceof InvalidCurrencyError) {
  return <p>Unsupported currency.</p>;
}
```

## License

MIT © UniRate API
