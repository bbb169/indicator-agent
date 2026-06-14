import type { MarketDataTimeframe } from "../types/market-data.js";
import {
  MACD_TIMEFRAME_LADDER,
  type BottomComparePoint,
  type ContractionBottomStatus,
  type LargerTimeframeContractionResult,
  type LatestMultipleContractionBottomResult,
  type MacdSignalRow,
  type TimeframeContractionResult,
} from "./macd-signal-types.js";

export type FindLatestMultipleContractionBottomOptions = {
  rowsByTimeframe: Partial<Record<MarketDataTimeframe, MacdSignalRow[]>>;
  latestWindowSize?: number;
  largerCount?: number;
};

const DEFAULT_LATEST_WINDOW_SIZE = 3;
const DEFAULT_LARGER_COUNT = 2;

export function findLatestMultipleContractionBottom(
  options: FindLatestMultipleContractionBottomOptions,
): LatestMultipleContractionBottomResult {
  const latestWindowSize = options.latestWindowSize ?? DEFAULT_LATEST_WINDOW_SIZE;
  const largerCount = options.largerCount ?? DEFAULT_LARGER_COUNT;

  // Walk from the smallest timeframe upward and stop at the first base timeframe
  // that has a live bottom candidate. Larger timeframe checks are confirmation
  // only, so they should not run until a smaller base signal exists.
  for (const timeframe of MACD_TIMEFRAME_LADDER) {
    const baseRows = options.rowsByTimeframe[timeframe];

    if (baseRows === undefined) {
      continue;
    }

    const base = findRecentContractionBottom(timeframe, baseRows, latestWindowSize);

    if (base.status === "none") {
      continue;
    }

    const largerTimeframes = getNextAvailableLargerTimeframes(timeframe, options.rowsByTimeframe, largerCount);

    if (largerTimeframes.length === 0) {
      return {
        reason: `${timeframe} has a recent contraction bottom, but no larger timeframe is available to confirm it.`,
        matched: false,
        baseTimeframe: timeframe,
        base,
        larger: [],
        matchedLarger: null,
      };
    }

    const larger: LargerTimeframeContractionResult[] = [];

    for (const largerTimeframe of largerTimeframes) {
      const largerRows = options.rowsByTimeframe[largerTimeframe];

      if (largerRows === undefined) {
        continue;
      }

      const result = findRecentContractionBottom(largerTimeframe, largerRows, latestWindowSize);
      const item = { timeframe: largerTimeframe, result };

      larger.push(item);

      if (result.status !== "none") {
        return {
          reason: `${timeframe} has a recent contraction bottom confirmed by ${largerTimeframe}.`,
          matched: true,
          baseTimeframe: timeframe,
          base,
          larger,
          matchedLarger: item,
        };
      }
    }

    return {
      reason: `${timeframe} has a recent contraction bottom, but the next larger timeframes did not confirm it.`,
      matched: false,
      baseTimeframe: timeframe,
      base,
      larger,
      matchedLarger: null,
    };
  }

  return {
    reason: "No recent contraction bottom was found from the smallest available timeframe upward.",
    matched: false,
    baseTimeframe: null,
    base: null,
    larger: [],
    matchedLarger: null,
  };
}

export function findRecentContractionBottom(
  timeframe: MarketDataTimeframe,
  rows: MacdSignalRow[],
  latestWindowSize = DEFAULT_LATEST_WINDOW_SIZE,
): TimeframeContractionResult {
  const latestIndex = rows.length - 1;
  const firstCandidateIndex = Math.max(0, latestIndex - latestWindowSize + 1);
  let latestRejectedCandidate: TimeframeContractionResult | null = null;

  for (let index = latestIndex; index >= firstCandidateIndex; index -= 1) {
    const candidate = classifyBottomCandidate(rows, index);

    if (candidate.status === "none") {
      continue;
    }

    const comparePoint = getBottomComparePoint(rows, index);

    if (comparePoint === null) {
      continue;
    }

    const previousValleyIndex = findPreviousNegativeValley(rows, comparePoint.index);

    if (previousValleyIndex === null) {
      latestRejectedCandidate = noContractionResult(
        rows,
        timeframe,
        index,
        comparePoint,
        "Recent bottom candidate exists, but no previous negative MACD valley was found for contraction comparison.",
      );
      continue;
    }

    const previousValley = rows[previousValleyIndex];

    if (previousValley.macdValue === null || previousValley.macdValue >= 0) {
      latestRejectedCandidate = noContractionResult(
        rows,
        timeframe,
        index,
        comparePoint,
        "Previous MACD valley is missing or not negative.",
      );
      continue;
    }

    if (comparePoint.macdValue > previousValley.macdValue) {
      return {
        timeframe,
        status: candidate.status,
        candidateIndex: comparePoint.index,
        candidateTime: comparePoint.time,
        comparePoint,
        previousValleyIndex,
        previousValleyTime: previousValley.time,
        previousValleyMacdValue: previousValley.macdValue,
        reason:
          candidate.status === "confirmed"
            ? "Recent confirmed MACD bottom is shallower than the previous negative valley."
            : "Recent possible MACD bottom is shallower than the previous negative valley.",
      };
    }

    latestRejectedCandidate = noContractionResult(
      rows,
      timeframe,
      index,
      comparePoint,
      "Recent bottom candidate is not shallower than the previous negative MACD valley.",
      previousValleyIndex,
    );
  }

  return latestRejectedCandidate ?? emptyResult(timeframe, "No recent MACD bottom candidate was found.");
}

