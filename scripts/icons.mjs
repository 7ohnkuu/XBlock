import { deflateSync } from "node:zlib"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const dir = join(dirname(fileURLToPath(import.meta.url)), "../src/icons")
mkdirSync(dir, { recursive: true })

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}

function png(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paint(x, y, size)
      const i = row + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

function icon(x, y, s) {
  const ink = [20, 16, 10, 255]
  const amber = [212, 146, 42, 255]
  const paper = [241, 230, 212, 255]
  const nx = (x + 0.5) / s
  const ny = (y + 0.5) / s
  const m = 0.12
  if (nx < m || ny < m || nx > 1 - m || ny > 1 - m) return ink
  // two grease-pencil strokes making an X, plus a baseline
  const inStroke = (d) => Math.abs(d) < 0.07
  const d1 = nx - ny
  const d2 = nx + ny - 1
  if (inStroke(d1) || inStroke(d2)) return amber
  if (ny > 0.78 && ny < 0.86 && nx > 0.22 && nx < 0.78) return amber
  return paper
}

for (const s of [16, 48, 128]) {
  writeFileSync(join(dir, `${s}.png`), png(s, icon))
}
console.log("wrote icons")
