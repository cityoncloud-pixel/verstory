import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { apiError } from './errors.js'
import { getCallLogs, recordCall } from './callLog.js'
import { getModelRegistry } from './modelRegistry.js'
import { getConfig } from './config.js'
import { createDb, migrate } from './db.js'
import { authPlugin, ensurePreprovisionedUsers } from './auth.js'
import { createR2Client } from './r2.js'
import { registerProjectRoutes } from './routes/projects.js'
import { registerRecordingRoutes } from './routes/recordings.js'
import { registerProjectTextRoutes } from './routes/projectTexts.js'
import { registerSttRoutes } from './routes/stt.js'
import { registerTextRefineRoutes } from './routes/textRefine.js'

export async function buildServer() {
  const config = getConfig()
  const db = createDb(config.DATABASE_URL, { sslRejectUnauthorized: config.PG_SSL_REJECT_UNAUTHORIZED })
  await migrate(db)
  await ensurePreprovisionedUsers(db, config)

  const app = Fastify({ logger: true })

  app.addHook('onRequest', async (req) => {
    ;(req as any).__startedAt = Date.now()
  })

  app.addHook('onSend', async (req, reply, payload) => {
    const startedAt = (req as any).__startedAt as number | undefined
    const durationMs = startedAt ? Date.now() - startedAt : 0

    let ok: boolean | undefined
    let errorCode: string | undefined
    let errorMessage: string | undefined
    let details: unknown

    try {
      if (typeof payload === 'string' && payload.length <= 10_000) {
        const ct = String(reply.getHeader('content-type') || '')
        if (ct.includes('application/json')) {
          const parsed = JSON.parse(payload)
          if (parsed && typeof parsed === 'object') {
            ok = (parsed as any).ok
            const err = (parsed as any).error
            if (err && typeof err === 'object') {
              errorCode = err.code
              errorMessage = err.message
              details = err.details
            }
          }
        }
      }
    } catch {
      // ignore
    }

    recordCall({
      ts: new Date().toISOString(),
      method: req.method,
      url: req.url,
      statusCode: reply.statusCode,
      durationMs,
      ok,
      errorCode,
      errorMessage,
      details,
    })

    return payload
  })

  await app.register(cors, {
    credentials: true,
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      const allow = [
        'https://story.suenbeya.com',
        'https://suenbeya.com',
        'https://www.suenbeya.com',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ]
      if (allow.includes(origin)) return cb(null, true)
      return cb(new Error('CORS_NOT_ALLOWED'), false)
    },
  })

  await app.register(cookie)
  await app.register(jwt, { secret: config.JWT_ACCESS_SECRET })

  await app.register(multipart, {
    limits: {
      fileSize: 25 * 1024 * 1024,
    },
  })

  app.get('/healthz', async (req, reply) => {
    if (req.method === 'HEAD') return reply.code(200).send()
    return reply.code(200).send({ status: 'ok', time: new Date().toISOString() })
  })

  app.get('/api/models', async (_req, reply) => {
    const registry = getModelRegistry()
    return reply.send({
      ok: true,
      providers: Object.values(registry.providers).map((p) => ({
        id: p.id,
        enabled: p.enabled,
        apiKeyEnv: p.apiKeyEnv,
        models: p.models,
      })),
      defaults: registry.defaults,
    })
  })

  app.get('/api/config/check', async (_req, reply) => {
    const registry = getModelRegistry()
    const results = Object.values(registry.providers).map((p) => {
      const apiKey = process.env[p.apiKeyEnv]
      return {
        id: p.id,
        enabled: p.enabled,
        apiKeyEnv: p.apiKeyEnv,
        ready: Boolean(apiKey && apiKey.trim()),
      }
    })
    return reply.send({ ok: true, providers: results })
  })

  app.get('/api/admin/calls', async (req, reply) => {
    const limit = Number((req.query as any)?.limit ?? 200)
    const n = Number.isFinite(limit) ? limit : 200
    return reply.send({ ok: true, logs: getCallLogs(n) })
  })

  const { requireAuth } = authPlugin(app, db, config)
  ;(app as any).requireAuth = requireAuth

  const s3 = createR2Client({
    endpoint: config.R2_ENDPOINT,
    accessKeyId: config.R2_ACCESS_KEY_ID,
    secretAccessKey: config.R2_SECRET_ACCESS_KEY,
  })

  registerProjectRoutes(app, db, s3, config.R2_BUCKET)
  registerRecordingRoutes(app, db, s3, config.R2_BUCKET)
  registerProjectTextRoutes(app, db)

  // Temporary file endpoint used by existing Doubao flow; kept for backward compatibility.
  app.get('/api/stt/tmp/:id', async (req, reply) => {
    const id = (req.params as any).id as string
    const filePath = path.join(os.tmpdir(), 'verstory-stt-serve', id)
    if (!fs.existsSync(filePath)) return reply.code(404).send(apiError('BAD_REQUEST', 'file not found'))
    const stream = fs.createReadStream(filePath)
    return reply.type('application/octet-stream').send(stream)
  })

  await registerSttRoutes(app, db)
  await registerTextRefineRoutes(app)

  app.setErrorHandler((err: unknown, _req, reply) => {
    if (err && typeof err === 'object' && 'message' in err && (err as any).message === 'CORS_NOT_ALLOWED') {
      return reply.code(403).send(apiError('BAD_REQUEST', 'CORS origin not allowed'))
    }
    app.log.error(err)
    return reply.code(500).send(apiError('INTERNAL_ERROR', 'internal error'))
  })

  return app
}
