param(
  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$startedAt = [System.Diagnostics.Stopwatch]::StartNew()

Add-Type -AssemblyName System.Drawing

# Keep the native calls here instead of depending on a screenshot package. The
# capture target is intentionally only the current foreground window. Windows
# can report scaled or child-window bounds unless this process is DPI-aware and
# the foreground HWND is promoted to the top-level window before measuring it.
Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class WindowCaptureNative
{
    public const uint GA_ROOT = 2;
    public const int DWMWA_EXTENDED_FRAME_BOUNDS = 9;

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern IntPtr GetAncestor(IntPtr hWnd, uint gaFlags);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);

    [DllImport("user32.dll")]
    public static extern bool SetProcessDPIAware();

    [DllImport("dwmapi.dll")]
    public static extern int DwmGetWindowAttribute(
        IntPtr hWnd,
        int dwAttribute,
        out RECT pvAttribute,
        int cbAttribute
    );
}
"@

[WindowCaptureNative]::SetProcessDPIAware() | Out-Null

$resolvedOutput = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)
$outputDir = Split-Path -Parent $resolvedOutput
if ($outputDir) {
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$handle = [WindowCaptureNative]::GetForegroundWindow()
if ($handle -eq [IntPtr]::Zero) {
  throw "No foreground window is available to capture."
}

$rootHandle = [WindowCaptureNative]::GetAncestor($handle, [WindowCaptureNative]::GA_ROOT)
if ($rootHandle -ne [IntPtr]::Zero) {
  $handle = $rootHandle
}

$rect = New-Object WindowCaptureNative+RECT

# DWM's extended frame bounds match the visible window frame more closely on
# modern Windows. Some windows do not expose DWM bounds, so fall back to the
# classic full window rectangle when that API is unavailable or returns empty.
$dwmResult = [WindowCaptureNative]::DwmGetWindowAttribute(
  $handle,
  [WindowCaptureNative]::DWMWA_EXTENDED_FRAME_BOUNDS,
  [ref]$rect,
  [System.Runtime.InteropServices.Marshal]::SizeOf([type][WindowCaptureNative+RECT])
)

$hasDwmBounds = $dwmResult -eq 0 -and ($rect.Right -gt $rect.Left) -and ($rect.Bottom -gt $rect.Top)
if (-not $hasDwmBounds -and -not [WindowCaptureNative]::GetWindowRect($handle, [ref]$rect)) {
  throw "Unable to read the foreground window bounds."
}

$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top
if ($width -le 0 -or $height -le 0) {
  throw "Foreground window has invalid bounds: $width x $height."
}

$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

try {
  $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
  $bitmap.Save($resolvedOutput, [System.Drawing.Imaging.ImageFormat]::Png)
}
finally {
  $graphics.Dispose()
  $bitmap.Dispose()
}

$startedAt.Stop()
[Console]::Out.WriteLine((@{
  outputPath = $resolvedOutput
  latencyMs = [int]$startedAt.ElapsedMilliseconds
} | ConvertTo-Json -Compress))
