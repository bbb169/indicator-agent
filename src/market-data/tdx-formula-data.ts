import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import type {
  TwelveDataBar,
  TwelveDataTimeSeriesPayload,
  TdxFormulaKLineRecord,
} from "../types/market-data.js";

const TDX_FORMULA_DECIMALS = 6;
const TDX_FORMULA_DATE_FORMAT = "YYYY-MM-DD HH:mm:ss";

dayjs.extend(customParseFormat);

export function toTdxFormulaRecords(
  stock: string,
  payload: TwelveDataTimeSeriesPayload,
): TdxFormulaKLineRecord[] {
  return (payload.values ?? []).map((bar) => toTdxFormulaRecord(stock, bar));
}

function toTdxFormulaRecord(stock: string, bar: TwelveDataBar): TdxFormulaKLineRecord {
  const date = normalizeFormulaDate(bar.datetime ?? null);
  const values = {
    open: numericProviderValue(bar.open),
    high: numericProviderValue(bar.high),
    low: numericProviderValue(bar.low),
    close: numericProviderValue(bar.close),
  };

  // TDX formula_set_data needs complete OHLC bars. A timestamp or price gap is
  // more dangerous than a missing volume, because formula calculations would
  // receive a fake candle. Stop the whole refresh here so abnormal provider data
  // cannot silently flow into later formula steps.
  assertCompleteOhlc(values, { stock, ...bar });

  return {
    Date: date,
    // Twelve Data's time_series response used by this project has no turnover
    // amount field. Keep the SDK-compatible key and use 0 until a real Amount
    // source is added.
    Amount: 0,
    Volume: roundFormulaNumber(numericProviderValue(bar.volume) ?? 0),
    Close: roundFormulaNumber(values.close),
    Open: roundFormulaNumber(values.open),
    High: roundFormulaNumber(values.high),
    Low: roundFormulaNumber(values.low),
  };
}

function normalizeFormulaDate(value: string | null): string {
  if (value === null || value.trim() === "") {
    throw new Error("Cannot format TDX formula K-line record without a timestamp.");
  }

  const trimmedValue = value.trim();

  // Tongdaxin's formatter emits "YYYY-MM-DD HH:mm:ss". Existing market-data
  // cache rows already use that shape for intraday bars. Strict Dayjs parsing
  // keeps invalid calendar values, such as 2026-02-31, from being normalized
  // into a different date and later fed into formula_set_data.
  const parsedDate = parseFormulaDate(trimmedValue, TDX_FORMULA_DATE_FORMAT)
    // Some future daily rows may only carry a date. Fill daily-only values with
    // midnight so Step 2 can pass one consistent timestamp format to TDX.
    ?? parseFormulaDate(trimmedValue, "YYYY-MM-DD")
    ?? null;

  if (parsedDate === null) {
    throw new Error(`Cannot format invalid TDX formula timestamp: ${value}`);
  }

  return parsedDate;
}

function parseFormulaDate(value: string, format: string): string | null {
  const parsedDate = dayjs(value, format, true);

  return parsedDate.isValid() ? parsedDate.format(TDX_FORMULA_DATE_FORMAT) : null;
}

function numericProviderValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  const numericValue = typeof value === "number" ? value : Number(value.trim());

  return Number.isFinite(numericValue) ? numericValue : null;
}

function assertCompleteOhlc(
  values: { open: number | null; high: number | null; low: number | null; close: number | null },
  source: object,
): asserts values is { open: number; high: number; low: number; close: number } {
  if (values.open === null || values.high === null || values.low === null || values.close === null) {
    throw new Error(`Cannot format abnormal TDX formula K-line record: ${JSON.stringify(source)}`);
  }
}

function roundFormulaNumber(value: number): number {
  return Number(value.toFixed(TDX_FORMULA_DECIMALS));
}
