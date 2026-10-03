import { describe, expect, it } from 'vitest'
import { monthOf, todayISO } from './dates'
import { parseAmount, parsePlan, sumRub } from './money'
import { judgePace, spendTone } from './pace'
import { summarizeMonth } from './summary'
import type { Category, Expense } from '../data/types'

function category(partial: Partial<Category> & Pick<Category, 'id' | 'name' | 'kind'>): Category {
  return {
    householdId: 'h',
    plannedAmount: 0,
    sortOrder: 0,
    icon: 'food',
    ...partial,
  }
}

function expense(partial: Partial<Expense> & Pick<Expense, 'categoryId' | 'amount' | 'spentOn'>): Expense {
  return {
    id: partial.spentOn + partial.categoryId + String(partial.amount),
    householdId: 'h',
    createdBy: 'u',
    createdAt: partial.spentOn + 'T12:00:00.000Z',
    note: '',
    ...partial,
  }
}

describe('judgePace', () => {
  it('15 октября и 90% еды — осталось на дни, месяц ещё не кончился', () => {
    expect(judgePace({ kind: 'pace', spent: 9000, planned: 10000, day: 15, daysInMonth: 31 })).toEqual({
      level: 'over',
      reason: 'low',
      amount: 1000,
      daysLeft: 16,
    })
  })

  it('обгон больше 15 п.п., но меньше 90% — оранжевое предупреждение', () => {
    expect(judgePace({ kind: 'pace', spent: 7000, planned: 10000, day: 15, daysInMonth: 31 })).toMatchObject({
      level: 'warn',
      reason: 'pace',
    })
  })

  it('не шумит, если обгон не больше 15 п.п.', () => {
    expect(judgePace({ kind: 'pace', spent: 6000, planned: 10000, day: 15, daysInMonth: 31 }).level).toBe('ok')
    expect(judgePace({ kind: 'pace', spent: 5200, planned: 10000, day: 15, daysInMonth: 31 }).level).toBe('ok')
  })

  it('в последний день месяца 90% уже не про остаток дней', () => {
    expect(judgePace({ kind: 'pace', spent: 9000, planned: 10000, day: 31, daysInMonth: 31 }).level).toBe('ok')
  })

  it('выше лимита считает сумму превышения', () => {
    expect(judgePace({ kind: 'pace', spent: 12000, planned: 10000, day: 15, daysInMonth: 31 })).toEqual({
      level: 'over',
      reason: 'exceeded',
      amount: 2000,
      daysLeft: 16,
    })
  })

  it('аренда на всю сумму в первый день остаётся спокойной', () => {
    expect(judgePace({ kind: 'fixed', spent: 50000, planned: 50000, day: 1, daysInMonth: 31 })).toMatchObject({
      level: 'ok',
      reason: null,
    })
  })

  it('разовый платёж краснеет только выше плана', () => {
    expect(judgePace({ kind: 'fixed', spent: 51000, planned: 50000, day: 1, daysInMonth: 31 })).toMatchObject({
      level: 'over',
      reason: 'exceeded',
      amount: 1000,
    })
  })

  it('полная аренда не красит полоску, превышение лимита красит', () => {
    const calm = { level: 'ok' as const, reason: null, amount: 0, daysLeft: 0 }
    const over = { level: 'over' as const, reason: 'exceeded' as const, amount: 1000, daysLeft: 30 }
    expect(spendTone({ percent: 100, judgement: calm, paceEnabled: true, kind: 'fixed' })).toBe('ok')
    expect(spendTone({ percent: 101, judgement: over, paceEnabled: true, kind: 'fixed' })).toBe('over')
    expect(
      spendTone({
        percent: 90,
        judgement: { level: 'over', reason: 'low', amount: 1000, daysLeft: 16 },
        paceEnabled: true,
        kind: 'pace',
      }),
    ).toBe('over')
    expect(
      spendTone({
        percent: 70,
        judgement: { level: 'warn', reason: 'pace', amount: 0, daysLeft: 16 },
        paceEnabled: false,
        kind: 'pace',
      }),
    ).toBe('ok')
  })

  it('траты без плана подсвечивает', () => {
    expect(judgePace({ kind: 'pace', spent: 500, planned: 0, day: 3, daysInMonth: 31 })).toMatchObject({
      level: 'over',
      reason: 'no-plan',
      amount: 500,
    })
  })
})

describe('summarizeMonth', () => {
  it('собирает фразу про 15 октября', () => {
    const food = category({ id: 'food', name: 'Продукты', kind: 'pace', plannedAmount: 10000, sortOrder: 1 })
    const rent = category({ id: 'rent', name: 'Жильё', kind: 'fixed', plannedAmount: 50000, sortOrder: 0 })
    const summary = summarizeMonth(
      [rent, food],
      [
        expense({ categoryId: 'food', amount: 9000, spentOn: '2026-10-15' }),
        expense({ categoryId: 'rent', amount: 50000, spentOn: '2026-10-01' }),
      ],
      '2026-10-15',
    )

    expect(summary.alerts).toHaveLength(1)
    expect(summary.alerts[0]).toMatchObject({
      categoryName: 'Продукты',
      level: 'over',
      kicker: 'Осталось мало',
    })
    expect(summary.alerts[0].detail.replace(/\s/g, ' ')).toContain('1 000')
    expect(summary.alerts[0].detail).toContain('16')
    expect(summary.rows.find((row) => row.category.id === 'rent')?.judgement.level).toBe('ok')
    expect(summary.spentTotal).toBe(59000)
    expect(summary.plannedTotal).toBe(60000)
  })

  it('не берёт траты другого месяца', () => {
    const food = category({ id: 'food', name: 'Продукты', kind: 'pace', plannedAmount: 10000 })
    const summary = summarizeMonth(
      [food],
      [expense({ categoryId: 'food', amount: 9000, spentOn: '2026-09-30' })],
      '2026-10-15',
    )
    expect(summary.alerts).toHaveLength(0)
    expect(summary.spentTotal).toBe(0)
  })
})

describe('dates and money', () => {
  it('октябрь 2026 длится 31 день, февраль 2028 — 29', () => {
    expect(monthOf('2026-10-15').days).toBe(31)
    expect(monthOf('2028-02-10').days).toBe(29)
    expect(monthOf('2026-02-10').days).toBe(28)
  })

  it('сегодня в Москве не сдвигается из-за UTC', () => {
    const eveningBeforeMidnightUtc = new Date('2026-10-03T21:30:00.000Z')
    expect(todayISO(eveningBeforeMidnightUtc)).toBe('2026-10-04')
  })

  it('понимает сумму с пробелом и запятой', () => {
    expect(parseAmount('1 500,50')).toBe(1500.5)
    expect(parseAmount('0')).toBeNull()
    expect(parsePlan('')).toBe(0)
    expect(parsePlan('10 000')).toBe(10000)
    expect(sumRub([0.1, 0.2])).toBe(0.3)
  })
})
