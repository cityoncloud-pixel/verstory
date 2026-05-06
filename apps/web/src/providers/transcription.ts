import type { RecordingSegment } from '../db'

export type TranscriptResult = {
  providerId: string
  updatedAt: string
  perSegment: Array<{ segmentId: string; text: string }>
  mergedText: string
}

export interface TranscriptionProvider {
  id: string
  transcribe(segments: RecordingSegment[]): Promise<TranscriptResult>
}

function nowIso() {
  return new Date().toISOString()
}

function hashString(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}

function msToHint(ms: number) {
  const sec = Math.max(1, Math.round(ms / 1000))
  return `${sec}s`
}

export class MockTranscriptionProvider implements TranscriptionProvider {
  id = 'mock-transcription:v1'

  async transcribe(segments: RecordingSegment[]): Promise<TranscriptResult> {
    const perSegment = segments
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((seg, i) => {
        const seed = hashString(`${seg.id}|${seg.durationMs}|${seg.blob.size}`)
        const t = [
          `【片段 ${i + 1} / ${msToHint(seg.durationMs)}】`,
          `（mock）我在这里讲述了一段回忆，重点关键词是：${seed.slice(0, 6)}。`,
          `我想表达的情绪与事实以原话为准，这里仅做占位示例。`,
        ].join('')
        return { segmentId: seg.id, text: t }
      })

    const mergedText = perSegment.map((x) => x.text).join('\n')
    return { providerId: this.id, updatedAt: nowIso(), perSegment, mergedText }
  }
}

