#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { loadRuntimeConfig } from "./config/load-config.js";
import {
  runCachedContractionBottomAutomation,
  runContractionBottomAutomation,
  watchContractionBottomAutomation,
} from "./indicator/contraction-bottom-automation.js";
import { runPineIndicator } from "./indicator/pine-indicator-runner.js";
import { normalizeCsvArgs } from "./lib/normalize-csv-args.js";
import { parseMarketDataTimeframe } from "./lib/parse-market-data-timeframe.js";
import { parsePositiveIntegerOption } from "./lib/parse-positive-integer-option.js";
import { pullMarketDataFromTwelveData } from "./market-data/twelve-data-provider.js";

const program = new Command();

program.name("indicator-agent").description("Market-data and Pine indicator helpers.").version("0.1.0");

const tdx = program.command("tdx").description("Market-data helpers.");
const pine = program.command("pine").description("TradingView Pine indicator helpers.");
const contractionBottom = program.command("contraction-bottom").description("Contraction-bottom workflow.");

// Market data uses Twelve Data directly. Provider request/response diagnostics
// are written by the market-data layer to local files, so this command does not
// print or rewrite the final transformed result.
tdx
  .command("data")
  .argument("<symbols...>", "Twelve Data symbols to pull, e.g. AAPL EUR/USD 688318.SH.")
  .option("-p, --period <period>", "Accepted for compatibility; data is fetched as 5min and derived locally.", "5min")
  .option("-d, --days <days>", "Initial trading-session lookback when no 5min checkpoint exists.", parsePositiveIntegerOption, 63)
  .description("Pull 5-minute K-line market data and derive local PineTS candle files.")
  .action(async (symbols: string[], options) => {
    try {
      await pullMarketDataFromTwelveData({
        symbols: normalizeCsvArgs(symbols),
        interval: options.period,
        days: options.days,
      });
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  });

pine
  .command("run")
  .argument("<script>", "Script name under config/scripts, e.g. macd_variant.")
  .argument("<symbols...>", "Symbols whose cached market data should be used.")
  .option("-t, --timeframe <timeframe>", "Cached market-data timeframe.", "25m")
  .description("Run a Pine indicator script against cached PineTS candle data.")
  .action(async (script: string, symbols: string[], options) => {
    try {
      const outputPaths = await runPineIndicator({
        script,
        symbols: normalizeCsvArgs(symbols),
        timeframe: parseMarketDataTimeframe(options.timeframe),
      });

      process.stdout.write(`${JSON.stringify({ results: outputPaths }, null, 2)}\n`);
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  });

contractionBottom
  .command("cached")
  .argument("[symbols...]", "Optional cached symbols to check. Defaults to watchlists/default.json.")
  .description("Run MACD and write the report using existing local market-data cache only.")
  .action(
    contractionBottomAction(async (symbols) => {
      const result = await runCachedContractionBottomAutomation(symbols);

      if (result.skippedSymbols.length > 0) {
        process.stderr.write(`[contraction-bottom cached] skipped missing cache: ${result.skippedSymbols.join(", ")}\n`);
      }

      process.stdout.write(`${result.reportPath}\n`);
    }),
  );

contractionBottom
  .command("run")
  .argument("[symbols...]", "Optional symbols to refresh and check. Defaults to watchlists/default.json.")
  .description("Fetch latest data, run MACD, and write the report immediately.")
  .action(
    contractionBottomAction(async (symbols) => {
      const result = await runContractionBottomAutomation(symbols);

      process.stdout.write(`${result.reportPath}\n`);
    }),
  );

contractionBottom
  .command("watch")
  .argument("[symbols...]", "Optional symbols to refresh and check. Defaults to watchlists/default.json.")
  .description("After the U.S. stock market opens, run every 10 minutes.")
  .action(contractionBottomAction((symbols) => watchContractionBottomAutomation(symbols)));

await program.parseAsync();

function contractionBottomAction(
  run: (symbols: string[]) => Promise<void>,
): (symbols: string[]) => Promise<void> {
  return async (symbols: string[]) => {
    try {
      const explicitSymbols = normalizeCsvArgs(symbols);
      const targetSymbols =
        explicitSymbols.length > 0 ? explicitSymbols : (await loadRuntimeConfig()).watchlist.symbols;

      await run(targetSymbols);
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  };
}
