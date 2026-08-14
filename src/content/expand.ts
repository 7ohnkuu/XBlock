const OFFENSIVE =
  /冒犯|反感|offensive|abusive|may be offensive|including those that may contain/i
const MORE = /顯示更多回覆|显示更多回复|show more replies|show replies|更多回覆|更多回复/i

function isVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

function candidateButtons(): HTMLElement[] {
  const nodes = [
    ...document.querySelectorAll<HTMLElement>('[data-testid="primaryColumn"] button, [data-testid="primaryColumn"] [role="button"]'),
  ]
  return nodes.filter((el) => {
    const t = (el.textContent || "").replace(/\s+/g, " ").trim()
    if (!t || t.length > 80) return false
    if (OFFENSIVE.test(t)) return false
    return MORE.test(t)
  })
}

export function createExpander(opts: { maxClicks: () => number; enabled: () => boolean }) {
  let clicksThisPage = 0
  let timer: number | null = null
  let conversationId = ""

  const clear = () => {
    if (timer != null) window.clearTimeout(timer)
    timer = null
  }

  const tick = () => {
    if (!opts.enabled()) return
    if (document.hidden) return
    if (clicksThisPage >= opts.maxClicks()) return
    const btn = candidateButtons().find(isVisible)
    if (!btn) return
    clicksThisPage++
    btn.click()
  }

  const schedule = () => {
    clear()
    if (!opts.enabled()) return
    const delay = 800 + Math.floor(Math.random() * 1200)
    timer = window.setTimeout(() => {
      tick()
      if (clicksThisPage < opts.maxClicks()) schedule()
    }, delay)
  }

  return {
    reset(id: string) {
      conversationId = id
      clicksThisPage = 0
      clear()
      schedule()
    },
    pause: clear,
    resume() {
      if (conversationId) schedule()
    },
    stop() {
      clear()
      conversationId = ""
    },
  }
}
