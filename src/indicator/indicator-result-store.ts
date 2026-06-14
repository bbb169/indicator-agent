import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isNodeErrorCode } from "../lib/node-error.js";
import { sanitizePathPart } from "../lib/sanitize-path-part.js";
import type { MarketDataTimeframe, PersistedIndicatorResult } from "../types/market-data.js";

const INDICATOR_RESULT_DIR = path.join(".data", "indicator-results");

export async function writeIndicatorResult(result: PersistedIndicatorResult): Promise<string> {
  const outputDirectory = path.join(INDICATOR_RESULT_DIR, sanitizePathPart(result.script));
  const outputPath = path.join(
    outputDirectory,
    `${sanitizePathPart(result.symbol)}-${sanitizePathPart(result.timeframe)}.json`,
  );

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  return outputPath;
}

export async function readIndicatorResult(
  script: string,
  symbol: string,
  timeframe: MarketDataTimeframe,
): Promise<PersistedIndicatorResult | null> {
  const resultPath = indicatorResultPath(script, symbol, timeframe);

  try {
    const content = await readFile(resultPath, "utf8");
    return JSON.parse(content) as PersistedIndicatorResult;
  } catch (error) {
    if (isNodeErrorCode(error, "ENOENT")) {
      return null;
    }

    throw error;
  }
}

export function indicatorResultPath(script: string, symbol: string, timeframe: MarketDataTimeframe): string {
  return path.join(
    INDICATOR_RESULT_DIR,
    sanitizePathPart(script),
    `${sanitizePathPart(symbol)}-${sanitizePathPart(timeframe)}.json`,
  );
}
