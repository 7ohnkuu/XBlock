import { setLocale, t } from "../shared/i18n.ts"
import { applyPending, rebindHandle } from "../shared/lists.ts"
import type { Mutation, Request, Response } from "../shared/messages.ts"
import { isStatusPath, parseConversationId } from "../shared/path.ts"
import { defaultState } from "../shared/schema.ts"
import type { StorageRoot, Suggestion, QueueStatus } from "../shared/types.ts"
import { createBlockQueue } from "./blockQueue.ts"
import { classifyThread } from "./classify.ts"
import { extractComments, type LiveComment } from "./extract.ts"
import { createExpander } from "./expand.ts"
import { applyHides, injectPageStyles, isRevealed, setReveal, teardownHides } from "./hide.ts"
import { watchDom, watchUrl } from "./observe.ts"
import { mountTray, type TrayModel } from "./tray.ts"

let state: StorageRoot = defaultState()
let conversationId: string | null = null
let live: LiveComment[] = []
let suggestions: Suggestion[] = []
let pendingSeen: Suggestion[] = []
let hiddenCount = 0
let parseFailed = false
let queueStatus: QueueStatus = { phase: "idle" }
let tray: ReturnType<typeof mountTray> | null = null
let domWatch: ReturnType<typeof watchDom> | null = null
let lastStatKey = ""
let processPaused = false
let paintTimer: number | null = null

const expander = createExpander({
  maxClicks: () => state.settings.maxShowMoreClicks,
  enabled: () => !!conversationId && state.settings.enableSlowExpand,
})

function log(...args: unknown[]) {
  if (state.settings.debugLog) console.debug("[xblock]", ...args)
}

async function send(req: Request): Promise<Response> {
  try {
    const res = (await chrome.runtime.sendMessage(req)) as Response | undefined
    if (!res) return { ok: false, error: "no response" }
    return res
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" }
  }
}

async function mutate(mutation: Mutation) {
  const res = await send({ type: "MUTATE", mutation })
  if (res.ok) state = res.state
  return res
}

function currentModel(): TrayModel {
  return {
    scannedCount: live.filter((c) => !c.isRoot).length,
    hiddenCount,
    suggestions,
    pending: pendingSeen,
    reveal: isRevealed(),
    parseFailed,
    queue: queueStatus,
    conversationId: conversationId ?? "",
  }
}

function paint(immediate = false) {
  if (!immediate) {
    if (paintTimer != null) return
    paintTimer = window.setTimeout(() => {
      paintTimer = null
      tray?.update(currentModel())
    }, 200)
    return
  }
  if (paintTimer != null) {
    window.clearTimeout(paintTimer)
    paintTimer = null
  }
  tray?.update(currentModel())
}

function setQueueBusy(on: boolean) {
  processPaused = on
  domWatch?.pause(on)
  if (on) expander.pause()
  else expander.resume()
}

const queue = createBlockQueue({
  getLive: () => live,
  onStatus: (s) => {
    queueStatus = s
    if (s.phase === "done" || s.phase === "failed" || s.phase === "stopped") {
      setQueueBusy(false)
    }
    paint(true)
  },
  onBlocked: async (userId, handle, displayName) => {
    await mutate({ op: "blocked", userId, handle, displayName })
  },
})

function process() {
  if (!conversationId || processPaused) return
  setLocale(state.settings.uiLocale)
  const extracted = extractComments(conversationId)
  live = extracted.comments
  parseFailed = extracted.parseFailed && live.length === 0

  for (const c of live) {
    if (c.userId.startsWith("h:")) continue
    const rebound = rebindHandle(state.lists, c.handle, c.userId, c.displayName)
    if (rebound !== state.lists) {
      state = { ...state, lists: rebound }
      void mutate({ op: "rebind", handle: c.handle, userId: c.userId, displayName: c.displayName })
    }
  }

  const result = classifyThread(conversationId, live, state)
  hiddenCount = result.hiddenCommentCount
  suggestions = result.suggestions.map((s) => {
    const prev = suggestions.find((p) => p.userId === s.userId)
    return prev ? { ...s, checked: prev.checked } : s
  })
  pendingSeen = result.pendingSeen
  parseFailed = parseFailed || result.parseFailed

  applyHides(live, result.byTweetId, (kind, comment) => {
    if (kind === "exempt") void markHuman([comment.userId])
    else {
      void mutate({
        op: "pending",
        userId: comment.userId,
        handle: comment.handle,
        displayName: comment.displayName,
        reasons: ["manual"],
        sourceConversationId: conversationId ?? "",
      }).then(process)
    }
  })

  const fpKeys = Object.keys(result.statUpdates.fingerprints).sort().join(",")
  const uhKeys = Object.keys(result.statUpdates.userHits).sort().join(",")
  const sk = `${conversationId}:${fpKeys}:${uhKeys}`
  if (sk !== lastStatKey && (fpKeys || uhKeys)) {
    lastStatKey = sk
    void mutate({
      op: "recordStats",
      fingerprints: result.statUpdates.fingerprints,
      userHits: result.statUpdates.userHits,
    })
  }

  paint()
  log("processed", live.length, "hidden", hiddenCount)
}

