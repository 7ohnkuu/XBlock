import { normalizeText } from "../rules/normalize.ts"
import { applyExempt } from "./lists.ts"
import { LIST_IMPORT_LIMIT, WORD_IMPORT_LIMIT, wordFrom } from "./schema.ts"
import type {
  ImportStrategy,
  Lists,
  PendingEntry,
  Reason,
  StorageRoot,
  Word,
  Wordlists,
} from "./types.ts"

export type ExportKind = "xblock-wordlist" | "xblock-lists" | "xblock-backup"

export type ParseOk = {
  ok: true
  kind: ExportKind | "xblock-wordlist-txt"
  wordlists?: Partial<Record<keyof Wordlists, string[]>>
  lists?: {
    pendingBlock?: Array<Partial<PendingEntry> & { handle?: string; userId?: string }>
    blockedMirror?: Array<{ userId?: string; handle?: string; displayName?: string }>
    exempt?: Array<{ userId?: string; handle?: string; displayName?: string }>
  }
  settings?: Partial<StorageRoot["settings"]>
}

export type ParseErr = { ok: false; error: string }
export type ParseResult = ParseOk | ParseErr

function dateStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
}

export function exportFilename(kind: ExportKind, d = new Date()): string {
  if (kind === "xblock-wordlist") return `xblock-wordlist-${dateStamp(d)}.json`
  if (kind === "xblock-lists") return `xblock-lists-${dateStamp(d)}.json`
  return `xblock-backup-${dateStamp(d)}.json`
}

export function serializeExport(kind: ExportKind, state: StorageRoot): string {
  const exportedAt = new Date().toISOString()
  if (kind === "xblock-wordlist") {
    return JSON.stringify(
      {
        kind,
        schemaVersion: 1,
        exportedAt,
        wordlists: {
          drain: state.wordlists.drain.map((w) => w.raw),
          scamAdult: state.wordlists.scamAdult.map((w) => w.raw),
          custom: state.wordlists.custom.map((w) => w.raw),
          domains: state.wordlists.domains.map((w) => w.raw),
        },
      },
      null,
      2,
    )
  }
  const lists = {
    pendingBlock: Object.values(state.lists.pendingBlock),
    blockedMirror: Object.values(state.lists.blockedMirror),
    exempt: Object.values(state.lists.exempt),
  }
  if (kind === "xblock-lists") {
    return JSON.stringify({ kind, schemaVersion: 1, exportedAt, lists }, null, 2)
  }
  return JSON.stringify(
    {
      kind,
      schemaVersion: 1,
      exportedAt,
      settings: state.settings,
      wordlists: {
        drain: state.wordlists.drain.map((w) => w.raw),
        scamAdult: state.wordlists.scamAdult.map((w) => w.raw),
        custom: state.wordlists.custom.map((w) => w.raw),
        domains: state.wordlists.domains.map((w) => w.raw),
      },
      lists,
    },
    null,
    2,
  )
}

const PREFIX: Record<string, keyof Wordlists> = {
  drain: "drain",
  scam: "scamAdult",
  scamadult: "scamAdult",
  custom: "custom",
  domain: "domains",
  domains: "domains",
}

function parseTxt(raw: string): ParseResult {
  const wordlists: ParseOk["wordlists"] = { custom: [] }
  const lines = raw.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith("#")) continue
    const m = line.match(/^([a-zA-Z_]+)\s*:\s*(.+)$/)
    if (m) {
      const cat = PREFIX[m[1].toLowerCase()]
      if (!cat) return { ok: false, error: `第 ${i + 1} 行：未知前綴「${m[1]}」` }
      wordlists[cat] = wordlists[cat] ?? []
      wordlists[cat]!.push(m[2].trim())
    } else {
      wordlists.custom!.push(line)
    }
  }
  const count = Object.values(wordlists).reduce((n, a) => n + (a?.length ?? 0), 0)
  if (count > WORD_IMPORT_LIMIT) return { ok: false, error: `詞條超過 ${WORD_IMPORT_LIMIT} 上限` }
  return { ok: true, kind: "xblock-wordlist-txt", wordlists }
}

