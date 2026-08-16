import type { Reason, Suggestion } from "../shared/types.ts"

export function scoreReasons(reasons: Reason[]): number {
  let s = 0
  if (reasons.includes("cross_tweet")) s += 40
  const drain = reasons.includes("drain")
  const scam = reasons.includes("scam_adult")
  if (drain && scam) s += 30
  else if (drain || scam) s += 15
  if (reasons.includes("mention")) s += 18
  if (reasons.includes("farm")) s += 18
  if (reasons.includes("dup_in_thread")) s += 10
  if (reasons.includes("manual")) s += 8
  s += reasons.length
  return s
}

/** Rank, cap, and keep the user's checkboxes across a rescan. */
export function applyTraySession(
  candidates: Suggestion[],
  previous: Suggestion[],
  maxTray: number,
): Suggestion[] {
  const prevById = new Map(previous.map((s) => [s.userId, s]))
  const scored = candidates.map((s) => ({
    ...s,
    score: s.score > 0 ? s.score : scoreReasons(s.reasons),
  }))
  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, maxTray)
  return top.map((s) => {
    const prev = prevById.get(s.userId)
    return { ...s, checked: prev ? prev.checked : true }
  })
}
