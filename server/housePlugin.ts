import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import type { Connect, Plugin } from 'vite'
import { applyHouseOp, normalizeHouse, type HouseDb, type HouseOp } from '../src/data/houseDb'

/**
 * Один бюджет на все телефоны в этой сети.
 * Кука vmeste_scope держит отдельную память для автотестов, чтобы они не стирали data/house.json.
 */
export function housePlugin(): Plugin {
  const file = path.join(process.cwd(), 'data', 'house.json')
  const memory = new Map<string, HouseDb | null>()
  const queues = new Map<string, Promise<void>>()

  function scopeOf(req: IncomingMessage): string {
    const header = req.headers.cookie ?? ''
    const match = /(?:^|;\s*)vmeste_scope=([^;]+)/.exec(header)
    if (!match) return 'file'
    const value = decodeURIComponent(match[1]).trim()
    if (!/^[a-z0-9_-]{1,40}$/i.test(value)) return 'file'
    return value
  }

  function readFile(): HouseDb | null {
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as HouseDb
      if (parsed?.household?.id && Array.isArray(parsed.categories) && Array.isArray(parsed.expenses)) {
        return normalizeHouse(parsed)
      }
    } catch {
      // Файла ещё нет или он повреждён: бюджет создастся заново.
    }
    return null
  }

  function writeFile(db: HouseDb | null) {
    if (!db) {
      try {
        unlinkSync(file)
      } catch {
        // Уже удалён.
      }
      return
    }
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify(db))
  }

  function readStore(scope: string): HouseDb | null {
    if (scope === 'file') return readFile()
    return memory.get(scope) ?? null
  }

  function writeStore(scope: string, db: HouseDb | null) {
    if (scope === 'file') writeFile(db)
    else memory.set(scope, db)
  }

  function enqueue(scope: string, job: () => Promise<void>): Promise<void> {
    const previous = queues.get(scope) ?? Promise.resolve()
    const run = previous.then(job, job)
    queues.set(
      scope,
      run.then(
        () => undefined,
        () => undefined,
      ),
    )
    return run
  }

  function send(res: ServerResponse, status: number, body: unknown) {
    res.statusCode = status
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.setHeader('cache-control', 'no-store')
    res.end(JSON.stringify(body))
  }

  function readBody(req: IncomingMessage): Promise<HouseOp> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as HouseOp)
        } catch (error) {
          reject(error)
        }
      })
      req.on('error', reject)
    })
  }

  function attach(middlewares: Connect.Server) {
    middlewares.use((req, res, next) => {
      const pathname = (req.url || '').split('?')[0]
      if (pathname !== '/api/house') {
        next()
        return
      }
      const scope = scopeOf(req)
      void enqueue(scope, async () => {
        try {
          if (req.method === 'GET') {
            send(res, 200, { db: readStore(scope) })
            return
          }
          if (req.method === 'DELETE') {
            writeStore(scope, null)
            send(res, 200, { db: null })
            return
          }
          if (req.method === 'POST') {
            const body = await readBody(req)
            const nextDb = applyHouseOp(readStore(scope), body)
            writeStore(scope, nextDb)
            send(res, 200, { db: nextDb })
            return
          }
          send(res, 405, { error: 'Метод не поддерживается' })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Не получилось'
          if (!res.headersSent) send(res, 400, { error: message })
        }
      })
    })
  }

  return {
    name: 'vmeste-house',
    configureServer(server) {
      attach(server.middlewares)
    },
    configurePreviewServer(server) {
      attach(server.middlewares)
    },
  }
}
