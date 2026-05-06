param(
  [Parameter(Mandatory = $false)]
  [string]$TargetPath = (Get-Location).Path,

  [Parameter(Mandatory = $false)]
  [string]$Adapters = $null,

  [Parameter(Mandatory = $false)]
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

function Ensure-Dir {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
  }
}

function Copy-TemplateItem {
  param(
    [string]$Src,
    [string]$Dst
  )
  $dstDir = Split-Path -Parent $Dst
  Ensure-Dir $dstDir
  Copy-Item -LiteralPath $Src -Destination $Dst -Force
}

function Split-Adapters {
  param([string]$Value)
  if (-not $Value) { return @() }
  return ($Value -split '[,;]' | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ })
}

function Install-AdapterCodex {
  param([string]$ScriptRoot, [string]$TargetPath)
  $src = Join-Path $ScriptRoot 'adapters\codex\SKILL.md'
  if (-not (Test-Path -LiteralPath $src)) { throw "Codex adapter missing: $src" }
  $dst = Join-Path $TargetPath '.codex\skills\gaeh\SKILL.md'
  Copy-TemplateItem -Src $src -Dst $dst
}

function Install-AdapterCursor {
  param([string]$ScriptRoot, [string]$TargetPath)
  $src = Join-Path $ScriptRoot 'adapters\cursor\gaeh.mdc'
  if (-not (Test-Path -LiteralPath $src)) { throw "Cursor adapter missing: $src" }
  $dst = Join-Path $TargetPath '.cursor\rules\gaeh.mdc'
  Copy-TemplateItem -Src $src -Dst $dst
}

function Validate-Install {
  param([string]$TargetPath, [string[]]$Adapters)

  $requiredDirs = @('project_control','ai_harness','specs','plans','reviews','reports')
  foreach ($d in $requiredDirs) {
    if (-not (Test-Path -LiteralPath (Join-Path $TargetPath $d))) { throw "Missing dir: $d" }
  }

  $requiredFiles = @(
    'project_control\goal.md',
    'project_control\phase_status.md',
    'project_control\task_queue.json',
    'ai_harness\harness_rules.md'
  )
  foreach ($f in $requiredFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $TargetPath $f))) { throw "Missing file: $f" }
  }

  # task_queue.json must be valid JSON
  $queuePath = Join-Path $TargetPath 'project_control\task_queue.json'
  $null = (Get-Content -Raw -LiteralPath $queuePath) | ConvertFrom-Json

  if ($Adapters -contains 'codex') {
    if (-not (Test-Path -LiteralPath (Join-Path $TargetPath '.codex\skills\gaeh\SKILL.md'))) { throw "Codex adapter not installed" }
  }
  if ($Adapters -contains 'cursor') {
    if (-not (Test-Path -LiteralPath (Join-Path $TargetPath '.cursor\rules\gaeh.mdc'))) { throw "Cursor adapter not installed" }
  }
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$templatesRoot = Join-Path $scriptRoot 'templates'

if (-not (Test-Path -LiteralPath $templatesRoot)) {
  throw "templates folder missing: $templatesRoot"
}

Ensure-Dir $TargetPath

Write-Host "GAEH bootstrap -> $TargetPath"

$gaehDirs = @('project_control','ai_harness','specs','plans','reviews','reports')
foreach ($d in $gaehDirs) {
  Ensure-Dir (Join-Path $TargetPath $d)
}

# Copy template files (deterministic set)
$files = Get-ChildItem -LiteralPath $templatesRoot -Recurse -File
foreach ($f in $files) {
  $rel = $f.FullName.Substring($templatesRoot.Length).TrimStart('\','/')
  $dst = Join-Path $TargetPath $rel

  if ((Test-Path -LiteralPath $dst) -and (-not $Force)) {
    continue
  }
  Copy-TemplateItem -Src $f.FullName -Dst $dst
}

# Copy spec next to harness for reference (optional, non-destructive)
$specSrc = Join-Path $scriptRoot 'GAEH_Implementation_Spec.md'
if (Test-Path -LiteralPath $specSrc) {
  $specDst = Join-Path $TargetPath 'GAEH_Implementation_Spec.md'
  if ((-not (Test-Path -LiteralPath $specDst)) -or $Force) {
    Copy-Item -LiteralPath $specSrc -Destination $specDst -Force
  }
}

# Patch placeholder date in task_queue.json
$queuePath = Join-Path $TargetPath 'project_control\task_queue.json'
if (Test-Path -LiteralPath $queuePath) {
  $txt = Get-Content -Raw -LiteralPath $queuePath
  $today = (Get-Date).ToString('yyyy-MM-dd')
  if ($txt -match '\"updated_at\"\\s*:\\s*\"YYYY-MM-DD\"') {
    $txt = $txt -replace '\"updated_at\"\\s*:\\s*\"YYYY-MM-DD\"', ('\"updated_at\": \"' + $today + '\"')
    Set-Content -LiteralPath $queuePath -Value $txt -Encoding UTF8
  }
}

# Install adapters (optional)
$selectedAdapters = Split-Adapters $Adapters
foreach ($a in $selectedAdapters) {
  switch ($a) {
    'codex' { Install-AdapterCodex -ScriptRoot $scriptRoot -TargetPath $TargetPath; break }
    'cursor' { Install-AdapterCursor -ScriptRoot $scriptRoot -TargetPath $TargetPath; break }
    default { throw "Unknown adapter: $a (supported: codex,cursor)" }
  }
}

# Validate + log
Validate-Install -TargetPath $TargetPath -Adapters $selectedAdapters

$logPath = Join-Path $TargetPath 'gaeh_install.log'
$log = @()
$log += "installed_at: $((Get-Date).ToString('s'))"
$log += "target: $TargetPath"
$log += "adapters: $($selectedAdapters -join ',')"
Set-Content -LiteralPath $logPath -Value ($log -join [Environment]::NewLine) -Encoding UTF8

Write-Host "Done."
Write-Host "Next: fill project_control\\goal.md, then ask your AI: 按 GAEH 流程开始执行当前 goal"

