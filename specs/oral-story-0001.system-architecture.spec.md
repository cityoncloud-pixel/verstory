# Spec: oral-story-0001 — System Architecture (M1)

## 0. Source of truth
- Interaction spec: `oral_story_interaction_spec_v1.md`
- Goal: `project_control/goal.md`

## 1. Objectives
Build a production-usable M1 loop:

`项目 → 录音/上传 → 转写 → 校正 → 整理成文 → 导出`

Hard constraints:
- Keep the 3-step main flow stable: `录音 → 转写 → 整理`
- Elder-friendly UI: big buttons, high contrast, minimal choices
- Recordings and texts must be strictly bound to a project (no cross-project mixing)

## 2. High-level architecture

```text
Browser (apps/web)
  - Auth UI + Project UI
  - Recording (MediaRecorder)
  - Upload (multipart or presigned URL)
  - Playback (signed URL / proxy blob)
  - State machine (single-path)
        |
        v
API (apps/api, Fastify)
  - Auth (cookie/session or token)
  - Projects CRUD
  - Recordings CRUD + signed URLs + blob proxy
  - STT jobs (sync for M1; async later)
  - Rewrite/organize jobs (sync for M1)
        |
        +--> Postgres (metadata + texts)
        |
        +--> Object Storage (R2/S3 compatible, audio blobs)
```

## 3. Data ownership & binding rules
- A `Recording` always belongs to exactly one `Project`.
- All transcript/correction/rewrite artifacts must reference:
  - `user_id`
  - `project_id`
  - `recording_id` (when derived from a recording)
- Object storage key must embed `userId` + `projectId` to guarantee physical segregation.

## 4. Security boundaries (M1)
- API requires auth for all project/recording/text endpoints.
- User isolation is enforced by `user_id` checks on every DB query.
- Never expose provider/model knobs in the main flow UI (allowed in “设置”页).

## 5. Reliability & cleanup
- Delete recording:
  - best-effort delete object storage key
  - delete DB row
  - must be idempotent (repeatable without breaking)
- Delete project:
  - delete DB rows via FK cascade
  - best-effort iterate & delete object storage keys under `u/{userId}/p/{projectId}/...`

## 6. Observability (minimum)
- `/healthz`
- request logging (no API keys; no transcript content in logs by default)
- error model:
  - `{ ok:false, error:{ code, message, detail? } }`

## 7. Non-goals (M1)
- background queues, realtime partial transcripts
- speaker diarization
- multi-device sync conflicts

