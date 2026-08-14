import { t } from "../shared/i18n.ts"
import type { QueueStatus, Suggestion } from "../shared/types.ts"
import { findArticleForUser, findMoreButton, type LiveComment } from "./extract.ts"
import { clearQueueMarks } from "./hide.ts"

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function waitFor<T>(fn: () => T | null | undefined, timeout: number, interval = 80): Promise<T | null> {
  const start = Date.now()
  return new Promise((resolve) => {
    const tick = () => {
      const v = fn()
      if (v) return resolve(v)
      if (Date.now() - start >= timeout) return resolve(null)
      setTimeout(tick, interval)
    }
    tick()
  })
}

function realClick(el: HTMLElement) {
  el.focus({ preventScroll: true })
  const opts: MouseEventInit = { bubbles: true, cancelable: true, view: window }
  el.dispatchEvent(new PointerEvent("pointerdown", opts))
  el.dispatchEvent(new MouseEvent("mousedown", opts))
  el.dispatchEvent(new PointerEvent("pointerup", opts))
  el.dispatchEvent(new MouseEvent("mouseup", opts))
  el.dispatchEvent(new MouseEvent("click", opts))
  if (typeof el.click === "function") el.click()
}

function menuBlockItem(handle: string): HTMLElement | null {
  const h = handle.replace(/^@/, "").toLowerCase()
  const nodes = document.querySelectorAll<HTMLElement>(
    '[role="menuitem"], [role="menu"] [role="button"], [data-testid="Dropdown"] [role="button"], [data-testid="Dropdown"] div[tabindex="0"]',
  )
  for (const el of nodes) {
    const t = (el.textContent || "").replace(/\s+/g, " ").trim()
    if (!t) continue
    if (/unblock|解除封鎖|取消屏蔽|unhide/i.test(t)) continue
    if (/block @|封鎖 @|屏蔽 @/i.test(t)) return el
    if (/^(block|封鎖|屏蔽)\b/i.test(t)) return el
    if (/block|封鎖|屏蔽/i.test(t) && t.toLowerCase().includes(h)) return el
  }
  return null
}

function confirmDialog(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>('[data-testid="confirmationSheetDialog"]') ||
    document.querySelector<HTMLElement>('[role="alertdialog"]') ||
    document.querySelector<HTMLElement>('[data-testid="sheetDialog"]')
  )
}

function dismissMenus() {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }))
}

export type QueueDeps = {
  getLive: () => LiveComment[]
  onStatus: (s: QueueStatus) => void
  onBlocked: (userId: string, handle: string, displayName?: string) => Promise<void>
}

export function createBlockQueue(deps: QueueDeps) {
  let stopped = false
  let running = false

  const stop = (reason: string, handle?: string) => {
    stopped = true
    running = false
    clearQueueMarks()
    deps.onStatus({ phase: "stopped", reason, handle })
  }

  const fail = (reason: string, handle?: string) => {
    running = false
    clearQueueMarks()
    dismissMenus()
    deps.onStatus({ phase: "failed", reason, handle })
  }

  const run = async (targets: Suggestion[]) => {
    if (running) {
      deps.onStatus({ phase: "stopped", reason: t("queue.runningShort") })
      return
    }
    running = true
    stopped = false
    let completed = 0

    for (let i = 0; i < targets.length; i++) {
      if (stopped) return
      const t = targets[i]
      deps.onStatus({ phase: "opening", index: i, total: targets.length, handle: t.handle, userId: t.userId })
      clearQueueMarks()

      const live = findArticleForUser(t.userId, t.handle, deps.getLive())
      if (!live) {
        fail(t("queue.notOnScreen", { handle: t.handle }), t.handle)
        return
      }

      live.cell.setAttribute("data-xblock-queue", "1")
      live.article.setAttribute("data-xblock-queue", "1")
      live.cell.scrollIntoView({ block: "center", behavior: "auto" })
      await sleep(200)

      const caret = findMoreButton(live.article)
      if (!caret) {
        fail(t("queue.noMore", { handle: t.handle }), t.handle)
        return
      }
      realClick(caret)
      const item = await waitFor(() => menuBlockItem(t.handle), 3500)
      if (!item) {
        fail(t("queue.noBlockItem", { handle: t.handle }), t.handle)
        return
      }
      realClick(item)

      deps.onStatus({ phase: "awaiting_user", index: i, total: targets.length, handle: t.handle, userId: t.userId })

      const dialog = await waitFor(() => confirmDialog(), 5000)
      const outcome = await waitUser(dialog, t.handle, 120_000)
      if (stopped) return

      if (outcome === "blocked") {
        await deps.onBlocked(t.userId, t.handle, t.displayName)
        completed++
        clearQueueMarks()
        await sleep(350)
        continue
      }
      if (outcome === "timeout") {
        fail(t("queue.timeout", { handle: t.handle }), t.handle)
        return
      }
      fail(t("queue.cancelled", { handle: t.handle }), t.handle)
      return
    }

    running = false
    clearQueueMarks()
    deps.onStatus({ phase: "done", completed })
  }

  return {
    start: (targets: Suggestion[]) => {
      void run(targets).catch((err) => {
        running = false
        deps.onStatus({
          phase: "failed",
          reason: t("queue.error", { error: err instanceof Error ? err.message : String(err) }),
        })
      })
    },
    stop: () => stop(t("queue.stopped")),
    get running() {
      return running
    },
  }
}

function waitUser(dialog: HTMLElement | null, handle: string, timeout: number): Promise<"blocked" | "cancelled" | "timeout"> {
  return new Promise((resolve) => {
    let done = false
    const finish = (v: "blocked" | "cancelled" | "timeout") => {
      if (done) return
      done = true
      clearTimeout(timer)
      obs.disconnect()
      document.removeEventListener("click", onClick, true)
      resolve(v)
    }
    const timer = setTimeout(() => finish("timeout"), timeout)

    const onClick = (e: Event) => {
      const raw = e.target as HTMLElement | null
      if (raw?.closest?.("#xblock-root, #xblock-banner")) return
      const btn = raw?.closest?.("button, [role='button']") as HTMLElement | null
      if (!btn) return
      const t = (btn.textContent || "").replace(/\s+/g, " ").trim()
      const testid = btn.getAttribute("data-testid") || ""
      if (
        testid === "confirmationSheetConfirm" ||
        (/^(block|封鎖|屏蔽)\b/i.test(t) && !/unblock|解除|取消/i.test(t))
      ) {
        finish("blocked")
      }
      if (testid === "confirmationSheetCancel" || /^(cancel|取消)$/i.test(t)) finish("cancelled")
    }
    document.addEventListener("click", onClick, true)

    const obs = new MutationObserver(() => {
      const still = confirmDialog()
      if (dialog && !document.contains(dialog) && !still) {
        const toast = document.body.innerText || ""
        if (new RegExp(`blocked|已封鎖|屏蔽了\\s*@?${handle}`, "i").test(toast)) finish("blocked")
      }
    })
    obs.observe(document.body, { childList: true, subtree: true })
  })
}
