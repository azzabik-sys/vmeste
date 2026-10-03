const JOIN_KEY = 'vmeste.join'

export function rememberJoinCode(code: string) {
  sessionStorage.setItem(JOIN_KEY, code.trim().toUpperCase())
}

export function readJoinCode(): string | null {
  const value = sessionStorage.getItem(JOIN_KEY)
  return value || null
}

export function clearJoinCode() {
  sessionStorage.removeItem(JOIN_KEY)
}
