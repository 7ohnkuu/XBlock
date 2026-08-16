import { isBindCandidateId, legacyBindKey, unresolvedKey } from "./path.ts"
import type { Lists, ListEntry, PendingEntry, Reason } from "./types.ts"

export type ListKind = "exempt" | "pending" | "blocked" | null

function boundByHandle(rec: Record<string, ListEntry | PendingEntry>, handle: string): boolean {
  const h = handle.replace(/^@/, "").toLowerCase()
  return Object.values(rec).some((e) => {
    if (isBindCandidateId(e.userId) || e.unresolved) return false
    return e.handle.replace(/^@/, "").toLowerCase() === h
  })
}

export function lookupList(lists: Lists, userId: string, handle: string): ListKind {
  const boundId = !isBindCandidateId(userId)
  if (boundId && lists.exempt[userId]) return "exempt"
  if (boundByHandle(lists.exempt, handle)) return "exempt"
  if (boundId && lists.blockedMirror[userId]) return "blocked"
  if (boundByHandle(lists.blockedMirror, handle)) return "blocked"
  if (boundId && lists.pendingBlock[userId]) return "pending"
  if (boundByHandle(lists.pendingBlock, handle)) return "pending"
  return null
}

export function findUnresolvedPending(lists: Lists, handle: string): PendingEntry | null {
  return lists.pendingBlock[unresolvedKey(handle)] ?? null
}

export function rebindHandle(lists: Lists, handle: string, userId: string, displayName?: string): Lists {
  if (isBindCandidateId(userId)) return lists
  const keys = [unresolvedKey(handle), legacyBindKey(handle)]
  const has = keys.some(
    (key) => lists.exempt[key] || lists.blockedMirror[key] || lists.pendingBlock[key],
  )
  if (!has) return lists
  const next: Lists = {
    exempt: { ...lists.exempt },
    pendingBlock: { ...lists.pendingBlock },
    blockedMirror: { ...lists.blockedMirror },
  }
  const now = Date.now()
  for (const table of ["exempt", "blockedMirror"] as const) {
    for (const key of keys) {
      const row = next[table][key]
      if (!row) continue
      delete next[table][key]
      next[table][userId] = {
        ...row,
        userId,
        handle,
        displayName: displayName ?? row.displayName,
        updatedAt: now,
        unresolved: false,
      }
    }
  }
  for (const key of keys) {
    const pending = next.pendingBlock[key]
    if (!pending) continue
    delete next.pendingBlock[key]
    next.pendingBlock[userId] = {
      ...pending,
      userId,
      handle,
      displayName: displayName ?? pending.displayName,
      updatedAt: now,
      unresolved: false,
    }
  }
  return next
}

export function applyExempt(
  lists: Lists,
  entry: { userId: string; handle: string; displayName?: string },
): Lists {
  const now = Date.now()
  const { userId, handle, displayName } = entry
  const next: Lists = {
    exempt: { ...lists.exempt, [userId]: { userId, handle, displayName, updatedAt: now } },
    pendingBlock: { ...lists.pendingBlock },
    blockedMirror: { ...lists.blockedMirror },
  }
  delete next.pendingBlock[userId]
  delete next.blockedMirror[userId]
  delete next.pendingBlock[unresolvedKey(handle)]
  delete next.blockedMirror[unresolvedKey(handle)]
  delete next.pendingBlock[legacyBindKey(handle)]
  delete next.blockedMirror[legacyBindKey(handle)]
  return next
}

export function applyPending(
  lists: Lists,
  entry: {
    userId: string
    handle: string
    displayName?: string
    reasons: Reason[]
    sourceConversationId: string
  },
): Lists {
  if (lookupList(lists, entry.userId, entry.handle) === "exempt") return lists
  const now = Date.now()
  const next: Lists = {
    exempt: { ...lists.exempt },
    pendingBlock: { ...lists.pendingBlock },
    blockedMirror: { ...lists.blockedMirror },
  }
  next.pendingBlock[entry.userId] = {
    userId: entry.userId,
    handle: entry.handle,
    displayName: entry.displayName,
    reasons: entry.reasons,
    sourceConversationId: entry.sourceConversationId,
    addedAt: next.pendingBlock[entry.userId]?.addedAt ?? now,
    updatedAt: now,
  }
  return next
}

export function applyBlocked(
  lists: Lists,
  entry: { userId: string; handle: string; displayName?: string },
): Lists {
  const now = Date.now()
  const next: Lists = {
    exempt: { ...lists.exempt },
    pendingBlock: { ...lists.pendingBlock },
    blockedMirror: { ...lists.blockedMirror },
  }
  delete next.pendingBlock[entry.userId]
  delete next.pendingBlock[unresolvedKey(entry.handle)]
  delete next.pendingBlock[legacyBindKey(entry.handle)]
  next.blockedMirror[entry.userId] = {
    userId: entry.userId,
    handle: entry.handle,
    displayName: entry.displayName,
    updatedAt: now,
  }
  return next
}

export function removeListEntry(lists: Lists, table: keyof Lists, userId: string): Lists {
  const next: Lists = {
    exempt: { ...lists.exempt },
    pendingBlock: { ...lists.pendingBlock },
    blockedMirror: { ...lists.blockedMirror },
  }
  delete next[table][userId]
  return next
}
