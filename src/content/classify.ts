import { isDigitFarmHandle } from "../rules/handles.ts"
import { extraMentions, hasCjk, mentionsInText, stripMentions } from "../rules/mentions.ts"
import { charBigrams, fingerprint, hostFromUrl, jaccard, normalizeText } from "../rules/normalize.ts"
import { lookupList } from "../shared/lists.ts"
import type {
  CommentRecord,
  Decision,
  Reason,
  Stats,
  StorageRoot,
  Suggestion,
  ThreadResult,
  Word,
} from "../shared/types.ts"

const CONTACT_RE: RegExp[] = [
  /t\.me\/[a-z0-9_+/.-]+/i,
  /(?:加|➕)\s*[v微威薇]/,
  /(?:微信|v信|vx|wx)\s*[:：=是]?\s*[a-z0-9_-]{5,}/i,
  /(?:qq|扣扣)\s*[:：]?\s*\d{5,12}/i,
  /telegram|飞机号|飛機號/,
]

function hitWords(normalized: string, words: Word[]): string[] {
  const hits: string[] = []
  for (const w of words) {
    if (!w.normalized) continue
    if (normalized.includes(w.normalized)) hits.push(w.raw)
  }
  return hits
}

function domainHits(urls: string[], words: Word[]): string[] {
  const hits: string[] = []
  for (const url of urls) {
    const host = hostFromUrl(url)
    if (!host) continue
    for (const w of words) {
      const d = w.normalized.replace(/^https?:\/\//, "").replace(/\/$/, "")
      if (!d) continue
      if (host === d || host.endsWith(`.${d}`)) hits.push(w.raw)
    }
  }
  return hits
}

function hasContact(normalized: string): boolean {
  return CONTACT_RE.some((re) => re.test(normalized))
}

function emptyDecision(): Decision {
  return { hide: false, suggest: false, reasons: [], matchedTerms: [] }
}

function pushReason(d: Decision, r: Reason, terms: string[] = []) {
  if (!d.reasons.includes(r)) d.reasons.push(r)
  for (const t of terms) if (!d.matchedTerms.includes(t)) d.matchedTerms.push(t)
}

function scoreOf(reasons: Reason[]): number {
  let s = 0
  if (reasons.includes("cross_tweet")) s += 40
  const drain = reasons.includes("drain")
  const scam = reasons.includes("scam_adult")
  if (drain && scam) s += 30
  else if (drain || scam) s += 15
  if (reasons.includes("mention")) s += 18
  if (reasons.includes("dup_in_thread")) s += 10
  if (reasons.includes("manual")) s += 8
  s += reasons.length
  return s
}

export function classifyThread(
  conversationId: string,
  comments: CommentRecord[],
  state: StorageRoot,
): ThreadResult {
  const { settings, wordlists, lists, stats } = state
  const byTweetId: Record<string, Decision> = {}
  const hideUsers = new Set<string>()
  const reasonsByUser = new Map<string, Reason[]>()
  const termsByUser = new Map<string, string[]>()
  const metaByUser = new Map<string, { handle: string; displayName: string }>()

  const mergeUser = (c: CommentRecord, d: Decision) => {
    const prev = reasonsByUser.get(c.userId) ?? []
    const terms = termsByUser.get(c.userId) ?? []
    for (const r of d.reasons) if (!prev.includes(r)) prev.push(r)
    for (const t of d.matchedTerms) if (!terms.includes(t)) terms.push(t)
    reasonsByUser.set(c.userId, prev)
    termsByUser.set(c.userId, terms)
    metaByUser.set(c.userId, { handle: c.handle, displayName: c.displayName })
    if (d.hide) hideUsers.add(c.userId)
  }

  const gated: { comment: CommentRecord; norm: string; grams: Set<string> }[] = []
  const rootHandle = comments.find((x) => x.isRoot)?.handle ?? ""

  for (const c of comments) {
    const d = emptyDecision()
    byTweetId[c.tweetId] = d
    if (c.isRoot || c.isRootAuthor) continue

    const listed = lookupList(lists, c.userId, c.handle)
    if (listed === "exempt") continue

    if (listed === "pending" || listed === "blocked") {
      d.hide = true
      pushReason(d, "manual")
      mergeUser(c, d)
      continue
    }

    // Match display name as well as body: drain/escort ads often live in the name.
    const bodyNorm = normalizeText(c.text)
    const nameNorm = normalizeText(c.displayName)
    const norm = `${nameNorm} ${bodyNorm}`.trim()
    const drainHits = settings.enableDrain ? hitWords(norm, wordlists.drain) : []
    const customHits = hitWords(norm, wordlists.custom)
    const scamHits = settings.enableScamAdult ? hitWords(norm, wordlists.scamAdult) : []
    const domains = settings.enableDrain || settings.enableScamAdult ? domainHits(c.urls, wordlists.domains) : []
    const contact = hasContact(norm)
    const urlGate = c.urls.length > 0 || contact
    const mentionList = c.mentions.length ? c.mentions : mentionsInText(c.text)
    const extras = extraMentions({
      mentions: mentionList,
      replyTo: c.replyTo ?? [],
      selfHandle: c.handle,
      rootHandle,
    })
    const mentionGate =
      !!settings.enableMentionSpam && hasCjk(`${c.text} ${c.displayName}`) && extras.length > 0

    if (drainHits.length || customHits.length) {
      d.hide = true
      pushReason(d, "drain", [...drainHits, ...customHits])
    }
    if (scamHits.length) {
      d.hide = true
      pushReason(d, "scam_adult", scamHits)
    }
    if (domains.length) {
      d.hide = true
      if (settings.enableScamAdult) pushReason(d, "scam_adult", domains)
      else pushReason(d, "drain", domains)
    }
    if (contact && settings.enableDrain && !d.hide) {
      d.hide = true
      pushReason(d, "drain", ["contact"])
    }

    if (mentionGate) {
      pushReason(d, "mention", extras.slice(0, 3).map((h) => `@${h}`))
      d.suggest = true
      if (extras.length >= 2) d.hide = true
    }

    // Ads often live only in the profile. Reply card still shows CJK name + latin+digit handle.
    if (
      settings.enableScamAdult &&
      hasCjk(c.displayName) &&
      isDigitFarmHandle(c.handle)
    ) {
      d.hide = true
      pushReason(d, "drain", ["handle_farm"])
    }

    const dupBody = normalizeText(stripMentions(c.text))
    const gateOpen = d.hide || urlGate || mentionGate
    if (gateOpen && dupBody.length >= 8) {
      gated.push({ comment: c, norm: dupBody, grams: charBigrams(dupBody) })
    }

    if (settings.enableCrossTweet) {
      const uh = stats.userHits[c.userId]
      if (uh && uh.conversationIds.some((id) => id !== conversationId)) {
        d.suggest = true
        pushReason(d, "cross_tweet")
      }
      if (gateOpen && bodyNorm.length >= 8) {
        const fp = fingerprint(bodyNorm)
        const fh = stats.fingerprints[fp]
        if (fh && fh.conversationIds.some((id) => id !== conversationId)) {
          d.suggest = true
          pushReason(d, "cross_tweet")
        }
      }
    }

    mergeUser(c, d)
  }

  for (let i = 0; i < gated.length; i++) {
    for (let j = i + 1; j < gated.length; j++) {
      const a = gated[i]
      const b = gated[j]
      const same = a.norm === b.norm || jaccard(a.grams, b.grams) >= 0.9
      if (!same) continue
      for (const g of [a, b]) {
        const d = byTweetId[g.comment.tweetId]
        d.hide = true
        pushReason(d, "dup_in_thread")
        mergeUser(g.comment, d)
      }
    }
  }

  // Hide every comment of a hidden account on this thread.
  for (const c of comments) {
    if (c.isRoot || c.isRootAuthor) continue
    if (lookupList(lists, c.userId, c.handle) === "exempt") continue
    if (hideUsers.has(c.userId)) {
      const d = byTweetId[c.tweetId]
      d.hide = true
      if (d.reasons.length === 0) {
        const r = reasonsByUser.get(c.userId) ?? ["manual"]
        d.reasons = [...r]
        d.matchedTerms = [...(termsByUser.get(c.userId) ?? [])]
      }
    }
  }

  const suggestions: Suggestion[] = []
  const pendingSeen: Suggestion[] = []
  for (const [userId, reasons] of reasonsByUser) {
    const meta = metaByUser.get(userId)
    if (!meta) continue
    const listed = lookupList(lists, userId, meta.handle)
    if (listed === "exempt") continue
    const hide = hideUsers.has(userId)
    const suggestOnly = (reasons.includes("cross_tweet") || reasons.includes("mention")) && !hide
    if (listed === "pending") {
      pendingSeen.push({
        userId,
        handle: meta.handle,
        displayName: meta.displayName,
        reasons,
        matchedTerms: termsByUser.get(userId) ?? [],
        score: 1000 + scoreOf(reasons),
        checked: false,
      })
      continue
    }
    if (listed === "blocked") continue
    if (!hide && !suggestOnly) continue
    suggestions.push({
      userId,
      handle: meta.handle,
      displayName: meta.displayName,
      reasons,
      matchedTerms: termsByUser.get(userId) ?? [],
      score: scoreOf(reasons),
      checked: true,
    })
  }
  suggestions.sort((a, b) => b.score - a.score)
  const max = state.settings.maxTray
  const top = suggestions.slice(0, max)
  for (const s of top) s.checked = true

  const hiddenCommentCount = comments.filter((c) => byTweetId[c.tweetId]?.hide && !c.isRoot).length

  const now = Date.now()
  const fpOut: Stats["fingerprints"] = {}
  const uhOut: Stats["userHits"] = {}
  for (const c of comments) {
    const d = byTweetId[c.tweetId]
    if (!d?.hide) continue
    if (c.isRoot || c.isRootAuthor) continue
    if (!d.reasons.some((r) => r === "drain" || r === "scam_adult" || r === "dup_in_thread" || r === "mention")) continue
    const norm = normalizeText(stripMentions(c.text))
    if (norm.length >= 8) {
      const fp = fingerprint(norm)
      const prev = stats.fingerprints[fp]
      const conv = new Set(prev?.conversationIds ?? [])
      conv.add(conversationId)
      const uids = new Set(prev?.userIds ?? [])
      uids.add(c.userId)
      fpOut[fp] = {
        textSample: c.text.slice(0, 80),
        userIds: [...uids],
        conversationIds: [...conv],
        lastSeen: now,
      }
    }
    const prevU = stats.userHits[c.userId]
    const convU = new Set(prevU?.conversationIds ?? [])
    convU.add(conversationId)
    const rs = new Set(prevU?.reasons ?? [])
    for (const r of d.reasons) rs.add(r)
    uhOut[c.userId] = {
      handle: c.handle,
      conversationIds: [...convU],
      reasons: [...rs],
      lastSeen: now,
    }
  }

  return {
    byTweetId,
    hideUserIds: [...hideUsers],
    suggestions: top,
    pendingSeen,
    hiddenCommentCount,
    parseFailed: false,
    statUpdates: { fingerprints: fpOut, userHits: uhOut },
  }
}
