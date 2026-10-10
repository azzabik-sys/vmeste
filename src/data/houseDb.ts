import { iconForName } from '../domain/defaults'
import { createId } from '../domain/id'
import { isCurrency, sumRub } from '../domain/money'
import type {
  Category,
  CategoryKind,
  CreateHouseholdInput,
  CurrencyCode,
  Expense,
  Household,
  HouseholdSettingsPatch,
  Member,
  NewCategory,
} from './types'
export type HouseDb = {
  household: Household
  members: Member[]
  categories: Category[]
  expenses: Expense[]
}

export type CategoryPatch = {
  name?: string
  plannedAmount?: number
  kind?: CategoryKind
  icon?: string
}

export type HouseOp =
  | { op: 'create'; userId: string; input: CreateHouseholdInput; shared?: boolean }
  | { op: 'join'; userId: string; displayName: string }
  | { op: 'migrate'; db: HouseDb }
  | { op: 'updateSettings'; userId: string; householdId: string; patch: HouseholdSettingsPatch }
  | { op: 'updateDisplayName'; userId: string; name: string }
  | { op: 'addCategory'; userId: string; householdId: string; input: NewCategory }
  | { op: 'updateCategory'; userId: string; id: string; patch: CategoryPatch }
  | { op: 'reorder'; userId: string; householdId: string; ids: string[]; kinds?: CategoryKind[] }
  | { op: 'removeMember'; userId: string; memberId: string }
  | { op: 'deleteCategory'; userId: string; id: string }
  | { op: 'saveExpense'; userId: string; expense: Expense }
  | { op: 'removeExpense'; userId: string; id: string }

function asCurrency(value: unknown): CurrencyCode {
  const code = String(value || '')
  return isCurrency(code) ? code : 'RUB'
}

function asKind(value: unknown): CategoryKind {
  return value === 'fixed' ? 'fixed' : 'pace'
}

export function makeInviteCode(): string {
  return createId().replace(/-/g, '').slice(0, 6).toUpperCase()
}

/** Старый бюджет без валюты и иконок открывается как есть. Общий план здесь не меняется. */
export function normalizeHouse(db: HouseDb): HouseDb {
  const plans = Array.isArray(db.categories) ? db.categories.map((category) => Number(category.plannedAmount) || 0) : []
  const household = db.household
  household.currency = asCurrency(household.currency)
  household.paceEnabled = typeof household.paceEnabled === 'boolean' ? household.paceEnabled : true
  household.monthlyBudget =
    typeof household.monthlyBudget === 'number' && Number.isFinite(household.monthlyBudget)
      ? household.monthlyBudget
      : sumRub(plans)
  household.name = (household.name || 'Наш бюджет').slice(0, 60)
  household.inviteCode = household.inviteCode ?? ''

  db.categories = (db.categories ?? []).map((category, index) => ({
    ...category,
    name: category.name || 'Категория',
    plannedAmount: Number(category.plannedAmount) || 0,
    kind: asKind(category.kind),
    icon: category.icon || iconForName(category.name || ''),
    sortOrder: Number.isFinite(category.sortOrder) ? category.sortOrder : index,
  }))
  db.expenses = (db.expenses ?? []).map((expense) => ({
    ...expense,
    note: typeof expense.note === 'string' ? expense.note : '',
    createdBy: expense.createdBy || '',
  }))
  if (!Array.isArray(db.members) || db.members.length === 0) {
    db.members = [{ userId: 'local-user', householdId: household.id, role: 'owner', displayName: 'Я' }]
  }
  return db
}

/** Лимиты категорий стали больше общего плана — план поднимается. Снижение плана здесь не делается. */
export function raiseBudget(db: HouseDb) {
  const sum = sumRub(db.categories.map((category) => category.plannedAmount))
  if (Math.round(sum * 100) > Math.round(db.household.monthlyBudget * 100)) {
    db.household.monthlyBudget = sum
  }
}

