import type { ExportKind } from "./io.ts"
import type { ImportStrategy, Reason, StorageRoot } from "./types.ts"

export type Mutation =
  | { op: "replace"; state: StorageRoot }
  | { op: "settings"; patch: Partial<StorageRoot["settings"]> }
  | { op: "addWord"; list: keyof StorageRoot["wordlists"]; raw: string }
  | { op: "removeWord"; list: keyof StorageRoot["wordlists"]; normalized: string }
  | { op: "resetSeeds" }
  | {
      op: "pending"
      userId: string
      handle: string
      displayName?: string
      reasons: Reason[]
      sourceConversationId: string
    }
  | { op: "exempt"; userId: string; handle: string; displayName?: string }
  | { op: "blocked"; userId: string; handle: string; displayName?: string }
  | { op: "removeList"; table: keyof StorageRoot["lists"]; userId: string }
  | { op: "recordStats"; fingerprints: StorageRoot["stats"]["fingerprints"]; userHits: StorageRoot["stats"]["userHits"] }
  | { op: "rebind"; handle: string; userId: string; displayName?: string }
  | { op: "import"; raw: string; filename: string; strategy: ImportStrategy }
  | { op: "markNeedsManual"; userId: string }

export type Request =
  | { type: "GET_STATE" }
  | { type: "MUTATE"; mutation: Mutation }
  | { type: "EXPORT"; kind: ExportKind }

export type Response =
  | { ok: true; state: StorageRoot }
  | { ok: true; state: StorageRoot; payload: string; filename: string }
  | { ok: false; error: string }
