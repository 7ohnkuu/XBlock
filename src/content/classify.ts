import { isDigitFarmHandle } from "../rules/handles.ts"
import { extraMentions, hasCjk, stripMentions } from "../rules/mentions.ts"
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
import { decide, emptySignals, type Signals } from "./verdict.ts"

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

function applyVerdict(d: Decision, listed: ReturnType<typeof lookupList>, signals: Signals) {
  const v = decide(listed, signals)
  d.hide = v.layer === "hide"
  d.suggest = v.layer === "suggest"
  d.reasons = v.reasons
  d.matchedTerms = v.matchedTerms
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
  const signalsByTweet = new Map<string, Signals>()

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
    const signals = emptySignals()

    if (listed !== "exempt" && listed !== "pending" && listed !== "blocked") {
      const bodyNorm = normalizeText(c.text)
      const nameNorm = normalizeText(c.displayName)
      const norm = `${nameNorm} ${bodyNorm}`.trim()
      signals.drainHits = settings.enableDrain ? hitWords(norm, wordlists.drain) : []
      signals.customHits = hitWords(norm, wordlists.custom)
      signals.scamHits = settings.enableScamAdult ? hitWords(norm, wordlists.scamAdult) : []
      signals.domainHits =
        settings.enableDrain || settings.enableScamAdult ? domainHits(c.urls, wordlists.domains) : []
      signals.domainReason = settings.enableScamAdult ? "scam_adult" : "drain"
      signals.contact = settings.enableDrain && hasContact(norm)
      const extras = extraMentions({
        mentions: c.mentions,
        replyTo: c.replyTo ?? [],
        selfHandle: c.handle,
        rootHandle,
      })
      if (settings.enableMentionSpam && hasCjk(c.text) && extras.length > 0) {
        signals.extraMentions = extras
      }
      const farm = isDigitFarmHandle(c.handle)
      const farmCjk = hasCjk(c.displayName) || hasCjk(c.text)
      if (farm && farmCjk && (settings.enableDrain || settings.enableScamAdult)) {
        signals.farmHandle = true
      }

      const dupBody = normalizeText(stripMentions(c.text))
      if (settings.enableCrossTweet) {
        const uh = stats.userHits[c.userId]
        if (uh && uh.conversationIds.some((id) => id !== conversationId)) signals.crossTweet = true
        if ((c.urls.length > 0 || signals.contact || signals.drainHits.length || signals.customHits.length || signals.scamHits.length || signals.domainHits.length) && dupBody.length >= 8) {
          const fp = fingerprint(dupBody)
          const fh = stats.fingerprints[fp]
          if (fh && fh.conversationIds.some((id) => id !== conversationId)) signals.crossTweet = true
        }
      }
    }

    applyVerdict(d, listed, signals)
    signalsByTweet.set(c.tweetId, signals)

    const dupBody = normalizeText(stripMentions(c.text))
    const spamGate = d.hide || c.urls.length > 0 || signals.contact
    if (listed !== "exempt" && spamGate && dupBody.length >= 8) {
      gated.push({ comment: c, norm: dupBody, grams: charBigrams(dupBody) })
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
        const listed = lookupList(lists, g.comment.userId, g.comment.handle)
        const signals = signalsByTweet.get(g.comment.tweetId) ?? emptySignals()
        signals.nearDup = true
        applyVerdict(d, listed, signals)
        mergeUser(g.comment, d)
      }
    }
  }

  for (const c of comments) {
    if (c.isRoot || c.isRootAuthor) continue
    if (lookupList(lists, c.userId, c.handle) === "exempt") continue
    if (hideUsers.has(c.userId)) {
      const d = byTweetId[c.tweetId]
      d.hide = true
      d.suggest = false
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
    const terms = termsByUser.get(userId) ?? []
    const suggestOnly = !hide && (reasons.includes("cross_tweet") || reasons.includes("mention") || reasons.includes("farm"))
    if (listed === "pending") {
      pendingSeen.push({
        userId,
        handle: meta.handle,
        displayName: meta.displayName,
        reasons,
        matchedTerms: terms,
        score: 0,
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
      matchedTerms: terms,
      score: 0,
      checked: false,
    })
  }

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
    suggestions,
    pendingSeen,
    hiddenCommentCount,
    parseFailed: false,
    statUpdates: { fingerprints: fpOut, userHits: uhOut },
  }
}
