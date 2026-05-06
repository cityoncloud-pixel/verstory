# Report: deploy-0002

## Status
DONE

## Verification
PASS (local build + local run)

## Commands
- `cd apps/api; npm install` (PASS)
- `cd apps/api; npm run build` (PASS)

## Runtime Check
- `GET http://127.0.0.1:8080/healthz` → `200` JSON（包含 `status: "ok"`）

## Output
- 后端最小服务：`apps/api`（Node + TS）
- Docker 化：`apps/api/Dockerfile`
- 使用说明：`apps/api/README.md`

## Next Step
- 执行 `deploy-0003`：VPS Nginx + HTTPS + 反代部署指南（含 certbot、systemd/compose）。

