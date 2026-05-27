import type { VisualScannerConfig } from "../types/config.js";
import type { VisualAnalysisResult, WorkflowDecision } from "../types/scan.js";

export type WorkflowAgent = {
  decide(analysis: VisualAnalysisResult): Promise<WorkflowDecision>;
};

export class RuleBasedWorkflowAgent implements WorkflowAgent {
  async decide(): Promise<WorkflowDecision> {
    return {
      action: "continue",
      reason: "Default workflow agent continues through all configured symbols and layouts.",
    };
  }
}

export class DeepSeekWorkflowAgent implements WorkflowAgent {
  constructor(private readonly config: VisualScannerConfig["workflowAgent"]) {}

  async decide(): Promise<WorkflowDecision> {
    throw new Error(`TODO: decide workflow action with DeepSeek model ${this.config.model}.`);
  }
}
