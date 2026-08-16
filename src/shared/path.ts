/** True when the path is an X status / conversation page. */
export function isStatusPath(pathname: string): boolean {
  return /\/status\/\d+/.test(pathname)
}

export function parseConversationId(pathname: string): string | null {
  const m = pathname.match(/\/status\/(\d+)/)
  return m ? m[1] : null
}

export function unresolvedKey(handle: string): string {
  return `unresolved:${handle.replace(/^@/, "").toLowerCase()}`
}

export function isUnresolvedId(userId: string): boolean {
  return userId.startsWith("unresolved:")
}

/** Live fiber-miss used `h:`; import used `unresolved:`. Both are bind candidates. */
export function isBindCandidateId(userId: string): boolean {
  return userId.startsWith("unresolved:") || userId.startsWith("h:")
}

export function legacyBindKey(handle: string): string {
  return `h:${handle.replace(/^@/, "").toLowerCase()}`
}

/** Same-origin profile path for sampling in a new tab. */
export function profilePath(handle: string): string {
  return `/${handle.replace(/^@/, "")}`
}
