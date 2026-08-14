# XBlock 設計方案

狀態：共同理解已確認（2026-08-14）  
形態：Manifest V3 Chrome 擴充功能，按 Chrome Web Store 標準工程化，**v1 自用 / 未列出安裝**  
單一用途：在 X 單帖評論區識別商業引流、複製農場、色情/詐騙機器人，先隱藏，再輔助你用官方對話框拉黑。

本文是實作契約，不是意向書。與本文衝突的實作視為缺陷。

---

## 1. 問題與成功標準

中文熱帖評論區被引流、複製農場、色情/詐騙號刷屏。現成工具要嘛是名單炮，要嘛是關鍵詞一刀切，沒有「本帖先可讀 → 短審核 → 你親自按原生封鎖」的閉環。

一條熱帖用完 10 分鐘後：

| 層 | 必須成立 |
|---|---|
| 當場可讀 | 命中規則的帳號在本帖評論流裡消失；真人討論連續可讀 |
| 持久防禦 | 你按完原生封鎖的號，之後由 X 帳號級 Block 生效 |
| 未封完 | 已在托盤確認、尚未按完封鎖的號：本帖繼續藏；之後任何單帖頁只要在 DOM 見到該號，即使這句是「你好」，也整號藏本帖（D2） |
| 誤傷可逆 | 「這是真人」後永久不再自動藏、不再進托盤（選項頁可撤） |

**審核預算：** 每帖約 20–40 秒勾選 5–15 個。這段時間**只審核**。封鎖是可中斷的第二段。

---

## 2. 明確不做（v1）

- 首頁時間線、通知、搜尋、書籤、社群頁、訊息的識別或隱藏
- 政治 / 輿論水軍的主題分類
- 自動拉黑、自動檢舉、檢舉捷徑
- 打開 X「顯示可能反感的回覆」
- 請求個人主頁或 X 內部 GraphQL / REST 做 enrichment
- 雲端推理、遠端規則、社區黑名單訂閱、任何把評論或名單傳到伺服器的行為
- 多 X 帳號分庫（v1 假設單一已登入帳號）
- 代發 `blocks/create` 或同等內部接口

碎了就停。寧可漏，不可替用戶寫入。

---

## 3. 產品形狀

### 3.1 作用頁面

內容腳本**只**匹配：

- `https://x.com/:user/status/:id`
- `https://x.com/i/status/:id`
- `https://x.com/:user/status/:id/*`（照片、引用展開等仍屬該帖）
- 對等的 `https://twitter.com/...`

不匹配 `/home`、`/notifications`、`/search`、`/i/timeline`、`/messages` 等。

### 3.2 兩層決策

```
評論進入 DOM
    │
    ├─ 豁免名單？ → 忽略
    ├─ 已封鎖鏡像 或 待封鎖確認？ → 本帖整號隱藏（不進「建議」也可進「待完成」）
    ├─ 規則 1/2 命中（引流 / 色情詐騙）？ → 本帖整號隱藏
    │         └─ 近重複且（已命中 1/2 或含連結/聯絡）→ 同樣隱藏
    └─ 僅跨帖統計命中？ → 不自動藏，只進托盤
```

純短句、純情緒、政治話術、沒命中 1/2 的複製：**不處理**。

### 3.3 畫面原則

- 隱藏 = 從評論流**拿掉佔位**（視覺與佈局都消失），不是摺疊灰條。
- 對話欄頂部一條狀態：`已隱藏 N 條可疑評論`，動作：`暫時顯示全部`（開關，離開此帖重置）、`打開托盤`。
- 托盤：行內標記 + 底部/側邊面板，不跳到選項頁完成主路徑。
- 預設不離開這條帖完成封鎖。

---

## 4. 資訊架構

### 4.1 三個表面

| 表面 | 何時出現 | 職責 |
|---|---|---|
| 評論流 | 單帖頁 | 隱藏；「暫時顯示」後顯示行內動作 |
| 托盤 | 本帖有隱藏或建議時 | 審核、豁免、開始/停止封鎖隊列 |
| 選項頁 | 用戶主動打開 | 詞庫、名單、開關、導入導出、撤銷豁免 |

### 4.2 托盤結構

