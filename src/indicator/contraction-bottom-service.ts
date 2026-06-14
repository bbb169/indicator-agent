import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sanitizePathPart } from "../lib/sanitize-path-part.js";
import { formatNasdaqMarketDateTime, NASDAQ_MARKET_TIME_ZONE } from "../market-data/market-timezone.js";
import type { MarketDataTimeframe } from "../types/market-data.js";
import { findLatestMultipleContractionBottom } from "./contraction-bottom-detector.js";
import { readIndicatorResult } from "./indicator-result-store.js";
import { toMacdSignalRows } from "./macd-signal-normalizer.js";
import {
  MACD_TIMEFRAME_LADDER,
  type LatestMultipleContractionBottomResult,
  type MacdSignalRow,
} from "./macd-signal-types.js";

export type JudgePersistedMacdContractionBottomOptions = {
  script: string;
  symbol: string;
  timeframes?: MarketDataTimeframe[];
  histogramTitle?: string;
  latestWindowSize?: number;
  largerCount?: number;
};

export type PersistedMacdContractionBottomReport = {
  symbol: string;
  availableTimeframes: MarketDataTimeframe[];
  result: LatestMultipleContractionBottomResult;
};

export type PersistedMacdContractionBottomBatchReport = {
  script: string;
  timezone: string;
  generatedAt: string;
  requestedSymbols: string[];
  checkedSymbols: string[];
  matchedSymbols: string[];
  invalidSymbols: Array<{ symbol: string; reason: string }>;
  results: PersistedMacdContractionBottomReport[];
};

const CONTRACTION_BOTTOM_RESULT_DIR = path.join(".data", "contraction-bottom-results");

export async function judgePersistedMacdContractionBottom(
  options: JudgePersistedMacdContractionBottomOptions,
): Promise<LatestMultipleContractionBottomResult> {
  const { rowsByTimeframe } = await readMacdRowsByTimeframe(options);

  return findLatestMultipleContractionBottom({
    rowsByTimeframe,
    latestWindowSize: options.latestWindowSize,
    largerCount: options.largerCount,
  });
}

export async function writePersistedMacdContractionBottomBatchReport(options: {
  script: string;
  symbols: string[];
  timeframes?: MarketDataTimeframe[];
  histogramTitle?: string;
  latestWindowSize?: number;
  largerCount?: number;
}): Promise<string> {
  const requestedSymbols = normalizeReportSymbols(options.symbols);
  const checkedReports = await Promise.all(
    requestedSymbols.map((symbol) => checkSymbolContractionBottom({ ...options, symbol })),
  );
  const results = checkedReports.filter((report) => report.availableTimeframes.length > 0);
  const invalidSymbols = checkedReports
    .filter((report) => report.availableTimeframes.length === 0)
    .map((report) => ({ symbol: report.symbol, reason: "No persisted MACD indicator results were found." }));

  const batchReport: PersistedMacdContractionBottomBatchReport = {
    script: options.script,
    timezone: NASDAQ_MARKET_TIME_ZONE,
    generatedAt: formatNasdaqMarketDateTime(),
    requestedSymbols,
    checkedSymbols: results.map((report) => report.symbol),
    matchedSymbols: results.filter((report) => report.result.matched).map((report) => report.symbol),
    invalidSymbols,
    results,
  };
  const outputPath = contractionBottomBatchReportPath(options.script);

  await writeJsonFile(outputPath, batchReport);

  return outputPath;
}

async function checkSymbolContractionBottom(
  options: JudgePersistedMacdContractionBottomOptions,
): Promise<PersistedMacdContractionBottomReport> {
  const { rowsByTimeframe, availableTimeframes } = await readMacdRowsByTimeframe(options);
  const result = findLatestMultipleContractionBottom({
    rowsByTimeframe,
    latestWindowSize: options.latestWindowSize,
    largerCount: options.largerCount,
  });

  return {
    symbol: options.symbol,
    availableTimeframes,
    result,
  };
}

async function readMacdRowsByTimeframe(options: JudgePersistedMacdContractionBottomOptions): Promise<{
  rowsByTimeframe: Partial<Record<MarketDataTimeframe, MacdSignalRow[]>>;
  availableTimeframes: MarketDataTimeframe[];
}> {
  const timeframes = options.timeframes ?? [...MACD_TIMEFRAME_LADDER];
  const rowsByTimeframe: Partial<Record<MarketDataTimeframe, MacdSignalRow[]>> = {};
  const availableTimeframes: MarketDataTimeframe[] = [];

  for (const timeframe of timeframes) {
    const result = await readIndicatorResult(options.script, options.symbol, timeframe);

    if (result === null) {
      continue;
    }

    rowsByTimeframe[timeframe] = toMacdSignalRows(result, options.histogramTitle);
    availableTimeframes.push(timeframe);
  }

  return {
    rowsByTimeframe,
    availableTimeframes,
  };
}

async function writeJsonFile(outputPath: string, value: unknown): Promise<void> {
  await mkdir(CONTRACTION_BOTTOM_RESULT_DIR, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function contractionBottomBatchReportPath(script: string): string {
  return path.join(CONTRACTION_BOTTOM_RESULT_DIR, `${sanitizePathPart(script)}-watchlist.json`);
}

function normalizeReportSymbols(symbols: string[]): string[] {
  return [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];
}
