import { spawn } from "node:child_process";
import path from "node:path";
import type { PythonBridgeOptions, RunPythonBridgeOptions } from "../types/python.js";

export async function runTdxPythonBridge(options: PythonBridgeOptions = {}): Promise<void> {
  const pythonPath = path.join(process.cwd(), ".venv", "Scripts", "python.exe");
  const args = ["-m", "tdx_sdk.cli", ...(options.args ?? [])];
  const baseEnv = {
    ...process.env,
    ...options.env,
  };

  await runPythonBridge(pythonPath, args, {
    env: {
      ...baseEnv,
      // The Python package lives inside the repo instead of site-packages. Put
      // it first so bridge commands always use this checkout, while preserving
      // any caller-provided PYTHONPATH entries after it.
      PYTHONPATH: joinPythonPath(baseEnv.PYTHONPATH, path.join(process.cwd(), "python")),
    },
  });
}

function runPythonBridge(pythonPath: string, args: string[], options: RunPythonBridgeOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonPath, args, {
      env: options.env,
      stdio: ["ignore", "inherit", "inherit"],
      windowsHide: true,
    });

    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Python TDX bridge exited with code ${code ?? "null"}${signal ? ` signal ${signal}` : ""}`));
    });
  });
}

function joinPythonPath(existingPath: string | undefined, repoPythonPath: string): string {
  return existingPath ? `${repoPythonPath};${existingPath}` : repoPythonPath;
}
