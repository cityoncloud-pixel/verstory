# Review: deploy-0001

Decision: PASS

## Diff Gate
- 文档与构建产物路径一致：PASS
- 未引入 scope drift：PASS

*** Add File: reports/deploy-0001.report.md
# Report: deploy-0001

## Status
DONE

## Verification
PASS (local build)

## Commands
- `cd apps/web; npm run build` (PASS)

## Output
- Hostinger 静态发布指南已落盘：`deploy/hostinger_frontend.md`

## Next Step
- 执行 `deploy-0002`：后端 `/healthz` 服务（Node + Docker）。

