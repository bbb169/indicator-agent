import { readFile } from "node:fs/promises";
import path from "node:path";
import type { VisualScannerConfig, WatchlistConfig } from "../types/config.js";

export type RuntimeConfig = {
  watchlist: WatchlistConfig;
  visualScanner: VisualScannerConfig;
};

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  // Keep watchlist and scanner settings separate: watchlists change frequently,
  // while automation/model settings should stay stable across scans.
  const [watchlist, visualScanner] = await Promise.all([
    readJson<WatchlistConfig>("watchlists/default.json"),
    readJson<VisualScannerConfig>("config/visual-scanner.json"),
  ]);

  return {
    watchlist: {
      symbols: normalizeSymbols(watchlist.symbols),
    },
    visualScanner,
  };
}

async function readJson<T>(relativePath: string): Promise<T> {
  // Config paths are project-root relative so compiled CLI behavior matches tsx dev behavior.
  const absolutePath = path.join(process.cwd(), relativePath);
  const content = await readFile(absolutePath, "utf8");
  return JSON.parse(content) as T;
}

function normalizeSymbols(symbols: string[]) {
  return symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean);
}