export function createHouse(input: CreateHouseholdInput, userId: string, shared = false): HouseDb {
  const householdId = createId()
  const name = input.name.trim().slice(0, 60) || 'Наш бюджет'
  const displayName = input.displayName.trim().slice(0, 40) || 'Я'
  return {
    household: {
      id: householdId,
      name,
      inviteCode: shared ? makeInviteCode() : '',
      currency: input.currency,
      monthlyBudget: input.monthlyBudget,
      paceEnabled: input.paceEnabled,
    },
    members: [{ userId, householdId, role: 'owner', displayName }],
    categories: input.categories
      .map((category) => ({ ...category, name: category.name.trim().slice(0, 40) }))
      .filter((category) => category.name)
      .map((category, index) => ({
        id: createId(),
        householdId,
        name: category.name,
        plannedAmount: category.plannedAmount,
        kind: category.kind,
        icon: category.icon || iconForName(category.name),
        sortOrder: index,
      })),
    expenses: [],
  }
}

function assertHouse(db: HouseDb, householdId: string) {
  if (db.household.id !== householdId) throw new Error('Это не ваш бюджет')
}

function requireMember(db: HouseDb, userId: string) {
  if (!db.members.some((member) => member.userId === userId)) throw new Error('Это не ваш бюджет')
}

export function joinHouse(db: HouseDb, userId: string, displayName: string) {
  const name = displayName.trim().slice(0, 40)
  if (!name) throw new Error('Введите имя')
  const existing = db.members.find((member) => member.userId === userId)
  if (existing) {
    existing.displayName = name
    return
  }
  db.members.push({ userId, householdId: db.household.id, role: 'member', displayName: name })
}

export function updateSettings(db: HouseDb, householdId: string, patch: HouseholdSettingsPatch) {
  assertHouse(db, householdId)
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim()
    if (!trimmed) throw new Error('Введите название')
    db.household.name = trimmed.slice(0, 60)
  }
  if (patch.currency !== undefined) db.household.currency = patch.currency
  if (patch.monthlyBudget !== undefined) {
    if (patch.monthlyBudget < 0 || patch.monthlyBudget >= 100_000_000) throw new Error('Проверьте сумму бюджета')
    db.household.monthlyBudget = patch.monthlyBudget
  }
  if (patch.paceEnabled !== undefined) db.household.paceEnabled = patch.paceEnabled
}

export function updateDisplayName(db: HouseDb, userId: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Введите имя')
  const member = db.members.find((item) => item.userId === userId)
  if (!member) throw new Error('Это не ваш бюджет')
  member.displayName = trimmed.slice(0, 40)
}

export function addCategory(db: HouseDb, householdId: string, input: NewCategory) {
  const trimmed = input.name.trim()
  if (!trimmed) throw new Error('Введите название категории')
  assertHouse(db, householdId)
  const sortOrder = db.categories.reduce((max, category) => Math.max(max, category.sortOrder), -1) + 1
  db.categories.push({
    id: createId(),
    householdId,
    name: trimmed.slice(0, 40),
    plannedAmount: input.plannedAmount,
    kind: input.kind,
    icon: input.icon || iconForName(trimmed),
    sortOrder,
  })
  raiseBudget(db)
}

export function updateCategory(db: HouseDb, id: string, patch: CategoryPatch) {
  const category = db.categories.find((item) => item.id === id)
  if (!category) throw new Error('Категория уже удалена')
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim()
    if (!trimmed) throw new Error('Введите название категории')
    category.name = trimmed.slice(0, 40)
  }
  if (patch.plannedAmount !== undefined) {
    if (patch.plannedAmount < 0 || patch.plannedAmount >= 100_000_000) throw new Error('Проверьте сумму плана')
    category.plannedAmount = patch.plannedAmount
    raiseBudget(db)
  }
  if (patch.kind !== undefined) category.kind = patch.kind
  if (patch.icon !== undefined) category.icon = patch.icon
}

