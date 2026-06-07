import { readFile } from "node:fs/promises";
import path from "node:path";
import { PineTS } from "pinets";
import { isNodeErrorCode } from "../lib/node-error.js";
import { sanitizePathPart } from "../lib/sanitize-path-part.js";
import { formatMarketDataTime, readMarketDataSet } from "../market-data/market-data-store.js";
import type {
  IndicatorResultRow,
  IndicatorPlotPoint,
  MarketDataTimeframe,
  PersistedIndicatorResult,
} from "../types/market-data.js";
import { writeIndicatorResult } from "./indicator-result-store.js";

export type RunPineIndicatorOptions = {
  script: string;
  symbols: string[];
  timeframe: MarketDataTimeframe;
};

const PINE_SCRIPT_DIR = path.join("config", "scripts");

export async function runPineIndicator(options: RunPineIndicatorOptions): Promise<string[]> {
  const scriptName = normalizeScriptName(options.script);
  const scriptSource = await readPineScript(scriptName);
  const outputPaths: string[] = [];

  for (const symbol of options.symbols.map((value) => value.trim()).filter(Boolean)) {
    const dataSet = await readMarketDataSet(symbol, options.timeframe);

    if (dataSet === null) {
      throw new Error(`Missing market data cache for ${symbol} ${options.timeframe}.`);
    }

    if (dataSet.stockData.length === 0) {
      throw new Error(`Cannot run Pine indicator with empty market data for ${symbol} ${options.timeframe}.`);
    }

    assertPineCandles(dataSet.stockData, symbol, options.timeframe);

    const pineTS = new PineTS(dataSet.stockData, dataSet.symbol, dataSet.timeframe, dataSet.stockData.length);
    const context = await pineTS.run(scriptSource);
    const firstTime = dataSet.stockData[0] ? formatMarketDataTime(dataSet.stockData[0].openTime) : null;
    const latestTime = dataSet.latestTime;
    const result: PersistedIndicatorResult = {
      script: scriptName,
      symbol: dataSet.symbol,
      timeframe: dataSet.timeframe,
      generatedAt: new Date().toISOString(),
      barCount: dataSet.stockData.length,
      firstTime,
      latestTime,
      timeRange: { firstTime, latestTime },
      ...normalizePinePlotRows(context.plots),
    };

    const outputPath = await writeIndicatorResult(result);
    outputPaths.push(outputPath);
    process.stderr.write(`[pine] ${scriptName} ${dataSet.symbol} ${dataSet.timeframe} -> ${outputPath}\n`);
  }

  return outputPaths;
}

function normalizeScriptName(script: string): string {
  const trimmedScript = script.trim();

  if (trimmedScript === "") {
    throw new Error("Pine script name cannot be blank.");
  }

  return trimmedScript.endsWith(".md") ? trimmedScript.slice(0, -3) : trimmedScript;
}

async function readPineScript(scriptName: string): Promise<string> {
  const scriptPath = path.join(PINE_SCRIPT_DIR, `${sanitizePathPart(scriptName)}.md`);

  try {
    return await readFile(scriptPath, "utf8");
  } catch (error) {
    if (isNodeErrorCode(error, "ENOENT")) {
      throw new Error(`Missing Pine script: ${scriptPath}`);
    }

    throw error;
  }
}

function normalizePinePlotRows(plots: unknown): { plotTitles: string[]; values: IndicatorResultRow[] } {
  const plotSeries = normalizePinePlotSeries(plots);
  const plotTitles = Object.keys(plotSeries);
  const rowCount = Math.max(0, ...Object.values(plotSeries).map((series) => series.length));
  const values: IndicatorResultRow[] = [];

  for (let index = 0; index < rowCount; index += 1) {
    const timePoint = firstPlotPointAtIndex(plotSeries, index);
    const row: IndicatorResultRow = {
      time: timePoint?.time ?? formatMarketDataTime(0),
      openTime: timePoint?.openTime ?? 0,
    };

    for (const title of plotTitles) {
      row[title] = plotSeries[title]?.[index]?.value ?? null;
    }

    values.push(row);
  }

  return { plotTitles, values };
}

function normalizePinePlotSeries(plots: unknown): Record<string, IndicatorPlotPoint[]> {
  if (plots === null || typeof plots !== "object") {
    return {};
  }

  const normalizedPlots: Record<string, IndicatorPlotPoint[]> = {};

  for (const [title, plot] of Object.entries(plots)) {
    if (title.startsWith("__")) {
      continue;
    }

    const data = plot !== null && typeof plot === "object" && "data" in plot ? (plot as { data?: unknown }).data : null;
    if (!Array.isArray(data)) {
      normalizedPlots[title] = [];
      continue;
    }

    normalizedPlots[title] = data.map((point) => normalizePlotPoint(point));
  }

  return normalizedPlots;
}

function firstPlotPointAtIndex(
  plotSeries: Record<string, IndicatorPlotPoint[]>,
  index: number,
): IndicatorPlotPoint | null {
  for (const series of Object.values(plotSeries)) {
    const point = series[index];
    if (point !== undefined) {
      return point;
    }
  }

  return null;
}

function normalizePlotPoint(point: unknown): IndicatorPlotPoint {
  const source = point !== null && typeof point === "object" ? (point as Record<string, unknown>) : {};
  const openTime = typeof source.time === "number" && Number.isFinite(source.time) ? source.time : 0;
  const value = typeof source.value === "number" && Number.isFinite(source.value) ? source.value : null;

  return { time: formatMarketDataTime(openTime), openTime, value };
}

function assertPineCandles(candles: unknown[], symbol: string, timeframe: MarketDataTimeframe): void {
  const firstInvalidIndex = candles.findIndex((candle) => !isPineCandle(candle));

  if (firstInvalidIndex !== -1) {
    throw new Error(
      `Market data cache for ${symbol} ${timeframe} is not in PineTS candle format at stockData[${firstInvalidIndex}]. Regenerate or migrate the cache before running Pine indicators.`,
    );
  }
}

function isPineCandle(value: unknown): boolean {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const candle = value as Record<string, unknown>;
  return ["openTime", "closeTime", "open", "high", "low", "close", "volume"].every(
    (field) => typeof candle[field] === "number" && Number.isFinite(candle[field]),
  );
}
