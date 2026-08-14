import { DRAIN_SEEDS, DOMAIN_SEEDS, SCAM_ADULT_SEEDS } from "../rules/seeds.ts"
import { normalizeText } from "../rules/normalize.ts"
import type { StorageRoot, Word, Wordlists } from "./types.ts"

export const SCHEMA_VERSION = 1 as const
export const SEED_REVISION = 7
export const STATS_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const WORD_IMPORT_LIMIT = 5000
export const LIST_IMPORT_LIMIT = 20_000

export function wordFrom(raw: string, source: Word["source"], at = Date.now()): Word {
  const trimmed = raw.trim()
  return { raw: trimmed, normalized: normalizeText(trimmed), addedAt: at, source }
}

export function seedWordlists(at = Date.now()): Wordlists {
  const to = (arr: string[]): Word[] => arr.map((w) => wordFrom(w, "seed", at))
  return {
    drain: to(DRAIN_SEEDS),
    scamAdult: to(SCAM_ADULT_SEEDS),
    custom: [],
    domains: to(DOMAIN_SEEDS),
  }
}

export function defaultState(at = Date.now()): StorageRoot {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {
      enableDrain: true,
      enableScamAdult: true,
      enableCrossTweet: true,
      enableSlowExpand: true,
      enableMentionSpam: true,
      maxTray: 15,
      maxShowMoreClicks: 8,
      debugLog: false,
      seedRevision: SEED_REVISION,
      uiLocale: "auto",
    },
    wordlists: seedWordlists(at),
    lists: {
      exempt: {},
      pendingBlock: {},
      blockedMirror: {},
    },
    stats: { fingerprints: {}, userHits: {} },
  }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v)
}

export function migrate(raw: unknown): StorageRoot {
  const base = defaultState()
  if (!isObj(raw)) return base
  const src = raw as Partial<StorageRoot>
  if (src.settings && isObj(src.settings)) {
    base.settings = { ...base.settings, ...src.settings }
    base.settings.maxTray = 15
    base.settings.maxShowMoreClicks = Math.min(8, Math.max(0, base.settings.maxShowMoreClicks || 8))
  }
  if (src.wordlists && isObj(src.wordlists)) {
    base.wordlists = {
      drain: Array.isArray(src.wordlists.drain) ? src.wordlists.drain : base.wordlists.drain,
      scamAdult: Array.isArray(src.wordlists.scamAdult) ? src.wordlists.scamAdult : base.wordlists.scamAdult,
      custom: Array.isArray(src.wordlists.custom) ? src.wordlists.custom : [],
      domains: Array.isArray(src.wordlists.domains) ? src.wordlists.domains : base.wordlists.domains,
    }
  }
  const storedRev = typeof src.settings?.seedRevision === "number" ? src.settings.seedRevision : 0
  if (storedRev < SEED_REVISION) {
    base.wordlists = mergeMissingSeeds(base.wordlists)
    base.settings.seedRevision = SEED_REVISION
  }
  if (src.lists && isObj(src.lists)) {
    base.lists = {
      exempt: isObj(src.lists.exempt) ? (src.lists.exempt as StorageRoot["lists"]["exempt"]) : {},
      pendingBlock: isObj(src.lists.pendingBlock)
        ? (src.lists.pendingBlock as StorageRoot["lists"]["pendingBlock"])
        : {},
      blockedMirror: isObj(src.lists.blockedMirror)
        ? (src.lists.blockedMirror as StorageRoot["lists"]["blockedMirror"])
        : {},
    }
  }
  if (src.stats && isObj(src.stats)) {
    base.stats = {
      fingerprints: isObj(src.stats.fingerprints)
        ? (src.stats.fingerprints as StorageRoot["stats"]["fingerprints"])
        : {},
      userHits: isObj(src.stats.userHits) ? (src.stats.userHits as StorageRoot["stats"]["userHits"]) : {},
    }
  }
  return pruneStats(base, Date.now())
}

export function pruneStats(state: StorageRoot, now: number): StorageRoot {
  const cutoff = now - STATS_TTL_MS
  const fingerprints: StorageRoot["stats"]["fingerprints"] = {}
  for (const [k, v] of Object.entries(state.stats.fingerprints)) {
    if (v && v.lastSeen >= cutoff) fingerprints[k] = v
  }
  const userHits: StorageRoot["stats"]["userHits"] = {}
  for (const [k, v] of Object.entries(state.stats.userHits)) {
    if (v && v.lastSeen >= cutoff) userHits[k] = v
  }
  return { ...state, stats: { fingerprints, userHits } }
}

export function mergeMissingSeeds(wordlists: Wordlists, at = Date.now()): Wordlists {
  const seeds = seedWordlists(at)
  const merge = (have: Word[], seeded: Word[]) => {
    const haveNorm = new Set(have.map((w) => w.normalized))
    const extra = seeded.filter((s) => !haveNorm.has(s.normalized))
    return extra.length ? [...have, ...extra] : have
  }
  return {
    drain: merge(wordlists.drain, seeds.drain),
    scamAdult: merge(wordlists.scamAdult, seeds.scamAdult),
    custom: wordlists.custom,
    domains: merge(wordlists.domains, seeds.domains),
  }
}

export function resetSeedWords(wordlists: Wordlists, at = Date.now()): Wordlists {
  const seeds = seedWordlists(at)
  const keepUser = (list: Word[], seeded: Word[]) => {
    const users = list.filter((w) => w.source === "user")
    const userNorm = new Set(users.map((w) => w.normalized))
    return [...seeded.filter((s) => !userNorm.has(s.normalized)), ...users]
  }
  return {
    drain: keepUser(wordlists.drain, seeds.drain),
    scamAdult: keepUser(wordlists.scamAdult, seeds.scamAdult),
    custom: wordlists.custom.filter((w) => w.source === "user"),
    domains: keepUser(wordlists.domains, seeds.domains),
  }
}
