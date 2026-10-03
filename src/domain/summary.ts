import type { Category, Expense } from '../data/types'
import { inMonth, monthOf } from './dates'
import { formatMoney, formatPercent, sumRub } from './money'
import { judgePace, type PaceJudgement } from './pace'

export type MonthRow = {
  category: Category
  spent: number
  judgement: PaceJudgement
  percent: number
}

export type MonthAlert = {
  categoryId: string
  categoryName: string
  level: 'warn' | 'over'
  kicker: string
  detail: string
}

export type MonthSummary = {
  day: number
  days: number
  start: string
  end: string
  spentTotal: number
  plannedTotal: number
  rows: MonthRow[]
  alerts: MonthAlert[]
  hasPlan: boolean
}

export function summarizeMonth(
  categories: Category[],
  expenses: Expense[],
  today: string,
): MonthSummary {
  const month = monthOf(today)
  const spentByCategory = new Map<string, number[]>()

  for (const expense of expenses) {
    if (!inMonth(expense.spentOn, month)) continue
    const list = spentByCategory.get(expense.categoryId) ?? []
    list.push(expense.amount)
    spentByCategory.set(expense.categoryId, list)
  }

  const spentTotals = new Map<string, number>()
  for (const [id, amounts] of spentByCategory) {
    spentTotals.set(id, sumRub(amounts))
  }

  const rows: MonthRow[] = [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru'))
    .map((category) => {
      const spent = spentTotals.get(category.id) ?? 0
      const judgement = judgePace({
        kind: category.kind,
        spent,
        planned: category.plannedAmount,
        day: month.day,
        daysInMonth: month.days,
      })
      return {
        category,
        spent,
        judgement,
        percent: formatPercent(spent, category.plannedAmount),
      }
    })

  const alerts = rows
    .filter((row) => row.judgement.level !== 'ok' && row.judgement.reason)
    .sort((a, b) => {
      if (a.judgement.level !== b.judgement.level) return a.judgement.level === 'over' ? -1 : 1
      return b.percent - a.percent
    })
    .map((row) => toAlert(row, month.day, month.days))

  return {
    day: month.day,
    days: month.days,
    start: month.start,
    end: month.end,
    spentTotal: sumRub(rows.map((row) => row.spent)),
    plannedTotal: sumRub(rows.map((row) => row.category.plannedAmount)),
    rows,
    alerts,
    hasPlan: rows.some((row) => row.category.plannedAmount > 0),
  }
}

function toAlert(row: MonthRow, day: number, days: number): MonthAlert {
  const { category, judgement } = row
  const base = { categoryId: category.id, categoryName: category.name, level: judgement.level === 'warn' ? 'warn' as const : 'over' as const }
  if (judgement.reason === 'low') {
    return { ...base, kicker: 'Осталось мало', detail: `Осталось ${formatMoney(judgement.amount)} на ${judgement.daysLeft} дней.` }
  }
  if (judgement.reason === 'exceeded' || judgement.reason === 'no-plan') {
    return { ...base, kicker: 'Бюджет превышен', detail: `Бюджет превышен на ${formatMoney(judgement.amount)}.` }
  }
  return { ...base, kicker: 'Расходы выше плана', detail: `Потрачено больше, чем прошло месяца: ${day} из ${days}.` }
}
