import type { FastifyInstance, FastifyRequest } from 'fastify'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import type { Db } from './db.js'
import type { AppConfig } from './config.js'
import { apiError } from './errors.js'

export type AuthedUser = { id: string; email: string }

export async function ensurePreprovisionedUsers(db: Db, config: AppConfig) {
  const entries = Object.entries(config.preprovisionedUsers).filter(([email, pass]) => email && pass)
  for (const [email, password] of entries) {
    const normalized = email.trim().toLowerCase()
    const hash = await bcrypt.hash(password, 10)

    const existing = await db.pool.query('select id from users where email=$1', [normalized])
    if (existing.rowCount && existing.rows[0]?.id) {
      await db.pool.query('update users set password_hash=$2 where email=$1', [normalized, hash])
      continue
    }
    await db.pool.query('insert into users (id, email, password_hash) values ($1,$2,$3)', [
      randomUUID(),
      normalized,
      hash,
    ])
  }
}

export function authPlugin(app: FastifyInstance, db: Db, config: AppConfig) {
  if (!app.hasRequestDecorator('user')) {
    app.decorateRequest('user', null)
  }

  app.post('/api/auth/login', async (req, reply) => {
    const body = (req.body ?? {}) as any
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    if (!email || !password) return reply.code(400).send(apiError('BAD_REQUEST', 'missing email or password'))

    const q = await db.pool.query('select id, email, password_hash from users where email=$1', [email])
    if (!q.rowCount) return reply.code(401).send(apiError('UNAUTHORIZED', 'invalid credentials'))
    const row = q.rows[0] as any
    const ok = await bcrypt.compare(password, row.password_hash)
    if (!ok) return reply.code(401).send(apiError('UNAUTHORIZED', 'invalid credentials'))

    const accessToken = await reply.jwtSign({ sub: row.id, email: row.email }, { expiresIn: '20m' })
    const refreshToken = await reply.jwtSign(
      { sub: row.id, email: row.email, typ: 'refresh' },
      { expiresIn: '30d', key: config.JWT_REFRESH_SECRET },
    )

    const cookieDomain = config.COOKIE_DOMAIN?.trim() || undefined
    reply.setCookie('verstory_refresh', refreshToken, {
      httpOnly: true,
      secure: Boolean(config.COOKIE_SECURE),
      sameSite: 'lax',
      domain: cookieDomain,
      path: '/api/auth',
    })
    return reply.send({ ok: true, accessToken, email: row.email })
  })

  app.post('/api/auth/refresh', async (req, reply) => {
    const token = (req.cookies as any)?.verstory_refresh as string | undefined
    if (!token) return reply.code(401).send(apiError('UNAUTHORIZED', 'missing refresh token'))
    try {
      const payload = await app.jwt.verify(token, { key: config.JWT_REFRESH_SECRET })
      if ((payload as any)?.typ !== 'refresh') throw new Error('not refresh')
      const accessToken = await reply.jwtSign({ sub: (payload as any).sub, email: (payload as any).email }, { expiresIn: '20m' })
      return reply.send({ ok: true, accessToken })
    } catch {
      return reply.code(401).send(apiError('UNAUTHORIZED', 'invalid refresh token'))
    }
  })

  app.post('/api/auth/logout', async (_req, reply) => {
    const cookieDomain = config.COOKIE_DOMAIN?.trim() || undefined
    reply.clearCookie('verstory_refresh', { domain: cookieDomain, path: '/api/auth' })
    return reply.send({ ok: true })
  })

  app.get('/api/auth/me', { preHandler: [requireAuth] }, async (req, reply) => {
    return reply.send({ ok: true, user: (req as any).user })
  })

  async function requireAuth(req: FastifyRequest, reply: any) {
    try {
      await req.jwtVerify()
      const user = { id: (req.user as any).sub as string, email: (req.user as any).email as string }
      ;(req as any).user = user
    } catch {
      return reply.code(401).send(apiError('UNAUTHORIZED', 'missing or invalid token'))
    }
  }

  return { requireAuth }
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthedUser | null
  }
}
