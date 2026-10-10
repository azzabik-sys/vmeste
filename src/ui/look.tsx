import { createContext, useContext, useState, type ReactNode } from 'react'

export type Look = 'new' | 'classic'
const KEY = 'vmeste.look'

export function readLook(): Look {
  try {
    return localStorage.getItem(KEY) === 'classic' ? 'classic' : 'new'
  } catch {
    return 'new'
  }
}

function applyLook(look: Look) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.look = look
}

applyLook(readLook())

const LookContext = createContext<{ look: Look; setLook: (look: Look) => void }>({
  look: 'new',
  setLook: () => {},
})

export function LookProvider({ children }: { children: ReactNode }) {
  const [look, setLookState] = useState<Look>(readLook)

  function setLook(next: Look) {
    setLookState(next)
    applyLook(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Приватный режим может запретить запись. Переключатель всё равно работает до закрытия вкладки.
    }
  }

  return <LookContext.Provider value={{ look, setLook }}>{children}</LookContext.Provider>
}

export function useLook() {
  return useContext(LookContext)
}
