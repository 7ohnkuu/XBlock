import { t, translateTerm } from "../shared/i18n.ts"
import { profilePath } from "../shared/path.ts"
import { primaryColumn } from "./extract.ts"
import type { QueueStatus, Suggestion } from "../shared/types.ts"

export type TrayModel = {
  scannedCount: number
  hiddenCount: number
  suggestions: Suggestion[]
  pending: Suggestion[]
  reveal: boolean
  parseFailed: boolean
  queue: QueueStatus
  conversationId: string
}

export type TrayHandlers = {
  toggleReveal: () => void
  toggleCheck: (userId: string, checked: boolean) => void
  checkAll: (checked: boolean) => void
  startBlock: () => void
  stopBlock: () => void
  markHuman: (userIds: string[]) => void
  openOptions: () => void
}

const CSS = `
:host { all: initial; }
.wrap {
  font-family: "PingFang TC", "Hiragino Sans GB", "Noto Sans TC", sans-serif;
  color: var(--ink);
  --ink: #22190f;
  --paper: #f6efe3;
  --rule: #d8c4a2;
  --amber: #b56a08;
  --amber-deep: #8a4b00;
  --danger: #9a2f22;
  --muted: #7a6854;
  --shadow: 0 18px 40px rgba(40, 22, 6, 0.28);
}
@media (prefers-color-scheme: dark) {
  .wrap {
    --ink: #f3e6d2;
    --paper: #1b1610;
    --rule: #3d3124;
    --amber: #e0a04a;
    --amber-deep: #f0c27a;
    --danger: #e07a6a;
    --muted: #b39a7c;
    --shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
  }
}
.banner {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: var(--paper);
  border-bottom: 1px solid var(--rule);
  color: var(--ink);
  font-size: 13px;
  letter-spacing: 0.01em;
}
.banner strong { font-weight: 650; color: var(--amber-deep); }
.banner button, .dock button, .panel button {
  font: inherit;
  cursor: pointer;
}
.link {
  border: 0;
  background: none;
  color: var(--amber-deep);
  text-decoration: underline;
  text-underline-offset: 3px;
  padding: 0;
}
.dock {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 999999;
}
.fab {
  border: 1px solid var(--rule);
  background: var(--paper);
  color: var(--ink);
  box-shadow: var(--shadow);
  border-radius: 999px;
  padding: 8px 14px;
  display: flex;
  align-items: baseline;
  gap: 8px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 11px;
}
.fab em {
  font-style: normal;
  color: var(--amber);
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}
.panel {
  position: fixed;
  right: 18px;
  bottom: 72px;
  width: min(380px, calc(100vw - 24px));
  height: min(72vh, calc(100vh - 130px));
  max-height: min(72vh, calc(100vh - 130px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 999999;
  background: var(--paper);
  color: var(--ink);
  border: 1px solid var(--rule);
  box-shadow: var(--shadow);
  border-radius: 2px;
  overscroll-behavior: contain;
}
.head {
  flex: 0 0 auto;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--rule);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.suggest-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
.pending {
  flex: 0 0 auto;
  max-height: 68px;
  overflow: hidden;
  border-top: 1px solid var(--rule);
  padding: 6px 16px 8px;
}
.pending h3 { margin-bottom: 4px; }
.pending-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  max-height: 40px;
  overflow: hidden;
}
.brand {
  font-family: "New York", "Iowan Old Style", Palatino, "Songti TC", serif;
  font-size: 20px;
  letter-spacing: 0.02em;
}
.meta { font-size: 12px; color: var(--muted); }
.section { padding: 10px 16px 4px; }
.section h3 {
  margin: 0 0 8px;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 600;
}
.row {
  display: grid;
  grid-template-columns: 18px 1fr auto;
  gap: 8px;
  align-items: start;
  padding: 7px 0;
  border-top: 1px dashed var(--rule);
  font-size: 13px;
}
.handle {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 12px;
  color: var(--amber-deep);
  text-decoration: none;
  border-bottom: 1px solid transparent;
}
a.handle:hover { border-bottom-color: var(--amber); }
.why { color: var(--muted); font-size: 11px; margin-top: 2px; }
.human {
  border: 1px solid var(--rule);
  background: transparent;
  color: var(--muted);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
}
.actions {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px 16px;
  border-top: 1px solid var(--rule);
  background: var(--paper);
}
.primary {
  background: var(--amber);
  color: #1b1208;
  border: 0;
  padding: 8px 12px;
  font-weight: 650;
  letter-spacing: 0.04em;
}
.ghost {
  background: transparent;
  border: 1px solid var(--rule);
  color: var(--ink);
  padding: 8px 12px;
}
.warn { flex: 0 0 auto; color: var(--danger); font-size: 12px; padding: 8px 16px 10px; }
.queue { flex: 0 0 auto; font-size: 12px; padding: 8px 16px; color: var(--amber-deep); }
.empty { font-size: 12px; color: var(--muted); padding: 4px 0 10px; }
`

