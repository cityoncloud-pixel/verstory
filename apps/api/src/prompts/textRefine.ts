export type RefineMode = 'clean' | 'organize' | 'memoir' | 'goal'

export function buildRefinePrompt(mode: RefineMode, input: string) {
  const rules = [
    '禁止虚构：不得添加原文中没有的新事实、人物、时间地点、经历。',
    '禁止改事实：不得把不确定说法改成确定结论；不得替用户下判断或编造动机。',
    '允许操作：断句、去口头语/重复、语病修正、补标点、段落结构重排（不改变含义）。',
    '风格保留：尽量保留第一人称与原本语气；不做文学化夸张改写。',
    '输出使用中文。',
  ]

  if (mode === 'clean') {
    return {
      system: `你是文本清理助手。请遵守：\n- ${rules.join('\n- ')}`,
      user: `请对以下口述文本进行“清理”：去口头禅/重复、补标点、分段、修正明显错字，但不改变事实与语气。\n\n【原文】\n${input}\n\n【输出】`,
    }
  }

  if (mode === 'organize') {
    return {
      system: `你是文本整理助手。请遵守：\n- ${rules.join('\n- ')}`,
      user: `请对以下口述文本进行“整理”：在不新增事实的前提下，提升可读性，按主题分段，并输出一个简短的“主题提要”列表。\n\n【原文】\n${input}\n\n【输出格式】\n先输出：\n主题提要：\n- ...\n- ...\n\n然后输出整理后的正文。\n`,
    }
  }

  if (mode === 'memoir') {
    return {
      system: `你是自传/口述写作编辑。请遵守：\n- 禁止虚构：不得添加原文中没有的新事实、人物、时间地点、经历。\n- 禁止改事实：不得把不确定说法改成确定结论；不得替用户下判断或编造动机。\n- 允许操作：断句、去口头禅/重复、语病修正、补标点、分段、结构重排（不改变含义）。\n- 写作目标：把口语口述转成“第一人称”的书面叙事文本，可读性更强，但不自作主张补新信息。\n- 不确定信息：对没说清的地方，用【待确认：…】标注。\n- 输出使用中文。`,
      user: `请将下面的口述稿转成“可直接用于自传/文章”的中文正文：可以较大幅度重写句式与衔接，增强叙事与表达，但不得添加任何新事实/人名/地名/时间/事件。\n\n【原文】\n${input}\n\n【输出】`,
    }
  }

  return {
    system: `你是 GAEH 目标整理助手。请遵守：\n- ${rules.join('\n- ')}\n- 你必须输出“可被 GAEH 消费的 goal packet”Markdown。`,
    user: `把下面的口述文本整理成一份 GAEH 可消费的目标包，使用以下模板（不要省略标题）：\n\n# Goal\n\n## Background\n\n## Objective\n\n## Constraints\n\n## Deliverables\n\n## Acceptance Criteria\n\n## Execution Notes\n\n【原文】\n${input}\n`,
  }
}
