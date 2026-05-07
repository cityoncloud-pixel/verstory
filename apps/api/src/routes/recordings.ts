import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import type { Db } from '../db.js'
import { apiError } from '../errors.js'
import type { S3Client } from '@aws-sdk/client-s3'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { presignGetUrl, presignPutUrl } from '../r2.js'

function safeExt(ext: string) {
  const e = ext.replace(/[^a-z0-9.]/gi, '').toLowerCase()
  if (!e) return 'webm'
  return e.startsWith('.') ? e.slice(1) : e
}

export function registerRecordingRoutes(app: FastifyInstance, db: Db, s3: S3Client, bucket: string) {
  app.post('/api/projects/:projectId/recordings/init', { preHandler: [(app as any).requireAuth] }, async (req, reply) => {
    const userId = (req as any).user.id as string
    const projectId = String((req.params as any).projectId)
    const body = (req.body ?? {}) as any
    const mimeType = String(body.mimeType ?? '').trim()
    const ext = safeExt(String(body.ext ?? 'webm'))
    const sizeBytes = body.sizeBytes != null ? Number(body.sizeBytes) : undefined

    const p = await db.pool.query('select id from projects where id=$1 and user_id=$2', [projectId, userId])
    if (!p.rowCount) return reply.code(404).send(apiError('NOT_FOUND', 'project not found'))

    const recordingId = randomUUID()
    const r2Key = `u/${userId}/p/${projectId}/r/${recordingId}.${ext}`

    await db.pool.query('insert into recordings (id, user_id, project_id, r2_key, mime_type, size_bytes) values ($1,$2,$3,$4,$5,$6)', [
      recordingId,
      userId,
      projectId,
      r2Key,
      mimeType || null,
      Number.isFinite(sizeBytes) ? sizeBytes : null,
    ])

    const putUrl = await presignPutUrl(s3, {
      bucket,
      key: r2Key,
      contentType: mimeType || undefined,
      contentLength: Number.isFinite(sizeBytes) ? sizeBytes : undefined,
    })
    return reply.send({ ok: true, recordingId, r2Key, putUrl })
  })

  // Local-dev fallback: proxy upload to avoid browser CORS against R2.
  // Client sends multipart form-data with field "audio".
  app.post('/api/projects/:projectId/recordings/upload', { preHandler: [(app as any).requireAuth] }, async (req, reply) => {
    if (!req.isMultipart()) {
      return reply.code(400).send(apiError('BAD_REQUEST', 'expected multipart/form-data'))
    }

    const userId = (req as any).user.id as string
    const projectId = String((req.params as any).projectId)
    const file = await (req as any).file()
    if (!file) return reply.code(400).send(apiError('BAD_REQUEST', 'missing audio file field'))

    const p = await db.pool.query('select id from projects where id=$1 and user_id=$2', [projectId, userId])
    if (!p.rowCount) return reply.code(404).send(apiError('NOT_FOUND', 'project not found'))

    const mimeType = String(file.mimetype ?? '').trim()
    const ext = safeExt(String((file.filename ?? '').split('.').pop() ?? 'webm'))
    const recordingId = randomUUID()
    const r2Key = `u/${userId}/p/${projectId}/r/${recordingId}.${ext || 'webm'}`

    await db.pool.query('insert into recordings (id, user_id, project_id, r2_key, mime_type) values ($1,$2,$3,$4,$5)', [
      recordingId,
      userId,
      projectId,
      r2Key,
      mimeType || null,
    ])

    const chunks: Buffer[] = []
    let bytes = 0
    for await (const chunk of file.file) {
      const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      chunks.push(b)
      bytes += b.length
      if (bytes > 25 * 1024 * 1024) {
        return reply.code(413).send(apiError('BAD_REQUEST', 'file too large (max 25MB)'))
      }
    }
    const body = Buffer.concat(chunks)

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: r2Key,
        Body: body,
        ContentType: mimeType || 'application/octet-stream',
        ContentLength: body.length,
      }),
    )

    await db.pool.query('update recordings set size_bytes=$1 where id=$2 and user_id=$3', [body.length, recordingId, userId])
    return reply.send({ ok: true, recordingId, r2Key })
  })

  app.post('/api/recordings/:recordingId/complete', { preHandler: [(app as any).requireAuth] }, async (req, reply) => {
    const userId = (req as any).user.id as string
    const recordingId = String((req.params as any).recordingId)
    const body = (req.body ?? {}) as any
    const durationMs = body.durationMs != null ? Number(body.durationMs) : null
    const sizeBytes = body.sizeBytes != null ? Number(body.sizeBytes) : null
    const sha256 = body.sha256 != null ? String(body.sha256) : null

    const q = await db.pool.query(
      'update recordings set duration_ms=$1, size_bytes=coalesce($2,size_bytes), sha256=$3 where id=$4 and user_id=$5 returning id',
      [Number.isFinite(durationMs as any) ? durationMs : null, Number.isFinite(sizeBytes as any) ? sizeBytes : null, sha256, recordingId, userId],
    )
    if (!q.rowCount) return reply.code(404).send(apiError('NOT_FOUND', 'recording not found'))
    return reply.send({ ok: true })
  })

  app.get('/api/projects/:projectId/recordings', { preHandler: [(app as any).requireAuth] }, async (req, reply) => {
    const userId = (req as any).user.id as string
    const projectId = String((req.params as any).projectId)
    const q = await db.pool.query(
      `select id, project_id as "projectId", created_at as "createdAt", duration_ms as "durationMs",
              mime_type as "mimeType", size_bytes as "sizeBytes", r2_key as "r2Key"
            , (
              select t.text
              from transcripts t
              where t.user_id=$1 and t.recording_id=recordings.id
              order by t.created_at desc
              limit 1
            ) as "transcriptText"
            , (
              select t.provider
              from transcripts t
              where t.user_id=$1 and t.recording_id=recordings.id
              order by t.created_at desc
              limit 1
            ) as "transcriptProvider"
            , (
              select t.model
              from transcripts t
              where t.user_id=$1 and t.recording_id=recordings.id
              order by t.created_at desc
              limit 1
            ) as "transcriptModel"
       from recordings where user_id=$1 and project_id=$2 order by created_at desc`,
      [userId, projectId],
    )
    return reply.send({ ok: true, recordings: q.rows })
  })

  app.delete('/api/recordings/:recordingId', { preHandler: [(app as any).requireAuth] }, async (req, reply) => {
    const userId = (req as any).user.id as string
    const recordingId = String((req.params as any).recordingId)

    const q = await db.pool.query('select r2_key as "r2Key" from recordings where id=$1 and user_id=$2', [recordingId, userId])
    if (!q.rowCount) return reply.code(404).send(apiError('NOT_FOUND', 'recording not found'))
    const r2Key = (q.rows[0] as any).r2Key as string

    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: r2Key }))
    await db.pool.query('delete from recordings where id=$1 and user_id=$2', [recordingId, userId])
    return reply.send({ ok: true })
  })

  app.post('/api/recordings/bulk-delete', { preHandler: [(app as any).requireAuth] }, async (req, reply) => {
    const userId = (req as any).user.id as string
    const ids = ((req.body as any)?.ids ?? []) as unknown
    if (!Array.isArray(ids) || ids.length === 0) return reply.code(400).send(apiError('BAD_REQUEST', 'missing ids'))
    const recordingIds = ids.map((v) => String(v)).filter(Boolean)
    if (recordingIds.length === 0) return reply.code(400).send(apiError('BAD_REQUEST', 'missing ids'))

    const q = await db.pool.query(
      `select id, r2_key as "r2Key"
       from recordings
       where user_id=$1 and id = any($2::text[])`,
      [userId, recordingIds],
    )

    for (const r of q.rows as any[]) {
      const r2Key = String(r.r2Key || '')
      if (r2Key) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: r2Key }))
    }

    await db.pool.query('delete from recordings where user_id=$1 and id = any($2::text[])', [userId, recordingIds])
    return reply.send({ ok: true, deleted: q.rowCount })
  })

  app.get('/api/recordings/:recordingId/signed-url', { preHandler: [(app as any).requireAuth] }, async (req, reply) => {
    const userId = (req as any).user.id as string
    const recordingId = String((req.params as any).recordingId)
    const q = await db.pool.query('select r2_key as "r2Key" from recordings where id=$1 and user_id=$2', [recordingId, userId])
    if (!q.rowCount) return reply.code(404).send(apiError('NOT_FOUND', 'recording not found'))
    const r2Key = (q.rows[0] as any).r2Key as string
    const getUrl = await presignGetUrl(s3, { bucket, key: r2Key })
    return reply.send({ ok: true, url: getUrl })
  })

  // Proxy download (avoids browser CORS against R2)
  app.get('/api/recordings/:recordingId/blob', { preHandler: [(app as any).requireAuth] }, async (req, reply) => {
    const userId = (req as any).user.id as string
    const recordingId = String((req.params as any).recordingId)
    const q = await db.pool.query(
      'select r2_key as "r2Key", mime_type as "mimeType" from recordings where id=$1 and user_id=$2',
      [recordingId, userId],
    )
    if (!q.rowCount) return reply.code(404).send(apiError('NOT_FOUND', 'recording not found'))
    const r2Key = (q.rows[0] as any).r2Key as string
    const mimeType = ((q.rows[0] as any).mimeType as string | null) || 'application/octet-stream'

    const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: r2Key }))
    reply.header('cache-control', 'no-store')
    reply.type(mimeType)
    return reply.send(obj.Body as any)
  })
}
