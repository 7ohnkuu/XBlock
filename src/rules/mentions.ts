const HANDLE = /@([A-Za-z0-9_]{1,30})/g

export function hasCjk(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text)
}

/** @handles written in the comment body. */
export function mentionsInText(text: string): string[] {
  const out = new Set<string>()
  HANDLE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = HANDLE.exec(text))) out.add(m[1].toLowerCase())
  return [...out]
}

export function stripMentions(text: string): string {
  return text.replace(HANDLE, " ").replace(/\s+/g, " ").trim()
}

/** Mentions that are not the author, the reply parent, or the original poster. */
export function extraMentions(input: {
  mentions: string[]
  replyTo: string[]
  selfHandle: string
  rootHandle: string
}): string[] {
  const ignore = new Set(
    [input.selfHandle, input.rootHandle, ...input.replyTo]
      .map((h) => h.replace(/^@/, "").toLowerCase())
      .filter(Boolean),
  )
  const seen = new Set<string>()
  const extra: string[] = []
  for (const raw of input.mentions) {
    const h = raw.replace(/^@/, "").toLowerCase()
    if (!h || ignore.has(h) || seen.has(h)) continue
    seen.add(h)
    extra.push(h)
  }
  return extra
}
