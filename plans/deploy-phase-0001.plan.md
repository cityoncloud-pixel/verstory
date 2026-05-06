# Plan: deploy-phase-0001 — Phase 3 Deployment

## Deliverables
- Phase 3 任务拆分（deploy-0001~0004）
- 每个任务都有 spec/plan/review/report 落盘

## Task Breakdown
1) `deploy-0001`：前端 build 与 Hostinger 发布指南（含 SPA 刷新/缓存策略）
2) `deploy-0002`：后端 `/healthz` 服务（Node + Docker）
3) `deploy-0003`：VPS 部署指南（Nginx + HTTPS + 反代到容器）
4) `deploy-0004`：DNS A 记录切换与最终验收清单

## Validation Strategy
- 本地可验证部分：前端 `npm run build`；后端容器本地 `docker build/run`（若有 docker）或 `npm run dev`（至少一个）
- 服务器验证部分：以“可执行命令清单”交付，由 Owner 在 VPS 上运行（因为需要 SSH 凭据）

