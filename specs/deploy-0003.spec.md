# Spec: deploy-0003 — VPS Nginx + HTTPS + Reverse Proxy Guide

## Goal
在搬瓦工 Ubuntu 22.04 VPS 上完成可复现部署链路：
- `story-api.suenbeya.com` → Nginx → 反代到后端服务（容器/进程）
- HTTPS：Let’s Encrypt 证书签发与自动续期
- 验收：`https://story-api.suenbeya.com/healthz` 返回 200 JSON

## Scope
### In
- DNS A 记录前置与验证
- SSH 登录与基础安全（建议 SSH key、禁用 root 密码登录作为可选项）
- 方案选择：优先 Docker（便于回滚）
- Nginx 站点配置（server_name、proxy_pass、headers）
- Certbot 签发证书与续期检查
- 运行/回滚命令清单

### Out
- 自动化 CI/CD
- 复杂监控体系（仅保留最小可用的日志查看方式）

## Acceptance / Verification
- VPS 上执行文档命令后：
  - `curl -fsS http://127.0.0.1:8080/healthz`（容器/进程本地）返回 200
  - `curl -fsS https://story-api.suenbeya.com/healthz` 返回 200 JSON
  - `sudo nginx -t` 通过

