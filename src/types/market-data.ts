export type PullMarketDataOptions = {
  symbols: string[];
  interval: string;
  days: number;
};

export type MarketDataTimeframe = "5m" | "10m" | "25m" | "50m" | "100m" | "200m" | "400m";

export type TdxFormulaKLineRecord = {
  Date: string;
  Amount: number;
  Volume: number;
  Close: number;
  Open: number;
  High: number;
  Low: number;
};

export type PersistedMarketDataSet = {
  symbol: string;
  timeframe: MarketDataTimeframe;
  sourceTimeframe: MarketDataTimeframe | null;
  updatedAt: string;
  latestTime: string | null;
  stockData: TdxFormulaKLineRecord[];
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
