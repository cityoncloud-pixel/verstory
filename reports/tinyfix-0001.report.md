# Report: tinyfix-0001

## Status
DONE

## Verification
PASS (local build) + READY (server deploy requires pulling latest on VPS)

## Change
- 后端 `/healthz` 增加对 `HEAD` 的支持：`HEAD /healthz` 现在返回 `200`（无 body）

## Rationale
- 许多探活/反代/监控会用 `HEAD`；此前 `curl -I https://story-api.suenbeya.com/healthz` 返回 404，容易误判服务不可用。

## Commands
- `cd apps/api; npm run build` (PASS)

