import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isNodeErrorCode } from "../lib/node-error.js";
import { sanitizePathPart } from "../lib/sanitize-path-part.js";
import type {
  MarketDataCheckpoint,
  MarketDataTimeframe,
  PersistedMarketDataSet,
  TdxFormulaKLineRecord,
} from "../types/market-data.js";

const TDX_FORMULA_DATA_DIR = path.join(".data", "tdx-formula-data");

export async function readMarketDataSet(
  symbol: string,
  timeframe: MarketDataTimeframe,
): Promise<PersistedMarketDataSet | null> {
  try {
    const content = await readFile(marketDataSetPath(symbol, timeframe), "utf8");
    return JSON.parse(content) as PersistedMarketDataSet;
  } catch (error) {
    if (isNodeErrorCode(error, "ENOENT")) {
      return null;
    }

    throw error;
  }
}

export async function readMarketDataCheckpoint(
  symbol: string,
  timeframe: MarketDataTimeframe,
): Promise<MarketDataCheckpoint | null> {
  try {
    const content = await readFile(marketDataCheckpointPath(symbol, timeframe), "utf8");
    return JSON.parse(content) as MarketDataCheckpoint;
  } catch (error) {
    if (isNodeErrorCode(error, "ENOENT")) {
      return null;
    }

    throw error;
  }
}

export async function writeMarketDataSet(
  symbol: string,
  timeframe: MarketDataTimeframe,
  sourceTimeframe: MarketDataTimeframe | null,
  latestTime: string | null,
  stockData: TdxFormulaKLineRecord[],
): Promise<PersistedMarketDataSet> {
  const dataSet: PersistedMarketDataSet = {
    symbol,
    timeframe,
    sourceTimeframe,
    updatedAt: new Date().toISOString(),
    latestTime,
    stockData,
  };

  await mkdir(TDX_FORMULA_DATA_DIR, { recursive: true });
  await writeFile(marketDataSetPath(symbol, timeframe), `${JSON.stringify(dataSet, null, 2)}\n`, "utf8");

  return dataSet;
}

export async function writeMarketDataCheckpoint(
  symbol: string,
  timeframe: MarketDataTimeframe,
  latestTime: string | null,
): Promise<MarketDataCheckpoint> {
  const checkpoint: MarketDataCheckpoint = {
    symbol,
    timeframe,
    updatedAt: new Date().toISOString(),
    latestTime,
  };

  await mkdir(TDX_FORMULA_DATA_DIR, { recursive: true });
  await writeFile(marketDataCheckpointPath(symbol, timeframe), `${JSON.stringify(checkpoint, null, 2)}\n`, "utf8");

  return checkpoint;
}

export function mergeMarketDataRecords(
  cachedRecords: TdxFormulaKLineRecord[],
  fetchedRecords: TdxFormulaKLineRecord[],
): TdxFormulaKLineRecord[] {
  const recordsByTime = new Map<string, TdxFormulaKLineRecord>();

  // Twelve Data start_date is inclusive, so the first fetched bar after a
  // checkpoint can be the same bar already stored locally. Keying by timestamp
  // lets the freshest provider copy replace the cached record without creating
  // duplicate bars in the raw 5-minute source of truth.
  for (const record of [...cachedRecords, ...fetchedRecords]) {
    recordsByTime.set(record.Date, record);
  }

  return [...recordsByTime.values()].sort(compareRecordsByTime);
}

export function lastRecordTime(records: TdxFormulaKLineRecord[]): string | null {
  return records.at(-1)?.Date ?? null;
}

function marketDataSetPath(symbol: string, timeframe: MarketDataTimeframe): string {
  return path.join(TDX_FORMULA_DATA_DIR, `${sanitizePathPart(symbol)}-${timeframe}.json`);
}

function marketDataCheckpointPath(symbol: string, timeframe: MarketDataTimeframe): string {
  return path.join(TDX_FORMULA_DATA_DIR, `${sanitizePathPart(symbol)}-${timeframe}-checkpoint.json`);
}

function compareRecordsByTime(left: TdxFormulaKLineRecord, right: TdxFormulaKLineRecord): number {
  return left.Date.localeCompare(right.Date);
}
