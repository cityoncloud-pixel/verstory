export type PolishRules = {
  forbidFabrication: boolean
  forbidChangingFacts: boolean
  allowLightCleanup: boolean
  keepFirstPersonStyle: boolean
}

export type PolishResult = {
  providerId: string
  updatedAt: string
  storyText: string
  rulesSummary: string
}

export interface StoryPolishProvider {
  id: string
  polish(input: string, rules: PolishRules): Promise<PolishResult>
}

function nowIso() {
  return new Date().toISOString()
}

function normalize(input: string) {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function lightCleanupZh(input: string) {
  const fillers = ['嗯', '呃', '那个', '就是', '然后', '其实', '可能']
  let out = input
  for (const f of fillers) out = out.replaceAll(f, '')
  out = out.replace(/[，,]{2,}/g, '，').replace(/[。\.]{2,}/g, '。')
  out = out.replace(/([。！？!?])(?=[^\n])/g, '$1\n')
  out = out.replace(/\n{3,}/g, '\n\n')
  return out.trim()
}

export class MockStoryPolishProvider implements StoryPolishProvider {
  id = 'mock-polish:v1'

  async polish(input: string, rules: PolishRules): Promise<PolishResult> {
    const base = normalize(input)
    const cleaned = rules.allowLightCleanup ? lightCleanupZh(base) : base

    const header = '【整理原则】不虚构、不改动事实；仅做断句、去口头语/重复、语病修正与结构整理。\n'
    const storyText = `${header}\n${cleaned}`
    const rulesSummary = '不虚构；不改事实；轻度整理；保留第一人称与语气'

    return { providerId: this.id, updatedAt: nowIso(), storyText, rulesSummary }
  }
}

