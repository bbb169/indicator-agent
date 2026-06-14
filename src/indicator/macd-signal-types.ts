import type { MarketDataTimeframe } from "../types/market-data.js";

export const MACD_TIMEFRAME_LADDER = ["10m", "25m", "50m", "100m", "200m", "400m"] as const;

export type MacdSignalRow = {
  time: string;
  openTime: number;
  macdValue: number | null;
};

export type ContractionBottomStatus = "none" | "possible" | "confirmed";

export type BottomComparePoint = {
  index: number;
  time: string;
  macdValue: number;
  source: "candidate" | "previous-negative" | "second-previous-negative";
};

export type TimeframeContractionResult = {
  timeframe: MarketDataTimeframe;
  status: ContractionBottomStatus;
  candidateIndex: number | null;
  candidateTime: string | null;
  comparePoint: BottomComparePoint | null;
  previousValleyIndex: number | null;
  previousValleyTime: string | null;
  previousValleyMacdValue: number | null;
  reason: string;
};

export type LargerTimeframeContractionResult = {
  timeframe: MarketDataTimeframe;
  result: TimeframeContractionResult;
};

export type LatestMultipleContractionBottomResult = {
  reason: string;
  matched: boolean;
  baseTimeframe: MarketDataTimeframe | null;
  base: TimeframeContractionResult | null;
  larger: LargerTimeframeContractionResult[];
  matchedLarger: LargerTimeframeContractionResult | null;
};