export function reorderCategories(db: HouseDb, ids: string[], kinds?: CategoryKind[]) {
  const byId = new Map(db.categories.map((category) => [category.id, category]))
  const next: Category[] = []
  ids.forEach((id, index) => {
    const category = byId.get(id)
    if (!category) return
    category.sortOrder = index
    if (kinds?.[index] === 'fixed' || kinds?.[index] === 'pace') category.kind = kinds[index]
    next.push(category)
    byId.delete(id)
  })
  for (const category of byId.values()) {
    category.sortOrder = next.length
    next.push(category)
  }
  db.categories = next
}

export function removeMember(db: HouseDb, memberId: string) {
  if (!db.members.some((member) => member.userId === memberId)) return
  if (db.members.length < 2) throw new Error('Не получилось')
  db.members = db.members.filter((member) => member.userId !== memberId)
  if (!db.members.some((member) => member.role === 'owner') && db.members[0]) {
    db.members[0].role = 'owner'
  }
}

export function deleteCategory(db: HouseDb, id: string) {
  db.categories = db.categories.filter((category) => category.id !== id)
  db.expenses = db.expenses.filter((expense) => expense.categoryId !== id)
}

export function saveExpense(db: HouseDb, expense: Expense) {
  if (expense.amount <= 0) throw new Error('Введите сумму')
  assertHouse(db, expense.householdId)
  if (!db.categories.some((category) => category.id === expense.categoryId)) {
    throw new Error('Выберите категорию')
  }
  const stored: Expense = { ...expense, note: expense.note ?? '' }
  const index = db.expenses.findIndex((item) => item.id === expense.id)
  if (index === -1) db.expenses.push(stored)
  else db.expenses[index] = stored
}

export function removeExpense(db: HouseDb, id: string) {
  db.expenses = db.expenses.filter((expense) => expense.id !== id)
}

function isHouse(value: unknown): value is HouseDb {
  if (!value || typeof value !== 'object') return false
  const db = value as HouseDb
  return Boolean(db.household?.id) && Array.isArray(db.categories) && Array.isArray(db.expenses)
}

export function applyHouseOp(current: HouseDb | null, body: HouseOp): HouseDb {
  if (body.op === 'migrate') {
    if (current) return normalizeHouse(structuredClone(current))
    if (!isHouse(body.db)) throw new Error('Не получилось перенести бюджет')
    const incoming = normalizeHouse(structuredClone(body.db))
    if (!incoming.household.inviteCode) incoming.household.inviteCode = makeInviteCode()
    return incoming
  }
  if (body.op === 'create') {
    if (current) throw new Error('Бюджет уже есть.')
    return createHouse(body.input, body.userId, Boolean(body.shared))
  }

  if (!current) throw new Error('Бюджет ещё не создан')
  const db = normalizeHouse(structuredClone(current))
  if (body.op === 'join') {
    joinHouse(db, body.userId, body.displayName)
    return db
  }
  requireMember(db, body.userId)
  switch (body.op) {
    case 'updateSettings':
      updateSettings(db, body.householdId, body.patch)
      break
    case 'updateDisplayName':
      updateDisplayName(db, body.userId, body.name)
      break
    case 'addCategory':
      addCategory(db, body.householdId, body.input)
      break
    case 'updateCategory':
      updateCategory(db, body.id, body.patch)
      break
    case 'reorder':
      reorderCategories(db, body.ids, body.kinds)
      break
    case 'deleteCategory':
      deleteCategory(db, body.id)
      break
    case 'removeMember':
      removeMember(db, body.memberId)
      break
    case 'saveExpense': {
      const existing = db.expenses.find((item) => item.id === body.expense.id)
      saveExpense(
        db,
        existing
          ? {
              ...body.expense,
              createdBy: existing.createdBy,
              createdByName: existing.createdByName,
              createdAt: existing.createdAt,
            }
          : { ...body.expense, createdBy: body.userId },
      )
      break
    }
    case 'removeExpense':
      removeExpense(db, body.id)
      break
    default:
      throw new Error('Не получилось')
  }
  return db
}
