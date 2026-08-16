# XBlock

On a single X status conversation, hide promo / farm / adult-scam reply bots, then confirm native Block. Local lists only.

## Language

**Conversation**:
One X status page (`/status/:id`) and its reply stream. The only place identification runs.
_Avoid_: timeline, thread (when you mean Home), page

**Hide**:
The account’s replies disappear from this conversation’s layout. One high-confidence hit hides every reply from that account here.
_Avoid_: collapse, mute, fold

**Suggest**:
The account appears in the tray for review and is not hidden.
_Avoid_: flag, suspect (as the layer)

**Ignore**:
The reply stays visible and stays out of the tray.
_Avoid_: skip, pass

**Exempt**:
A human. Never hidden, never suggested. Wins over pending and blocked mirror.
_Avoid_: whitelist, safe, friend

**Pending**:
The user confirmed the account in the tray and has not finished native Block. Seen later on any conversation, the account is hidden (D2).
_Avoid_: queued, to-block (as the list name)

**Blocked mirror**:
Local record that the user finished native Block. When seen, hide like pending.
_Avoid_: blocked (as if XBlock performed the block)

**Native Block queue**:
Opens X’s own Block dialog. The last click must be the user’s. Does not pause hide, suggest, or ignore.
_Avoid_: auto-block, silent block

**Near-dup**:
Same gated reply text in one conversation (exact match or Jaccard ≥ 0.9, length ≥ 8). A hide signal. The gate is already-hide, URL, or contact — not extra mention and not farm handle.
_Avoid_: copy (as the signal), near-dup gated by mention

**Farm handle**:
A Latin-plus-long-digit handle shape. A suggest signal by itself, never a hide reason and never drain.
_Avoid_: handle_farm (as a drain term), farm (as a hide reason)

**Bind candidate**:
An account known only by handle, not by X rest_id. Not hidden via pending/blocked until bound to a rest_id.
_Avoid_: h: id and unresolved: id as two kinds, temporary id

**Extra mention**:
An @handle in a reply that is not the author, the conversation author, or the reply parent.
_Avoid_: mention spam (as the signal name)

**Fingerprint**:
A local 30-day key of gated reply text used only to suggest a cross-conversation repeat.
_Avoid_: hash, embedding

**Seed**:
A built-in word-list entry. A higher seed revision merges missing seeds and keeps user words.
_Avoid_: default word, builtin
