#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { loadRuntimeConfig } from "./config/load-config.js";
import { runVisualScan } from "./scanner/visual-scan-runner.js";
import { TodoTdxController } from "./tdx/tdx-controller.js";

const program = new Command();

program
  .name("indicator-agent")
  .description("CLI framework for Tongdaxin screenshot scanning.")
  .version("0.1.0");

program
  .command("scan")
  .description("Capture watchlist screenshots and log the saved paths.")
  .action(async () => {
    try {
      const config = await loadRuntimeConfig();
      process.stderr.write(`Scanning ${config.watchlist.symbols.length} symbols...\n`);
      const result = await runVisualScan(config);

      for (const capture of result.results) {
        process.stderr.write(`[scan] ${capture.symbol} -> ${capture.path}\n`);
      }

      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  });

const tdx = program.command("tdx").description("Tongdaxin desktop automation helpers.");

tdx
  .command("focus")
  .description("Focus the configured Tongdaxin window, launching it first if needed.")
  .action(async () => {
    try {
      const config = await loadRuntimeConfig();
      const controller = new TodoTdxController(config.visualScanner.tdx);

      await controller.focusApp();
      process.stdout.write("Focused Tongdaxin window.\n");
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  });

tdx
  .command("symbol")
  .argument("<symbol>", "Stock symbol to open in Tongdaxin.")
  .description("Focus Tongdaxin, input a stock symbol, and press Enter.")
  .action(async (symbol: string) => {
    try {
      const config = await loadRuntimeConfig();
      const controller = new TodoTdxController(config.visualScanner.tdx);

      await controller.switchSymbol(symbol);
      process.stdout.write(`Switched Tongdaxin to ${symbol.trim().toUpperCase()}.\n`);
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  });

tdx
  .command("screenshot")
  .description("Capture the current foreground window to the configured screenshot directory.")
  .action(async () => {
    try {
      const config = await loadRuntimeConfig();
      const controller = new TodoTdxController(config.visualScanner.tdx);
      const capture = await controller.captureScreenshot("manual");

      process.stdout.write(`${capture.path}\n`);
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  });

await program.parseAsync();
