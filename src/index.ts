export {
  AuthenticationError,
  InvalidCurrencyError,
  InvalidRequestError,
  ProRequiredError,
  RateLimitError,
  UniRateClient,
  UniRateError,
  type HistoricalLimitsResponse,
  type UniRateClientOptions,
  type VATEntry,
  type VATRateOne,
  type VATRatesAll,
} from "./client.js";

export {
  UniRateProvider,
  useUniRateClient,
  type UniRateProviderProps,
} from "./provider.js";

export {
  useConvert,
  useCurrencies,
  useExchangeRate,
  useHistoricalRate,
  useRates,
  type HookOptions,
  type QueryState,
} from "./hooks.js";

export { Currency, Rate, type CurrencyProps, type RateProps } from "./components.js";
