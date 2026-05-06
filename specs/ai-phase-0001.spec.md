# Spec: ai-phase-0001 — Phase 4 Backend AI + Model Selection

## Goal
将 Verstory 推进为“真实可用的 AI 文本处理系统”：
- 模型配置系统（provider/model 可选）
- STT：音频→文字
- Text refine：clean/organize/goal
- 前端接入并可验证

## Baseline
- 前端：Hostinger 静态站点 `https://story.suenbeya.com`
- 后端：VPS Docker + Nginx + HTTPS 已跑通，`https://story-api.suenbeya.com/healthz` OK

## Scope
### In
- 后端 endpoints：
  - `GET /api/models`
  - `GET /api/config/check`
  - `POST /api/stt/transcribe`（multipart audio）
  - `POST /api/text/refine`（json）
- Provider registry（OpenAI/DeepSeek），缺少 key 时返回明确 error
- 前端接入：模型选择、音频上传、结果展示、错误提示

### Out
- 账号/同步/数据库持久化
- 计费/配额/审计

## Acceptance
- `curl https://story-api.suenbeya.com/api/models` 返回模型列表（含 defaults）
- `curl https://story-api.suenbeya.com/api/config/check` 返回 key 缺失/就绪状态
- 上传音频到 `/api/stt/transcribe` 可获得 text（或缺 key 返回清晰错误）
- `/api/text/refine` 在三种 mode 下可返回结果（或缺 key 返回清晰错误）
- 前端页面可选择 provider/model 并完成端到端闭环

