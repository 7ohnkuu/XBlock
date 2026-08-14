export type UiLocale = "auto" | "en" | "zh-Hant"

export type ResolvedLocale = "en" | "zh-Hant"

const EN = {
  "ext.name": "XBlock",
  "banner.scan": "Scanned {scanned} · Hidden {hidden}",
  "banner.reveal": "Show hidden",
  "banner.unreveal": "Hide again",
  "banner.open": "Open panel",
  "banner.close": "Close panel",
  "tray.meta": "Scanned {scanned} · Hidden {hidden} · Suggested {suggested} · Pending {pending}",
  "tray.parseFailed": "Could not parse replies on this page. They may still be loading, or X changed its layout.",
  "tray.opening": "Opening the Block menu for @{handle} · {index}/{total}",
  "tray.awaiting": "Click Block in X’s dialog · {index}/{total}  @{handle}",
  "tray.done": "Finished {completed} native block(s) this round",
  "tray.suggestTitle": "Suggested blocks",
  "tray.suggestEmpty": "No suggestions on this post yet. Auto-hidden accounts will show up here.",
  "tray.pendingTitle": "Unfinished blocks",
  "tray.pendingEmpty": "Accounts you confirmed but have not finished blocking stay here.",
  "tray.start": "Start blocking {count}",
  "tray.busy": "Blocking…",
  "tray.stop": "Stop",
  "tray.markHuman": "Mark selected as human",
  "tray.uncheckAll": "Uncheck all",
  "tray.options": "Options",
  "tray.human": "Human",
  "tray.profileTitle": "Open profile in a new tab (sample)",
  "reason.cross_tweet": "Cross-post",
  "reason.mention": "@mention",
  "reason.drain": "Promo",
  "reason.scam_adult": "Adult/scam",
  "reason.dup_in_thread": "Copy in thread",
  "reason.manual": "Confirmed",
  "term.handleFarm": "Latin name + long digits",
  "term.contact": "Contact info",
  "badge.suspect": "Suspect",
  "badge.human": "This is a person",
  "badge.pending": "Add to block queue",
  "queue.alreadyRunning": "A block queue is already running. Stop it first, or finish the current X dialog.",
  "queue.noneSelected": "No accounts selected. Check items in the suggestion list first.",
  "queue.stopped": "Stopped. Unfinished accounts stay hidden.",
  "queue.runningShort": "A block queue is already running.",
  "queue.notOnScreen": "Reply from @{handle} is not on screen (X may have virtualized it). Show hidden replies and scroll to it, or open the profile to block manually. Queue stopped.",
  "queue.noMore": "Could not find the More button for @{handle}. X may have changed. Stopped; will not call unofficial APIs.",
  "queue.noBlockItem": "Could not open Block for @{handle}. Block from the profile, or try again later. Queue stopped.",
  "queue.timeout": "Timed out waiting for block confirmation (@{handle}). Queue stopped.",
  "queue.cancelled": "Cancelled @{handle}. Queue stopped. Unfinished accounts stay hidden.",
  "queue.error": "Block queue error: {error}",
  "opt.title": "XBlock Options",
  "opt.kicker": "On-device · status replies only · no silent blocks",
  "opt.aboutTitle": "What this is",
  "opt.aboutBody": "On X status reply threads, flag promo, copy-paste farms, and adult/scam accounts with a local word list. Hide first, then block with X’s own dialog. Data stays on this machine. Import/export is a local file, not a subscribed list.",
  "opt.risk": "Expanding replies and opening native menus is still unofficial automation under X’s rules. You must click the final Block. If the menu breaks, the queue stops instead of calling internal APIs.",
  "opt.language": "Display language",
  "opt.lang.auto": "Match browser",
  "opt.lang.zh": "中文",
  "opt.lang.en": "English",
  "opt.toggles": "Toggles",
  "opt.enableDrain": "Promo / contact (auto-hide)",
  "opt.enableScamAdult": "Adult / scam (auto-hide)",
  "opt.enableCrossTweet": "Cross-post suggestions (tray only)",
  "opt.enableMentionSpam": "Extra @mentions in Chinese replies (tray only unless other spam signals)",
  "opt.enableSlowExpand": "Slow-click “Show more replies”",
  "opt.wordlists": "Filter words",
  "opt.category": "Category",
  "opt.cat.drain": "Promo",
  "opt.cat.scamAdult": "Adult / scam",
  "opt.cat.custom": "Custom",
  "opt.cat.domains": "Domains",
  "opt.wordSearch": "Search words…",
  "opt.wordNew": "Add a word",
  "opt.wordAdd": "Add",
  "opt.wordReset": "Reset seed words (keep yours)",
  "opt.wordResetConfirm": "Replace seed words with the built-in list and keep words you added?",
  "opt.seed": "seed",
  "opt.lists": "Lists",
  "opt.list.pending": "Pending block",
  "opt.list.blocked": "Blocked (mirror)",
  "opt.list.exempt": "Human (exempt)",
  "opt.empty": "(empty)",
  "opt.remove": "Remove",
  "opt.unresolved": "id not bound yet",
  "opt.io": "Import / export",
  "opt.ioHint": "This is your backup, not a community blocklist. Choose a file on this computer only.",
  "opt.export": "Export",
  "opt.exportWords": "Export words",
  "opt.exportLists": "Export lists",
  "opt.exportBackup": "Full backup",
  "opt.import": "Import",
  "opt.strategy": "Strategy",
  "opt.merge": "Merge (default)",
  "opt.fill": "Fill gaps only",
  "opt.replace": "Replace these tables",
  "opt.replaceConfirm": "Replace will overwrite every table present in the file. Continue?",
  "opt.chooseFile": "Choose file",
  "opt.imported": "Imported {name}",
} as const

