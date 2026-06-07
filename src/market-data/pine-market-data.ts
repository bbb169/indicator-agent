import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import utc from "dayjs/plugin/utc.js";
import type {
  MarketDataCandle,
  TwelveDataBar,
  TwelveDataTimeSeriesPayload,
} from "../types/market-data.js";

const MARKET_DATA_DECIMALS = 6;
const MARKET_DATA_DATE_FORMAT = "YYYY-MM-DD HH:mm:ss";
const RAW_FIVE_MINUTE_CLOSE_TIME_MS = 5 * 60 * 1000;

dayjs.extend(customParseFormat);
dayjs.extend(utc);

export function toPineMarketDataCandles(
  stock: string,
  payload: TwelveDataTimeSeriesPayload,
): MarketDataCandle[] {
  return (payload.values ?? []).map((bar) => toPineMarketDataCandle(stock, bar));
}

function toPineMarketDataCandle(stock: string, bar: TwelveDataBar): MarketDataCandle {
  const openTime = normalizePineOpenTime(bar.datetime ?? null);
  const values = {
    open: numericProviderValue(bar.open),
    high: numericProviderValue(bar.high),
    low: numericProviderValue(bar.low),
    close: numericProviderValue(bar.close),
  };

  // Pine indicators need complete OHLC bars. A timestamp or price gap is more
  // dangerous than a missing volume, because indicator calculations would
  // receive a fake candle. Stop the whole refresh here so abnormal provider data
  // cannot silently flow into later steps.
  assertCompleteOhlc(values, { stock, ...bar });

  return {
    time: dayjs.utc(openTime).format(MARKET_DATA_DATE_FORMAT),
    openTime,
    closeTimeText: dayjs.utc(openTime + RAW_FIVE_MINUTE_CLOSE_TIME_MS).format(MARKET_DATA_DATE_FORMAT),
    closeTime: openTime + RAW_FIVE_MINUTE_CLOSE_TIME_MS,
    open: roundMarketDataNumber(values.open),
    high: roundMarketDataNumber(values.high),
    low: roundMarketDataNumber(values.low),
    close: roundMarketDataNumber(values.close),
    volume: roundMarketDataNumber(numericProviderValue(bar.volume) ?? 0),
    quoteAssetVolume: 0,
    numberOfTrades: 0,
    takerBuyBaseAssetVolume: 0,
    takerBuyQuoteAssetVolume: 0,
    ignore: 0,
  };
}

function normalizePineOpenTime(value: string | null): number {
  if (value === null || value.trim() === "") {
    throw new Error("Cannot format PineTS market-data candle without a timestamp.");
  }

  const trimmedValue = value.trim();

  // Twelve Data emits wall-clock strings such as "YYYY-MM-DD HH:mm:ss".
  // Strict Dayjs parsing keeps invalid calendar values, such as 2026-02-31,
  // from being normalized into a different date and later fed into PineTS.
  const parsedDate = parsePineDate(trimmedValue, MARKET_DATA_DATE_FORMAT)
    // Some future daily rows may only carry a date. Fill daily-only values with
    // midnight so PineTS receives one consistent timestamp format.
    ?? parsePineDate(trimmedValue, "YYYY-MM-DD")
    ?? null;

  if (parsedDate === null) {
    throw new Error(`Cannot format invalid market-data timestamp: ${value}`);
  }

  return parsedDate;
}

function parsePineDate(value: string, format: string): number | null {
  const parsedDate = dayjs.utc(value, format, true);

  return parsedDate.isValid() ? parsedDate.valueOf() : null;
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
    throw new Error(`Cannot format abnormal market-data candle: ${JSON.stringify(source)}`);
  }
}

function roundMarketDataNumber(value: number): number {
  return Number(value.toFixed(MARKET_DATA_DECIMALS));
}
