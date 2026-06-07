//@version=6
indicator(title="Moving Average Convergence Divergence", shorttitle="MACD", timeframe="", timeframe_gaps=true)
// Getting inputs
fast_length = input(title = "Fast Length", defval = 8)
slow_length = input(title = "Slow Length", defval = 20)
src = input(title = "Source", defval = close)
signal_length = input.int(title = "Signal Smoothing",  minval = 1, maxval = 50, defval = 9, display = display.data_window)
sma_source = input.string(title = "Oscillator MA Type",  defval = "EMA", options = ["SMA", "EMA"], display = display.data_window)
sma_signal = input.string(title = "Signal Line MA Type", defval = "EMA", options = ["SMA", "EMA"], display = display.data_window)
// Calculating
fast_ma = sma_source == "SMA" ? ta.sma(src, fast_length) : ta.ema(src, fast_length)
slow_ma = sma_source == "SMA" ? ta.sma(src, slow_length) : ta.ema(src, slow_length)
diff = fast_ma - slow_ma
dea = ta.ema(diff, 7)
macd = (diff - dea) *2
signal = sma_signal == "SMA" ? ta.sma(macd, signal_length) : ta.ema(macd, signal_length)
hist = macd

hline(0, "Zero Line", color = color.new(#787B86, 50))
plot(hist, title = "Histogram", style = plot.style_columns, color = (hist >= 0 ? (hist[1] < hist ? #26A69A : #B2DFDB) : (hist[1] < hist ? #FFCDD2 : #FF5252)))
plot(diff,   title = "MACD",   color = #2962FF)
plot(dea, title = "Signal", color = #FF6D00)