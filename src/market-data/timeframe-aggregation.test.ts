import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MarketDataTimeframe, TdxFormulaKLineRecord } from "../types/market-data.js";
import { deriveMarketDataTimeframes } from "./timeframe-aggregation.js";

describe("deriveMarketDataTimeframes", () => {
  it("aggregates 10m bars within each day and keeps same-day partial bars", () => {
    const recordsByTimeframe = deriveMarketDataTimeframes([
      bar("2026-03-09 15:50:00", 100, 10),
      bar("2026-03-09 15:55:00", 101, 11),
      bar("2026-03-10 09:30:00", 200, 20),
    ]);

    const tenMinuteRecords = records(recordsByTimeframe, "10m");

    assert.deepEqual(
      tenMinuteRecords.map((record) => record.Date),
      ["2026-03-09 15:50:00", "2026-03-10 09:30:00"],
    );
    assert.equal(tenMinuteRecords[0]?.Close, 101);
    assert.equal(tenMinuteRecords[0]?.Volume, 21);
    assert.equal(tenMinuteRecords[1]?.Close, 200);
    assert.equal(tenMinuteRecords[1]?.Volume, 20);
  });

  it("does not combine the prior close with the next day's open", () => {
    const recordsByTimeframe = deriveMarketDataTimeframes([
      bar("2026-03-09 15:55:00", 100, 10),
      bar("2026-03-10 09:30:00", 200, 20),
      bar("2026-03-10 09:35:00", 201, 21),
    ]);

    const tenMinuteRecords = records(recordsByTimeframe, "10m");

    assert.deepEqual(
      tenMinuteRecords.map((record) => record.Date),
      ["2026-03-09 15:55:00", "2026-03-10 09:30:00"],
    );
    assert.equal(tenMinuteRecords[0]?.Open, 100);
    assert.equal(tenMinuteRecords[0]?.Close, 100);
    assert.equal(tenMinuteRecords[1]?.Open, 200);
    assert.equal(tenMinuteRecords[1]?.Close, 201);
  });

  it("resets larger derived ladder timeframes at each day boundary", () => {
    const recordsByTimeframe = deriveMarketDataTimeframes([
      ...fiveMinuteDay("2026-03-09"),
      ...fiveMinuteDay("2026-03-10"),
    ]);

    assert.equal(records(recordsByTimeframe, "25m")[0]?.Date, "2026-03-09 09:30:00");
    assert.equal(records(recordsByTimeframe, "25m")[2]?.Date, "2026-03-10 09:30:00");
    assert.equal(records(recordsByTimeframe, "50m")[0]?.Date, "2026-03-09 09:30:00");
    assert.equal(records(recordsByTimeframe, "50m")[1]?.Date, "2026-03-10 09:30:00");
    assert.equal(records(recordsByTimeframe, "100m")[0]?.Date, "2026-03-09 09:30:00");
    assert.equal(records(recordsByTimeframe, "100m")[1]?.Date, "2026-03-10 09:30:00");
  });
});

function fiveMinuteDay(date: string): TdxFormulaKLineRecord[] {
  return [
    bar(`${date} 09:30:00`, 100, 10),
    bar(`${date} 09:35:00`, 101, 11),
    bar(`${date} 09:40:00`, 102, 12),
    bar(`${date} 09:45:00`, 103, 13),
    bar(`${date} 09:50:00`, 104, 14),
    bar(`${date} 09:55:00`, 105, 15),
    bar(`${date} 10:00:00`, 106, 16),
    bar(`${date} 10:05:00`, 107, 17),
    bar(`${date} 10:10:00`, 108, 18),
    bar(`${date} 10:15:00`, 109, 19),
  ];
}

function bar(time: string, price: number, volume: number): TdxFormulaKLineRecord {
  return {
    Date: time,
    Amount: 0,
    Volume: volume,
    Close: price,
    Open: price,
    High: price + 1,
    Low: price - 1,
  };
}

function records(
  recordsByTimeframe: Map<MarketDataTimeframe, TdxFormulaKLineRecord[]>,
  timeframe: MarketDataTimeframe,
): TdxFormulaKLineRecord[] {
  return recordsByTimeframe.get(timeframe) ?? [];
}