function attachHost(id: string): { host: HTMLElement; wrap: HTMLElement } {
  const host = document.createElement("div")
  host.id = id
  const shadow = host.attachShadow({ mode: "open" })
  const style = document.createElement("style")
  style.textContent = CSS
  const wrap = document.createElement("div")
  wrap.className = "wrap"
  shadow.append(style, wrap)
  return { host, wrap }
}

export function mountTray(handlers: TrayHandlers): {
  update: (model: TrayModel) => void
  destroy: () => void
} {
  const overlay = attachHost("xblock-root")
  const banner = attachHost("xblock-banner")
  document.documentElement.appendChild(overlay.host)

  let open = false
  let suggestScrollTop = 0
  let lastConversationId = ""
  let model: TrayModel = {
    scannedCount: 0,
    hiddenCount: 0,
    suggestions: [],
    pending: [],
    reveal: false,
    parseFailed: false,
    queue: { phase: "idle" },
    conversationId: "",
  }

  const placeBanner = () => {
    const col = primaryColumn()
    const host = banner.host
    if (!col) {
      host.style.display = "none"
      return
    }
    if (host.parentElement !== document.documentElement) document.documentElement.appendChild(host)
    const r = col.getBoundingClientRect()
    host.style.display = "block"
    host.style.position = "fixed"
    host.style.top = "53px"
    host.style.left = `${Math.max(0, r.left)}px`
    host.style.width = `${r.width}px`
    host.style.zIndex = "6"
    host.style.pointerEvents = "none"
  }

  const render = () => {
    placeBanner()
    const prevScroll = overlay.wrap.querySelector<HTMLElement>(".suggest-scroll")
    if (prevScroll) suggestScrollTop = prevScroll.scrollTop
    overlay.wrap.replaceChildren()
    banner.wrap.replaceChildren()
    const checked = model.suggestions.filter((s) => s.checked).length
    const q = model.queue

    const bar = document.createElement("div")
    bar.className = "banner"
    const count = document.createElement("span")
    count.innerHTML = t("banner.scan", { scanned: `<strong>${model.scannedCount}</strong>`, hidden: `<strong>${model.hiddenCount}</strong>` })
    const revealBtn = document.createElement("button")
    revealBtn.className = "link"
    revealBtn.textContent = model.reveal ? t("banner.unreveal") : t("banner.reveal")
    revealBtn.addEventListener("click", handlers.toggleReveal)
    const openBtn = document.createElement("button")
    openBtn.className = "link"
    openBtn.textContent = open ? t("banner.close") : t("banner.open")
    openBtn.addEventListener("click", () => {
      open = !open
      render()
    })
    bar.append(count, revealBtn, openBtn)
    banner.wrap.append(bar)

    const dock = document.createElement("div")
    dock.className = "dock"
    const fab = document.createElement("button")
    fab.className = "fab"
    fab.type = "button"
    fab.innerHTML = `XBlock <em>${model.hiddenCount}</em>`
    fab.addEventListener("click", () => {
      open = !open
      render()
    })
    dock.append(fab)
    overlay.wrap.append(dock)

    if (!open && q.phase === "idle" && !model.parseFailed) return

    const panel = document.createElement("div")
    panel.className = "panel"
    panel.addEventListener("wheel", (e) => e.stopPropagation(), { capture: true })
    panel.addEventListener("touchmove", (e) => e.stopPropagation(), { capture: true })

    const head = document.createElement("div")
    head.className = "head"
    head.innerHTML = `<div class="brand">XBlock</div>
      <div class="meta">${t("tray.meta", {
        scanned: model.scannedCount,
        hidden: model.hiddenCount,
        suggested: model.suggestions.length,
        pending: model.pending.length,
      })}</div>`
    panel.append(head)

    if (model.parseFailed) {
      const w = document.createElement("p")
      w.className = "warn"
      w.textContent = t("tray.parseFailed")
      panel.append(w)
    }

    if (q.phase === "opening" || q.phase === "awaiting_user") {
      const p = document.createElement("p")
      p.className = "queue"
      p.textContent =
        q.phase === "awaiting_user"
          ? t("tray.awaiting", { handle: q.handle, index: q.index + 1, total: q.total })
          : t("tray.opening", { handle: q.handle, index: q.index + 1, total: q.total })
      panel.append(p)
    } else if (q.phase === "failed" || q.phase === "stopped") {
      const p = document.createElement("p")
      p.className = "warn"
      p.textContent = q.reason
      panel.append(p)
    } else if (q.phase === "done") {
      const p = document.createElement("p")
      p.className = "queue"
      p.textContent = t("tray.done", { completed: q.completed })
      panel.append(p)
    }

    const sugWrap = document.createElement("div")
    sugWrap.className = "suggest-scroll"
    const sug = document.createElement("div")
    sug.className = "section"
    sug.innerHTML = `<h3>${t("tray.suggestTitle")}</h3>`
    if (model.suggestions.length === 0) {
      const e = document.createElement("div")
      e.className = "empty"
      e.textContent = t("tray.suggestEmpty")
      sug.append(e)
    }
    for (const s of model.suggestions) {
      sug.append(row(s, true, handlers))
    }
    sugWrap.append(sug)
    trapScroll(sugWrap)
    sugWrap.addEventListener("scroll", () => {
      suggestScrollTop = sugWrap.scrollTop
    })
    panel.append(sugWrap)
    requestAnimationFrame(() => {
      sugWrap.scrollTop = suggestScrollTop
    })

    if (model.pending.length > 0) {
      const pend = document.createElement("div")
      pend.className = "pending"
      pend.innerHTML = `<h3>${t("tray.pendingTitle")}</h3>`
      const chips = document.createElement("div")
      chips.className = "pending-chips"
      for (const s of model.pending) {
        chips.append(profileLink(s.handle))
      }
      pend.append(chips)
      panel.append(pend)
    }

    const actions = document.createElement("div")
    actions.className = "actions"
    const start = document.createElement("button")
    start.className = "primary"
    const busy = q.phase === "opening" || q.phase === "awaiting_user"
    start.textContent = busy ? t("tray.busy") : t("tray.start", { count: checked })
    start.disabled = busy || checked === 0
    start.addEventListener("click", handlers.startBlock)
    const stop = document.createElement("button")
    stop.className = "ghost"
    stop.textContent = t("tray.stop")
    stop.disabled = !busy
    stop.addEventListener("click", handlers.stopBlock)
    const humans = document.createElement("button")
    humans.className = "ghost"
    humans.textContent = t("tray.markHuman")
    humans.disabled = checked === 0
    humans.addEventListener("click", () =>
      handlers.markHuman(model.suggestions.filter((s) => s.checked).map((s) => s.userId)),
    )
    const none = document.createElement("button")
    none.className = "ghost"
    none.textContent = t("tray.uncheckAll")
    none.addEventListener("click", () => handlers.checkAll(false))
    const opts = document.createElement("button")
    opts.className = "ghost"
    opts.textContent = t("tray.options")
    opts.addEventListener("click", handlers.openOptions)
    actions.append(start, stop, humans, none, opts)
    panel.append(actions)

    overlay.wrap.append(panel)
  }

  window.addEventListener("resize", placeBanner)
  render()
  return {
    update: (next) => {
      const becameUseful =
        (next.suggestions.length > 0 || next.hiddenCount > 0) &&
        model.suggestions.length === 0 &&
        model.hiddenCount === 0
      if (next.conversationId !== lastConversationId) {
        suggestScrollTop = 0
        lastConversationId = next.conversationId
      }
      model = next
      if (becameUseful) open = true
      render()
    },
    destroy: () => {
      window.removeEventListener("resize", placeBanner)
      overlay.host.remove()
      banner.host.remove()
    },
  }
}

