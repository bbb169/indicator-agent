import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { promisify } from "node:util";
import type { VisualScannerConfig } from "../types/config.js";
import type { ScreenshotCapture } from "../types/scan.js";

const execFileAsync = promisify(execFile);
const DEFAULT_STABLE_SETTLE_MS = 1200;

type PowerShellArgs = Record<string, string | number | undefined>;

export type TdxController = {
  focusApp(): Promise<void>;
  switchSymbol(symbol: string): Promise<void>;
  switchLayout(layoutId: string): Promise<void>;
  waitUntilStable(): Promise<void>;
  captureScreenshot(symbol: string, layoutId: string): Promise<ScreenshotCapture>;
};

export class TodoTdxController implements TdxController {
  constructor(private readonly config: VisualScannerConfig["tdx"]) {}

  async focusApp(): Promise<void> {
    if (process.platform !== "win32") {
      throw new Error("Tongdaxin focus automation is currently implemented for Windows only.");
    }

    await focusWindowsApp(this.config);
  }

  async switchSymbol(symbol: string): Promise<void> {
    await inputSymbol(symbol);
  }

  async switchLayout(layoutId: string): Promise<void> {
    // TODO: Confirm whether layouts are selected by hotkey, menu, workspace name,
    // or already fixed on screen. If fixed, this can become a no-op.
    throw new Error(`TODO: switch Tongdaxin layout ${layoutId}.`);
  }

  async waitUntilStable(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, DEFAULT_STABLE_SETTLE_MS));
  }

  async captureScreenshot(symbol: string, layoutId: string): Promise<ScreenshotCapture> {
    // TODO: Replace placeholder file with real screenshot capture.
    // Candidate approaches: PowerShell Add-Type System.Windows.Forms, screenshot-desktop,
    // or AutoHotkey's screen capture helper.
    await mkdir(this.config.screenshotDir, { recursive: true });
    const capturedAt = new Date().toISOString();
    const filename = `${symbol}_${layoutId}_${capturedAt.replace(/[:.]/g, "-")}.todo.txt`;
    const screenshotPath = path.join(this.config.screenshotDir, filename);

    await writeFile(
      screenshotPath,
      [
        "TODO screenshot placeholder",
        `symbol=${symbol}`,
        `layoutId=${layoutId}`,
        `capturedAt=${capturedAt}`,
      ].join("\n"),
      "utf8",
    );

    return {
      symbol,
      layoutId,
      path: screenshotPath,
      capturedAt,
    };
  }
}

async function inputSymbol(symbol: string): Promise<void> {
  const scriptPath = path.join(process.cwd(), "scripts", "input-symbol.ps1");

  try {
    await runPowerShellFile(scriptPath, { Symbol: symbol });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to input Tongdaxin symbol ${symbol}: ${details}`, { cause: error });
  }
}

async function focusWindowsApp(config: VisualScannerConfig["tdx"]): Promise<void> {
  const scriptPath = path.join(process.cwd(), "scripts", "focus-window.ps1");

  try {
    await runPowerShellFile(scriptPath, {
      ProcessName: config.processName,
      WindowTitleIncludes: config.windowTitleIncludes,
      StartupCommand: config.startupCommand,
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to focus Tongdaxin: ${details}`, { cause: error });
  }
}

async function runPowerShellFile(scriptPath: string, args: PowerShellArgs): Promise<void> {
  const namedArgs = Object.entries(args).flatMap(([name, value]) =>
    value === undefined ? [] : [`-${name}`, String(value)],
  );
  const startedAt = performance.now();

  const result = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, ...namedArgs],
    { windowsHide: true },
  );
  const processLatencyMs = Math.round(performance.now() - startedAt);

  logPowerShellLatency(path.basename(scriptPath), processLatencyMs, String(result.stdout).trim());
}

function logPowerShellLatency(scriptName: string, processLatencyMs: number, stdout: string): void {
  if (process.env.TDX_LOG_LATENCY === "0") {
    return;
  }

  const scriptLatencyMs = readScriptLatencyMs(stdout);
  const scriptPart = scriptLatencyMs === undefined ? "" : ` script=${scriptLatencyMs}ms`;
  process.stderr.write(`[tdx latency] ${scriptName} process=${processLatencyMs}ms${scriptPart}\n`);
}

function readScriptLatencyMs(stdout: string): number | undefined {
  if (!stdout) {
    return undefined;
  }

  try {
    const output = JSON.parse(stdout) as { latencyMs?: unknown };
    return typeof output.latencyMs === "number" ? output.latencyMs : undefined;
  } catch {
    return undefined;
  }
}
