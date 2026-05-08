# Spec: oral-story-0001 — Database Schema (M1)

## 1) Current baseline (exists)
- `users`
- `projects`
- `recordings` (binds `user_id`, `project_id`, `r2_key`, duration/size/sha256)
- `transcripts` (binds `user_id`, `recording_id`)
- `rewrites` (binds `user_id`, `project_id`)
- `jobs` (future async)

## 2) Gaps vs interaction spec
Interaction requires:
- per-recording “校正稿”（editable, versioned)
- project-level “合并校正全文”（derived)
- per-project “整理稿”（style-based, versioned)

## 3) Target schema additions (M1)
### A) corrections (new)
Store manual corrections per recording.

Columns:
- `id text pk`
- `user_id text not null` (FK users)
- `project_id text not null` (FK projects)
- `recording_id text not null` (FK recordings)
- `text text not null`
- `created_at timestamptz not null default now()`

Indexes:
- `(user_id, project_id, recording_id, created_at desc)`

Rules:
- “latest correction” is the source-of-truth for a recording when present.

### B) derived_texts (optional, can be computed on read)
If performance becomes an issue, persist merged results.

Columns:
- `id text pk`
- `user_id text not null`
- `project_id text not null`
- `kind text not null` (`transcript_merged` | `correction_merged`)
- `text text not null`
- `created_at timestamptz not null default now()`

## 4) Rewrite versioning (M1)
For `rewrites`, ensure:
- `style` is explicit (e.g. `oral_clean` / `memoir`)
- store `rules_summary` for auditability
- always bind to `project_id`

## 5) Cascading deletes
- `projects` delete cascades to `recordings`, `rewrites`, and any derived tables referencing `project_id`.
- `recordings` delete cascades to `transcripts` and `corrections`.

## 6) Migration policy
Keep migrations idempotent in `apps/api/src/db.ts`:
- `create table if not exists ...`
- `alter table ... add column if not exists ...`

