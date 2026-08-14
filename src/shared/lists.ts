import { isUnresolvedId, unresolvedKey } from "./path.ts"
import type { Lists, ListEntry, PendingEntry, Reason } from "./types.ts"

export type ListKind = "exempt" | "pending" | "blocked" | null

export function lookupList(lists: Lists, userId: string, handle: string): ListKind {
  const h = handle.replace(/^@/, "").toLowerCase()
  const byHandle = (rec: Record<string, ListEntry | PendingEntry>) =>
    Object.values(rec).some((e) => e.handle.replace(/^@/, "").toLowerCase() === h)

  if (lists.exempt[userId] || byHandle(lists.exempt)) return "exempt"
  if (lists.blockedMirror[userId] || byHandle(lists.blockedMirror)) return "blocked"
  if (lists.pendingBlock[userId] || byHandle(lists.pendingBlock)) return "pending"
  const u = unresolvedKey(h)
  if (lists.pendingBlock[u] || lists.blockedMirror[u]) {
    // unresolved rows must not hide until rebound — caller handles bind
    return null
  }
  return null
}

export function findUnresolvedPending(lists: Lists, handle: string): PendingEntry | null {
  return lists.pendingBlock[unresolvedKey(handle)] ?? null
}

export function rebindHandle(lists: Lists, handle: string, userId: string, displayName?: string): Lists {
  if (isUnresolvedId(userId)) return lists
  const key = unresolvedKey(handle)
  if (!lists.exempt[key] && !lists.blockedMirror[key] && !lists.pendingBlock[key]) return lists
  const next: Lists = {
    exempt: { ...lists.exempt },
    pendingBlock: { ...lists.pendingBlock },
    blockedMirror: { ...lists.blockedMirror },
  }
  const now = Date.now()
  for (const table of ["exempt", "blockedMirror"] as const) {
    const row = next[table][key]
    if (row) {
      delete next[table][key]
      next[table][userId] = { ...row, userId, handle, displayName: displayName ?? row.displayName, updatedAt: now, unresolved: false }
    }
  }
  const pending = next.pendingBlock[key]
  if (pending) {
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
