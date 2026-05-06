# Report: deploy-0003

## Status
DONE

## Verification
PASS (documentation + templates ready; server execution requires Owner)

## Output
- VPS 部署指南：`deploy/vps_backend.md`
- Nginx 配置模板：`deploy/nginx/story-api.suenbeya.com.conf`
- Compose 模板：`deploy/docker-compose.story-api.yml`

## Owner Runbook (VPS)
- 按 `deploy/vps_backend.md` 执行后，目标验收：
  - `curl -fsS https://story-api.suenbeya.com/healthz` → 200 JSON

## Next Step
- 执行 `deploy-0004`：DNS 切换与最终验收清单（前端 + 后端）。

