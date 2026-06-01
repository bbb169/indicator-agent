import type { RuntimeConfig } from "../config/load-config.js";
import { TodoTdxController, type TdxController } from "../tdx/tdx-controller.js";
import type { ScreenshotCapture, VisualScanResult } from "../types/scan.js";

export async function runVisualScan(config: RuntimeConfig): Promise<VisualScanResult> {
  const startedAt = new Date().toISOString();
  const controller = createTdxController(config);
  const results: ScreenshotCapture[] = [];

  await controller.focusApp();

  for (const symbol of config.watchlist.symbols) {
    await controller.switchSymbol(symbol);
    const capture = await controller.captureScreenshot(symbol);
    results.push(capture);
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    results,
  };
}

function createTdxController(config: RuntimeConfig): TdxController {
  return new TodoTdxController(config.visualScanner.tdx);
}
