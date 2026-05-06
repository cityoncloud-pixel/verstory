import type { FastifyInstance } from 'fastify'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import { apiError } from '../errors.js'
import { createOpenAIClient } from '../providers/openaiClient.js'
import { getModelRegistry, isModelAllowed, type ProviderId } from '../modelRegistry.js'
import { doubaoQuery, doubaoSubmit } from '../providers/doubaoAsr.js'

const MAX_FILE_BYTES = 25 * 1024 * 1024

export async function registerSttRoutes(app: FastifyInstance) {
  app.post('/api/stt/transcribe', async (req, reply) => {
    const registry = getModelRegistry()

    if (!req.isMultipart()) {
      return reply.code(400).send(apiError('BAD_REQUEST', 'expected multipart/form-data'))
    }

    const file = await (req as any).file()
    if (!file) {
      return reply.code(400).send(apiError('BAD_REQUEST', 'missing audio file field'))
    }

    const fields = file.fields ?? {}
    const provider = (fields.provider?.value ?? registry.defaults.stt.provider) as ProviderId
    const model = (fields.model?.value ?? registry.defaults.stt.model) as string
    const language = (fields.language?.value ?? undefined) as string | undefined

    const providerDef = registry.providers[provider]
    if (!providerDef || !providerDef.enabled) {
      return reply.code(400).send(apiError('PROVIDER_DISABLED', 'provider disabled', { provider }))
    }
    if (!isModelAllowed(registry, 'stt', provider, model)) {
      return reply.code(400).send(apiError('MODEL_NOT_ALLOWED', 'model not allowed', { provider, model }))
    }

    const apiKey = process.env[providerDef.apiKeyEnv]
    if (!apiKey || !apiKey.trim()) {
      return reply.code(401).send(
        apiError('MISSING_API_KEY', 'missing api key', { env: providerDef.apiKeyEnv, provider }),
      )
    }

    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'verstory-stt-'))
    const tmpPath = path.join(tmpDir, `${randomUUID()}_${file.filename || 'audio'}`)

    let bytes = 0
    file.file.on('data', (chunk: Buffer) => {
      bytes += chunk.length
      if (bytes > MAX_FILE_BYTES) file.file.destroy(new Error('FILE_TOO_LARGE'))
    })

    try {
      await pipeline(file.file, fs.createWriteStream(tmpPath))
    } catch (e: any) {
      if (e?.message === 'FILE_TOO_LARGE') {
        return reply.code(413).send(apiError('BAD_REQUEST', 'file too large (max 25MB)'))
      }
      return reply.code(400).send(apiError('BAD_REQUEST', 'failed to read upload'))
    }

    try {
      const started = Date.now()
      if (provider === 'doubao') {
        // Doubao 标准版需要一个可公网访问的音频 URL。MVP：临时落盘到本机并通过 /api/stt/tmp/:id 提供一次性访问 URL。
        // 为避免 scope 膨胀，这里采用最小实现：直接复用当前域名 story-api 并提供临时文件服务。
        const audioId = randomUUID()
        const publicBase = process.env.PUBLIC_BASE_URL?.trim() || 'https://story-api.suenbeya.com'
        const audioUrl = `${publicBase}/api/stt/tmp/${audioId}`

        // move file to a deterministic path for serving
        const serveDir = path.join(os.tmpdir(), 'verstory-stt-serve')
        await fs.promises.mkdir(serveDir, { recursive: true })
        const servePath = path.join(serveDir, audioId)
        await fs.promises.copyFile(tmpPath, servePath)

        const submit = await doubaoSubmit({
          apiKey,
          resourceId: model,
          audioUrl,
          audioFormat: (file.mimetype?.split('/')[1] ?? 'webm').replace('x-', ''),
          userId: 'verstory',
        })
        if (!submit.ok) return reply.code(502).send(submit)

        // polling: 标准版可能需要更久；根据文档状态码 20000001/20000002 表示处理中/队列中
        const deadlineMs = Date.now() + 120_000
        let waitMs = 800
        let last: any = null
        while (Date.now() < deadlineMs) {
          await new Promise((r) => setTimeout(r, waitMs))
          waitMs = Math.min(3000, Math.floor(waitMs * 1.15))

          const q = await doubaoQuery({ apiKey, resourceId: model, requestId: submit.requestId })
          if (q.ok) {
            await fs.promises.rm(servePath, { force: true }).catch(() => {})
            const duration = (Date.now() - started) / 1000
            return reply.send({ ok: true, text: q.text, provider, model, duration })
          }

          if ('pending' in q && q.pending) {
            last = q
            continue
          }

          // terminal error
          last = q
          await fs.promises.rm(servePath, { force: true }).catch(() => {})
          const err = 'error' in q ? q.error : apiError('INTERNAL_ERROR', 'doubao query failed').error
          const status = err.code === 'BAD_REQUEST' ? 400 : 502
          return reply.code(status).send({ ok: false, error: err })
        }

        await fs.promises.rm(servePath, { force: true }).catch(() => {})
        return reply.code(504).send(apiError('INTERNAL_ERROR', 'doubao query timeout', { last }))
      }

      if (provider === 'openai') {
        const client = createOpenAIClient(apiKey)
        const result = await client.audio.transcriptions.create({
          file: fs.createReadStream(tmpPath),
          model,
          language,
        })
        const duration = (Date.now() - started) / 1000
        return reply.send({
          ok: true,
          text: result.text,
          provider,
          model,
          duration,
        })
      }

      return reply.code(400).send(apiError('BAD_REQUEST', 'stt provider not implemented', { provider }))
    } catch (e: any) {
      app.log.error(e)
      return reply.code(502).send(apiError('INTERNAL_ERROR', 'stt provider call failed'))
    } finally {
      fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
    }
  })
}
