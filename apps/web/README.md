# Verstory (Web)

目标：一个“录音 → 转写 → 改写”的网页应用。

## 存储位置（重要）
本项目采用“音频存对象存储，文本存数据库”的结构：

- 录音文件（音频本体）：存 **Cloudflare R2**（bucket `verstory`），通过后端签发 **预签名 URL** 直传/直取
- 录音元数据 + 转写草稿（draft）+ 故事最终稿（final）：存 **Postgres（Supabase）**

这意味着：**R2 里只放音频文件；转写/改写后的文本不在 R2，而在 Postgres**。

登录：仅预置用户（邮箱/密码），不开放注册

## 环境
- Node.js >= 20

## 安装与启动（本地）
```bash
cd apps/api
npm install
# create apps/api/.env (see apps/api/.env.example)
npm run dev

cd ../web
npm install
# optional: override api base for dev
# set VITE_API_BASE=http://127.0.0.1:8080
npm run dev
```

## 构建
```bash
cd apps/web
npm run build
```

## 手动验收（端到端）
1) 启动后端与前端
2) 打开前端页面并登录（预置用户）
3) 新建项目并录音（停止后自动上传到 R2）
4) 选择录音 → 点击“开始转写”
5) 点击“开始改写”
6) 刷新页面/换设备登录后，能看到同一项目与录音并继续操作

## 本地开发提示
- 若前端是 `http://localhost`，后端 refresh cookie 需要在 `apps/api/.env` 设置：
  - `COOKIE_SECURE=false`
  - `COOKIE_DOMAIN=`（空，避免设置 `.suenbeya.com` 影响 localhost）