```
┌─ XBlock ─────────────────────────────────────┐
│ 本帖已藏 36 條 · 建議拉黑 11 · 待完成封鎖 4    │
│                                              │
│ 建議拉黑（預設勾選，最多 15）                  │
│  ☑ @foo   跨帖 · 微信          [真人]        │
│  ☑ @bar   t.me · 本帖複製                   │
│  ☐ @baz   僅跨帖指紋                        │
│                                              │
│ 待完成封鎖（已確認、尚未按完原生封鎖）          │
│  @old1  @old2  …                             │
│                                              │
│ [開始封鎖 11]  [將勾選標為真人]  [全不選]      │
│ 封鎖中：3/11  @handle    [停止]               │
└──────────────────────────────────────────────┘
```

排序（建議列）：待完成續跑 > 跨帖 + 規則疊加 > 引流+色情同時命中 > 單一規則。預設勾選前 15 個。

「開始封鎖」只處理**當前勾選**。勾選確認的那一刻寫入待封鎖名單（D2 從此生效）。

### 4.3 選項頁

1. **開關：** 引流、色情詐騙、跨帖建議、慢速展開更多回覆  
2. **封控詞庫：** 分類（引流 / 色情詐騙 / 自訂）增刪、搜尋、重置為種子（確認）  
3. **名單：** 待封鎖、已封鎖鏡像、真人豁免；單條刪除  
4. **導入 / 導出：** 見第 8 節  
5. **關於：** 單一用途說明、資料不出機、X 灰區風險一段話

### 4.4 行內（僅「暫時顯示全部」之後）

每條被標過的評論：`可疑 · 原因`，按鈕 `這是真人` / `加入待封鎖`。

---

## 5. 規則引擎

本機、可解釋、可關。不做模型。

### 5.1 文本正規化

比對前：

1. Unicode NFKC  
2. 去零寬字元、常見替換字（微 信、v x、ｔｇ）  
3. 繁體 → 簡體（內建小對照表，只求關鍵字等價，不求全文翻譯品質）  
4. URL 小寫；全形標點 → 半形  

詞庫條目同樣走 1–3 再存一份 `normalized`，避免只寫簡體漏繁體。

### 5.2 分類與命中

**引流（自動藏）**  
種子含（示例，實作以 `src/rules/seeds.ts` 為準）：  
微信、v信、vx、加微、加v、威信、電報、飞机、飛機、tg、telegram、`t.me/`、qq、扣扣、只粉、刷单、刷單、兼职、兼職、招生、加群。  
模式：`t.me/username`、`加` + `v/微/q` + 可選數字、明顯微信號形狀。

**色情/詐騙（自動藏）**  
裸聊、约炮、約炮、色粉、福利姬、看片、色情短鏈域名表、加好友看資源等。域名表獨立，可在選項編輯。

**本帖近重複（自動藏，有閘）**  
同一 `conversationId` 內，正規化後完全相同，或 Jaccard(字 bi-gram) ≥ 0.9，且長度 ≥ 8。  
**僅當**該文本已命中引流/色情，或抽出了 URL / 聯絡模式。  
「確實」「笑死」「來了」進不了這扇閘。

**跨帖（只進托盤）**  
本機 30 天：

- 同一 `userId` 在 ≥2 個 `conversationId` 命中過自動藏規則；或  
- 同一文本指紋出現在 ≥2 個 `conversationId`（指紋只在過閘的文本上建立）

跨帖分類總開關關閉時：不寫建議、仍可自動藏本帖 1/2/3。

### 5.3 隱藏單位

一次高置信命中 → **該 `userId` 在本帖所有回覆單元隱藏**（含之後才載入的樓中樓）。  
不是只藏那一句。

技術約束：X 是 React SPA。**禁止從 DOM 卸下節點**。用內容腳本在該單元根節點加 `data-xblock-hide="1"`，注入樣式：

```css
[data-xblock-hide="1"] { display: none !important; }
[data-xblock-reveal="1"] [data-xblock-hide="1"] { display: revert !important; }
```

「暫時顯示全部」打在對話欄容器上 `data-xblock-reveal`。

### 5.4 慢速展開

開關默認開。僅點用戶本來就看得到的「顯示更多回覆 / Show more replies」，**不點**「可能包含冒犯內容」。

- 兩次點擊間隔 800–2000ms 隨機  
- 單帖最多 8 次  
- 標籤頁隱藏時暫停  
- 用戶滾動優先，不搶焦點

---

## 6. 封鎖隊列

### 6.1 契約

擴充功能**只負責打開原生 UI**。最後一下「Block / 封鎖」必須是用戶指針事件。  
禁止 `fetch` / XHR / GraphQL 寫入封鎖。

