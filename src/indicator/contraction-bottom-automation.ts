import { wait } from "../market-data/delay.js";
import { readMarketDataSet } from "../market-data/market-data-store.js";
import { fetchTwelveDataMarketState, pullMarketDataFromTwelveData } from "../market-data/twelve-data-provider.js";
import { normalizeCsvArgs } from "../lib/normalize-csv-args.js";
import { runPineIndicator } from "./pine-indicator-runner.js";
import { writePersistedMacdContractionBottomBatchReport } from "./contraction-bottom-service.js";
import { MACD_TIMEFRAME_LADDER } from "./macd-signal-types.js";

const MACD_CONTRACTION_SCRIPT = "macd_variant";
const DEFAULT_INITIAL_PULL_DAYS = 63;
const DEFAULT_PROVIDER_INTERVAL = "5min";
const TEN_MINUTES_MS = 10 * 60 * 1000;
const CLOSED_MARKET_POLL_MS = 60 * 1000;
const UNITED_STATES_MARKET_CODE = "XNYS";

export type RunContractionBottomAutomationResult = {
  reportPath: string;
  indicatorResultPaths: string[];
  skippedSymbols: string[];
};

export async function runContractionBottomAutomation(symbols: string[]): Promise<RunContractionBottomAutomationResult> {
  const normalizedSymbols = normalizeCsvArgs(symbols);

  await pullMarketDataFromTwelveData({
    symbols: normalizedSymbols,
    interval: DEFAULT_PROVIDER_INTERVAL,
    days: DEFAULT_INITIAL_PULL_DAYS,
  });

  return runCachedContractionBottomAutomation(normalizedSymbols);
}

export async function runCachedContractionBottomAutomation(
  symbols: string[],
): Promise<RunContractionBottomAutomationResult> {
  const normalizedSymbols = normalizeCsvArgs(symbols);
  const cachedSymbols = await cachedMarketDataSymbols(normalizedSymbols);
  const indicatorResultPaths: string[] = [];

  for (const timeframe of MACD_TIMEFRAME_LADDER) {
    indicatorResultPaths.push(
      ...(await runPineIndicator({
        script: MACD_CONTRACTION_SCRIPT,
        symbols: cachedSymbols,
        timeframe,
      })),
    );
  }

  return {
    indicatorResultPaths,
    reportPath: await writePersistedMacdContractionBottomBatchReport({
      script: MACD_CONTRACTION_SCRIPT,
      symbols: cachedSymbols,
    }),
    skippedSymbols: [],
  };
}

export async function watchContractionBottomAutomation(symbols: string[]): Promise<never> {
  const normalizedSymbols = normalizeCsvArgs(symbols);
  let nextRunAt = 0;

  for (;;) {
    const marketState = await fetchTwelveDataMarketState(UNITED_STATES_MARKET_CODE);
    const isMarketOpen = marketState?.is_market_open === true;
    const now = Date.now();

    if (!isMarketOpen) {
      nextRunAt = 0;
      process.stderr.write(
        `[automation] market closed; next open in ${marketState?.time_to_open ?? "unknown"}.\n`,
      );
      await wait(CLOSED_MARKET_POLL_MS);
      continue;
    }

    if (now >= nextRunAt) {
      const { reportPath } = await runContractionBottomAutomation(normalizedSymbols);

      process.stdout.write(`${reportPath}\n`);
      nextRunAt = Date.now() + TEN_MINUTES_MS;
    }

    await wait(Math.max(1_000, nextRunAt - Date.now()));
  }
}

async function cachedMarketDataSymbols(symbols: string[]): Promise<string[]> {
  const cachedSymbols: string[] = [];

  for (const symbol of symbols) {
    const dataSet = await readMarketDataSet(symbol, "5m");

    if (dataSet !== null && dataSet.stockData.length > 0) {
      cachedSymbols.push(symbol);
    }
  }

  return cachedSymbols;
}
