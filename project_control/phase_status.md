# phase_status.md (Owner-owned)

## Current Phase
Phase 4: Backend AI + Model Selection

## Phase Goal
把 Verstory 推进到真实可用的 AI 文本处理系统：
- 后端提供模型可选（provider/model）与配置检查
- 后端提供 STT（音频→文字）与 text refine（clean/organize/goal）
- 前端接入并完成端到端闭环（上传音频→转写→整理→展示/导出）

## Done Criteria
- `GET https://story-api.suenbeya.com/api/models` 返回 provider/model 列表
- `POST https://story-api.suenbeya.com/api/stt/transcribe` 可转写（至少一种 provider/model）
- `POST https://story-api.suenbeya.com/api/text/refine` 支持 `clean|organize|goal`
- 前端 `https://story.suenbeya.com` 可选择模型并跑通上传→转写→整理闭环
- 关键工程产物落盘：spec / plan / report / review 完整，`task_queue.json` 状态与实际一致

## Notes
- 真实调用需要在 VPS 设置 `OPENAI_API_KEY` / `DEEPSEEK_API_KEY` 并更新 Hostinger 前端构建产物（见 `deploy/phase4_runbook.md`）。

## Forbidden Work (Scope Guard)
- 不做账号/跨设备同步/多用户协作
- 不做 SaaS/分布式 CI/CD
- 不引入复杂多 Agent runtime
