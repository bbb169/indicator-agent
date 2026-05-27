import type { RuntimeConfig } from "../config/load-config.js";
import { TodoTdxController, type TdxController } from "../tdx/tdx-controller.js";
import type { VisualAnalysisResult, VisualScanResult } from "../types/scan.js";
import { GeminiVisionAnalyzer, type VisionAnalyzer } from "../vision/vision-analyzer.js";

export async function runVisualScan(config: RuntimeConfig): Promise<VisualScanResult> {
  const startedAt = new Date().toISOString();
  const controller = createTdxController(config);
  const analyzer = createVisionAnalyzer(config);
  const results: VisualAnalysisResult[] = [];

  await controller.focusApp();

  for (const symbol of config.watchlist.symbols) {
    // V1 keeps the active path simple: deterministic desktop actions produce
    // one current-window screenshot, and Gemini returns the full analysis for it.
    await controller.switchSymbol(symbol);
    await controller.waitUntilStable();

    const capture = await controller.captureScreenshot(symbol);
    const analysis = await analyzer.analyze(capture);
    results.push(analysis);
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

function createVisionAnalyzer(config: RuntimeConfig): VisionAnalyzer {
  return new GeminiVisionAnalyzer(config.visualScanner.vision);
}
