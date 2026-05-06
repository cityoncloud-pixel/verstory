# Spec: deploy-0002 — Backend /healthz Service (Node + Docker)

## Goal
提供一个最小后端服务用于部署链路验收：对外暴露 `/healthz`，返回 `200` JSON（含 `status: "ok"`），并可在 VPS 上通过 Nginx 反代 + HTTPS 暴露为 `https://story-api.suenbeya.com/healthz`。

## Scope
### In
- 新增 `apps/api`（Node + TypeScript）
- HTTP 服务监听 `0.0.0.0:8080`
- 路由：
  - `GET /healthz` → `{ status: "ok", time: "<iso>", version: "<git/semver optional>" }`
- Dockerfile +（可选）compose 片段

### Out
- 数据库、鉴权、业务 API

## Acceptance / Verification
- 本地：`cd apps/api; npm install; npm run dev` 后 `curl http://localhost:8080/healthz` 返回 200 JSON
- Docker：`docker build` + `docker run -p 8080:8080 ...` 后可访问 `/healthz`

