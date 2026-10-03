import { createId } from '../domain/id'

const KEY = 'vmeste.who'

export type Who = { id: string; name: string }

let memory: Who | null = null

function write(who: Who) {
  memory = who
  try {
    localStorage.setItem(KEY, JSON.stringify(who))
  } catch {
    // Имя живёт в памяти вкладки, если хранилище закрыто.
  }
}

export function readWho(): Who {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Who>
      if (parsed?.id) {
        memory = { id: String(parsed.id), name: typeof parsed.name === 'string' ? parsed.name : '' }
        return memory
      }
    }
  } catch {
    // Повреждённая запись не должна мешать входу.
  }
  if (memory) return memory
  memory = { id: createId(), name: '' }
  write(memory)
  return memory
}

/** Первый телефон остаётся тем же человеком, что и в старых расходах. */
export function pinWho(id: string, name: string) {
  write({ id, name })
}
