import type { MarketDataCandle, MarketDataTimeframe } from "../types/market-data.js";

type AggregationStep = {
  timeframe: MarketDataTimeframe;
  sourceTimeframe: MarketDataTimeframe;
  groupSize: number;
};

export const DERIVED_TIMEFRAME_STEPS = [
  { timeframe: "10m", sourceTimeframe: "5m", groupSize: 2 },
  { timeframe: "25m", sourceTimeframe: "5m", groupSize: 5 },
  { timeframe: "50m", sourceTimeframe: "25m", groupSize: 2 },
  { timeframe: "100m", sourceTimeframe: "50m", groupSize: 2 },
  { timeframe: "200m", sourceTimeframe: "100m", groupSize: 2 },
  { timeframe: "400m", sourceTimeframe: "200m", groupSize: 2 },
] satisfies AggregationStep[];

export function deriveMarketDataTimeframes(
  rawFiveMinuteRecords: MarketDataCandle[],
): Map<MarketDataTimeframe, MarketDataCandle[]> {
  const recordsByTimeframe = new Map<MarketDataTimeframe, MarketDataCandle[]>([
    ["5m", rawFiveMinuteRecords],
  ]);

  // The requested timeframes are intentionally a ladder, not direct multiples
  // from 5m for every output. 10m and 25m start from raw provider bars, then
  // each larger cycle is built from the prior custom cycle so partial bars and
  // open/high/low/close semantics stay consistent with the user's workflow.
  for (const step of DERIVED_TIMEFRAME_STEPS) {
    const sourceRecords = recordsByTimeframe.get(step.sourceTimeframe) ?? [];
    recordsByTimeframe.set(step.timeframe, aggregateSequentialBars(sourceRecords, step.groupSize));
  }

  return recordsByTimeframe;
}

function aggregateSequentialBars(
  sourceRecords: MarketDataCandle[],
  groupSize: number,
): MarketDataCandle[] {
  const aggregatedRecords: MarketDataCandle[] = [];
  let sameDayGroup: MarketDataCandle[] = [];
  let currentDate: string | null = null;

  const flushSameDayGroup = (): void => {
    // Group only the records collected for one date. This is the key guard
    // against joining a previous day's close with the next day's 09:30 bar when
    // the source cache is one continuous chronological array.
    for (let index = 0; index < sameDayGroup.length; index += groupSize) {
      const group = sameDayGroup.slice(index, index + groupSize);

      // Keep partial same-day groups. For example, a final single 5m bar still
      // becomes a valid partial 10m bar instead of being dropped.
      if (group.length > 0) {
        aggregatedRecords.push(aggregateBarGroup(group));
      }
    }

    sameDayGroup = [];
  };

  for (const record of sourceRecords) {
    const recordDate = recordDatePart(record);

    // When the date changes, finish the previous day's partial/full groups
    // before collecting bars for the new day. This resets every derived
    // timeframe back to the new day's first source bar.
    if (currentDate !== null && recordDate !== currentDate) {
      flushSameDayGroup();
    }

    sameDayGroup.push(record);
    currentDate = recordDate;
  }

  flushSameDayGroup();

  return aggregatedRecords;
}

function recordDatePart(record: MarketDataCandle): string {
  return new Date(record.openTime).toISOString().slice(0, 10);
}

function aggregateBarGroup(group: MarketDataCandle[]): MarketDataCandle {
  const firstRecord = group[0];
  const lastRecord = group.at(-1) ?? firstRecord;

  // The latest incomplete cycle is written as a normal bar. This makes the
  // newest file immediately useful during market hours, while the next run can
  // recalculate the same partial group from the raw 5m cache once more bars
  // arrive.
  return {
    openTime: firstRecord.openTime,
    closeTime: lastRecord.closeTime,
    open: firstRecord.open,
    high: maxRecordField(group, "high"),
    low: minRecordField(group, "low"),
    close: lastRecord.close,
    volume: sumRecordField(group, "volume"),
    quoteAssetVolume: sumRecordField(group, "quoteAssetVolume"),
    numberOfTrades: sumRecordField(group, "numberOfTrades"),
    takerBuyBaseAssetVolume: sumRecordField(group, "takerBuyBaseAssetVolume"),
    takerBuyQuoteAssetVolume: sumRecordField(group, "takerBuyQuoteAssetVolume"),
    ignore: 0,
  };
}

function maxRecordField(records: MarketDataCandle[], field: "high"): number {
  return Math.max(...records.map((record) => record[field]));
}

function minRecordField(records: MarketDataCandle[], field: "low"): number {
  return Math.min(...records.map((record) => record[field]));
}

function sumRecordField(
  records: MarketDataCandle[],
  field: "volume" | "quoteAssetVolume" | "numberOfTrades" | "takerBuyBaseAssetVolume" | "takerBuyQuoteAssetVolume",
): number {
  return records.reduce((sum, record) => sum + record[field], 0);
}