const ZH: Record<keyof typeof EN, string> = {
  "ext.name": "XBlock",
  "banner.scan": "已掃描 {scanned} · 已隱藏 {hidden}",
  "banner.reveal": "暫時顯示全部",
  "banner.unreveal": "恢復隱藏",
  "banner.open": "打開托盤",
  "banner.close": "收起托盤",
  "tray.meta": "掃描 {scanned} · 已藏 {hidden} · 建議 {suggested} · 待完成 {pending}",
  "tray.parseFailed": "此頁無法解析評論。可能是還沒載入，或 X 改了結構。",
  "tray.opening": "正在打開 @{handle} 的封鎖選單 · {index}/{total}",
  "tray.awaiting": "請在 X 的對話框按「封鎖」· {index}/{total}  @{handle}",
  "tray.done": "本輪完成 {completed} 個原生封鎖",
  "tray.suggestTitle": "建議拉黑",
  "tray.suggestEmpty": "這一帖還沒有建議。自動隱藏的號會出現在這裡。",
  "tray.pendingTitle": "待完成封鎖",
  "tray.pendingEmpty": "確認後還沒按完原生封鎖的號會留在這裡。",
  "tray.start": "開始封鎖 {count}",
  "tray.busy": "封鎖進行中",
  "tray.stop": "停止",
  "tray.markHuman": "將勾選標為真人",
  "tray.uncheckAll": "全不選",
  "tray.options": "選項",
  "tray.human": "真人",
  "tray.profileTitle": "新分頁打開主頁（抽樣）",
  "reason.cross_tweet": "跨帖",
  "reason.mention": "@提及",
  "reason.drain": "引流",
  "reason.scam_adult": "色情/詐騙",
  "reason.dup_in_thread": "本帖複製",
  "reason.manual": "已確認",
  "term.handleFarm": "英文名+長數字",
  "term.contact": "聯絡方式",
  "badge.suspect": "可疑",
  "badge.human": "這是真人",
  "badge.pending": "加入待封鎖",
  "queue.alreadyRunning": "封鎖隊列已在進行。先按停止，或在 X 對話框完成這一號。",
  "queue.noneSelected": "沒有勾選任何帳號。請先勾選建議列表。",
  "queue.stopped": "已停止。未完成的仍會隱藏。",
  "queue.runningShort": "封鎖隊列已在進行。",
  "queue.notOnScreen": "畫面上找不到 @{handle} 的評論（可能被 X 卸載了）。請先「暫時顯示全部」並捲到該則，或點帳號進主頁手動封鎖。已停止。",
  "queue.noMore": "找不到 @{handle} 的「更多」按鈕。X 可能改版。已停止，不會改用接口封鎖。",
  "queue.noBlockItem": "打不開 @{handle} 的封鎖選項。請自行在主頁封鎖，或稍後再試。已停止。",
  "queue.timeout": "等待封鎖確認逾時（@{handle}）。已停止。",
  "queue.cancelled": "已取消 @{handle}，隊列停止。未完成的仍會隱藏。",
  "queue.error": "封鎖隊列出錯：{error}",
  "opt.title": "XBlock 選項",
  "opt.kicker": "本機 · 單帖評論區 · 不代發封鎖",
  "opt.aboutTitle": "這是什麼",
  "opt.aboutBody": "在你打開的 X 帖子評論區，用本機詞庫標出引流、複製農場、色情／詐騙號，先藏起來，再讓你用官方對話框拉黑。資料不出這台機器。導入導出只接受本機檔，不是訂閱名單。",
  "opt.risk": "展開回覆與打開原生選單仍屬 X 所寫的非官方自動化灰區。封鎖的最後一下必須你按。選單改版時隊列會停，不會改去打內部接口。",
  "opt.language": "介面語言",
  "opt.lang.auto": "跟隨瀏覽器",
  "opt.lang.zh": "中文",
  "opt.lang.en": "English",
  "opt.toggles": "開關",
  "opt.enableDrain": "引流（自動藏）",
  "opt.enableScamAdult": "色情／詐騙（自動藏）",
  "opt.enableCrossTweet": "跨帖建議（只進托盤）",
  "opt.enableMentionSpam": "中文留言裡多餘的 @帳號（只進托盤；沒有引流／連結不自動藏）",
  "opt.enableSlowExpand": "慢速展開「更多回覆」",
  "opt.wordlists": "封控詞庫",
  "opt.category": "分類",
  "opt.cat.drain": "引流",
  "opt.cat.scamAdult": "色情／詐騙",
  "opt.cat.custom": "自訂",
  "opt.cat.domains": "域名",
  "opt.wordSearch": "搜尋詞…",
  "opt.wordNew": "新增一詞",
  "opt.wordAdd": "加入",
  "opt.wordReset": "重置種子詞（保留自增）",
  "opt.wordResetConfirm": "用內建種子覆寫種子詞，並保留你自己加的詞？",
  "opt.seed": "種子",
  "opt.lists": "名單",
  "opt.list.pending": "待封鎖",
  "opt.list.blocked": "已封鎖鏡像",
  "opt.list.exempt": "真人豁免",
  "opt.empty": "（空）",
  "opt.remove": "移除",
  "opt.unresolved": "待對上 id",
  "opt.io": "導入／導出",
  "opt.ioHint": "這是你的備份，不是社區黑名單。只從本機選擇檔案。",
  "opt.export": "導出",
  "opt.exportWords": "導出詞庫",
  "opt.exportLists": "導出名單",
  "opt.exportBackup": "完整備份",
  "opt.import": "導入",
  "opt.strategy": "策略",
  "opt.merge": "合併（默認）",
  "opt.fill": "僅補缺",
  "opt.replace": "覆蓋此類",
  "opt.replaceConfirm": "覆蓋此類會取代檔案裡出現的整張表。確定？",
  "opt.chooseFile": "選擇檔案",
  "opt.imported": "已導入 {name}",
}

