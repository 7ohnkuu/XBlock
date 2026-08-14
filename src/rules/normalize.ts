/**
 * Focused traditional→simplified map for comment spam matching.
 * Parallel strings, same index. Not a general translator.
 */
const T =
  "電報飛機約砲單業團關歡網聯係麼為這個來時會說對發長門開與從們學國後過還當經於裡裏並點擊領見視頻黃義資訊論議請謝幣錢號碼職賺賭賣買貨務兒爾媽婦麗態戀愛養樂興頭顏顯隱隨際邊達遠遠選適戶廠廣應廳庫盤內專帶師幫權標樓檔檢瀏覽繫線頁託語認證賬餘額負責勝獲獎勵紅綠聲聽讀寫掃描攝錄傳遞遊戲戰鬥殺殘儘無爲衹隻纔迴複復衝準確實將徵彆週鬆乾幹穀髮齣醜範傢鐘鍾錶僱"
const S =
  "电报飞机约炮单业团关欢网联系么为这个来时会说对发长门开与从们学国后过还当经于里里并点击领见视频黄义资讯论议请谢币钱号码职赚赌卖买货务儿尔妈妇丽态恋爱养乐兴头颜显隐随际边达远远选适户厂广应厅库盘内专带师帮权标楼档检浏览系线页托语认证账余额负责胜获奖励红绿声听读写扫描摄录传递游戏战斗杀残尽无为只只才回复复冲准确实将征别周松干干谷发出丑范家钟钟表雇"

const T2S: Record<string, string> = {}
for (let i = 0; i < T.length; i++) {
  const tc = T[i]
  if (T2S[tc] === undefined) T2S[tc] = S[i] ?? tc
}

function toSimplifiedChar(ch: string): string {
  return T2S[ch] ?? ch
}

const ZERO_WIDTH = /[\u200b\u200c\u200d\u200e\u200f\u2060\ufeff\u00ad\u180e]/g

function fullwidthToHalf(s: string): string {
  let out = ""
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0
    if (c === 0x3000) {
      out += " "
    } else if (c >= 0xff01 && c <= 0xff5e) {
      out += String.fromCodePoint(c - 0xfee0)
    } else {
      out += ch
    }
  }
  return out
}

function squeezeCjkSpaces(s: string): string {
  let prev = ""
  let cur = s
  while (cur !== prev) {
    prev = cur
    cur = cur.replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, "$1$2")
  }
  return cur
}

/** Normalize comment text or a wordlist entry for matching. */
export function normalizeText(input: string): string {
  let s = input.normalize("NFKC")
  s = s.replace(ZERO_WIDTH, "")
  s = fullwidthToHalf(s)
  s = s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  let mapped = ""
  for (const ch of s) mapped += toSimplifiedChar(ch)
  s = mapped
  s = s.toLowerCase()
  s = squeezeCjkSpaces(s)
  s = s.replace(/[v]\s*[x]/g, "vx")
  s = s.replace(/w\s*x/g, "wx")
  s = s.replace(/t\s*\.?\s*g(?![a-z])/g, "tg")
  s = s.replace(/t\s*\.\s*me/g, "t.me")
  s = s.replace(/\s+/g, " ").trim()
  return s
}

export function fingerprint(normalized: string): string {
  let h = 5381
  for (let i = 0; i < normalized.length; i++) {
    h = ((h << 5) + h) ^ normalized.charCodeAt(i)
  }
  return (h >>> 0).toString(16)
}

export function charBigrams(s: string): Set<string> {
  const set = new Set<string>()
  if (s.length <= 1) {
    if (s) set.add(s)
    return set
  }
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2))
  return set
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

export function extractUrlStrings(text: string, hrefs: string[] = []): string[] {
  const found = new Set<string>()
  for (const h of hrefs) {
    if (h) found.add(h)
  }
  const re = /\bhttps?:\/\/[^\s<>"']+/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) found.add(m[0])
  const te = /(?:^|\s)(t\.me\/[a-z0-9_+/.-]+)/gi
  while ((m = te.exec(text))) found.add(`https://t.me/${m[1].slice(5)}`)
  return [...found]
}

export function hostFromUrl(url: string): string | null {
  try {
    const withProto = /^[a-z]+:\/\//i.test(url) ? url : `https://${url}`
    return new URL(withProto).hostname.toLowerCase()
  } catch {
    return null
  }
}
