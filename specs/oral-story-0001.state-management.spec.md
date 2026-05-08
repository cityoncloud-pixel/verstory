# Spec: oral-story-0001 — State Management (Single-path, M1)

## 1) Why a state machine
目标用户容易迷路；因此必须把 UI 约束为“单路径推进”，并让每一步的可用按钮极少且明确。

## 2) Top-level flow (project workspace)
State is per-project.

```text
project_idle
  -> recording_ready
  -> recording_in_progress
  -> recording_stopped
  -> transcribe_ready
  -> transcribing
  -> correction_ready
  -> correcting
  -> organize_ready
  -> organizing
  -> export_ready
```

## 3) Allowed transitions
- `recording_ready` → `recording_in_progress` (Start)
- `recording_in_progress` → `recording_stopped` (Stop)
- `recording_stopped` → `recording_ready` (Record another)
- `recording_stopped` → `transcribe_ready` (Go to Tab2)
- `transcribe_ready` → `transcribing` (Transcribe all / single)
- `transcribing` → `correction_ready` (when at least 1 transcript succeeded)
- `correction_ready` → `correcting` (edit)
- `correcting` → `organize_ready` (save merged correction)
- `organize_ready` → `organizing` (generate)
- `organizing` → `export_ready` (success)

Error sub-states:
- `transcribing_error(recordingId)` (retry allowed; not fatal)
- `organizing_error` (retry allowed)

## 4) UI mapping (button budget)
- 录音 Tab: main = Start/Stop, secondary = Upload, tertiary = Manage/Delete
- 转写 Tab: main = Transcribe all, secondary = Retry failed, tertiary = Merge to correction
- 整理 Tab: main = Generate, secondary = Export, tertiary = Back

## 5) Data sources
Server is source-of-truth:
- recordings list (with latest transcript/correction)
- merged transcript/correction (computed server-side)
- rewrites latest by style

Client stores:
- current projectId
- ephemeral UI state (in-flight requests, selected recordings)

