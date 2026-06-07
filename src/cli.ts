#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { loadRuntimeConfig } from "./config/load-config.js";
import { normalizeCsvArgs } from "./lib/normalize-csv-args.js";
import { parsePositiveIntegerOption } from "./lib/parse-positive-integer-option.js";
import { pullMarketDataFromTwelveData } from "./market-data/twelve-data-provider.js";
import { runVisualScan } from "./scanner/visual-scan-runner.js";
import { TodoTdxController } from "./tdx/tdx-controller.js";

const program = new Command();

program
  .name("indicator-agent")
  .description("CLI framework for Tongdaxin screenshot scanning.")
  .version("0.1.0");

// The scan command is the current top-level workflow: load config, run the
// deterministic capture loop, then print the structured scan result to stdout.
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

// Desktop automation commands share runtime config because window title,
// startup command, and screenshot paths belong to the user's local setup.
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

// Market data uses Twelve Data directly. Provider request/response diagnostics
// are written by the market-data layer to local files, so this command does not
// print or rewrite the final transformed result.
tdx
  .command("data")
  .argument("<symbols...>", "Twelve Data symbols to pull, e.g. AAPL EUR/USD 688318.SH.")
  .option("-p, --period <period>", "Accepted for compatibility; data is fetched as 5min and derived locally.", "5min")
  .option("-d, --days <days>", "Initial trading-session lookback when no 5min checkpoint exists.", parsePositiveIntegerOption, 63)
  .description("Pull 5-minute K-line market data and derive TDX-like multi-timeframe files.")
  .action(async (symbols: string[], options) => {
    try {
      const normalizedSymbols = normalizeCsvArgs(symbols);
      await pullMarketDataFromTwelveData({
        symbols: normalizedSymbols,
        interval: options.period,
        days: options.days,
      });
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  });

await program.parseAsync();
