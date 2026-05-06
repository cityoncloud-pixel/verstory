# Spec: deploy-phase-0001 — Phase 3 Deployment

## Goal
把 Phase 2 的本机 MVP 推进到可公网访问的最小部署形态：
- 前端：Hostinger 静态站点发布，`https://story.suenbeya.com` 可访问
- 后端：VPS 上线最小 API（`/healthz`），`https://story-api.suenbeya.com/healthz` 可访问（Nginx + HTTPS）

## Scope
### In
- 前端构建与 Hostinger 上传发布说明（含 SPA 刷新路由处理）
- 后端最小服务（Node）+ Docker 化（便于 VPS 部署与回滚）
- VPS 部署说明：Nginx 反代、Let’s Encrypt 证书、systemd 或 docker compose 运行方式
- DNS 切换与验收清单

### Out
- 真正业务后端（账号、存储 API、鉴权、数据库）
- 自动化 CI/CD

## Acceptance / Verification (Phase 3)
- 前端：Hostinger 发布后 `https://story.suenbeya.com` 可打开页面
- 后端：`curl -fsS https://story-api.suenbeya.com/healthz` 返回 `200` JSON（包含 `status: "ok"`）
- HTTPS：证书有效，浏览器无安全警告

## Constraints
- Hostinger 只托管静态前端（不运行后端）
- VPS：Ubuntu 22.04 LTS，优先 SSH key 登录

