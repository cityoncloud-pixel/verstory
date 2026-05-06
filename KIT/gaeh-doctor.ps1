param(
  [Parameter(Mandatory = $false)]
  [string]$TargetPath = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'

function Fail($msg) {
  Write-Host "GAEH doctor: FAIL - $msg" -ForegroundColor Red
  exit 2
}

function Ok($msg) {
  Write-Host "GAEH doctor: OK   - $msg" -ForegroundColor Green
}

if (-not (Test-Path -LiteralPath $TargetPath)) {
  Fail "TargetPath not found: $TargetPath"
}

$requiredDirs = @('project_control','ai_harness','specs','plans','reviews','reports')
foreach ($d in $requiredDirs) {
  $p = Join-Path $TargetPath $d
  if (-not (Test-Path -LiteralPath $p)) { Fail "Missing dir: $d" }
}
Ok "Directories present"

$requiredFiles = @(
  'project_control\goal.md',
  'project_control\phase_status.md',
  'project_control\task_queue.json',
  'ai_harness\harness_rules.md'
)
foreach ($f in $requiredFiles) {
  $p = Join-Path $TargetPath $f
  if (-not (Test-Path -LiteralPath $p)) { Fail "Missing file: $f" }
}
Ok "Core files present"

# Optional GGS check
$ggsRunner = Join-Path $TargetPath 'project_control\.ggs\templates\runner.prompt.md'
if (Test-Path -LiteralPath $ggsRunner) {
  Ok "GGS runner present"
} else {
  Write-Host "GAEH doctor: WARN - GGS runner not found (project_control/.ggs/templates/runner.prompt.md)" -ForegroundColor Yellow
}

# task_queue.json must be valid JSON
$queuePath = Join-Path $TargetPath 'project_control\task_queue.json'
try {
  $null = (Get-Content -Raw -LiteralPath $queuePath) | ConvertFrom-Json
  Ok "task_queue.json is valid JSON"
} catch {
  Fail "task_queue.json invalid JSON: $($_.Exception.Message)"
}

# Optional adapters check
$codexSkill = Join-Path $TargetPath '.codex\skills\gaeh\SKILL.md'
if (Test-Path -LiteralPath $codexSkill) { Ok "Codex adapter present" } else { Write-Host "GAEH doctor: WARN - Codex adapter not found (.codex/skills/gaeh/SKILL.md)" -ForegroundColor Yellow }

$cursorRule = Join-Path $TargetPath '.cursor\rules\gaeh.mdc'
if (Test-Path -LiteralPath $cursorRule) { Ok "Cursor adapter present" } else { Write-Host "GAEH doctor: WARN - Cursor adapter not found (.cursor/rules/gaeh.mdc)" -ForegroundColor Yellow }

Write-Host "GAEH doctor: PASS" -ForegroundColor Green