function profileLink(handle: string): HTMLAnchorElement {
  const a = document.createElement("a")
  a.className = "handle"
  a.href = profilePath(handle)
  a.target = "_blank"
  a.rel = "noopener noreferrer"
  a.textContent = `@${handle}`
  a.title = t("tray.profileTitle")
  a.addEventListener("click", (e) => e.stopPropagation())
  return a
}

function whyLine(s: Suggestion): HTMLElement {
  const why = document.createElement("div")
  why.className = "why"
  why.textContent = labelReasons(s)
  return why
}

function trapScroll(scroller: HTMLElement) {
  scroller.addEventListener(
    "wheel",
    (e) => {
      e.stopPropagation()
      const canScroll = scroller.scrollHeight > scroller.clientHeight + 1
      if (!canScroll) {
        e.preventDefault()
        return
      }
      const down = e.deltaY > 0
      const atTop = scroller.scrollTop <= 0
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2
      if ((down && atBottom) || (!down && atTop)) e.preventDefault()
    },
    { passive: false, capture: true },
  )
  scroller.addEventListener("touchmove", (e) => e.stopPropagation(), { capture: true })
  scroller.addEventListener(
    "scroll",
    (e) => {
      e.stopPropagation()
    },
    { capture: true },
  )
}

function row(s: Suggestion, withCheck: boolean, handlers: TrayHandlers): HTMLElement {
  const el = document.createElement("label")
  el.className = "row"
  const cb = document.createElement("input")
  cb.type = "checkbox"
  cb.checked = s.checked
  cb.addEventListener("change", () => handlers.toggleCheck(s.userId, cb.checked))
  const mid = document.createElement("div")
  mid.append(profileLink(s.handle), whyLine(s))
  const hum = document.createElement("button")
  hum.type = "button"
  hum.className = "human"
  hum.textContent = t("tray.human")
  hum.addEventListener("click", (e) => {
    e.preventDefault()
    handlers.markHuman([s.userId])
  })
  if (withCheck) el.append(cb, mid, hum)
  return el
}

function labelReasons(s: Suggestion): string {
  const tags: string[] = []
  if (s.reasons.includes("cross_tweet")) tags.push(t("reason.cross_tweet"))
  if (s.reasons.includes("mention")) tags.push(t("reason.mention"))
  if (s.reasons.includes("drain")) tags.push(t("reason.drain"))
  if (s.reasons.includes("scam_adult")) tags.push(t("reason.scam_adult"))
  if (s.reasons.includes("dup_in_thread")) tags.push(t("reason.dup_in_thread"))
  if (s.reasons.includes("manual")) tags.push(t("reason.manual"))
  const terms = s.matchedTerms.slice(0, 2).map(translateTerm).join(" · ")
  return [tags.join(" · "), terms].filter(Boolean).join("  ")
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}
