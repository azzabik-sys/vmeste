import { deflateSync, crc32 } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const name = Buffer.from(type)
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])) >>> 0)
  return Buffer.concat([length, name, data, checksum])
}

function png(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = paint(x, y, size)
      const index = row + 1 + x * 4
      raw[index] = r
      raw[index + 1] = g
      raw[index + 2] = b
      raw[index + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function pngRgb(size, paint) {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 3 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = paint(x, y, size)
      const index = row + 1 + x * 3
      raw[index] = r
      raw[index + 1] = g
      raw[index + 2] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function paint(x, y, size) {
  const nx = (x + 0.5) / size
  const ny = (y + 0.5) / size
  const inset = 0.08
  const radius = 0.2
  const left = inset
  const right = 1 - inset
  const top = inset
  const bottom = 1 - inset
  const inside =
    nx >= left &&
    nx <= right &&
    ny >= top &&
    ny <= bottom &&
    corner(nx, ny, left, right, top, bottom, radius)
  if (!inside) return [246, 240, 230, 255]
  let color = [34, 28, 22]
  const heads = [
    [0.38, 0.4, 0.075],
    [0.62, 0.4, 0.075],
  ]
  for (const [cx, cy, rad] of heads) {
    if (Math.hypot(nx - cx, ny - cy) <= rad) color = [246, 240, 230]
  }
  const shoulder = ((nx - 0.5) / 0.28) ** 2 + ((ny - 0.68) / 0.16) ** 2
  if (shoulder <= 1 && ny > 0.52) color = [246, 240, 230]
  return [...color, 255]
}

function corner(nx, ny, left, right, top, bottom, radius) {
  const cx = nx < left + radius ? left + radius : nx > right - radius ? right - radius : nx
  const cy = ny < top + radius ? top + radius : ny > bottom - radius ? bottom - radius : ny
  return Math.hypot(nx - cx, ny - cy) <= radius
}

function paintStore(x, y, size) {
  const nx = (x + 0.5) / size
  const ny = (y + 0.5) / size
  let color = [25, 24, 21]
  const heads = [
    [0.38, 0.4, 0.092],
    [0.62, 0.4, 0.092],
  ]
  for (const [cx, cy, rad] of heads) {
    if (Math.hypot(nx - cx, ny - cy) <= rad) color = [250, 249, 246]
  }
  const shoulder = ((nx - 0.5) / 0.34) ** 2 + ((ny - 0.7) / 0.2) ** 2
  if (shoulder <= 1 && ny > 0.52) color = [250, 249, 246]
  return color
}

for (const size of [180, 192, 512]) {
  writeFileSync(new URL(`../public/icon-${size}.png`, import.meta.url), png(size, paint))
}

mkdirSync(new URL('../store/', import.meta.url), { recursive: true })
writeFileSync(new URL('../store/icon-1024.png', import.meta.url), pngRgb(1024, paintStore))
