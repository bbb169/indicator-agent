# Indicator Agent

TypeScript CLI framework for scanning Tongdaxin visually.

The active v1 flow is:

```text
deterministic desktop automation -> screenshot capture -> Gemini vision analysis -> JSON result
```

DeepSeek is intentionally not in the active scan path for now. Gemini can return the screenshot analysis directly. A workflow/reasoning agent can be added later if we need retry policy, portfolio summaries, or higher-level decisions.

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

Real scan is intentionally blocked by TODO implementations:

```bash
npm run scan
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
