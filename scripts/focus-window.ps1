param(
  [Parameter(Mandatory = $true)]
  [string]$ProcessName,

  [Parameter(Mandatory = $true)]
  [string]$WindowTitleIncludes,

  [string]$StartupCommand = ""
)

$scriptStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$focusSettleMs = 50

Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class TdxWindowFocus {
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

  [DllImport("user32.dll")]
  public static extern bool IsIconic(IntPtr hWnd);
}
"@

$processFilter = -not [string]::IsNullOrWhiteSpace($ProcessName) -and -not $ProcessName.StartsWith("TODO")
$titleFilter = -not [string]::IsNullOrWhiteSpace($WindowTitleIncludes) -and -not $WindowTitleIncludes.StartsWith("TODO")

function Find-MatchingWindow {
  $processes = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 }

  if ($processFilter) {
    $processes = $processes | Where-Object { $_.ProcessName -ieq $ProcessName }
  }

  if ($titleFilter) {
    $processes = $processes | Where-Object { $_.MainWindowTitle -like "*$WindowTitleIncludes*" }
  }

  # Tongdaxin can spawn helper processes, but only the real top-level UI has a
  # main window handle and title. Prefer the newest matching window so a newly
  # launched instance wins over stale helper windows.
  $processes | Sort-Object StartTime -Descending -ErrorAction SilentlyContinue | Select-Object -First 1
}

function Write-FocusResult {
  param(
    [Parameter(Mandatory = $true)]
    $Process,

    [Parameter(Mandatory = $true)]
    [string]$Method
  )

  [pscustomobject]@{
    processName = $Process.ProcessName
    processId = $Process.Id
    windowTitle = $Process.MainWindowTitle
    method = $Method
    latencyMs = $scriptStopwatch.ElapsedMilliseconds
  } | ConvertTo-Json -Compress
}

$match = Find-MatchingWindow

if (-not $match -and -not [string]::IsNullOrWhiteSpace($StartupCommand)) {
  # Start-Process handles executable paths and .lnk files. Tongdaxin may create
  # its visible window after the process exists, so we poll for the top-level
  # window instead of assuming the first process handle is focusable.
  Start-Process -FilePath $StartupCommand | Out-Null
  Start-Sleep -Milliseconds 1200

  $deadline = (Get-Date).AddSeconds(12)
  do {
    $match = Find-MatchingWindow
    if ($match) { break }
    Start-Sleep -Milliseconds 500
  } while ((Get-Date) -lt $deadline)
}

if (-not $match) {
  throw "No matching window found. processName='$ProcessName', windowTitleIncludes='$WindowTitleIncludes', startupCommand='$StartupCommand'."
}

$shell = New-Object -ComObject WScript.Shell
$handle = [IntPtr]$match.MainWindowHandle
if ([TdxWindowFocus]::IsIconic($handle)) {
  [TdxWindowFocus]::ShowWindowAsync($handle, 9) | Out-Null
} else {
  [TdxWindowFocus]::ShowWindowAsync($handle, 5) | Out-Null
}

Start-Sleep -Milliseconds $focusSettleMs
$activatedByShell = $shell.AppActivate($match.Id)
Start-Sleep -Milliseconds $focusSettleMs

# Windows foreground activation is intentionally guarded. AppActivate and
# SetForegroundWindow each succeed in slightly different desktop states, so try
# both before reporting a focus failure.
$activatedByUser32 = [TdxWindowFocus]::SetForegroundWindow($handle)
if (-not $activatedByShell -and -not $activatedByUser32) {
  throw "Found window '$($match.MainWindowTitle)' in process '$($match.ProcessName)', but Windows refused foreground focus."
}

Write-FocusResult -Process $match -Method "ShowWindowAppActivateSetForeground"
