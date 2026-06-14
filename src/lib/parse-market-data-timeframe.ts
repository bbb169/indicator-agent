import type { MarketDataTimeframe } from "../types/market-data.js";
import { normalizeCsvArgs } from "./normalize-csv-args.js";

const VALID_MARKET_DATA_TIMEFRAMES = new Set<MarketDataTimeframe>([
  "5m",
  "10m",
  "25m",
  "50m",
  "100m",
  "200m",
  "400m",
]);

export function parseMarketDataTimeframes(value: string): MarketDataTimeframe[] {
  const timeframes = normalizeCsvArgs([value]);

  for (const timeframe of timeframes) {
    if (!VALID_MARKET_DATA_TIMEFRAMES.has(timeframe as MarketDataTimeframe)) {
      throw new Error(`Unsupported market-data timeframe: ${timeframe}`);
    }
  }

  return timeframes as MarketDataTimeframe[];
}

export function parseMarketDataTimeframe(value: string): MarketDataTimeframe {
  const timeframes = parseMarketDataTimeframes(value);

  if (timeframes.length !== 1) {
    throw new Error(`Expected exactly one timeframe, received: ${value}`);
  }

  return timeframes[0] as MarketDataTimeframe;
}
