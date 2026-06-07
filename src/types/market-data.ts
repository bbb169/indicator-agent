import type { Kline } from "pinets";

export type PullMarketDataOptions = {
  symbols: string[];
  interval: string;
  days: number;
};

export type MarketDataTimeframe = "5m" | "10m" | "25m" | "50m" | "100m" | "200m" | "400m";

export type MarketDataCandle = Kline & {
  time?: string;
  closeTimeText?: string;
};

export type PersistedMarketDataSet = {
  symbol: string;
  timeframe: MarketDataTimeframe;
  sourceTimeframe: MarketDataTimeframe | null;
  updatedAt: string;
  latestTime: string | null;
  stockData: MarketDataCandle[];
};

export type MarketDataCheckpoint = {
  symbol: string;
  timeframe: MarketDataTimeframe;
  updatedAt: string;
  latestTime: string | null;
};

export type TwelveDataTimeSeriesPayload = {
  status?: string;
  message?: string;
  code?: number;
  meta?: unknown;
  values?: TwelveDataBar[];
};

export type TwelveDataBar = {
  datetime?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  volume?: string;
};

export type TwelveDataFetchTimeSeriesOptions = {
  stock: string;
  interval: string;
  startDate: string;
};

export type IndicatorPlotPoint = {
  time: string;
  openTime: number;
  value: number | null;
};

export type IndicatorResultRow = {
  time: string;
  openTime: number;
  [plotTitle: string]: string | number | null;
};

export type PersistedIndicatorResult = {
  script: string;
  symbol: string;
  timeframe: MarketDataTimeframe;
  generatedAt: string;
  barCount: number;
  firstTime: string | null;
  latestTime: string | null;
  timeRange: {
    firstTime: string | null;
    latestTime: string | null;
  };
  plotTitles: string[];
  values: IndicatorResultRow[];
};
