export type ScreenshotCapture = {
  symbol: string;
  layoutId: string;
  path: string;
  capturedAt: string;
};

export type VisualIndicatorSummary = {
  name: string;
  values: Record<string, number | string | null>;
  shape: string;
  confidence: number;
  notes: string[];
};

export type VisualAnalysisResult = {
  symbol: string;
  layoutId: string;
  screenshotPath: string;
  analyzedAt: string;
  indicators: VisualIndicatorSummary[];
  overallSignal: string;
  confidence: number;
  notes: string[];
};

export type WorkflowDecision = {
  action: "continue" | "retry" | "skip" | "stop";
  reason: string;
};

export type VisualScanResult = {
  startedAt: string;
  finishedAt: string;
  results: VisualAnalysisResult[];
};
