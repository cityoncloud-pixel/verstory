import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import type { Db } from '../db.js'
import { apiError } from '../errors.js'

export function registerProjectRoutes(app: FastifyInstance, db: Db) {
  app.get('/api/projects', { preHandler: [(app as any).requireAuth] }, async (req, reply) => {
    const userId = (req as any).user.id as string
    const q = await db.pool.query(
      'select id, name, created_at as "createdAt", updated_at as "updatedAt" from projects where user_id=$1 order by updated_at desc',
      [userId],
    )
    return reply.send({ ok: true, projects: q.rows })
  })

  app.post('/api/projects', { preHandler: [(app as any).requireAuth] }, async (req, reply) => {
    const userId = (req as any).user.id as string
    const name = String((req.body as any)?.name ?? '').trim()
    if (!name) return reply.code(400).send(apiError('BAD_REQUEST', 'missing project name'))
    const id = randomUUID()
    await db.pool.query('insert into projects (id, user_id, name) values ($1,$2,$3)', [id, userId, name])
    return reply.send({ ok: true, project: { id, name } })
  })

  app.delete('/api/projects/:id', { preHandler: [(app as any).requireAuth] }, async (req, reply) => {
    const userId = (req as any).user.id as string
    const id = String((req.params as any).id)
    const q = await db.pool.query('delete from projects where id=$1 and user_id=$2', [id, userId])
    if (!q.rowCount) return reply.code(404).send(apiError('NOT_FOUND', 'project not found'))
    return reply.send({ ok: true })
  })
}

