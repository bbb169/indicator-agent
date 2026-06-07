import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MarketDataCandle, MarketDataTimeframe } from "../types/market-data.js";
import { formatMarketDataTime } from "./market-data-store.js";
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
      tenMinuteRecords.map((record) => formatMarketDataTime(record.openTime)),
      ["2026-03-09 15:50:00", "2026-03-10 09:30:00"],
    );
    assert.equal(tenMinuteRecords[0]?.close, 101);
    assert.equal(tenMinuteRecords[0]?.volume, 21);
    assert.equal(tenMinuteRecords[1]?.close, 200);
    assert.equal(tenMinuteRecords[1]?.volume, 20);
  });

  it("does not combine the prior close with the next day's open", () => {
    const recordsByTimeframe = deriveMarketDataTimeframes([
      bar("2026-03-09 15:55:00", 100, 10),
      bar("2026-03-10 09:30:00", 200, 20),
      bar("2026-03-10 09:35:00", 201, 21),
    ]);

    const tenMinuteRecords = records(recordsByTimeframe, "10m");

    assert.deepEqual(
      tenMinuteRecords.map((record) => formatMarketDataTime(record.openTime)),
      ["2026-03-09 15:55:00", "2026-03-10 09:30:00"],
    );
    assert.equal(tenMinuteRecords[0]?.open, 100);
    assert.equal(tenMinuteRecords[0]?.close, 100);
    assert.equal(tenMinuteRecords[1]?.open, 200);
    assert.equal(tenMinuteRecords[1]?.close, 201);
  });

  it("resets larger derived ladder timeframes at each day boundary", () => {
    const recordsByTimeframe = deriveMarketDataTimeframes([
      ...fiveMinuteDay("2026-03-09"),
      ...fiveMinuteDay("2026-03-10"),
    ]);

    assert.equal(formatMarketDataTime(records(recordsByTimeframe, "25m")[0]?.openTime ?? 0), "2026-03-09 09:30:00");
    assert.equal(formatMarketDataTime(records(recordsByTimeframe, "25m")[2]?.openTime ?? 0), "2026-03-10 09:30:00");
    assert.equal(formatMarketDataTime(records(recordsByTimeframe, "50m")[0]?.openTime ?? 0), "2026-03-09 09:30:00");
    assert.equal(formatMarketDataTime(records(recordsByTimeframe, "50m")[1]?.openTime ?? 0), "2026-03-10 09:30:00");
    assert.equal(formatMarketDataTime(records(recordsByTimeframe, "100m")[0]?.openTime ?? 0), "2026-03-09 09:30:00");
    assert.equal(formatMarketDataTime(records(recordsByTimeframe, "100m")[1]?.openTime ?? 0), "2026-03-10 09:30:00");
  });
});

function fiveMinuteDay(date: string): MarketDataCandle[] {
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

function bar(time: string, price: number, volume: number): MarketDataCandle {
  const openTime = Date.UTC(
    Number(time.slice(0, 4)),
    Number(time.slice(5, 7)) - 1,
    Number(time.slice(8, 10)),
    Number(time.slice(11, 13)),
    Number(time.slice(14, 16)),
    Number(time.slice(17, 19)),
  );

  return {
    openTime,
    closeTime: openTime + 5 * 60 * 1000,
    open: price,
    high: price + 1,
    low: price - 1,
    close: price,
    volume,
    quoteAssetVolume: 0,
    numberOfTrades: 0,
    takerBuyBaseAssetVolume: 0,
    takerBuyQuoteAssetVolume: 0,
    ignore: 0,
  };
}

function records(
  recordsByTimeframe: Map<MarketDataTimeframe, MarketDataCandle[]>,
  timeframe: MarketDataTimeframe,
): MarketDataCandle[] {
  return recordsByTimeframe.get(timeframe) ?? [];
}
