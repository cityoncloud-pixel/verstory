# Spec: deploy-0004 — DNS Cutover + Verification Checklist

## Goal
给 Owner 一份“照着做就能上线”的执行顺序与验收清单，完成 Phase 3 的最终闭环：
- 前端：`https://story.suenbeya.com`
- 后端：`https://story-api.suenbeya.com/healthz`

## Scope
### In
- DNS A 记录配置核对点
- 发布执行顺序（推荐顺序 + 失败回滚）
- 最终验收命令清单（curl/浏览器）

### Out
- 自动化部署脚本（后续可补）

## Acceptance
- Owner 按清单执行后，可得到两个域名都通过 HTTPS 访问的验收结果

