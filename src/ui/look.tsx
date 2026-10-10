import { createContext, useContext, useState, type ReactNode } from 'react'

export type Look = 'new' | 'classic' | 'card'
const KEY = 'vmeste.look'
const CARD_DEFAULT = 'vmeste.lookCardDefault'

function isLook(value: string | null): value is Look {
  return value === 'new' || value === 'classic' || value === 'card'
}

export function readLook(): Look {
  try {
    // Раньше по умолчанию открывался новый экран, и выбор уже мог сохраниться.
    // Один раз переводим на карточку: это теперь основной вид.
    if (localStorage.getItem(CARD_DEFAULT) !== '1') {
      localStorage.setItem(KEY, 'card')
      localStorage.setItem(CARD_DEFAULT, '1')
      return 'card'
    }
    const saved = localStorage.getItem(KEY)
    return isLook(saved) ? saved : 'card'
  } catch {
    return 'card'
  }
}

function applyLook(look: Look) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.look = look
}

applyLook(readLook())

const LookContext = createContext<{ look: Look; setLook: (look: Look) => void }>({
  look: 'card',
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
