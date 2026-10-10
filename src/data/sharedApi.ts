import type { BudgetApi } from './api'
import type { HouseDb, HouseOp } from './houseDb'
import { clearLocalHouse, readLocalHouse } from './localApi'
import type { Snapshot } from './types'
import { pinWho, readWho } from './who'

async function request(method: string, body?: HouseOp): Promise<HouseDb | null> {
  const response = await fetch('/api/house', {
    method,
    cache: 'no-store',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = (await response.json().catch(() => null)) as { db?: HouseDb | null; error?: string } | null
  if (!response.ok) throw new Error(payload?.error || 'Не получилось')
  return payload?.db ?? null
}

function ready(db: HouseDb, userId: string): Snapshot {
  return {
    status: 'ready',
    mode: 'local',
    email: null,
    userId,
    household: db.household,
    households: [
      {
        id: db.household.id,
        name: db.household.name,
        role: db.members.find((member) => member.userId === userId)?.role ?? 'member',
      },
    ],
    members: db.members,
    categories: db.categories,
    expenses: db.expenses,
  }
}

export function createSharedApi(): BudgetApi {
  return {
    mode: 'local',
    async load(): Promise<Snapshot> {
      let db = await request('GET')
      const local = readLocalHouse()
      if (!db && local) db = await request('POST', { op: 'migrate', db: local })
      if (db && local) {
        const owner = local.members.find((member) => member.role === 'owner') ?? local.members[0]
        const ownerOnServer = Boolean(owner && db.members.some((member) => member.userId === owner.userId))
        // Чужой бюджет на сервере не стирает копию с этого телефона.
        if (owner && ownerOnServer) {
          pinWho(owner.userId, owner.displayName)
          clearLocalHouse()
        }
      }
      const who = readWho()
      if (!db) return { status: 'onboarding', mode: 'local', email: null, userId: who.id, pendingCode: null }
      if (!db.members.some((member) => member.userId === who.id)) {
        return {
          status: 'needs_household',
          mode: 'local',
          email: null,
          userId: who.id,
          pendingCode: null,
          householdName: db.household.name,
        }
      }
      return ready(db, who.id)
    },
    subscribe() {
      return () => {}
    },
    async signIn() {
      throw new Error('Общий вход включается после подключения Supabase.')
    },
    async signInWithProvider() {
      throw new Error('Общий вход включается после подключения Supabase.')
    },
    async signUp() {
      throw new Error('Общий вход включается после подключения Supabase.')
    },
    async requestPasswordReset() {
      throw new Error('Новый пароль включается на общем сайте.')
    },
    async confirmPasswordReset() {
      throw new Error('Новый пароль включается на общем сайте.')
    },
    async signOut() {},
    async deleteAccount() {
      throw new Error('Удаление аккаунта включается на общем сайте.')
    },
    async createHousehold(input) {
      const who = readWho()
      const displayName = input.displayName.trim()
      await request('POST', { op: 'create', userId: who.id, input: { ...input, displayName }, shared: true })
      pinWho(who.id, displayName)
    },
    async joinHousehold(_code, displayName) {
      const who = readWho()
      const name = displayName.trim()
      if (!name) throw new Error('Введите имя')
      await request('POST', { op: 'join', userId: who.id, displayName: name })
      pinWho(who.id, name)
    },
    async leaveHousehold() {},
    async deleteBudget() {
      await request('DELETE')
    },
    async removeMember(_householdId, memberId) {
      await request('POST', { op: 'removeMember', userId: readWho().id, memberId })
    },
    async updateHouseholdName(householdId, name) {
      await request('POST', { op: 'updateSettings', userId: readWho().id, householdId, patch: { name } })
    },
    async updateHouseholdSettings(householdId, patch) {
      await request('POST', { op: 'updateSettings', userId: readWho().id, householdId, patch })
    },
    async updateDisplayName(name) {
      const who = readWho()
      await request('POST', { op: 'updateDisplayName', userId: who.id, name })
      pinWho(who.id, name.trim())
    },
    async addCategory(householdId, input) {
      await request('POST', { op: 'addCategory', userId: readWho().id, householdId, input })
    },
    async updateCategory(id, patch) {
      await request('POST', { op: 'updateCategory', userId: readWho().id, id, patch })
    },
    async reorderCategories(householdId, ids, kinds) {
      await request('POST', { op: 'reorder', userId: readWho().id, householdId, ids, kinds })
    },
    async deleteCategory(id) {
      await request('POST', { op: 'deleteCategory', userId: readWho().id, id })
    },
    async saveExpense(expense) {
      await request('POST', { op: 'saveExpense', userId: readWho().id, expense })
    },
    async removeExpense(id) {
      await request('POST', { op: 'removeExpense', userId: readWho().id, id })
    },
  }
}
