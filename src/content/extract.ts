import { mentionsInText } from "../rules/mentions.ts"
import type { CommentRecord } from "../shared/types.ts"

export const SEL = {
  column: '[data-testid="primaryColumn"]',
  cell: '[data-testid="cellInnerDiv"]',
  tweet: 'article[data-testid="tweet"]',
  userName: '[data-testid="User-Name"]',
  tweetText: '[data-testid="tweetText"]',
  caret: '[data-testid="caret"]',
} as const

export function primaryColumn(): HTMLElement | null {
  return document.querySelector<HTMLElement>(SEL.column)
}

export function tweetCell(article: Element): HTMLElement {
  return (article.closest(SEL.cell) as HTMLElement) ?? (article as HTMLElement)
}

type Fiber = {
  memoizedProps?: Record<string, unknown>
  pendingProps?: Record<string, unknown>
  return?: Fiber | null
}

function fiberOf(el: Element): Fiber | null {
  const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"))
  if (!key) return null
  return (el as unknown as Record<string, Fiber>)[key] ?? null
}

function readUserRestId(article: Element): string | null {
  let fiber = fiberOf(article)
  for (let i = 0; i < 50 && fiber; i++) {
    const props = (fiber.memoizedProps ?? fiber.pendingProps) as Record<string, unknown> | undefined
    if (!props) {
      fiber = fiber.return ?? null
      continue
    }
    const direct = pickRestId(props)
    if (direct) return direct
    fiber = fiber.return ?? null
  }
  return null
}

function pickRestId(props: Record<string, unknown>): string | null {
  const walk = (v: unknown, depth: number): string | null => {
    if (!v || depth > 8) return null
    if (typeof v === "string" && /^\d{5,}$/.test(v) && (props as { rest_id?: string }).rest_id === v) return v
    if (typeof v !== "object") return null
    const o = v as Record<string, unknown>
    const user = (o.core as Record<string, unknown> | undefined)?.user_results as Record<string, unknown> | undefined
    const result = user?.result as Record<string, unknown> | undefined
    if (result && typeof result.rest_id === "string") return result.rest_id
    if (typeof o.userId === "string" && /^\d+$/.test(o.userId)) return o.userId
    if (typeof o.rest_id === "string" && o.__typename === "User") return o.rest_id
    const tweet = o.tweet_results as Record<string, unknown> | undefined
    const tr = tweet?.result as Record<string, unknown> | undefined
    if (tr) {
      const fromTweet = walk(tr, depth + 1)
      if (fromTweet) return fromTweet
    }
    return null
  }
  return walk(props, 0)
}

const SKIP_HEAD = new Set([
  "home",
  "i",
  "search",
  "explore",
  "messages",
  "settings",
  "compose",
  "intent",
  "hashtag",
  "login",
  "signup",
  "tos",
  "privacy",
  "notifications",
  "jobs",
])

/** Accept relative `/foo` and absolute `https://x.com/foo` / twitter.com. */
export function handleFromHref(href: string | null): string | null {
  if (!href) return null
  try {
    let path = href
    if (/^https?:\/\//i.test(href)) {
      const u = new URL(href)
      const host = u.hostname.replace(/^www\./, "")
      if (host !== "x.com" && host !== "twitter.com" && host !== "mobile.x.com" && host !== "mobile.twitter.com") {
        return null
      }
      path = u.pathname
    }
    const parts = path.split("/").filter(Boolean)
    if (parts.length === 0) return null
    if (SKIP_HEAD.has(parts[0].toLowerCase())) return null
    if (parts[1] === "status" && /^\d+$/.test(parts[2] ?? "")) return parts[0]
    if (parts.length === 1 && /^[A-Za-z0-9_]{1,30}$/.test(parts[0])) return parts[0]
    if (parts[0] && /^[A-Za-z0-9_]{1,30}$/.test(parts[0])) return parts[0]
  } catch {
    return null
  }
  return null
}

export function handleFromArticle(article: Element): string | null {
  const av = article.querySelector("[data-testid^='UserAvatar-Container-']")
  const tid = av?.getAttribute("data-testid") ?? ""
  const prefix = "UserAvatar-Container-"
  if (tid.startsWith(prefix)) {
    const h = tid.slice(prefix.length)
    if (h && /^[A-Za-z0-9_]{1,30}$/.test(h)) return h
  }

  const userBox = article.querySelector(SEL.userName)
  const hrefs: string[] = []
  for (const a of userBox?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? []) {
    hrefs.push(a.getAttribute("href") || a.href)
  }
  for (const a of article.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]')) {
    hrefs.push(a.getAttribute("href") || a.href)
  }
  for (const href of hrefs) {
    const h = handleFromHref(href)
    if (h) return h
  }

  const at = (userBox?.textContent || "").match(/@([A-Za-z0-9_]{1,30})/)
  return at?.[1] ?? null
}

export function displayNameFromArticle(article: Element, handle: string): string {
  const userBox = article.querySelector(SEL.userName)
  if (userBox) {
    const raw = (userBox.textContent || "").replace(/\s+/g, " ").trim()
    const cut = raw.replace(new RegExp(`@${handle}\\b.*`, "i"), "").trim()
    if (cut) return cut
    const span = userBox.querySelector("span")
    if (span?.textContent?.trim()) return span.textContent.trim()
  }
  return handle
}

