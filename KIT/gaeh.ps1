param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$ErrorActionPreference = 'Stop'

function Get-KitRoot { return $PSScriptRoot }

function Get-UserHome {
  if ($env:USERPROFILE) { return $env:USERPROFILE }
  if ($HOME) { return $HOME }
  throw "Cannot resolve user home folder."
}

function Get-GaehHome { Join-Path (Get-UserHome) '.gaeh' }

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
  }
}

function Read-Json([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  (Get-Content -Raw -LiteralPath $Path) | ConvertFrom-Json
}

function Write-Json([string]$Path, $Obj) {
  $dir = Split-Path -Parent $Path
  Ensure-Dir $dir
  ($Obj | ConvertTo-Json -Depth 20) | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Print-Help {
  @"
GAEH CLI (PowerShell)

Usage:
  .\\gaeh.ps1 install              Install this kit to user home (~/.gaeh)
  .\\gaeh.ps1 init [-TargetPath <path>] [-Adapters codex,cursor] [-Force]
  .\\gaeh.ps1 doctor [-TargetPath <path>]

Tip:
  After install, run: gaeh init
"@ | Write-Host
}

function Cmd-Install {
  $kitRoot = Get-KitRoot
  $gaehHome = Get-GaehHome

  Ensure-Dir $gaehHome
  Ensure-Dir (Join-Path $gaehHome 'bin')
  Ensure-Dir (Join-Path $gaehHome 'kits')

  $metaPath = Join-Path $kitRoot 'gaeh-kit.json'
  $meta = Read-Json $metaPath
  if (-not $meta) { throw "Missing kit metadata: $metaPath" }
  $version = $meta.version
  if (-not $version) { throw "Missing version in gaeh-kit.json" }

  $dstKit = Join-Path (Join-Path $gaehHome 'kits') $version
  if (Test-Path -LiteralPath $dstKit) { Remove-Item -Recurse -Force -LiteralPath $dstKit }
  Ensure-Dir $dstKit
  Copy-Item -Recurse -Force -Path (Join-Path $kitRoot '*') -Destination $dstKit

  # Update "current" pointer
  $currentPath = Join-Path $gaehHome 'current.txt'
  Set-Content -LiteralPath $currentPath -Value $dstKit -Encoding UTF8

  # Default config (non-destructive)
  $cfgPath = Join-Path $gaehHome 'config.json'
  if (-not (Test-Path -LiteralPath $cfgPath)) {
    $cfg = @{
      schema_version = '1.0'
      default_adapters = @('codex','cursor')
    }
    Write-Json -Path $cfgPath -Obj $cfg
  }

  # Create shim command (PowerShell)
  $shim = @'
param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)
$ErrorActionPreference = "Stop"
$userHome = if ($env:USERPROFILE) { $env:USERPROFILE } elseif ($HOME) { $HOME } else { throw "Cannot resolve user home." }
$gaehHome = Join-Path $userHome ".gaeh"
$current = Join-Path $gaehHome "current.txt"
if (-not (Test-Path -LiteralPath $current)) { throw "GAEH not installed (missing ~/.gaeh/current.txt). Run: gaeh.ps1 install" }
$kit = (Get-Content -Raw -LiteralPath $current).Trim()
if (-not (Test-Path -LiteralPath $kit)) { throw "GAEH kit path not found: $kit" }
. (Join-Path $kit "gaeh.ps1") @Args
'@
  $shimPath = Join-Path (Join-Path $gaehHome 'bin') 'gaeh.ps1'
  Set-Content -LiteralPath $shimPath -Value $shim -Encoding UTF8

  Write-Host "GAEH installed to: $dstKit"
  Write-Host "Shim created: $shimPath"
  Write-Host "Add to PATH (current session):"
  $binPath = (Join-Path $gaehHome 'bin')
  Write-Host ("  `$env:PATH = `"{0};$env:PATH`"" -f $binPath)
}

function Cmd-Init {
  param(
    [string]$TargetPath = (Get-Location).Path,
    [string]$Adapters = $null,
    [switch]$Force
  )

  if (-not $Adapters) {
    $cfg = Read-Json (Join-Path (Get-GaehHome) 'config.json')
    if ($cfg -and $cfg.default_adapters) {
      $Adapters = (($cfg.default_adapters | ForEach-Object { $_.ToString() }) -join ',')
    }
  }

  $kitRoot = Get-KitRoot
  $bootstrap = Join-Path $kitRoot 'gaeh-bootstrap.ps1'
  if (-not (Test-Path -LiteralPath $bootstrap)) { throw "Missing bootstrap: $bootstrap" }

  $cmd = @('-ExecutionPolicy','Bypass','-File',$bootstrap,'-TargetPath',$TargetPath)
  if ($Adapters) { $cmd += @('-Adapters',$Adapters) }
  if ($Force) { $cmd += @('-Force') }
  & powershell @cmd
}

function Cmd-Doctor {
  param([string]$TargetPath = (Get-Location).Path)
  $kitRoot = Get-KitRoot
  $doctor = Join-Path $kitRoot 'gaeh-doctor.ps1'
  if (-not (Test-Path -LiteralPath $doctor)) { throw "Missing doctor script: $doctor" }
  & powershell -ExecutionPolicy Bypass -File $doctor -TargetPath $TargetPath
}

if (-not $Args -or $Args.Count -eq 0) { Print-Help; exit 0 }

$cmd = $Args[0].ToLowerInvariant()
$rest = @()
if ($Args.Count -gt 1) { $rest = $Args[1..($Args.Count-1)] }

switch ($cmd) {
  'install' { Cmd-Install; break }
  'init' {
    $tp = (Get-Location).Path
    $ad = $null
    $force = $false
    for ($i=0; $i -lt $rest.Count; $i++) {
      $a = $rest[$i]
      if ($a -eq '-TargetPath' -and $i+1 -lt $rest.Count) { $tp = $rest[$i+1]; $i++; continue }
      if ($a -eq '-Adapters' -and $i+1 -lt $rest.Count) { $ad = $rest[$i+1]; $i++; continue }
      if ($a -eq '-Force') { $force = $true; continue }
    }
    if ($force) {
      Cmd-Init -TargetPath $tp -Adapters $ad -Force
    } else {
      Cmd-Init -TargetPath $tp -Adapters $ad
    }
    break
  }
  'doctor' {
    $tp = (Get-Location).Path
    for ($i=0; $i -lt $rest.Count; $i++) {
      $a = $rest[$i]
      if ($a -eq '-TargetPath' -and $i+1 -lt $rest.Count) { $tp = $rest[$i+1]; $i++; continue }
    }
    Cmd-Doctor -TargetPath $tp
    break
  }
  default { Print-Help; exit 1 }
}
