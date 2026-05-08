# Plan: oral-story-0001 — Backend API (M1)

## 0) Principles
- All endpoints require auth unless explicitly public.
- All resources are scoped by `user_id`.
- Recordings/texts are scoped by `project_id`.
- Error model is stable: `{ ok:false, error:{ code, message, detail? } }`.

## 1) Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`

## 2) Projects
- `GET /api/projects`（列表）
- `POST /api/projects`（创建）
- `GET /api/projects/:projectId`（详情）
- `PATCH /api/projects/:projectId`（改名/描述）
- `DELETE /api/projects/:projectId`（删除 + best-effort 清理录音对象）

## 3) Recordings
### Create/upload
- `POST /api/projects/:projectId/recordings/init`
  - returns `{ recordingId, r2Key, putUrl }` (presigned)
- `POST /api/projects/:projectId/recordings/upload`（local-dev proxy upload）
- `POST /api/recordings/:recordingId/complete`（duration/size/sha256）

### List/playback/delete
- `GET /api/projects/:projectId/recordings`
  - includes latest transcript + correction status (M1)
- `GET /api/recordings/:recordingId/signed-url`
- `GET /api/recordings/:recordingId/blob`（proxy download）
- `DELETE /api/recordings/:recordingId`
- `POST /api/recordings/bulk-delete`

## 4) Transcripts (STT)
- `POST /api/stt/transcribe`
  - input: `multipart audio` + `{ projectId, recordingId, provider?, model?, language? }`
  - output: `{ ok:true, transcriptId, text, provider, model }`
- `GET /api/projects/:projectId/transcripts/merged`
  - output: `{ ok:true, text }` (server-side merge by created_at)

## 5) Corrections (manual edit)
- `POST /api/recordings/:recordingId/corrections`
  - input: `{ text }`
  - output: `{ ok:true, correctionId }`
- `GET /api/projects/:projectId/corrections/merged`
  - merges “latest correction if exists else latest transcript”

## 6) Rewrites (organize/story)
- `POST /api/projects/:projectId/rewrites`
  - input: `{ source:"correction"|"transcript", style, promptHints? }`
  - output: `{ ok:true, rewriteId, text, style }`
- `GET /api/projects/:projectId/rewrites/latest?style=...`

## 7) System
- `GET /healthz`
- `GET /api/config/check`（缺 key / provider 启用状态）
- `GET /api/models`（provider/model 列表 + defaults）

## 8) Verification
- 单条录音：init → upload/putUrl → complete → transcribe → list shows transcript
- 项目级：transcripts merged → correction merged → rewrite created → latest fetch
- 删除：recording delete + bulk-delete + project delete（可重复调用）

