import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import type { Db } from '../db.js'
import { apiError } from '../errors.js'

export function registerCorrectionRoutes(app: FastifyInstance, db: Db) {
  // Save a corrected transcript for a recording (versioned; latest wins).
  app.post('/api/recordings/:recordingId/corrections', { preHandler: [(app as any).requireAuth] }, async (req, reply) => {
    const userId = (req as any).user.id as string
    const recordingId = String((req.params as any).recordingId)
    const text = String((req.body as any)?.text ?? '')

    const r = await db.pool.query('select project_id as "projectId" from recordings where id=$1 and user_id=$2', [recordingId, userId])
    if (!r.rowCount) return reply.code(404).send(apiError('NOT_FOUND', 'recording not found'))
    const projectId = String((r.rows[0] as any).projectId)

    const id = randomUUID()
    await db.pool.query('insert into corrections (id, user_id, project_id, recording_id, text) values ($1,$2,$3,$4,$5)', [
      id,
      userId,
      projectId,
      recordingId,
      text,
    ])
    return reply.send({ ok: true, correctionId: id })
  })

  // Merge by project: latest correction if exists else latest transcript, ordered by recording created_at asc.
  app.get('/api/projects/:projectId/corrections/merged', { preHandler: [(app as any).requireAuth] }, async (req, reply) => {
    const userId = (req as any).user.id as string
    const projectId = String((req.params as any).projectId)

    const p = await db.pool.query('select id from projects where id=$1 and user_id=$2', [projectId, userId])
    if (!p.rowCount) return reply.code(404).send(apiError('NOT_FOUND', 'project not found'))

    const q = await db.pool.query(
      `
      select r.id as "recordingId",
             r.created_at as "createdAt",
             coalesce(
               (
                 select c.text
                 from corrections c
                 where c.user_id=$1 and c.recording_id=r.id
                 order by c.created_at desc
                 limit 1
               ),
               (
                 select t.text
                 from transcripts t
                 where t.user_id=$1 and t.recording_id=r.id
                 order by t.created_at desc
                 limit 1
               ),
               ''
             ) as "text"
        from recordings r
       where r.user_id=$1 and r.project_id=$2
       order by r.created_at asc
      `,
      [userId, projectId],
    )

    const parts = (q.rows as any[]).map((row) => String(row.text ?? '').trim()).filter(Boolean)
    return reply.send({ ok: true, text: parts.join('\n\n') })
  })
}

