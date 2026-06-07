# Indicator Agent

TypeScript CLI framework for scanning Tongdaxin visually.

The active v1 flow is:

```text
deterministic desktop automation -> screenshot capture -> JSON result
```

DeepSeek and Gemini are intentionally not in the active scan path for now. The scanner first makes the watchlist capture loop reliable, then image analysis can be added back when the screenshot set is stable.

## Install

```bash
npm install
```

## Config

- `watchlists/default.json`: stock symbols to scan.
- `config/visual-scanner.json`: Tongdaxin window settings, layouts, and Gemini model placeholder.
- `prompts/gemini-screenshot-analysis.md`: screenshot extraction prompt placeholder.

## Environment

Create `.env` when Gemini integration is implemented:

```bash
GEMINI_API_KEY=TODO
```

## Commands

Capture screenshots for every symbol in the watchlist and log the saved paths:

```bash
npm run scan
```

Pull K-line data from Twelve Data and write PineTS-compatible candles used by
the agent:

```powershell
$env:TWELVE_DATA_API_KEY="your-api-key"
npm run dev -- tdx data 688318.SH
```

By default, market data is written to `.data\market-data\`.

Pull the latest US trading day and derive local custom timeframes from the
5-minute source candles:

```powershell
npm run dev -- tdx data QQQ --days 1
```

## Main TODOs

1. Implement `TodoTdxController` in `src/tdx/tdx-controller.ts`.
   - focus/open Tongdaxin
   - type/select symbol
   - switch or preserve layout
   - capture real screenshot

2. Implement `GeminiVisionAnalyzer` in `src/vision/vision-analyzer.ts`.
   - choose exact Gemini model
   - send screenshot
   - enforce strict JSON result shape
   - add confidence and retry hints

3. Add retry policy only after we see real failure cases.

## Design Rule

Keep mouse/keyboard automation deterministic. Use Gemini for image analysis. Add a reasoning agent later only when the basic scan loop is stable.
