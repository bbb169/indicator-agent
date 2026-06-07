import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sanitizePathPart } from "../lib/sanitize-path-part.js";
import type { PersistedIndicatorResult } from "../types/market-data.js";

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
