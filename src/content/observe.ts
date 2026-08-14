export function watchDom(onChange: () => void): () => void {
  let t: number | null = null
  let paused = false
  const kick = () => {
    if (paused) return
    if (t != null) return
    t = window.setTimeout(() => {
      t = null
      if (!paused) onChange()
    }, 120)
  }
  const mo = new MutationObserver(kick)
  mo.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener("scroll", kick, { passive: true })
  return {
    stop: () => {
      mo.disconnect()
      window.removeEventListener("scroll", kick)
      if (t != null) window.clearTimeout(t)
    },
    pause: (on: boolean) => {
      paused = on
    },
  }
}

export function watchUrl(onChange: (href: string) => void): () => void {
  let last = location.href
  const fire = () => {
    if (location.href === last) return
    last = location.href
    onChange(last)
  }
  const wrap = (name: "pushState" | "replaceState") => {
    const orig = history[name]
    history[name] = function (this: History, ...args: Parameters<History["pushState"]>) {
      const ret = orig.apply(this, args)
      fire()
      return ret
    }
  }
  wrap("pushState")
  wrap("replaceState")
  window.addEventListener("popstate", fire)
  const id = window.setInterval(fire, 800)
  return () => {
    window.removeEventListener("popstate", fire)
    window.clearInterval(id)
  }
}
