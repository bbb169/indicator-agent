import type {
  MarketDataRecord,
  TwelveDataBar,
  TwelveDataTimeSeriesPayload,
} from "../types/market-data.js";

export const DEFAULT_TDX_FIELDS = ["open", "high", "low", "close", "volume"] satisfies Array<keyof TwelveDataBar>;

export function toTdxLikeRecords(
  stock: string,
  payload: TwelveDataTimeSeriesPayload,
): MarketDataRecord[] {
  const values = payload.values ?? [];

  return values.map((bar) => {
    // TDX-like output expects one flat record per bar. Twelve Data returns
    // numeric fields as strings, so each fixed output field is parsed before it
    // is placed on the JSON-safe record.
    const record: MarketDataRecord = {
      stock,
      time: bar.datetime ?? null,
    };

    for (const field of DEFAULT_TDX_FIELDS) {
      record[field] = numberFromProviderValue(bar[field]);
    }

    return record;
  });
}

function numberFromProviderValue(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}
