const ACTIVE_KEY = 'vmeste.household'

export function readActiveHousehold(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

export function writeActiveHousehold(id: string) {
  try {
    localStorage.setItem(ACTIVE_KEY, id)
  } catch {
    // Телефон мог запретить хранилище. Бюджет всё равно откроется на этот заход.
  }
}

export function clearActiveHousehold() {
  try {
    localStorage.removeItem(ACTIVE_KEY)
  } catch {
    // Нечего чистить.
  }
}