export type MsgKey = keyof typeof EN

const TABLES: Record<ResolvedLocale, Record<MsgKey, string>> = { en: EN, "zh-Hant": ZH }

let active: ResolvedLocale = "zh-Hant"

export function browserLocale(): ResolvedLocale {
  const raw =
    (typeof chrome !== "undefined" && chrome.i18n?.getUILanguage?.()) ||
    (typeof navigator !== "undefined" ? navigator.language : "zh")
  return raw.toLowerCase().startsWith("zh") ? "zh-Hant" : "en"
}

export function resolveLocale(pref: UiLocale | undefined): ResolvedLocale {
  if (pref === "en" || pref === "zh-Hant") return pref
  return browserLocale()
}

export function setLocale(pref: UiLocale | undefined) {
  active = resolveLocale(pref)
}

export function currentLocale(): ResolvedLocale {
  return active
}

export function t(key: MsgKey, vars?: Record<string, string | number>): string {
  let s = TABLES[active][key] ?? EN[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  }
  return s
}

export function translateTerm(term: string): string {
  if (term === "handle_farm" || term === "英文名+長數字") return t("term.handleFarm")
  if (term === "contact" || term === "聯絡方式") return t("term.contact")
  return term
}

export function applyDomI18n(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n as MsgKey | undefined
    if (key) el.textContent = t(key)
  })
  root.querySelectorAll<HTMLElement>("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder as MsgKey | undefined
    if (key && "placeholder" in el) (el as HTMLInputElement).placeholder = t(key)
  })
  root.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((el) => {
    const key = el.dataset.i18nTitle as MsgKey | undefined
    if (key) el.title = t(key)
  })
}