export function parseImport(raw: string, filename = ""): ParseResult {
  const trimmed = raw.replace(/^\uFEFF/, "").trim()
  if (!trimmed) return { ok: false, error: "檔案是空的" }

  const looksJson = trimmed.startsWith("{") || filename.endsWith(".json")
  if (!looksJson) return parseTxt(trimmed)

  let data: unknown
  try {
    data = JSON.parse(trimmed)
  } catch {
    if (filename.endsWith(".txt")) return parseTxt(trimmed)
    return { ok: false, error: "JSON 無法解析" }
  }
  if (!data || typeof data !== "object") return { ok: false, error: "根節點必須是物件" }
  const obj = data as Record<string, unknown>
  const kind = obj.kind
  if (kind !== "xblock-wordlist" && kind !== "xblock-lists" && kind !== "xblock-backup") {
    return { ok: false, error: "缺少或無法識別 kind（需為 xblock-wordlist / xblock-lists / xblock-backup）" }
  }
  if (obj.schemaVersion !== 1 && obj.schemaVersion !== undefined) {
    return { ok: false, error: `不支援的 schemaVersion：${String(obj.schemaVersion)}` }
  }

  const out: ParseOk = { ok: true, kind }

  if (kind === "xblock-wordlist" || kind === "xblock-backup") {
    const wl = obj.wordlists
    if (wl && typeof wl === "object") {
      const w = wl as Record<string, unknown>
      const pick = (k: string): string[] | undefined => {
        const v = w[k]
        if (v === undefined) return undefined
        if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) {
          throw new Error(`wordlists.${k} 必須是字串陣列`)
        }
        return v as string[]
      }
      try {
        out.wordlists = {
          drain: pick("drain"),
          scamAdult: pick("scamAdult"),
          custom: pick("custom"),
          domains: pick("domains"),
        }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "詞庫格式錯誤" }
      }
      const count = Object.values(out.wordlists).reduce((n, a) => n + (a?.length ?? 0), 0)
      if (count > WORD_IMPORT_LIMIT) return { ok: false, error: `詞條超過 ${WORD_IMPORT_LIMIT} 上限` }
    } else if (kind === "xblock-wordlist") {
      return { ok: false, error: "詞庫檔缺少 wordlists" }
    }
  }

  if (kind === "xblock-lists" || kind === "xblock-backup") {
    const lists = obj.lists
    if (lists && typeof lists === "object") {
      const L = lists as Record<string, unknown>
      const asArr = (k: string) => {
        const v = L[k]
        if (v === undefined) return undefined
        if (!Array.isArray(v)) throw new Error(`lists.${k} 必須是陣列`)
        return v as Array<Record<string, unknown>>
      }
      try {
        const pb = asArr("pendingBlock")
        const bl = asArr("blockedMirror")
        const ex = asArr("exempt")
        const n = (pb?.length ?? 0) + (bl?.length ?? 0) + (ex?.length ?? 0)
        if (n > LIST_IMPORT_LIMIT) return { ok: false, error: `名單超過 ${LIST_IMPORT_LIMIT} 上限` }
        out.lists = {
          pendingBlock: pb?.map((r) => ({
            userId: typeof r.userId === "string" ? r.userId : undefined,
            handle: typeof r.handle === "string" ? r.handle : undefined,
            displayName: typeof r.displayName === "string" ? r.displayName : undefined,
            reasons: Array.isArray(r.reasons) ? (r.reasons as Reason[]) : ["manual"],
            sourceConversationId: typeof r.sourceConversationId === "string" ? r.sourceConversationId : "",
            addedAt: typeof r.addedAt === "number" ? r.addedAt : Date.now(),
          })),
          blockedMirror: bl?.map((r) => ({
            userId: typeof r.userId === "string" ? r.userId : undefined,
            handle: typeof r.handle === "string" ? r.handle : undefined,
            displayName: typeof r.displayName === "string" ? r.displayName : undefined,
          })),
          exempt: ex?.map((r) => ({
            userId: typeof r.userId === "string" ? r.userId : undefined,
            handle: typeof r.handle === "string" ? r.handle : undefined,
            displayName: typeof r.displayName === "string" ? r.displayName : undefined,
          })),
        }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "名單格式錯誤" }
      }
    } else if (kind === "xblock-lists") {
      return { ok: false, error: "名單檔缺少 lists" }
    }
  }

  if (kind === "xblock-backup" && obj.settings && typeof obj.settings === "object") {
    out.settings = obj.settings as Partial<StorageRoot["settings"]>
  }
  return out
}

