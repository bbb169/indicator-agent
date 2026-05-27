import type { VisualScannerConfig } from "../types/config.js";
import type { ScreenshotCapture, VisualAnalysisResult } from "../types/scan.js";

export type VisionAnalyzer = {
  analyze(capture: ScreenshotCapture): Promise<VisualAnalysisResult>;
};

export class GeminiVisionAnalyzer implements VisionAnalyzer {
  constructor(private readonly config: VisualScannerConfig["vision"]) {}

  async analyze(capture: ScreenshotCapture): Promise<VisualAnalysisResult> {
    // TODO: Implement Gemini image analysis after model/API choice is confirmed.
    // Required decisions:
    // - exact Gemini model name
    // - API package or raw fetch
    // - whether screenshots are sent full-size or cropped/compressed first
    // - strict JSON schema for your indicators
    throw new Error(`TODO: analyze screenshot with Gemini model ${this.config.model}: ${capture.path}`);
  }
}
