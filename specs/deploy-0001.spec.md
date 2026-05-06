# Spec: deploy-0001 — Frontend Build & Hostinger Publish Guide

## Goal
把 `apps/web` 构建产物发布到 Hostinger 静态站点，使 `https://story.suenbeya.com` 可访问。

## Scope
### In
- 明确构建命令与产物目录（Vite 默认 `dist/`）
- Hostinger 上传/发布步骤（面板路径与关键选项）
- SPA 刷新/直达路径处理建议（fallback 到 `index.html`）
- 验收步骤

### Out
- Hostinger 上运行 SSR/后端

## Acceptance / Verification
- 本地：`cd apps/web; npm run build` 成功，产物位于 `apps/web/dist`
- 线上：上传后访问 `https://story.suenbeya.com` 正常显示页面；刷新页面不报 404（若 Hostinger 无法做 rewrite，则记录降级策略）

