import type { Reason } from "../shared/types.ts"

export type ListStatus = "exempt" | "pending" | "blocked" | null

export type Signals = {
  drainHits: string[]
  customHits: string[]
  scamHits: string[]
  domainHits: string[]
  domainReason: "drain" | "scam_adult"
  contact: boolean
  extraMentions: string[]
  farmHandle: boolean
  nearDup: boolean
  crossTweet: boolean
}

export type Layer = "hide" | "suggest" | "ignore"

export type Verdict = {
  layer: Layer
  reasons: Reason[]
  matchedTerms: string[]
}

export function emptySignals(): Signals {
  return {
    drainHits: [],
    customHits: [],
    scamHits: [],
    domainHits: [],
    domainReason: "drain",
    contact: false,
    extraMentions: [],
    farmHandle: false,
    nearDup: false,
    crossTweet: false,
  }
}

/** Last step: collected signals + list status → hide | suggest | ignore. */
export function decide(listed: ListStatus, signals: Signals): Verdict {
  if (listed === "exempt") return { layer: "ignore", reasons: [], matchedTerms: [] }

  const reasons: Reason[] = []
  const matchedTerms: string[] = []
  const add = (r: Reason, terms: string[] = []) => {
    if (!reasons.includes(r)) reasons.push(r)
    for (const t of terms) if (!matchedTerms.includes(t)) matchedTerms.push(t)
  }

  if (listed === "pending" || listed === "blocked") add("manual")

  const drainTerms = [...signals.drainHits, ...signals.customHits]
  if (drainTerms.length) add("drain", drainTerms)
  if (signals.scamHits.length) add("scam_adult", signals.scamHits)
  if (signals.domainHits.length) add(signals.domainReason, signals.domainHits)
  if (signals.contact) add("drain", ["contact"])
  if (signals.nearDup) add("dup_in_thread")

  const hide =
    listed === "pending" ||
    listed === "blocked" ||
    drainTerms.length > 0 ||
    signals.scamHits.length > 0 ||
    signals.domainHits.length > 0 ||
    signals.contact ||
    signals.nearDup

  if (signals.farmHandle) add("farm", ["handle_farm"])
  if (signals.extraMentions.length) {
    add(
      "mention",
      signals.extraMentions.slice(0, 3).map((h) => `@${h}`),
    )
  }
  if (signals.crossTweet) add("cross_tweet")

  if (hide) return { layer: "hide", reasons, matchedTerms }
  if (signals.farmHandle || signals.extraMentions.length > 0 || signals.crossTweet) {
    return { layer: "suggest", reasons, matchedTerms }
  }
  return { layer: "ignore", reasons, matchedTerms }
}