export function classifyBottomCandidate(
  rows: MacdSignalRow[],
  index: number,
): { status: ContractionBottomStatus; reason: string } {
  const prev = rows[index - 1];
  const cur = rows[index];
  const next = rows[index + 1];
  const curMacdValue = cur?.macdValue;
  const prevMacdValue = prev?.macdValue;
  const nextMacdValue = next?.macdValue;

  if (curMacdValue === null || curMacdValue === undefined) {
    return { status: "none", reason: "Candidate MACD value is missing." };
  }

  if (curMacdValue < 0 && prevMacdValue !== null && prevMacdValue !== undefined) {
    if (nextMacdValue !== null && nextMacdValue !== undefined && curMacdValue <= prevMacdValue && curMacdValue < nextMacdValue) {
      return { status: "confirmed", reason: "Negative MACD candle has a right-side recovery candle." };
    }

    if (curMacdValue < prevMacdValue) {
      return { status: "possible", reason: "Latest negative MACD candle is still making a lower near-term low." };
    }
  }

  if (curMacdValue >= 0 && prevMacdValue !== null && prevMacdValue !== undefined && prevMacdValue < 0) {
    return { status: "confirmed", reason: "Current MACD recovered above zero after a negative candle." };
  }

  return { status: "none", reason: "Candidate does not satisfy non-strict bottom rules." };
}

export function findPreviousNegativeValley(rows: MacdSignalRow[], beforeIndex: number): number | null {
  for (let index = beforeIndex - 1; index >= 1; index -= 1) {
    if (isNegativeValley(rows, index)) {
      return index;
    }
  }

  return null;
}

export function getNextAvailableLargerTimeframes(
  timeframe: MarketDataTimeframe,
  rowsByTimeframe: Partial<Record<MarketDataTimeframe, MacdSignalRow[]>>,
  count: number,
): MarketDataTimeframe[] {
  const timeframeLadder: readonly MarketDataTimeframe[] = MACD_TIMEFRAME_LADDER;
  const startIndex = timeframeLadder.indexOf(timeframe);

  if (startIndex === -1) {
    return [];
  }

  return timeframeLadder.slice(startIndex + 1)
    .filter((nextTimeframe) => rowsByTimeframe[nextTimeframe] !== undefined)
    .slice(0, count);
}

function getBottomComparePoint(rows: MacdSignalRow[], index: number): BottomComparePoint | null {
  const candidates = [
    { row: rows[index], index, source: "candidate" as const },
    { row: rows[index - 1], index: index - 1, source: "previous-negative" as const },
    { row: rows[index - 2], index: index - 2, source: "second-previous-negative" as const },
  ];
  let comparePoint: BottomComparePoint | null = null;

  for (const candidate of candidates) {
    const macdValue = candidate.row?.macdValue;

    if (candidate.row === undefined || macdValue === null || macdValue === undefined || macdValue >= 0) {
      continue;
    }

    if (comparePoint === null || macdValue < comparePoint.macdValue) {
      comparePoint = {
        index: candidate.index,
        time: candidate.row.time,
        macdValue,
        source: candidate.source,
      };
    }
  }

  // it's index - 2
  return comparePoint?.index === index - 2 ? null : comparePoint;
}

function isNegativeValley(rows: MacdSignalRow[], index: number): boolean {
  const prev = rows[index - 1];
  const cur = rows[index];
  const next = rows[index + 1];

  if (
    prev?.macdValue === null ||
    prev?.macdValue === undefined ||
    cur?.macdValue === null ||
    cur?.macdValue === undefined ||
    next?.macdValue === null ||
    next?.macdValue === undefined
  ) {
    return false;
  }

  return cur.macdValue < 0 && cur.macdValue <= prev.macdValue && cur.macdValue <= next.macdValue;
}

function noContractionResult(
  rows: MacdSignalRow[],
  timeframe: MarketDataTimeframe,
  candidateIndex: number,
  comparePoint: BottomComparePoint,
  reason: string,
  previousValleyIndex: number | null = null,
): TimeframeContractionResult {
  return {
    timeframe,
    status: "none",
    candidateIndex,
    candidateTime: rows[candidateIndex]?.time ?? null,
    comparePoint,
    previousValleyIndex,
    previousValleyTime: previousValleyIndex === null ? null : (rows[previousValleyIndex]?.time ?? null),
    previousValleyMacdValue: previousValleyIndex === null ? null : (rows[previousValleyIndex]?.macdValue ?? null),
    reason,
  };
}

function emptyResult(timeframe: MarketDataTimeframe, reason: string): TimeframeContractionResult {
  return {
    timeframe,
    status: "none",
    candidateIndex: null,
    candidateTime: null,
    comparePoint: null,
    previousValleyIndex: null,
    previousValleyTime: null,
    previousValleyMacdValue: null,
    reason,
  };
}
