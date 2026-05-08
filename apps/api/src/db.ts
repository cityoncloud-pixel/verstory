import pg from 'pg'

export type Db = {
  pool: pg.Pool
}

export function createDb(databaseUrl: string, opts?: { sslRejectUnauthorized?: boolean }): Db {
  const wantSsl = /\bsslmode=(require|prefer|verify-ca|verify-full)\b/i.test(databaseUrl)
  const sslRejectUnauthorized = opts?.sslRejectUnauthorized ?? true
  let connectionString = databaseUrl
  if (wantSsl) {
    try {
      const u = new URL(databaseUrl)
      // Avoid pg's connection-string sslmode handling overriding our explicit ssl options.
      u.searchParams.delete('sslmode')
      u.searchParams.delete('uselibpqcompat')
      connectionString = u.toString()
    } catch {
      // keep original
    }
  }
  const pool = new pg.Pool({
    connectionString,
    ...(wantSsl ? { ssl: { rejectUnauthorized: sslRejectUnauthorized } } : {}),
  })
  return { pool }
}

export async function migrate(db: Db) {
  // Minimal idempotent migrations; we can evolve later.
  // NOTE: For production-grade migrations, switch to a migration tool later.
  await db.pool.query(`
    create table if not exists users (
      id text primary key,
      email text not null unique,
      password_hash text not null,
      created_at timestamptz not null default now()
    );

    create table if not exists projects (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      name text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table projects add column if not exists draft_text text;
    alter table projects add column if not exists draft_updated_at timestamptz;
    alter table projects add column if not exists draft_prev_text text;
    alter table projects add column if not exists final_text text;
    alter table projects add column if not exists final_updated_at timestamptz;
    alter table projects add column if not exists final_prev_text text;

    create table if not exists recordings (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      project_id text not null references projects(id) on delete cascade,
      created_at timestamptz not null default now(),
      duration_ms integer,
      mime_type text,
      size_bytes bigint,
      sha256 text,
      r2_key text not null
    );

    create table if not exists transcripts (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      recording_id text not null references recordings(id) on delete cascade,
      text text not null,
      provider text,
      model text,
      created_at timestamptz not null default now()
    );

    create table if not exists corrections (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      project_id text not null references projects(id) on delete cascade,
      recording_id text not null references recordings(id) on delete cascade,
      text text not null,
      created_at timestamptz not null default now()
    );

    create index if not exists corrections_user_project_recording_created_at_idx
      on corrections (user_id, project_id, recording_id, created_at desc);

    create table if not exists rewrites (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      project_id text not null references projects(id) on delete cascade,
      text text not null,
      rules_summary text,
      mode text,
      provider text,
      model text,
      created_at timestamptz not null default now()
    );

    create table if not exists jobs (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      kind text not null, -- 'stt' | 'rewrite'
      status text not null, -- 'pending' | 'running' | 'succeeded' | 'failed'
      error_code text,
      error_message text,
      recording_id text references recordings(id) on delete cascade,
      project_id text references projects(id) on delete cascade,
      provider text,
      model text,
      language text,
      mode text,
      created_at timestamptz not null default now(),
      started_at timestamptz,
      finished_at timestamptz
    );
  `)
}
