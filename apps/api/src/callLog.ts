import fs from 'node:fs'

export type CallLogEntry = {
  ts: string
  method: string
  url: string
  statusCode: number
  durationMs: number
  ok?: boolean
  errorCode?: string
  errorMessage?: string
  details?: unknown
}

const MAX_ENTRIES = 500
const buffer: CallLogEntry[] = []

function logPath() {
  const p = process.env.API_CALL_LOG_PATH?.trim()
  return p || ''
}

export function recordCall(entry: CallLogEntry) {
  buffer.unshift(entry)
  if (buffer.length > MAX_ENTRIES) buffer.length = MAX_ENTRIES

  const p = logPath()
  if (!p) return
  try {
    fs.appendFileSync(p, JSON.stringify(entry) + '\n', { encoding: 'utf8' })
  } catch {
    // ignore
  }
}

export function getCallLogs(limit = 200) {
  return buffer.slice(0, Math.max(1, Math.min(500, limit)))
}