async function markHuman(userIds: string[]) {
  for (const id of userIds) {
    const row =
      live.find((c) => c.userId === id) ||
      suggestions.find((s) => s.userId === id) ||
      pendingSeen.find((s) => s.userId === id)
    if (!row) continue
    await mutate({ op: "exempt", userId: id, handle: row.handle, displayName: row.displayName })
  }
  suggestions = suggestions.filter((s) => !userIds.includes(s.userId))
  process()
}

function mount(id: string) {
  conversationId = id
  lastStatKey = ""
  suggestions = []
  pendingSeen = []
  hiddenCount = 0
  queueStatus = { phase: "idle" }
  injectPageStyles()
  if (!tray) {
    tray = mountTray({
      toggleReveal: () => {
        setReveal(!isRevealed())
        paint(true)
      },
      toggleCheck: (userId, checked) => {
        suggestions = suggestions.map((s) => (s.userId === userId ? { ...s, checked } : s))
        paint(true)
      },
      checkAll: (checked) => {
        suggestions = suggestions.map((s) => ({ ...s, checked }))
        paint(true)
      },
      startBlock: () => {
        if (queue.running) {
          queueStatus = { phase: "stopped", reason: t("queue.alreadyRunning") }
          paint(true)
          return
        }
        const chosen = suggestions.filter((s) => s.checked)
        if (!conversationId) return
        if (chosen.length === 0) {
          queueStatus = { phase: "failed", reason: t("queue.noneSelected") }
          paint(true)
          return
        }
        for (const s of chosen) {
          state = {
            ...state,
            lists: applyPending(state.lists, {
              userId: s.userId,
              handle: s.handle,
              displayName: s.displayName,
              reasons: s.reasons,
              sourceConversationId: conversationId,
            }),
          }
          void mutate({
            op: "pending",
            userId: s.userId,
            handle: s.handle,
            displayName: s.displayName,
            reasons: s.reasons,
            sourceConversationId: conversationId,
          })
        }
        process()
        setQueueBusy(true)
        queueStatus = { phase: "opening", index: 0, total: chosen.length, handle: chosen[0].handle, userId: chosen[0].userId }
        paint(true)
        queue.start(chosen)
      },
      stopBlock: () => queue.stop(),
      markHuman: (ids) => void markHuman(ids),
      openOptions: () => chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" }),
    })
  }
  domWatch?.stop()
  domWatch = watchDom(() => process())
  expander.reset(id)
  process()
}

function unmount() {
  setQueueBusy(false)
  expander.stop()
  queue.stop()
  domWatch?.stop()
  domWatch = null
  tray?.destroy()
  tray = null
  teardownHides()
  conversationId = null
  live = []
}

function syncRoute() {
  const path = location.pathname
  if (!isStatusPath(path)) {
    if (conversationId) unmount()
    return
  }
  const id = parseConversationId(path)
  if (!id) return
  if (id !== conversationId) {
    if (conversationId) {
      setQueueBusy(false)
      expander.stop()
      queue.stop()
      domWatch?.stop()
      teardownHides()
    }
    mount(id)
  }
}

async function boot() {
  const res = await send({ type: "GET_STATE" })
  if (res.ok) state = res.state
  setLocale(state.settings.uiLocale)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return
    if (changes.settings || changes.wordlists || changes.lists || changes.stats || changes.schemaVersion) {
      void send({ type: "GET_STATE" }).then((r) => {
        if (r.ok) {
          state = r.state
          setLocale(state.settings.uiLocale)
          if (conversationId && !processPaused) process()
        }
      })
    }
  })
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) expander.pause()
    else expander.resume()
  })
  watchUrl(() => syncRoute())
  syncRoute()
}

void boot()