### 6.2 流程

1. 用戶在托盤按「開始封鎖」。勾選項寫入 `pendingBlock`。  
2. 取隊列頭。若該號單元已被藏：暫時對**一條**源評論設 `data-xblock-queue="1"`（可見、滾進視口），以便點 Extra 選單。  
3. 點該單元 `More / 更多` → 等選單入口 `Block @handle` → 點擊 → **停住，等用戶點確認模態**。  
4. 成功訊號（任一）：模態關閉且選單項變 Unblock、該用戶推文被客戶端移除、或 15s 內出現封鎖確認文案。失敗 / 超時 / 選不到節點：該號標 `needsManual`，**停止自動點選單**，托盤提示「X 改版或風控，請自行封鎖或跳過」。  
5. 成功則寫入 `blockedMirror`，移出 `pendingBlock`，下一號。  
6. 「停止」：凍結索引，已確認未完成的留在 `pendingBlock`（D2 仍生效）。

並發 = 1。不做節奏性代點確認鍵。

### 6.3 失敗原則

選單結構不認得 → 停隊列，不降級成內部 API。  
這是刻意的產品決策，不是技術債。

---

## 7. 資料模型

全部 `chrome.storage.local`。無 sync（避免把黑名單打到 Google 帳號同步平面，除非以後單獨立項）。v1 單一邏輯用戶。

```ts
type StorageRoot = {
  schemaVersion: 1
  settings: {
    enableDrain: boolean
    enableScamAdult: boolean
    enableCrossTweet: boolean
    enableSlowExpand: boolean
    maxTray: 15
    maxShowMoreClicks: 8
  }
  wordlists: {
    drain: Word[]
    scamAdult: Word[]
    custom: Word[]
    domains: Word[]          // 詐騙/引流域名
  }
  lists: {
    exempt: Record<UserId, ListEntry>     // 真人
    pendingBlock: Record<UserId, PendingEntry>
    blockedMirror: Record<UserId, ListEntry>
  }
  stats: {
    fingerprints: Record<Fingerprint, FingerprintHit>
    userHits: Record<UserId, UserHit>
  }
}

type Word = { raw: string; normalized: string; addedAt: number; source: "seed" | "user" }
type ListEntry = { userId: string; handle: string; displayName?: string; updatedAt: number }
type PendingEntry = ListEntry & {
  reasons: Reason[]
  sourceConversationId: string
  addedAt: number
}
type Reason = "drain" | "scam_adult" | "dup_in_thread" | "cross_tweet" | "manual"
```

衝突優先級：`exempt` > `blockedMirror` > `pendingBlock`。  
導入或手動把號標成真人時，必須從另外兩張表刪除。

指紋與 `userHits` 30 天淘汰，不進預設導出檔。

---

## 8. 導入 / 導出（v1 一等能力）

只接受**本機檔案**。不做 URL 訂閱、不做「從某人的雲端名單更新」。個人備份與換機，不是社區黑名單產品。

### 8.1 兩種主要檔、一種完整備份

| 檔 | `kind` | 內容 |
|---|---|---|
| 封控詞庫 | `xblock-wordlist` | 分類詞 + 域名 |
| 名單 | `xblock-lists` | `pendingBlock` + `blockedMirror` + `exempt` |
| 完整備份 | `xblock-backup` | 上述 + `settings`；**預設不含** `stats` |

檔名建議：`xblock-wordlist-YYYYMMDD.json`、`xblock-lists-YYYYMMDD.json`。

### 8.2 詞庫 JSON

```json
{
  "kind": "xblock-wordlist",
  "schemaVersion": 1,
  "exportedAt": "2026-08-14T00:00:00.000Z",
  "wordlists": {
    "drain": ["微信", "v信", "t.me"],
    "scamAdult": ["裸聊"],
    "custom": [],
    "domains": ["example-spam.test"]
  }
}
```

另支援 **UTF-8 純文字**：一行一詞。可選前綴 `drain:` / `scam:` / `custom:` / `domain:`。無前綴導入到「自訂」。

### 8.3 名單 JSON

```json
{
  "kind": "xblock-lists",
  "schemaVersion": 1,
  "exportedAt": "2026-08-14T00:00:00.000Z",
  "lists": {
    "pendingBlock": [
      { "userId": "123", "handle": "foo", "reasons": ["drain"], "addedAt": 0 }
    ],
    "blockedMirror": [
      { "userId": "456", "handle": "bar", "updatedAt": 0 }
    ],
    "exempt": [
      { "userId": "789", "handle": "human", "updatedAt": 0 }
    ]
  }
}
```

