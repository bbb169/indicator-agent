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

## Python SDK

Create the local Python environment and install the SDK dependencies:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install numpy -i https://pypi.tuna.tsinghua.edu.cn/simple
.venv\Scripts\python.exe -m pip install pandas -i https://pypi.tuna.tsinghua.edu.cn/simple
.venv\Scripts\python.exe -m pip install backtrader -i https://pypi.tuna.tsinghua.edu.cn/simple
.venv\Scripts\python.exe -m pip install vectorbt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

Start the local SDK HTTP skeleton for future TypeScript integration:

```bash
npm run python:sdk
```

The service starts an empty local HTTP shell. Real trading SDK interfaces will
be added later in `python/tdx_sdk`.

To use Tongdaxin's own Python package, point the SDK at the terminal
`PYPlugins/user` directory that contains `tqcenter.py`:

```powershell
$env:TDX_PYPLUGINS_USER="C:\path\to\TdxW\PYPlugins\user"
```

Importing `tdx_sdk` imports `from tqcenter import tq` and initializes it using
the pattern from the Tongdaxin quant documentation.

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

Pull K-line data from Twelve Data and write it in the TDX-like JSON shape used
by the agent:

```powershell
$env:TWELVE_DATA_API_KEY="your-api-key"
npm run dev -- tdx data 688318.SH
```

By default, market data is written in TDX formula K-line format to `.data\tdx-formula-data\`.

Pull the latest 1 US trading day for a supported Twelve Data intraday interval.
The provider receives `30min` directly; only the output is reshaped:

```powershell
npm run dev -- tdx data QQQ --period 30min --days 1
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
