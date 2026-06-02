import type {
  MarketDataRecord,
  PullMarketDataOptions,
  TwelveDataFetchTimeSeriesOptions,
  TwelveDataTimeSeriesPayload,
} from "../types/market-data.js";
import { wait } from "./delay.js";
import { logTwelveDataRequest, logTwelveDataResponse } from "./market-data-log.js";
import { marketDataStartDate } from "./market-data-window.js";
import { toTdxLikeRecords } from "./tdx-records.js";

const TWELVE_DATA_TIME_SERIES_URL = "https://api.twelvedata.com/time_series";
const TWELVE_DATA_REQUEST_SPACING_MS = 2000;

type TwelveDataFetchTimeSeriesResult = {
  payload: TwelveDataTimeSeriesPayload;
  httpStatus: number;
};

export async function pullMarketDataFromTwelveData(options: PullMarketDataOptions): Promise<void> {
  const interval = options.interval.trim().toLowerCase();
  const stockList = options.symbols.map((symbol) => symbol.trim()).filter(Boolean);
  const startDate = marketDataStartDate(options.days);

  for (const [index, stock] of stockList.entries()) {
    if (index > 0) {
      await wait(TWELVE_DATA_REQUEST_SPACING_MS);
    }

    await fetchAndLogTwelveDataRecords(stock, interval, startDate);
  }
}

async function fetchAndLogTwelveDataRecords(
  stock: string,
  interval: string,
  startDate: string,
): Promise<MarketDataRecord[]> {
  // Fetch one symbol per request so provider errors can name the exact failing
  // symbol and each normalized record keeps the stock value the user supplied.
  const { payload, httpStatus } = await fetchTwelveDataTimeSeries({
    stock,
    interval,
    startDate,
  });

  if (!isSuccessfulTwelveDataPayload(payload, httpStatus)) {
    await logTwelveDataResponse(stock, payload, httpStatus, []);
    throw new Error(twelveDataFailureMessage(stock, payload, httpStatus));
  }

  const records = toTdxLikeRecords(stock, payload);
  await logTwelveDataResponse(stock, payload, httpStatus, records);

  return records;
}

async function fetchTwelveDataTimeSeries(
  options: TwelveDataFetchTimeSeriesOptions,
): Promise<TwelveDataFetchTimeSeriesResult> {
  const apiKey = process.env.TWELVE_DATA_API_KEY ?? process.env.TWELVEDATA_API_KEY;
  if (!apiKey) {
    throw new Error("Set TWELVE_DATA_API_KEY before pulling market data from Twelve Data.");
  }

  // Do not translate symbol or interval here. The caller is expected to pass
  // Twelve Data-compatible request values, e.g. AAPL + 30min or EUR/USD + 1day.
  const params = new URLSearchParams({
    symbol: options.stock,
    interval: options.interval,
    apikey: apiKey,
    format: "JSON",
    order: "asc",
    adjust: "all",
    start_date: options.startDate,
  });

  await logTwelveDataRequest(TWELVE_DATA_TIME_SERIES_URL, options.stock, params);

  const response = await fetch(`${TWELVE_DATA_TIME_SERIES_URL}?${params.toString()}`);
  const payload = await readTwelveDataPayload(response);

  return {
    payload,
    httpStatus: response.status,
  };
}

async function readTwelveDataPayload(response: Response): Promise<TwelveDataTimeSeriesPayload> {
  const responseText = await response.text();

  if (!responseText.trim()) {
    return {
      status: response.ok ? "ok" : "error",
      message: "",
    };
  }

  try {
    return JSON.parse(responseText) as TwelveDataTimeSeriesPayload;
  } catch {
    return {
      status: response.ok ? "ok" : "error",
      message: responseText,
    };
  }
}

function isSuccessfulTwelveDataPayload(payload: TwelveDataTimeSeriesPayload, httpStatus: number): boolean {
  // Provider errors are returned as JSON with status=error, often with HTTP
  // 200. Treat a missing values array as an error too, because the output
  // transformer can only build TDX-like bars from values[].
  return httpStatus >= 200 && httpStatus < 300 && payload.status !== "error" && Array.isArray(payload.values);
}

function twelveDataFailureMessage(stock: string, payload: TwelveDataTimeSeriesPayload, httpStatus: number): string {
  if (httpStatus < 200 || httpStatus >= 300) {
    return `Twelve Data time_series HTTP error for ${stock}: ${httpStatus}`;
  }

  return `Twelve Data time_series failed for ${stock}: ${JSON.stringify(payload)}`;
}