`userId` 優先。只有 handle、沒有 id 的列：標為 `unresolved`，在之後評論區見到該 handle 再綁定 id，**在此之前不隱藏**（避免錯 handle）。

### 8.4 導入策略（選項頁必選，默認合併）

| 策略 | 行為 |
|---|---|
| 合併（默認） | 聯集。同 id 時 `exempt` 勝出。用戶自增詞保留，種子重複跳過 |
| 僅補缺 | 只加入本地沒有的詞 / 號 |
| 覆蓋此類 | 該檔包含的分類或名單整表替換；未出現的表不動 |

覆蓋前二次確認。導入**不會**觸發封鎖隊列，不會替你按封鎖。  
`pendingBlock` 導入後 D2 立即生效：之後單帖見到該號就藏。

導出在選項頁用 `Blob` + 本機下載。導入用 `<input type="file" accept=".json,.txt">`。解析失敗整檔拒絕並報第一個錯誤行，不做一半。

校驗：`kind` + `schemaVersion`；未知欄位忽略；單檔詞條上限 5_000、名單上限 20_000，超出拒絕。

---

## 9. 擴充功能架構

```
src/
  manifest.json
  background/sw.ts          # 存儲、導入導出校驗、訊息匯流
  content/
    boot.ts                 # 路由：是否單帖頁
    observe.ts              # MutationObserver + 虛擬列表滾動
    extract.ts              # 從 data-testid 抽 userId/handle/text/urls
    classify.ts             # 純函數，可單測
    hide.ts
    tray.ts                 # Shadow DOM
    blockQueue.ts           # 只點選單，不發 API
    expand.ts               # 慢速更多回覆
  options/
    index.html
    lists.ts
    wordlists.ts
    io.ts                   # 導入導出
  rules/
    seeds.ts
    normalize.ts            # 含繁簡小表
  shared/
    types.ts
    schema.ts
    messages.ts
```

**Shadow DOM** 承載托盤與頂欄，避免被 X 樣式打穿，也減少誤傷 X 自己的節點。

### 9.1 Manifest（最小權限）

```json
{
  "manifest_version": 3,
  "name": "XBlock",
  "version": "0.1.0",
  "permissions": ["storage"],
  "host_permissions": ["https://x.com/*", "https://twitter.com/*"],
  "background": { "service_worker": "background/sw.js" },
  "options_ui": { "page": "options/index.html", "open_in_tab": true },
  "content_scripts": [{
    "matches": [
      "https://x.com/*",
      "https://twitter.com/*"
    ],
    "js": ["content/boot.js"],
    "run_at": "document_idle"
  }]
}
```

`boot.ts` 用路徑守衛，非單帖頁立即 return。  
不要 `tabs`、不要 `<all_urls>`、不要 `webRequest`、不要遠端腳本。  
全部邏輯在送審包內。詞庫更新 = 用戶導入或裝新版，v1 不拉遠端配置。

內容腳本只在已登入用戶自己打開的頁面讀 **已經渲染的** 評論 DOM。不繞過登入牆。

### 9.2 訊息

| 方向 | 用途 |
|---|---|
| content → sw | 寫入 pending / exempt / blocked、讀取名單快取 |
| options → sw | 導入校驗、寫入、導出序列化 |
| sw → content | 名單變更，請重跑本帖 |

`classify.ts` 必須是純函數：`(comment, ctx) → Decision`，單元測試覆蓋閘門（短句不藏、繁簡、重複無閘不藏、D2）。

---

## 10. 選擇器策略

X 的 `data-testid` 會變。抽取層隔離：

| 邏輯名 | 初值（實作時對現網校對） |
|---|---|
| 對話欄 | `[data-testid="primaryColumn"]` |
| 單條 | `article[data-testid="tweet"]` |
| 使用者名 | `[data-testid="User-Name"] a[href^="/"]` |
| 正文 | `[data-testid="tweetText"]` |
| 更多 | `[data-testid="caret"]` |
| 更多回覆 | 文案匹配 / 角色按鈕 |

選擇器集中放 `extract.ts`。匹配失敗打結構化日誌（本機，默認關），托盤顯示「此頁無法解析評論」。禁止滿頁亂掃 `innerText`。

---

