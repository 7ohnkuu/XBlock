import { applyImport, exportFilename, parseImport, serializeExport } from "../shared/io.ts"
import { applyBlocked, applyExempt, applyPending, rebindHandle, removeListEntry } from "../shared/lists.ts"
import type { Mutation, Request, Response } from "../shared/messages.ts"
import { defaultState, migrate, pruneStats, resetSeedWords, wordFrom } from "../shared/schema.ts"
import type { StorageRoot } from "../shared/types.ts"

let writing: Promise<void> = Promise.resolve()

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = writing.then(fn, fn)
  writing = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

async function load(): Promise<StorageRoot> {
  const raw = await chrome.storage.local.get(null)
  if (!raw || Object.keys(raw).length === 0) {
    const fresh = defaultState()
    await save(fresh)
    return fresh
  }
  const migrated = migrate(raw)
  const prevRev = (raw as { settings?: { seedRevision?: number } }).settings?.seedRevision
  if (prevRev !== migrated.settings.seedRevision) await save(migrated)
  return migrated
}

async function save(state: StorageRoot): Promise<void> {
  await chrome.storage.local.set(state)
}

function applyMutation(state: StorageRoot, m: Mutation): StorageRoot | { error: string } {
  const now = Date.now()
  switch (m.op) {
    case "replace":
      return m.state
    case "settings":
      return { ...state, settings: { ...state.settings, ...m.patch } }
    case "addWord": {
      const w = wordFrom(m.raw, "user", now)
      if (!w.normalized) return { error: "空詞" }
      const list = [...state.wordlists[m.list]]
      if (list.some((x) => x.normalized === w.normalized)) return state
      list.push(w)
      return { ...state, wordlists: { ...state.wordlists, [m.list]: list } }
    }
    case "removeWord": {
      const list = state.wordlists[m.list].filter((w) => w.normalized !== m.normalized)
      return { ...state, wordlists: { ...state.wordlists, [m.list]: list } }
    }
    case "resetSeeds":
      return { ...state, wordlists: resetSeedWords(state.wordlists, now) }
    case "pending":
      return {
        ...state,
        lists: applyPending(state.lists, {
          userId: m.userId,
          handle: m.handle,
          displayName: m.displayName,
          reasons: m.reasons,
          sourceConversationId: m.sourceConversationId,
        }),
      }
    case "exempt":
      return { ...state, lists: applyExempt(state.lists, m) }
    case "blocked":
      return { ...state, lists: applyBlocked(state.lists, m) }
    case "removeList":
      return { ...state, lists: removeListEntry(state.lists, m.table, m.userId) }
    case "recordStats": {
      const next = pruneStats(state, now)
      return {
        ...next,
        stats: {
          fingerprints: { ...next.stats.fingerprints, ...m.fingerprints },
          userHits: { ...next.stats.userHits, ...m.userHits },
        },
      }
    }
    case "rebind":
      return { ...state, lists: rebindHandle(state.lists, m.handle, m.userId, m.displayName) }
    case "import": {
      const parsed = parseImport(m.raw, m.filename)
      if (!parsed.ok) return { error: parsed.error }
      return applyImport(state, parsed, m.strategy, now)
    }
    case "markNeedsManual": {
      const row = state.lists.pendingBlock[m.userId]
      if (!row) return state
      return {
        ...state,
        lists: {
          ...state.lists,
          pendingBlock: {
            ...state.lists.pendingBlock,
            [m.userId]: { ...row, needsManual: true },
          },
        },
      }
    }
    default:
      return { error: "未知操作" }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void enqueue(async () => {
    const raw = await chrome.storage.local.get(null)
    if (!raw || Object.keys(raw).length === 0) await save(defaultState())
    else await save(migrate(raw))
  })
})

chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage()
})

chrome.runtime.onMessage.addListener((msg: Request | { type: "OPEN_OPTIONS" }, _s, sendResponse) => {
  if ((msg as { type: string }).type === "OPEN_OPTIONS") {
    void chrome.runtime.openOptionsPage()
    sendResponse({ ok: true })
    return true
  }
  const req = msg as Request
  void enqueue(async () => {
    try {
      if (req.type === "GET_STATE") {
        const state = await load()
        const res: Response = { ok: true, state }
        sendResponse(res)
        return
      }
      if (req.type === "EXPORT") {
        const state = await load()
        const payload = serializeExport(req.kind, state)
        sendResponse({ ok: true, state, payload, filename: exportFilename(req.kind) } satisfies Response)
        return
      }
      if (req.type === "MUTATE") {
        const state = await load()
        const next = applyMutation(state, req.mutation)
        if ("error" in next) {
          sendResponse({ ok: false, error: next.error } satisfies Response)
          return
        }
        await save(next)
        sendResponse({ ok: true, state: next } satisfies Response)
        return
      }
      sendResponse({ ok: false, error: "未知訊息" } satisfies Response)
    } catch (e) {
      sendResponse({ ok: false, error: e instanceof Error ? e.message : "內部錯誤" } satisfies Response)
    }
  })
  return true
})
