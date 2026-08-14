/** Safe probe: after chrome://extensions reload, id is missing; do not call chrome.* then. */
export function runtimeAlive(runtime: { id?: string } | null | undefined): boolean {
  return typeof runtime?.id === "string" && runtime.id.length > 0
}

export function isContextError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /extension context invalidated/i.test(msg)
}
