import { t, translateTerm } from "../shared/i18n.ts"
import type { Decision } from "../shared/types.ts"
import type { LiveComment } from "./extract.ts"
import { primaryColumn } from "./extract.ts"

const PAGE_STYLE_ID = "xblock-page-style"

export function injectPageStyles() {
  if (document.getElementById(PAGE_STYLE_ID)) return
  const s = document.createElement("style")
  s.id = PAGE_STYLE_ID
  s.textContent = `
    [data-xblock-hide="1"] { display: none !important; }
    [data-xblock-reveal="1"] [data-xblock-hide="1"] { display: revert !important; }
    [data-xblock-queue="1"] {
      display: block !important;
      height: auto !important;
      max-height: none !important;
      visibility: visible !important;
      overflow: visible !important;
      outline: 2px solid #d48a04 !important;
      outline-offset: -2px;
    }
    .xblock-inline {
      display: none;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      font: 12px/1.3 "PingFang TC", "Hiragino Sans GB", sans-serif;
      padding: 6px 12px 2px;
      color: #9a7040;
    }
    [data-xblock-reveal="1"] [data-xblock-hide="1"] .xblock-inline { display: flex; }
    .xblock-inline button {
      border: 1px solid #c4a574;
      background: transparent;
      color: inherit;
      border-radius: 999px;
      padding: 2px 8px;
      cursor: pointer;
      font: inherit;
    }
  `
  document.documentElement.appendChild(s)
}

export function setReveal(on: boolean) {
  const col = primaryColumn()
  if (!col) return
  if (on) col.setAttribute("data-xblock-reveal", "1")
  else col.removeAttribute("data-xblock-reveal")
}

export function isRevealed(): boolean {
  return primaryColumn()?.getAttribute("data-xblock-reveal") === "1"
}

export function clearQueueMarks() {
  document.querySelectorAll("[data-xblock-queue]").forEach((el) => el.removeAttribute("data-xblock-queue"))
}

export function applyHides(
  live: LiveComment[],
  byTweetId: Record<string, Decision>,
  onAction: (kind: "exempt" | "pending", comment: LiveComment) => void,
) {
  for (const c of live) {
    const d = byTweetId[c.tweetId]
    const hide = !!d?.hide && !c.isRoot
    if (hide) c.cell.setAttribute("data-xblock-hide", "1")
    else c.cell.removeAttribute("data-xblock-hide")

    let badge = c.article.querySelector<HTMLElement>(":scope > .xblock-inline")
    if (hide && d) {
      if (!badge) {
        badge = document.createElement("div")
        badge.className = "xblock-inline"
        c.article.insertBefore(badge, c.article.firstChild)
      }
      const why = d.matchedTerms.slice(0, 3).map(translateTerm).join(" · ") || d.reasons.join(" · ")
      badge.replaceChildren()
      const lab = document.createElement("span")
      const link = document.createElement("a")
      link.href = `/${c.handle.replace(/^@/, "")}`
      link.target = "_blank"
      link.rel = "noopener noreferrer"
      link.textContent = `@${c.handle}`
      link.style.color = "inherit"
      link.addEventListener("click", (e) => e.stopPropagation())
      lab.append(`${t("badge.suspect")} · ${why} · `, link)
      const hum = document.createElement("button")
      hum.type = "button"
      hum.textContent = t("badge.human")
      hum.addEventListener("click", (e) => {
        e.preventDefault()
        e.stopPropagation()
        onAction("exempt", c)
      })
      const pend = document.createElement("button")
      pend.type = "button"
      pend.textContent = t("badge.pending")
      pend.addEventListener("click", (e) => {
        e.preventDefault()
        e.stopPropagation()
        onAction("pending", c)
      })
      badge.append(lab, hum, pend)
    } else if (badge) {
      badge.remove()
    }
  }
}

export function teardownHides() {
  document.querySelectorAll("[data-xblock-hide]").forEach((el) => el.removeAttribute("data-xblock-hide"))
  document.querySelectorAll("[data-xblock-queue]").forEach((el) => el.removeAttribute("data-xblock-queue"))
  document.querySelectorAll(".xblock-inline").forEach((el) => el.remove())
  primaryColumn()?.removeAttribute("data-xblock-reveal")
}
