export type WatchlistConfig = {
  symbols: string[];
};

export type LayoutConfig = {
  id: string;
  displayName: string;
  notes?: string;
};

export type VisualScannerConfig = {
  tdx: {
    processName: string;
    windowTitleIncludes: string;
    startupCommand?: string;
    screenshotDir: string;
  };
  layouts: LayoutConfig[];
  vision: {
    provider: "gemini";
    model: string;
    promptPath: string;
  };
  workflowAgent: {
    provider: "deepseek";
    model: string;
    enabled: boolean;
  };
};