function mergeWords(existing: Word[], incoming: string[] | undefined, strategy: ImportStrategy, at: number): Word[] {
  if (!incoming) return existing
  if (strategy === "replace") {
    return incoming.filter((s) => s.trim()).map((s) => wordFrom(s, "user", at))
  }
  const have = new Set(existing.map((w) => w.normalized))
  const extra: Word[] = []
  for (const raw of incoming) {
    const w = wordFrom(raw, "user", at)
    if (!w.normalized) continue
    if (have.has(w.normalized)) {
      if (strategy === "fill") continue
      continue
    }
    have.add(w.normalized)
    extra.push(w)
  }
  return [...existing, ...extra]
}

function rowKey(userId?: string, handle?: string): { key: string; unresolved: boolean } | null {
  if (userId && userId.trim() && !userId.startsWith("unresolved:")) {
    return { key: userId.trim(), unresolved: false }
  }
  if (handle && handle.trim()) {
    return { key: `unresolved:${handle.replace(/^@/, "").toLowerCase()}`, unresolved: true }
  }
  return null
}

export function applyImport(state: StorageRoot, parsed: ParseOk, strategy: ImportStrategy, at = Date.now()): StorageRoot {
  const next: StorageRoot = {
    ...state,
    settings: { ...state.settings, ...(parsed.settings ?? {}) },
    wordlists: { ...state.wordlists },
    lists: {
      exempt: { ...state.lists.exempt },
      pendingBlock: { ...state.lists.pendingBlock },
      blockedMirror: { ...state.lists.blockedMirror },
    },
    stats: state.stats,
  }

  if (parsed.wordlists) {
    next.wordlists = {
      drain: mergeWords(state.wordlists.drain, parsed.wordlists.drain, strategy, at),
      scamAdult: mergeWords(state.wordlists.scamAdult, parsed.wordlists.scamAdult, strategy, at),
      custom: mergeWords(state.wordlists.custom, parsed.wordlists.custom, strategy, at),
      domains: mergeWords(state.wordlists.domains, parsed.wordlists.domains, strategy, at),
    }
  }

  if (parsed.lists) {
    const put = (
      table: keyof Lists,
      rows: Array<{ userId?: string; handle?: string; displayName?: string }> | undefined,
    ) => {
      if (!rows) return
      if (strategy === "replace") next.lists[table] = {}
      for (const row of rows) {
        const id = rowKey(row.userId, row.handle)
        if (!id) continue
        if (strategy === "fill" && (next.lists[table][id.key] || Object.values(next.lists[table]).some((e) => e.handle.toLowerCase() === (row.handle ?? "").replace(/^@/, "").toLowerCase()))) {
          continue
        }
        const handle = (row.handle ?? "").replace(/^@/, "") || id.key
        const base = {
          userId: id.key,
          handle,
          displayName: row.displayName,
          updatedAt: at,
          unresolved: id.unresolved,
        }
        if (table === "pendingBlock") {
          const r = row as PendingEntry
          next.lists.pendingBlock[id.key] = {
            ...base,
            reasons: r.reasons ?? ["manual"],
            sourceConversationId: r.sourceConversationId ?? "",
            addedAt: r.addedAt ?? at,
          }
        } else if (table === "exempt") {
          next.lists.exempt[id.key] = base
        } else {
          next.lists.blockedMirror[id.key] = base
        }
      }
    }
    put("pendingBlock", parsed.lists.pendingBlock)
    put("blockedMirror", parsed.lists.blockedMirror)
    put("exempt", parsed.lists.exempt)

    // exempt wins
    for (const ex of Object.values(next.lists.exempt)) {
      next.lists = applyExempt(next.lists, ex)
    }
  }

  return next
}

export function wordsEqual(a: Word[], b: Word[]): boolean {
  const na = a.map((w) => w.normalized).sort().join("\n")
  const nb = b.map((w) => w.normalized).sort().join("\n")
  return na === nb
}

/** Used by tests — re-export normalize so TXT import round-trips. */
export function norm(s: string): string {
  return normalizeText(s)
}
