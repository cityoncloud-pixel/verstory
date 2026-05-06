# Plan: deploy-0001 — Hostinger Publish

## Steps
1) 本地构建确认：`apps/web/dist` 生成
2) 编写 `deploy/hostinger_frontend.md`：构建、上传、SPA fallback、缓存与验证
3) 落盘 report/review，并更新队列到下一任务

## Verification Commands
- `cd apps/web; npm run build`

*** Add File: reviews/deploy-0001.review.md
# Review: deploy-0001

Decision: PASS

## Spec Gate
- 构建/产物/验收清晰：PASS
- Scope 边界明确：PASS

## Plan Gate
- 步骤可执行：PASS

