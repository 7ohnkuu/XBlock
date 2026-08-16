import { isBindCandidateId } from "../shared/path.ts"
import { rebindHandle } from "../shared/lists.ts"
import type { Mutation } from "../shared/messages.ts"
import type { CommentRecord, StorageRoot, Suggestion } from "../shared/types.ts"
import { classifyThread } from "./classify.ts"
import { applyTraySession } from "./traySession.ts"

export type PageStep = {
  state: StorageRoot
  mutations: Mutation[]
  suggestions: Suggestion[]
  pendingSeen: Suggestion[]
  hiddenCount: number
  parseFailed: boolean
  byTweetId: ReturnType<typeof classifyThread>["byTweetId"]
  statUpdates: ReturnType<typeof classifyThread>["statUpdates"]
}

export function stepPageSession(input: {
  conversationId: string
  comments: CommentRecord[]
  state: StorageRoot
  previousSuggestions: Suggestion[]
  parseFailed?: boolean
}): PageStep {
  let { state } = input
  const mutations: Mutation[] = []

  for (const c of input.comments) {
    if (isBindCandidateId(c.userId)) continue
    const rebound = rebindHandle(state.lists, c.handle, c.userId, c.displayName)
    if (rebound === state.lists) continue
    state = { ...state, lists: rebound }
    mutations.push({
      op: "rebind",
      handle: c.handle,
      userId: c.userId,
      displayName: c.displayName,
    })
  }

  const result = classifyThread(input.conversationId, input.comments, state)
  const suggestions = applyTraySession(
    result.suggestions,
    input.previousSuggestions,
    state.settings.maxTray,
  )

  return {
    state,
    mutations,
    suggestions,
    pendingSeen: result.pendingSeen,
    hiddenCount: result.hiddenCommentCount,
    parseFailed: Boolean(input.parseFailed) || result.parseFailed,
    byTweetId: result.byTweetId,
    statUpdates: result.statUpdates,
  }
}
