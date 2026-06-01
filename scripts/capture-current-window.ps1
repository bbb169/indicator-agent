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

# Ask Windows to give this PowerShell process physical screen pixels instead of
# DPI-virtualized coordinates. Without this, a 150% scaled monitor can produce a
# window rectangle that does not line up with CopyFromScreen's pixel grid.
[WindowCaptureNative]::SetProcessDPIAware() | Out-Null

# Resolve the output path before creating directories so the final JSON always
# reports the absolute path that was actually written.
$resolvedOutput = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)
$outputDir = Split-Path -Parent $resolvedOutput
if ($outputDir) {
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# GetForegroundWindow may return a child HWND owned by the active app. The next
# step promotes that child handle to the root window, which is the rectangle we
# actually want for a full current-window screenshot.
$handle = [WindowCaptureNative]::GetForegroundWindow()
if ($handle -eq [IntPtr]::Zero) {
  throw "No foreground window is available to capture."
}

# GA_ROOT walks from a child/control HWND to the top-level window HWND. If
# Windows cannot find a root ancestor, keep the foreground HWND and let the DWM
# bounds call below be the source of truth.
$rootHandle = [WindowCaptureNative]::GetAncestor($handle, [WindowCaptureNative]::GA_ROOT)
if ($rootHandle -ne [IntPtr]::Zero) {
  $handle = $rootHandle
}

$rect = New-Object WindowCaptureNative+RECT

# DWM's extended frame bounds match the visible modern Windows frame: the pixels
# the user sees, excluding invisible resize borders that classic window APIs can
# include. This script intentionally requires DWM bounds so failures are obvious
# instead of silently switching to a different rectangle source.
$dwmResult = [WindowCaptureNative]::DwmGetWindowAttribute(
  $handle,
  [WindowCaptureNative]::DWMWA_EXTENDED_FRAME_BOUNDS,
  [ref]$rect,
  [System.Runtime.InteropServices.Marshal]::SizeOf([type][WindowCaptureNative+RECT])
)

$hasDwmBounds = $dwmResult -eq 0 -and ($rect.Right -gt $rect.Left) -and ($rect.Bottom -gt $rect.Top)
if (-not $hasDwmBounds) {
  throw "Unable to read DWM bounds for the foreground window. HRESULT: $dwmResult."
}

# RECT stores edges rather than size. Convert right/left and bottom/top into the
# bitmap dimensions CopyFromScreen needs.
$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top
if ($width -le 0 -or $height -le 0) {
  throw "Foreground window has invalid bounds: $width x $height."
}

# Create an in-memory bitmap exactly as large as the target window, then draw the
# screen pixels starting from the window's top-left corner into bitmap origin 0,0.
$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

try {
  $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
  $bitmap.Save($resolvedOutput, [System.Drawing.Imaging.ImageFormat]::Png)
}
finally {
  # System.Drawing objects hold native GDI handles, so dispose them even when
  # capture or save throws. This keeps repeated scanner runs from leaking handles.
  $graphics.Dispose()
  $bitmap.Dispose()
}

$startedAt.Stop()
[Console]::Out.WriteLine((@{
  outputPath = $resolvedOutput
  latencyMs = [int]$startedAt.ElapsedMilliseconds
} | ConvertTo-Json -Compress))
