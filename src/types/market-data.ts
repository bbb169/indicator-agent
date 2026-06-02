export type PullMarketDataOptions = {
  symbols: string[];
  interval: string;
  days: number;
};

export type MarketDataRecord = {
  stock: string;
  time: string | null;
  [field: string]: string | number | null;
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