function tweetIdFromArticle(article: Element): string | null {
  const links = article.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]')
  for (const a of links) {
    const m = (a.getAttribute("href") || "").match(/\/status\/(\d+)/)
    if (m) return m[1]
  }
  const time = article.querySelector("time")
  const parent = time?.closest("a")
  if (parent) {
    const m = (parent.getAttribute("href") || "").match(/\/status\/(\d+)/)
    if (m) return m[1]
  }
  return null
}

export function mentionsFromTweet(textEl: Element | null, text: string): string[] {
  const set = new Set(mentionsInText(text).map((h) => h.toLowerCase()))
  if (textEl) {
    for (const a of textEl.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      const h = handleFromHref(a.getAttribute("href") || a.href)
      if (h) set.add(h.toLowerCase())
    }
  }
  return [...set]
}

export function replyToFromArticle(article: Element, textEl: Element | null, authorHandle: string): string[] {
  const self = authorHandle.toLowerCase()
  const found = new Set<string>()
  const blocks = article.querySelectorAll("div, span")
  for (const el of blocks) {
    if (textEl && (el === textEl || textEl.contains(el))) continue
    const raw = el.childNodes.length <= 8 ? (el.textContent || "") : ""
    if (!raw || raw.length > 120) continue
    if (!/replying to|回复|回覆/i.test(raw)) continue
    for (const a of el.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      const h = handleFromHref(a.getAttribute("href") || a.href)
      if (h && h.toLowerCase() !== self) found.add(h.toLowerCase())
    }
    for (const h of mentionsInText(raw)) {
      if (h !== self) found.add(h)
    }
  }
  return [...found]
}

function extractUrls(article: Element, text: string): string[] {
  const hrefs: string[] = []
  for (const a of article.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const href = a.href || a.getAttribute("href") || ""
    if (/^https?:\/\//i.test(href) && !/(\/status\/|x\.com\/[^/]+$|twitter\.com\/[^/]+$)/.test(href)) {
      hrefs.push(href)
    }
    if (/t\.me\//i.test(href)) hrefs.push(href)
  }
  const extra = text.match(/\bhttps?:\/\/[^\s]+/gi) ?? []
  return [...new Set([...hrefs, ...extra])]
}

export type LiveComment = CommentRecord & { article: HTMLElement; cell: HTMLElement }

export function extractComments(conversationId: string): { comments: LiveComment[]; parseFailed: boolean } {
  const col = primaryColumn()
  const root = col ?? document.body
  const articles = [...root.querySelectorAll<HTMLElement>(SEL.tweet)]
  if (articles.length === 0) {
    return { comments: [], parseFailed: !col }
  }

  const comments: LiveComment[] = []
  let rootAuthorId: string | null = null
  let rootAuthorHandle: string | null = null

  for (const article of articles) {
    const handle = handleFromArticle(article)
    if (!handle) continue

    const displayName = displayNameFromArticle(article, handle)

    const textEl = article.querySelector(SEL.tweetText)
    const text = (textEl?.innerText ?? "").trim()
    const tweetId = tweetIdFromArticle(article) ?? `${handle}-${comments.length}`
    const restId = readUserRestId(article)
    const userId = restId ?? `h:${handle.toLowerCase()}`
    const urls = extractUrls(article, text)
    const mentions = mentionsFromTweet(textEl, text)
    const replyTo = replyToFromArticle(article, textEl, handle)
    const isRoot = tweetId === conversationId

    if (isRoot) {
      rootAuthorId = userId
      rootAuthorHandle = handle.toLowerCase()
    }

    comments.push({
      tweetId,
      userId,
      handle,
      displayName,
      text,
      urls,
      mentions,
      replyTo,
      isRoot,
      isRootAuthor: false,
      article,
      cell: tweetCell(article),
    })
  }

  for (const c of comments) {
    c.isRootAuthor =
      c.isRoot ||
      (!!rootAuthorId && c.userId === rootAuthorId) ||
      (!!rootAuthorHandle && c.handle.toLowerCase() === rootAuthorHandle)
  }

  return { comments, parseFailed: false }
}

export function findArticleForUser(userId: string, handle: string, live: LiveComment[]): LiveComment | null {
  const h = handle.toLowerCase()
  return live.find((c) => c.userId === userId) ?? live.find((c) => c.handle.toLowerCase() === h) ?? null
}

export function findMoreButton(article: HTMLElement): HTMLElement | null {
  const sels = [
    SEL.caret,
    '[data-testid="overflow"]',
    '[data-testid="icon-More"]',
    'button[aria-haspopup="menu"]',
    'button[aria-label="More"]',
    'button[aria-label="更多"]',
    '[aria-label="More"]',
    '[aria-label="更多"]',
    '[aria-label="More options"]',
    '[aria-label="更多選項"]',
  ]
  for (const sel of sels) {
    const el = article.querySelector<HTMLElement>(sel)
    if (el) return el
  }
  const name = article.querySelector(SEL.userName)
  const row = name?.closest("div")?.parentElement
  const buttons = row?.querySelectorAll("button")
  if (buttons?.length) return buttons[buttons.length - 1] as HTMLElement
  return null
}
