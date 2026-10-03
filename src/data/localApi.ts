import type { BudgetApi } from './api'
import {
  addCategory,
  createHouse,
  deleteCategory,
  normalizeHouse,
  removeExpense,
  reorderCategories,
  saveExpense,
  updateCategory,
  updateDisplayName,
  updateSettings,
  type HouseDb,
} from './houseDb'
import type { Snapshot } from './types'

const KEY = 'vmeste.v1'
const USER_ID = 'local-user'
let memory: HouseDb | null = null

function storageGet(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function storageSet(db: HouseDb) {
  memory = db
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    // Частный режим или запрет хранилища: бюджет живёт, пока открыта вкладка.
  }
}

function storageClear() {
  memory = null
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Нет доступа к хранилищу — достаточно стереть память вкладки.
  }
}

function read(): HouseDb | null {
  try {
    const raw = storageGet()
    if (raw) {
      const parsed = JSON.parse(raw) as HouseDb
      if (parsed?.household?.id && Array.isArray(parsed.categories) && Array.isArray(parsed.expenses)) {
        const db = normalizeHouse(parsed)
        memory = db
        return db
      }
    }
  } catch {
    // Повреждённая запись не должна ронять экран: остаётся память вкладки или онбординг.
  }
  if (memory?.household?.id) return normalizeHouse(memory)
  return null
}

/** Старый бюджет с этого телефона. Общий сервер забирает его один раз. */
export function readLocalHouse(): HouseDb | null {
  return read()
}

export function clearLocalHouse() {
  storageClear()
}

export function createLocalApi(): BudgetApi {
  const listeners = new Set<() => void>()

  function emit() {
    for (const listener of listeners) listener()
  }

  function mutate(change: (db: HouseDb) => void) {
    const db = read()
    if (!db) throw new Error('Бюджет ещё не создан')
    const next = structuredClone(db)
    change(next)
    storageSet(next)
    emit()
  }

  return {
    mode: 'local',
    async load(): Promise<Snapshot> {
      const db = read()
      if (!db) {
        return { status: 'onboarding', mode: 'local', email: null, userId: USER_ID, pendingCode: null }
      }
      return {
        status: 'ready',
        mode: 'local',
        email: null,
        userId: USER_ID,
        household: db.household,
        members: db.members,
        categories: db.categories,
        expenses: db.expenses,
      }
    },
    subscribe(onChange) {
      listeners.add(onChange)
      const onStorage = (event: StorageEvent) => {
        if (event.key === KEY) onChange()
      }
      window.addEventListener('storage', onStorage)
      return () => {
        listeners.delete(onChange)
        window.removeEventListener('storage', onStorage)
      }
    },
    async signIn() {
      throw new Error('Общий вход включается после подключения Supabase.')
    },
    async signUp() {
      throw new Error('Общий вход включается после подключения Supabase.')
    },
    async signOut() {},
    async createHousehold(input) {
      if (read()) throw new Error('Бюджет на этом телефоне уже есть.')
      storageSet(createHouse(input, USER_ID))
      emit()
    },
    async joinHousehold() {
      throw new Error('Приглашение заработает, когда подключим общий вход.')
    },
    async leaveHousehold() {},
    async deleteBudget() {
      storageClear()
      emit()
    },
    async updateHouseholdName(householdId, name) {
      mutate((db) => updateSettings(db, householdId, { name }))
    },
    async updateHouseholdSettings(householdId, patch) {
      mutate((db) => updateSettings(db, householdId, patch))
    },
    async updateDisplayName(name) {
      mutate((db) => updateDisplayName(db, USER_ID, name))
    },
    async addCategory(householdId, input) {
      mutate((db) => addCategory(db, householdId, input))
    },
    async updateCategory(id, patch) {
      mutate((db) => updateCategory(db, id, patch))
    },
    async reorderCategories(_householdId, ids) {
      mutate((db) => reorderCategories(db, ids))
    },
    async deleteCategory(id) {
      mutate((db) => deleteCategory(db, id))
    },
    async saveExpense(expense) {
      mutate((db) => saveExpense(db, expense))
    },
    async removeExpense(id) {
      mutate((db) => removeExpense(db, id))
    },
  }
}
