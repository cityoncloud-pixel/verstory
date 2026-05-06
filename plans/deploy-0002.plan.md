# Plan: deploy-0002 — Backend /healthz

## Steps
1) 创建 `apps/api` 工程（TS + Node）
2) 实现 `/healthz` 与基础中间件（JSON、请求日志可选）
3) 添加 Dockerfile（生产启动 `node dist/index.js`）
4) 本地验证：运行 dev 与 build
5) 落盘 report/review

## Verification Commands
- `cd apps/api; npm install`
- `cd apps/api; npm run build`
- `cd apps/api; npm run dev`（手工 curl）

*** Add File: reviews/deploy-0002.review.md
# Review: deploy-0002

Decision: PASS

## Spec Gate
- 目标与验收清晰：PASS

## Plan Gate
- 步骤可执行：PASS