## 11. Chrome Web Store 對齊（即使 v1 不上架）

| 政策 | 做法 |
|---|---|
| 單一用途 | 文案與 UI 只談「X 帖子評論區的垃圾帳號隱藏與輔助封鎖」 |
| 替用戶發訊 | 不發文、不 DM、不舉報；封鎖確認是用戶按的 |
| 遠端代碼 | 無 |
| Limited Use | 評論與 userId 只在本機；導入導出是用戶發起的本機檔 |
| 最小權限 | 見 9.1 |
| 不冒充 X | 名稱、圖示、文案禁止官方、認證、盾牌仿冒 |
| 可讀 | 不混淆；壓縮僅 minify |

以後若上架：隱私權政策必須寫清「讀取你打開的帖子評論、在本機比對詞庫、可把名單/詞庫下載到你的磁碟」。截圖避免未分級的色情樣本特寫。

---

## 12. 風險

| 風險 | 緩解 |
|---|---|
| X 自動化規則：腳本化網站可停權 | 不代發封鎖；展開回覆有上限；失敗即停 |
| 原生選單改版 | 隊列安全失敗；隱藏與詞庫仍可用 |
| React 虛擬列表卸載節點 | Observer + 滾動時重套用 hide |
| 誤傷真人 | 閘門 + 豁免 + 暫時顯示；自動層不用跨帖藏 |
| 導入他人名單變成地下黑名單網 | 只接受本機檔；無訂閱；文案寫明「這是你的備份」 |
| 選擇器誤藏非評論 | 只處理 `article[data-testid="tweet"]` 且位於主帖下方 |

---

## 13. v1 切片

按依賴順序，每一刀都可單獨用手驗證。

| 切片 | 交付 | 驗證 |
|---|---|---|
| P0 骨架 | MV3、路徑守衛、空托盤掛上單帖頁 | 只在 status 頁出現，home 不出現 |
| P1 抽取 + 隱藏 | 讀 DOM、規則 1/2、整號 `display:none`、頂欄 N 與暫時顯示 | 含「微信」的號整樓消失；「確實」×10 仍在 |
| P2 詞庫與開關 | 種子、繁簡、選項頁增刪、分類開關 | 關引流後微信不再藏 |
| P3 近重複閘 + 跨帖 | 指紋 30 天、托盤建議 | 無連結的短句重複不藏；換帖同垃圾號進托盤 |
| P4 名單與 D2 | exempt / pending / blockedMirror | 確認待封後，下一帖該號說「你好」也整號藏 |
| P5 導入導出 | 詞庫 JSON/TXT、名單 JSON、合併/補缺/覆蓋 | 匯出再匯入冪等；壞檔整份拒絕 |
| P6 封鎖隊列 | 打開原生選單 + 等用戶確認 + 停止 | 斷網或改選擇器時停，不發 API |
| P7 慢速展開 | 最多 8 次更多回覆 | 不點「冒犯回覆」；切走暫停 |

P1 就能改善閱讀。P6 最脆，刻意放後面：前五刀在選單爛掉時仍有價值。

---

## 14. 已鎖定決策（索引）

| ID | 決策 |
|---|---|
| Q1 | 當場藏 + 確認後拉黑 |
| Q2 | 只打引流、複製農場、色情/詐騙 |
| Q3/Q10 | 先藏；拉黑用原生對話框；不自動檢舉 |
| Q4 | 商店標準、先自用 |
| Q5/Q15 | 高置信自動藏；跨帖只進托盤；短句無閘不藏 |
| Q6 | 同一評論區閉環，不是名單炮 |
| Q7/Q18 | DOM + 慢速更多回覆；不點冒犯層；不 enrichment |
| Q8 | 規則 + 本機跨帖統計 |
| Q9/Q14 | 行內 + 托盤；藏掉不留佔位 |
| Q11 | 僅單帖；簡繁同等 |
| Q12 | 20–40 秒審核 5–15 個；單一 X 帳號 |
| Q13 | 審核與封鎖兩段；隊列可停；未完成繼續藏 |
| Q16 | 自動層：本帖按帳號藏 |
| D2 | 已確認待封：後續帖見到就整號藏 |
| Q17 | 豁免永久；指紋 30 天；v1 可編詞庫 |
| 補條 | 黑名單（含待封/已封/豁免）與封控詞庫支持本機導入導出 |

---

確認本文與共同理解一致後即可按第 13 節開切。預設從 P0 開始寫代碼。
