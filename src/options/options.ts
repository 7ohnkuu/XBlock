import { applyDomI18n, currentLocale, setLocale, t, type UiLocale } from "../shared/i18n.ts"
import type { ExportKind } from "../shared/io.ts"
import type { Mutation, Request, Response } from "../shared/messages.ts"
import type { ImportStrategy, StorageRoot, Wordlists } from "../shared/types.ts"

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

let state: StorageRoot | null = null
let table: keyof StorageRoot["lists"] = "pendingBlock"

async function send(req: Request): Promise<Response> {
  return chrome.runtime.sendMessage(req)
}

async function mutate(mutation: Mutation) {
  const res = await send({ type: "MUTATE", mutation })
  if (res.ok) {
    state = res.state
    render()
  } else {
    setStatus(res.error, true)
  }
  return res
}

function setStatus(text: string, err = false) {
  const el = $("import-status")
  el.textContent = text
  el.className = `status ${err ? "err" : "ok"}`
}

const TOGGLES: Array<{ key: keyof StorageRoot["settings"]; labelKey: Parameters<typeof t>[0] }> = [
  { key: "enableDrain", labelKey: "opt.enableDrain" },
  { key: "enableScamAdult", labelKey: "opt.enableScamAdult" },
  { key: "enableCrossTweet", labelKey: "opt.enableCrossTweet" },
  { key: "enableMentionSpam", labelKey: "opt.enableMentionSpam" },
  { key: "enableSlowExpand", labelKey: "opt.enableSlowExpand" },
]

function renderToggles() {
  if (!state) return
  const box = $("toggles")
  box.replaceChildren()
  for (const item of TOGGLES) {
    const lab = document.createElement("label")
    const cb = document.createElement("input")
    cb.type = "checkbox"
    cb.checked = Boolean(state.settings[item.key])
    cb.addEventListener("change", () => {
      void mutate({ op: "settings", patch: { [item.key]: cb.checked } })
    })
    lab.append(cb, document.createTextNode(t(item.labelKey)))
    box.append(lab)
  }
}

function currentCat(): keyof Wordlists {
  return ($("word-cat") as HTMLSelectElement).value as keyof Wordlists
}

function renderWords() {
  if (!state) return
  const cat = currentCat()
  const q = ($("word-search") as HTMLInputElement).value.trim().toLowerCase()
  const ul = $("word-list")
  ul.replaceChildren()
  for (const w of state.wordlists[cat]) {
    if (q && !w.raw.toLowerCase().includes(q) && !w.normalized.includes(q)) continue
    const li = document.createElement("li")
    if (w.source === "seed") li.className = "seed"
    li.append(document.createTextNode(w.raw + (w.source === "seed" ? ` · ${t("opt.seed")}` : "")))
    const rm = document.createElement("button")
    rm.type = "button"
    rm.textContent = "×"
    rm.title = "刪除"
    rm.addEventListener("click", () => void mutate({ op: "removeWord", list: cat, normalized: w.normalized }))
    li.append(rm)
    ul.append(li)
  }
}

function renderLists() {
  if (!state) return
  const ul = $("list-rows")
  ul.replaceChildren()
  const rows = Object.values(state.lists[table])
  if (rows.length === 0) {
    const li = document.createElement("li")
    li.textContent = t("opt.empty")
    ul.append(li)
    return
  }
  for (const row of rows) {
    const li = document.createElement("li")
    const left = document.createElement("span")
    const a = document.createElement("a")
    a.href = `https://x.com/${row.handle.replace(/^@/, "")}`
    a.target = "_blank"
    a.rel = "noopener noreferrer"
    a.textContent = `@${row.handle}`
    a.style.color = "var(--amber)"
    left.append(
      a,
      document.createTextNode(`${row.unresolved ? ` · ${t("opt.unresolved")}` : ""} · ${row.userId}`),
    )
    const rm = document.createElement("button")
    rm.type = "button"
    rm.textContent = t("opt.remove")
    rm.addEventListener("click", () => void mutate({ op: "removeList", table, userId: row.userId }))
    li.append(left, rm)
    ul.append(li)
  }
}

function render() {
  if (state) setLocale(state.settings.uiLocale)
  applyDomI18n()
  document.title = t("opt.title")
  document.documentElement.lang = currentLocale() === "en" ? "en" : "zh-Hant"
  const sel = $("ui-locale") as HTMLSelectElement | null
  if (sel && state) sel.value = state.settings.uiLocale ?? "auto"
  renderToggles()
  renderWords()
  renderLists()
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function boot() {
  const res = await send({ type: "GET_STATE" })
  if (!res.ok) {
    setStatus(res.error, true)
    return
  }
  state = res.state
  render()

  $("ui-locale").addEventListener("change", () => {
    const uiLocale = ($("ui-locale") as HTMLSelectElement).value as UiLocale
    void mutate({ op: "settings", patch: { uiLocale } })
  })

  $("word-cat").addEventListener("change", renderWords)
  $("word-search").addEventListener("input", renderWords)
  $("word-add").addEventListener("submit", (e) => {
    e.preventDefault()
    const input = $("word-new") as HTMLInputElement
    const raw = input.value
    input.value = ""
    void mutate({ op: "addWord", list: currentCat(), raw })
  })
  $("word-reset").addEventListener("click", () => {
    if (confirm(t("opt.wordResetConfirm"))) void mutate({ op: "resetSeeds" })
  })

  $("list-tabs").addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("button")
    if (!btn?.dataset.table) return
    table = btn.dataset.table as keyof StorageRoot["lists"]
    for (const b of $("list-tabs").querySelectorAll("button")) b.classList.toggle("on", b === btn)
    renderLists()
  })

  document.querySelectorAll<HTMLButtonElement>("[data-export]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const kind = btn.dataset.export as ExportKind
      const res = await send({ type: "EXPORT", kind })
      if (res.ok && "payload" in res) download(res.filename, res.payload)
      else if (!res.ok) setStatus(res.error, true)
    })
  })

  $("import-file").addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    ;(e.target as HTMLInputElement).value = ""
    if (!file) return
    const strategy = ($("import-strategy") as HTMLSelectElement).value as ImportStrategy
    if (strategy === "replace" && !confirm(t("opt.replaceConfirm"))) return
    const raw = await file.text()
    const res = await mutate({ op: "import", raw, filename: file.name, strategy })
    if (res.ok) setStatus(t("opt.imported", { name: file.name }))
  })
}

chrome.storage.onChanged.addListener((_c, area) => {
  if (area !== "local") return
  void send({ type: "GET_STATE" }).then((r) => {
    if (r.ok) {
      state = r.state
      render()
    }
  })
})

void boot()
