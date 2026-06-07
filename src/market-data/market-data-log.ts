import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { isNodeErrorCode } from "../lib/node-error.js";
import { sanitizePathPart } from "../lib/sanitize-path-part.js";
import type { TwelveDataTimeSeriesPayload, TdxFormulaKLineRecord } from "../types/market-data.js";

const TWELVE_DATA_LOG_DIR = path.join(".data", "twelve-data-logs");
const BEIJING_TIME_OFFSET_MS = 8 * 60 * 60 * 1000;

export async function logTwelveDataRequest(endpoint: string, stock: string, params: URLSearchParams): Promise<void> {
  const safeParams = new URLSearchParams(params);
  safeParams.set("apikey", "***");

  await writeMarketDataLogFile(stock, "request", {
    writtenAt: beijingTimestamp(),
    timezone: "Asia/Shanghai",
    stock,
    endpoint,
    params: Object.fromEntries(safeParams),
  });
}

export async function logTwelveDataResponse(
  stock: string,
  payload: TwelveDataTimeSeriesPayload,
  httpStatus: number,
  records: TdxFormulaKLineRecord[],
): Promise<void> {
  const values = payload.values ?? [];

  await writeMarketDataLogFile(stock, "response", {
    writtenAt: beijingTimestamp(),
    timezone: "Asia/Shanghai",
    stock,
    httpStatus,
    status: payload.status ?? "ok",
    code: payload.code ?? null,
    message: payload.message ?? null,
    recordCount: records.length,
    firstTime: values[0]?.datetime ?? null,
    lastTime: values.at(-1)?.datetime ?? null,
    records,
  });
}

async function writeMarketDataLogFile(stock: string, phase: "request" | "response", payload: object): Promise<void> {
  await mkdir(TWELVE_DATA_LOG_DIR, { recursive: true });

  const baseFileName = `${sanitizePathPart(stock)}-${phase}-${fileTimestamp()}`;

  await writeUniqueJsonFile(TWELVE_DATA_LOG_DIR, baseFileName, payload);
}

async function writeUniqueJsonFile(directory: string, baseFileName: string, payload: object): Promise<void> {
  const content = `${JSON.stringify(payload, null, 2)}\n`;

  // File names are second-granularity for readability, so two requests can
  // collide inside the same second. Use exclusive creation and retry with a
  // numeric suffix so concurrent diagnostics do not overwrite each other.
  for (let suffix = 0; ; suffix += 1) {
    const fileName = `${baseFileName}${suffix === 0 ? "" : `-${String(suffix).padStart(3, "0")}`}.json`;
    const outputPath = path.join(directory, fileName);

    try {
      await writeFile(outputPath, content, { encoding: "utf8", flag: "wx" });
      return;
    } catch (error) {
      if (!isNodeErrorCode(error, "EEXIST")) {
        throw error;
      }
    }
  }
}

function fileTimestamp(): string {
  const timestamp = beijingTimestamp();

  return `${timestamp.slice(0, 10)}_${timestamp.slice(11, 19).replace(/:/g, "-")}`;
}

function beijingTimestamp(): string {
  const beijingDate = new Date(Date.now() + BEIJING_TIME_OFFSET_MS);

  return `${beijingDate.toISOString().slice(0, -1)}+08:00`;
}
