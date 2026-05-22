import type { ReactNode } from "react";
import { useConvert, useExchangeRate } from "./hooks.js";

export interface CurrencyProps {
  // The amount in `from` currency to render.
  amount: number;
  // Source currency code (uppercase). Defaults to "USD".
  from?: string;
  // Target currency code (uppercase). Required.
  to: string;
  // Number of fraction digits. Defaults to 2.
  decimals?: number;
  // BCP-47 locale for Intl.NumberFormat. Defaults to the runtime's
  // current locale.
  locale?: string;
  // Render this while the conversion is loading. Defaults to "…".
  loading?: ReactNode;
  // Render this if the conversion fails. Receives the error. Defaults
  // to rendering the unconverted amount in `from` so layouts don't
  // collapse.
  fallback?: (error: Error) => ReactNode;
}

function formatMoney(
  amount: number,
  currency: string,
  decimals: number,
  locale?: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

// Inline conversion display: `<Currency amount={100} from="USD" to="EUR" />`
// renders "€92.50" once the rate arrives. Useful for product prices,
// totals, and anywhere a single converted value needs to land in JSX.
export function Currency({
  amount,
  from = "USD",
  to,
  decimals = 2,
  locale,
  loading = "…",
  fallback,
}: CurrencyProps) {
  const { data, error, isLoading } = useConvert(from, to, amount);
  if (isLoading) return <>{loading}</>;
  if (error) {
    if (fallback) return <>{fallback(error)}</>;
    return <>{formatMoney(amount, from, decimals, locale)}</>;
  }
  if (data === undefined) return <>{loading}</>;
  return <>{formatMoney(data, to, decimals, locale)}</>;
}

export interface RateProps {
  from: string;
  to: string;
  decimals?: number;
  locale?: string;
  loading?: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

// Renders a bare exchange-rate number: `<Rate from="EUR" to="USD" />`
// renders "1.0823" once it arrives. Use this for ticker / dashboard
// surfaces where you want the raw rate, not a converted amount.
export function Rate({
  from,
  to,
  decimals = 4,
  locale,
  loading = "…",
  fallback,
}: RateProps) {
  const { data, error, isLoading } = useExchangeRate(from, to);
  if (isLoading) return <>{loading}</>;
  if (error) {
    if (fallback) return <>{fallback(error)}</>;
    return <>{loading}</>;
  }
  if (data === undefined) return <>{loading}</>;
  return (
    <>
      {new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(data)}
    </>
  );
}
