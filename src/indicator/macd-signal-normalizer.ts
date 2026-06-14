import type { IndicatorResultRow, PersistedIndicatorResult } from "../types/market-data.js";
import type { MacdSignalRow } from "./macd-signal-types.js";

const DEFAULT_HISTOGRAM_TITLE = "Histogram";

export function toMacdSignalRows(
  result: PersistedIndicatorResult,
  histogramTitle = DEFAULT_HISTOGRAM_TITLE,
): MacdSignalRow[] {
  return result.values.map((row) => toMacdSignalRow(row, histogramTitle));
}

function toMacdSignalRow(row: IndicatorResultRow, histogramTitle: string): MacdSignalRow {
  const rawMacdValue = row[histogramTitle];
  const macdValue = typeof rawMacdValue === "number" && Number.isFinite(rawMacdValue) ? rawMacdValue : null;

  return {
    time: row.time,
    openTime: row.openTime,
    macdValue,
  };
}
