# Hostinger 前端部署（静态站点）— `story.suenbeya.com`

本项目的前端位于 `apps/web`，为 Vite 构建的静态站点，产物目录为 `dist/`。

## 1) 本地构建
在你的开发机执行：

```bash
cd apps/web
npm install
npm run build
```

构建产物在：`apps/web/dist/`

## 2) 上传到 Hostinger（静态站点）
在 Hostinger 面板中找到你已绑定的子域名 `story.suenbeya.com` 对应的网站/站点目录，然后：

- 将 `apps/web/dist/` 目录内的所有文件上传到站点根目录（通常是 `public_html/`，以 Hostinger 实际为准）
- 确保 `index.html` 位于站点根目录下

## 3) SPA 刷新 / 直达路径（重要）
本前端为单页应用（SPA）。如果你未来加入子路径（例如 `/p/<id>`），需要确保服务器把未知路径回退到 `index.html`。

Hostinger 静态站点的能力因套餐/面板功能不同而不同：

- **如果支持重写规则**：添加“所有非静态文件请求 → `/index.html`”
- **如果不支持重写**：MVP 阶段尽量保持单页无子路径（当前实现即为单页），即可避免刷新 404 的问题

## 4) HTTPS
Hostinger 通常可为绑定域名自动签发 HTTPS（或在面板中一键开启）。目标状态：
- 浏览器访问 `https://story.suenbeya.com` 无安全警告

## 5) 验收清单
1) 访问：`https://story.suenbeya.com` 能打开页面
2) 页面可完成最小流程：新建项目 → 录音两段 → 转写（mock）→ 生成故事（mock）→ 导出 Markdown
3) 刷新页面：项目/片段/文本仍可恢复

