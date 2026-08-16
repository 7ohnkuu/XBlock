export type Reason =
  | "drain"
  | "scam_adult"
  | "dup_in_thread"
  | "cross_tweet"
  | "mention"
  | "farm"
  | "manual"

export type WordSource = "seed" | "user"

export type Word = {
  raw: string
  normalized: string
  addedAt: number
  source: WordSource
}

export type UserId = string

export type ListEntry = {
  userId: UserId
  handle: string
  displayName?: string
  updatedAt: number
  unresolved?: boolean
}

export type PendingEntry = ListEntry & {
  reasons: Reason[]
  sourceConversationId: string
  addedAt: number
  needsManual?: boolean
}

export type FingerprintHit = {
  textSample: string
  userIds: string[]
  conversationIds: string[]
  lastSeen: number
}

export type UserHit = {
  handle: string
  conversationIds: string[]
  reasons: Reason[]
  lastSeen: number
}

export type Settings = {
  enableDrain: boolean
  enableScamAdult: boolean
  enableCrossTweet: boolean
  enableSlowExpand: boolean
  enableMentionSpam: boolean
  maxTray: number
  maxShowMoreClicks: number
  debugLog: boolean
  seedRevision: number
  uiLocale: import("./i18n.ts").UiLocale
}

export type Wordlists = {
  drain: Word[]
  scamAdult: Word[]
  custom: Word[]
  domains: Word[]
}

export type Lists = {
  exempt: Record<UserId, ListEntry>
  pendingBlock: Record<UserId, PendingEntry>
  blockedMirror: Record<UserId, ListEntry>
}

export type Stats = {
  fingerprints: Record<string, FingerprintHit>
  userHits: Record<UserId, UserHit>
}

export type StorageRoot = {
  schemaVersion: 1
  settings: Settings
  wordlists: Wordlists
  lists: Lists
  stats: Stats
}

export type ImportStrategy = "merge" | "fill" | "replace"

export type WordlistKind = keyof Wordlists

export type CommentRecord = {
  tweetId: string
  userId: string
  handle: string
  displayName: string
  text: string
  urls: string[]
  mentions: string[]
  replyTo: string[]
  isRoot: boolean
  isRootAuthor: boolean
}

export type Decision = {
  hide: boolean
  suggest: boolean
  reasons: Reason[]
  matchedTerms: string[]
}

export type Suggestion = {
  userId: string
  handle: string
  displayName: string
  reasons: Reason[]
  matchedTerms: string[]
  score: number
  checked: boolean
}

export type ThreadResult = {
  byTweetId: Record<string, Decision>
  hideUserIds: string[]
  suggestions: Suggestion[]
  pendingSeen: Suggestion[]
  hiddenCommentCount: number
  parseFailed: boolean
  statUpdates: {
    fingerprints: Record<string, FingerprintHit>
    userHits: Record<UserId, UserHit>
  }
}

export type QueueStatus =
  | { phase: "idle" }
  | { phase: "opening"; index: number; total: number; handle: string; userId: string }
  | { phase: "awaiting_user"; index: number; total: number; handle: string; userId: string }
  | { phase: "stopped"; reason: string; handle?: string }
  | { phase: "failed"; reason: string; handle?: string }
  | { phase: "done"; completed: number }
