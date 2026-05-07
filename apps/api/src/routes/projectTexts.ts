import type { FastifyInstance } from 'fastify'
import type { Db } from '../db.js'
import { apiError } from '../errors.js'

export function registerProjectTextRoutes(app: FastifyInstance, db: Db) {
  app.get('/api/projects/:id/texts', { preHandler: [(app as any).requireAuth] }, async (req, reply) => {
    const userId = (req as any).user.id as string
    const id = String((req.params as any).id)
    const q = await db.pool.query(
      `select id, draft_text as "draftText", final_text as "finalText",
              draft_updated_at as "draftUpdatedAt", final_updated_at as "finalUpdatedAt"
       from projects where id=$1 and user_id=$2`,
      [id, userId],
    )
    if (!q.rowCount) return reply.code(404).send(apiError('NOT_FOUND', 'project not found'))
    return reply.send({ ok: true, ...q.rows[0] })
  })

  app.post('/api/projects/:id/draft', { preHandler: [(app as any).requireAuth] }, async (req, reply) => {
    const userId = (req as any).user.id as string
    const id = String((req.params as any).id)
    const text = String((req.body as any)?.text ?? '')
    const q = await db.pool.query(
      `update projects
         set draft_prev_text = draft_text,
             draft_text = $3,
             draft_updated_at = now(),
             updated_at = now()
       where id=$1 and user_id=$2
       returning id`,
      [id, userId, text],
    )
    if (!q.rowCount) return reply.code(404).send(apiError('NOT_FOUND', 'project not found'))
    return reply.send({ ok: true })
  })

  app.post('/api/projects/:id/final', { preHandler: [(app as any).requireAuth] }, async (req, reply) => {
    const userId = (req as any).user.id as string
    const id = String((req.params as any).id)
    const text = String((req.body as any)?.text ?? '')
    const q = await db.pool.query(
      `update projects
         set final_prev_text = final_text,
             final_text = $3,
             final_updated_at = now(),
             updated_at = now()
       where id=$1 and user_id=$2
       returning id`,
      [id, userId, text],
    )
    if (!q.rowCount) return reply.code(404).send(apiError('NOT_FOUND', 'project not found'))
    return reply.send({ ok: true })
  })

  app.post('/api/projects/:id/final/rollback', { preHandler: [(app as any).requireAuth] }, async (req, reply) => {
    const userId = (req as any).user.id as string
    const id = String((req.params as any).id)
    const q = await db.pool.query(
      `update projects
         set final_text = final_prev_text,
             final_updated_at = now(),
             updated_at = now()
       where id=$1 and user_id=$2
       returning id`,
      [id, userId],
    )
    if (!q.rowCount) return reply.code(404).send(apiError('NOT_FOUND', 'project not found'))
    return reply.send({ ok: true })
  })
}

