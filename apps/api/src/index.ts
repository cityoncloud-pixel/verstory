import { buildServer } from './server.js'

const PORT = Number.parseInt(process.env.PORT ?? '8080', 10)
const HOST = process.env.HOST ?? '0.0.0.0'

const app = await buildServer()

await app.listen({ port: PORT, host: HOST })
