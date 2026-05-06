# decision_log.md

（AI 追加：关键决策与原因、路由变化、回滚原因、架构变化）

## 2026-05-04 — Phase 2 启动与路由
- 决策：将 `project_control/goal.md` 的实现作为 Phase 2（MVP Web App）执行，并采用 Route D（Phase Task）拆分为多个可验证子任务。
- 原因：目标涉及工程脚手架、录音、存储、provider 抽象与 UI 串联，属于多依赖任务，需队列化迭代与逐步验收。
- 影响：新增 task ids `mvp-phase-0001` ~ `mvp-0005`；每个任务都必须产出 spec/plan/review/report 并更新队列状态。

## 2026-05-04 — mvp-0001 工程落点
- 决策：前端工程落在 `apps/web`，采用 Vite + React + TypeScript。
- 原因：快速可运行/可构建，且与 GAEH harness 目录隔离，便于迭代与回滚。

## 2026-05-04 — mvp-0002 本地存储与录音方案
- 决策：录音使用 `MediaRecorder`；本地持久化使用 IndexedDB（通过 `idb` 轻量封装），并将 `projects` 与 `segments(blob)` 落盘。
- 原因：能满足“刷新恢复 + 回放”的验收要求，并为后续转写/整理提供可持久化输入。

## 2026-05-04 — mvp-0003 mock provider 持久化策略
- 决策：mock 转写/故事文本使用 localStorage 持久化（按 projectId），暂不变更 IndexedDB schema。
- 原因：避免引入 IndexedDB schema 迁移复杂度，先保证离线确定性与刷新恢复的验收闭环；后续如需统一存储可在单独任务中做版本升级与迁移。

## 2026-05-04 — mvp-0004 导出策略
- 决策：MVP 导出采用浏览器端下载 Markdown（必做）+ 剪贴板复制（可选）。
- 原因：满足“至少一种导出方式”的目标要求，且无需后端或额外依赖。

## 2026-05-04 — Phase 2 收尾
- 决策：将 Phase 2 标记为 Complete，并停止自动推进到真实转写/LLM。
- 原因：当前 `goal.md` 已可用 mock provider 达成可运行闭环；真实 provider 需要 Owner 决策隐私/成本/模型选择，属于产品取舍。

## 2026-05-05 — Phase 3 部署目标确认（Owner 决策输入）
- 决策：前端采用 Hostinger 静态站点发布（仅上传构建产物），域名为 `story.suenbeya.com`；后端部署在搬瓦工 Ubuntu 22.04 VPS，域名为 `story-api.suenbeya.com`，先上线 `/healthz` 并通过 Nginx + HTTPS 验证链路。
- 原因：将“可运行 MVP”推进到可公开访问的最小上线形态，同时保持后端范围最小化以便快速验收。

## 2026-05-05 — tinyfix-0001 探活兼容
- 决策：后端 `/healthz` 同时支持 `GET` 与 `HEAD`。
- 原因：部分探活/代理使用 `HEAD`；此前 `HEAD /healthz` 可能被误判为不可用（返回 404）。

## 2026-05-05 — Phase 3 线上验收
- 结果：`https://story-api.suenbeya.com/healthz`（GET/HEAD）均返回 200；`https://story.suenbeya.com` 可访问。
- 影响：Phase 3 标记为完成；下一阶段如要业务化后端/接入真实模型，需要 Owner 决策与新 phase 目标。

## 2026-05-05 — Phase 4 目标确认（Owner 输入）
- 决策：进入“Verstory 后端能力完善与模型可选化”：后端提供模型配置系统（provider/model 可选），并实现 STT（/api/stt/transcribe）与文本整理（/api/text/refine，支持 clean/organize/goal），再由前端接入形成端到端闭环。
- 原因：从“部署可用”升级为“真实可用的 AI 文本处理系统”，并保持 provider 可替换与无 key 的可解释错误。

## 2026-05-05 — Phase 4 交付形态
- 决策：Phase 4 先完成“接口与前端接入 + 明确缺 key 错误码”，并提供 runbook；真实调用在 VPS 配置 API keys、Hostinger 上传新前端后完成最终验收。
- 原因：密钥属于 Owner 控制的敏感配置；需要可审计、可回滚的部署步骤。
