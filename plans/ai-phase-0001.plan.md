# Plan: ai-phase-0001 — Phase 4

## Task Breakdown
1) `ai-0001`：model registry + `/api/models` + `/api/config/check` + `.env.example`
2) `ai-0002`：STT `/api/stt/transcribe`（OpenAI 优先，文件大小限制与错误码）
3) `ai-0003`：Text refine `/api/text/refine`（prompt 模板 + mode）
4) `ai-0004`：前端接入（模型下拉、上传、调用、展示、错误提示）

## Validation
- 后端本地：curl 访问 endpoints；缺 key 时验证错误码
- 线上：VPS 重建容器后，按 curl 清单验收

