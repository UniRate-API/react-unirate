import { describe, expect, it } from "vitest";
import {
  AuthenticationError,
  InvalidCurrencyError,
  InvalidRequestError,
  ProRequiredError,
  RateLimitError,
  UniRateClient,
  UniRateError,
} from "../src/client.js";
import { makeFetch } from "./mock-fetch.js";

describe("UniRateClient", () => {
  it("rejects construction without an api key", () => {
    expect(() => new UniRateClient({ apiKey: "" })).toThrow(UniRateError);
  });

  it("getRate(from, to) returns a single number", async () => {
    const { fetch, calls } = makeFetch({
      "/api/rates": { body: { rate: "0.925" } },
    });
    const c = new UniRateClient({ apiKey: "k", fetch });
    const r = await c.getRate("USD", "EUR");
    expect(r).toBe(0.925);
    expect(calls[0]).toMatch(/from=USD/);
    expect(calls[0]).toMatch(/to=EUR/);
    expect(calls[0]).toMatch(/api_key=k/);
  });

  it("getRate(from) returns the full map", async () => {
    const { fetch } = makeFetch({
      "/api/rates": { body: { rates: { EUR: "0.92", GBP: "0.80" } } },
    });
    const c = new UniRateClient({ apiKey: "k", fetch });
    const r = await c.getRate("USD");
    expect(r).toEqual({ EUR: 0.92, GBP: 0.8 });
  });

  it("convert returns a number", async () => {
    const { fetch } = makeFetch({
      "/api/convert": { body: { result: "92.50" } },
    });
    const c = new UniRateClient({ apiKey: "k", fetch });
    expect(await c.convert("EUR", 100, "USD")).toBe(92.5);
  });

  it("listCurrencies returns the array", async () => {
    const { fetch } = makeFetch({
      "/api/currencies": { body: { currencies: ["USD", "EUR", "GBP"] } },
    });
    const c = new UniRateClient({ apiKey: "k", fetch });
    expect(await c.listCurrencies()).toEqual(["USD", "EUR", "GBP"]);
  });

  it("getHistoricalRate with to+amount=1 uses rate", async () => {
    const { fetch } = makeFetch({
      "/api/historical/rates": { body: { rate: "0.9" } },
    });
    const c = new UniRateClient({ apiKey: "k", fetch });
    expect(await c.getHistoricalRate("2025-01-01", 1, "USD", "EUR")).toBe(0.9);
  });

  it("getHistoricalRate with to+amount!=1 uses result", async () => {
    const { fetch } = makeFetch({
      "/api/historical/rates": { body: { result: "90" } },
    });
    const c = new UniRateClient({ apiKey: "k", fetch });
    expect(await c.getHistoricalRate("2025-01-01", 100, "USD", "EUR")).toBe(90);
  });

  it("maps 401 to AuthenticationError", async () => {
    const { fetch } = makeFetch({
      "/api/rates": { status: 401, body: { error: "bad key" } },
    });
    const c = new UniRateClient({ apiKey: "k", fetch });
    await expect(c.getRate("USD", "EUR")).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("maps 403 to ProRequiredError", async () => {
    const { fetch } = makeFetch({
      "/api/historical/rates": { status: 403, body: { error: "Pro only" } },
    });
    const c = new UniRateClient({ apiKey: "k", fetch });
    await expect(
      c.getHistoricalRate("2020-01-01", 1, "USD", "EUR"),
    ).rejects.toBeInstanceOf(ProRequiredError);
  });

  it("maps 404 to InvalidCurrencyError", async () => {
    const { fetch } = makeFetch({
      "/api/rates": { status: 404, body: { error: "no data" } },
    });
    const c = new UniRateClient({ apiKey: "k", fetch });
    await expect(c.getRate("USD", "XYZ")).rejects.toBeInstanceOf(InvalidCurrencyError);
  });

  it("maps 429 to RateLimitError", async () => {
    const { fetch } = makeFetch({
      "/api/rates": { status: 429, body: { error: "slow down" } },
    });
    const c = new UniRateClient({ apiKey: "k", fetch });
    await expect(c.getRate("USD", "EUR")).rejects.toBeInstanceOf(RateLimitError);
  });

  it("maps 400 to InvalidRequestError", async () => {
    const { fetch } = makeFetch({
      "/api/rates": { status: 400, body: { error: "missing from" } },
    });
    const c = new UniRateClient({ apiKey: "k", fetch });
    await expect(c.getRate("USD", "EUR")).rejects.toBeInstanceOf(InvalidRequestError);
  });

  it("sets Accept: application/json on every request", async () => {
    const { fetch, mock } = makeFetch({
      "/api/currencies": { body: { currencies: ["USD"] } },
    });
    const c = new UniRateClient({ apiKey: "k", fetch });
    await c.listCurrencies();
    const init = mock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Accept).toBe("application/json");
  });

  it("rejects malformed /api/rates response", async () => {
    const { fetch } = makeFetch({
      "/api/rates": { body: { not_rate: 1 } },
    });
    const c = new UniRateClient({ apiKey: "k", fetch });
    await expect(c.getRate("USD", "EUR")).rejects.toBeInstanceOf(UniRateError);
  });

  it("rejects non-JSON success response", async () => {
    const { fetch } = makeFetch({
      "/api/rates": { rawText: "<html>404</html>", status: 200 },
    });
    const c = new UniRateClient({ apiKey: "k", fetch });
    await expect(c.getRate("USD", "EUR")).rejects.toBeInstanceOf(UniRateError);
  });

  it("forwards user signal to fetch and surfaces abort", async () => {
    const { fetch } = makeFetch({
      "/api/rates": { delay: 5_000, body: { rate: "1" } },
    });
    const c = new UniRateClient({ apiKey: "k", fetch });
    const ctrl = new AbortController();
    const p = c.getRate("USD", "EUR", ctrl.signal);
    ctrl.abort();
    await expect(p).rejects.toThrow();
  });

  it("uppercases currency codes in query params", async () => {
    const { fetch, calls } = makeFetch({
      "/api/rates": { body: { rate: "1" } },
    });
    const c = new UniRateClient({ apiKey: "k", fetch });
    await c.getRate("usd", "eur");
    expect(calls[0]).toMatch(/from=USD/);
    expect(calls[0]).toMatch(/to=EUR/);
  });
});
