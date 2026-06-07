# PineTS Indicator Workflow

## Current Direction

- Store cached market data as PineTS-compatible candle datasets.
- Derive custom timeframes locally from the 5-minute source candles.
- Run indicator scripts with `pinets` from local candles.
- Write indicator outputs under `.data/indicator-results/<script>/<symbol>-<timeframe>.json`.

## Main Command

```powershell
npm run dev -- pine run macd_variant QQQ -t 25m
```

## Notes

- TDX formula data upload/get/calculate steps are abandoned.
- Tongdaxin remains only for desktop automation and screenshot workflows.
- Missing scripts, missing cached candles, and empty candle datasets should fail clearly.
