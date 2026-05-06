# Verstory API (MVP)

最小后端服务：用于部署链路验收。

## 本地运行
```bash
cd apps/api
npm install
npm run dev
```

访问：
- `http://127.0.0.1:8080/healthz`

## 构建
```bash
cd apps/api
npm run build
npm run start
```

## Docker
```bash
cd apps/api
docker build -t verstory-api:local .
docker run --rm -p 8080:8080 verstory-api:local
```

