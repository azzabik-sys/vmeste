import { describe, expect, it } from 'vitest'
import { sameExpenseOnDay } from '../domain/duplicate'
import { applyHouseOp, createHouse, type HouseDb } from './houseDb'
import type { CreateHouseholdInput } from './types'

function house(): HouseDb {
  const input: CreateHouseholdInput = {
    name: 'Наш бюджет',
    displayName: 'Я',
    currency: 'RUB',
    monthlyBudget: 10000,
    paceEnabled: true,
    categories: [
      { name: 'Еда', plannedAmount: 4000, kind: 'pace', icon: 'food' },
      { name: 'Жильё', plannedAmount: 6000, kind: 'fixed', icon: 'home' },
    ],
  }
  return createHouse(input, 'local-user', true)
}

describe('общий план и участники', () => {
  it('поднимает общий бюджет, когда лимит категории становится больше суммы', () => {
    const db = house()
    const food = db.categories.find((category) => category.name === 'Еда')
    if (!food) throw new Error('нет еды')
    const next = applyHouseOp(db, {
      op: 'updateCategory',
      userId: 'local-user',
      id: food.id,
      patch: { plannedAmount: 8000 },
    })
    expect(next.household.monthlyBudget).toBe(14000)
    expect(db.household.monthlyBudget).toBe(10000)
  })

  it('добавленная категория с суммой тоже поднимает общий бюджет', () => {
    const db = house()
    const next = applyHouseOp(db, {
      op: 'addCategory',
      userId: 'local-user',
      householdId: db.household.id,
      input: { name: 'Кафе', plannedAmount: 5000, kind: 'pace', icon: 'coffee' },
    })
    expect(next.household.monthlyBudget).toBe(15000)
  })

  it('не уменьшает общий бюджет, когда категорию снижают или удаляют', () => {
    const db = house()
    const food = db.categories.find((category) => category.name === 'Еда')
    if (!food) throw new Error('нет еды')
    const lowered = applyHouseOp(db, {
      op: 'updateCategory',
      userId: 'local-user',
      id: food.id,
      patch: { plannedAmount: 1000 },
    })
    expect(lowered.household.monthlyBudget).toBe(10000)
    expect(lowered.categories.find((category) => category.id === food.id)?.plannedAmount).toBe(1000)
    const removed = applyHouseOp(lowered, { op: 'deleteCategory', userId: 'local-user', id: food.id })
    expect(removed.household.monthlyBudget).toBe(10000)
    expect(removed.categories.some((category) => category.id === food.id)).toBe(false)
  })

  it('второй человек входит по имени и не создаёт второй бюджет', () => {
    const db = house()
    const joined = applyHouseOp(db, { op: 'join', userId: 'girl', displayName: 'Аня' })
    expect(joined.members.map((member) => member.displayName)).toEqual(['Я', 'Аня'])
    expect(() =>
      applyHouseOp(joined, {
        op: 'create',
        userId: 'other',
        shared: true,
        input: {
          name: 'Другой',
          displayName: 'Кто-то',
          currency: 'RUB',
          monthlyBudget: 1,
          paceEnabled: true,
          categories: [],
        },
      }),
    ).toThrow(/уже есть/)
  })

  it('перенос не затирает бюджет, который уже есть', () => {
    const db = house()
    const other = house()
    other.household.name = 'Чужой'
    const kept = applyHouseOp(db, { op: 'migrate', db: other })
    expect(kept.household.name).toBe('Наш бюджет')
    expect(kept.household.id).toBe(db.household.id)
  })

  it('перетаскивание меняет раздел категории и не трогает чужой авторство траты', () => {
    const db = house()
    const food = db.categories.find((category) => category.name === 'Еда')
    const home = db.categories.find((category) => category.name === 'Жильё')
    if (!food || !home) throw new Error('нет категорий')
    const moved = applyHouseOp(db, {
      op: 'reorder',
      userId: 'local-user',
      householdId: db.household.id,
      ids: [food.id, home.id],
      kinds: ['fixed', 'pace'],
    })
    expect(moved.categories.find((category) => category.id === food.id)?.kind).toBe('fixed')
    expect(moved.categories.find((category) => category.id === home.id)?.kind).toBe('pace')

    const saved = applyHouseOp(moved, {
      op: 'saveExpense',
      userId: 'local-user',
      expense: {
        id: 'e1',
        householdId: db.household.id,
        categoryId: food.id,
        amount: 10,
        spentOn: '2026-10-01',
        note: '',
        createdBy: 'local-user',
        createdAt: '2026-10-01T00:00:00.000Z',
      },
    })
    const edited = applyHouseOp(saved, {
      op: 'saveExpense',
      userId: 'local-user',
      expense: {
        ...saved.expenses[0],
        amount: 12,
        createdBy: 'someone-else',
        createdAt: '2026-10-02T00:00:00.000Z',
      },
    })
    expect(edited.expenses[0].amount).toBe(12)
    expect(edited.expenses[0].createdBy).toBe('local-user')
    expect(edited.expenses[0].createdAt).toBe('2026-10-01T00:00:00.000Z')
    expect(
      sameExpenseOnDay(edited.expenses, {
        categoryId: food.id,
        amount: 12,
        spentOn: '2026-10-01',
      }),
    ).toBe(true)
    expect(
      sameExpenseOnDay(edited.expenses, {
        id: 'e1',
        categoryId: food.id,
        amount: 12,
        spentOn: '2026-10-01',
      }),
    ).toBe(false)
  })
})
