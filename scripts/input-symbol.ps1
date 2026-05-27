param(
  [Parameter(Mandatory = $true)]
  [string]$Symbol
)

$scriptStopwatch = [System.Diagnostics.Stopwatch]::StartNew()

$normalizedSymbol = $Symbol.Trim().ToUpperInvariant()
if ([string]::IsNullOrWhiteSpace($normalizedSymbol)) {
  throw "Symbol cannot be empty."
}

$shell = New-Object -ComObject WScript.Shell

# Send one key at a time to match the manual Tongdaxin workflow. This avoids
# relying on clipboard paste, which can bypass app-specific incremental search.
foreach ($char in $normalizedSymbol.ToCharArray()) {
  $shell.SendKeys([string]$char)
  Start-Sleep -Milliseconds 40
}

$shell.SendKeys("{ENTER}")
Start-Sleep -Milliseconds 100

[pscustomobject]@{
  symbol = $normalizedSymbol
  latencyMs = $scriptStopwatch.ElapsedMilliseconds
} | ConvertTo-Json -Compress
