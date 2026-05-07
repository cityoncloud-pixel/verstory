import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PG_SSL_REJECT_UNAUTHORIZED: z
    .string()
    .default('true')
    .transform((v) => v === 'true' || v === '1'),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  COOKIE_DOMAIN: z.string().default('.suenbeya.com'),
  COOKIE_SECURE: z
    .string()
    .default('true')
    .transform((v) => v === 'true' || v === '1'),

  R2_BUCKET: z.string().min(1),
  R2_ENDPOINT: z.string().url(),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),

  // JSON object mapping email -> password. Example:
  // {"hxkc@163.com":"change-me","hxkc@sohu.com":"change-me-too"}
  PREPROVISIONED_USERS_JSON: z.string().min(2).default('{}'),
})

export type AppConfig = z.infer<typeof envSchema> & { preprovisionedUsers: Record<string, string> }

export function getConfig(): AppConfig {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Invalid environment: ${msg}`)
  }

  let preprovisionedUsers: Record<string, string> = {}
  try {
    preprovisionedUsers = JSON.parse(parsed.data.PREPROVISIONED_USERS_JSON) as Record<string, string>
  } catch {
    throw new Error('Invalid PREPROVISIONED_USERS_JSON (must be JSON object email->password)')
  }

  return { ...parsed.data, preprovisionedUsers }
}
