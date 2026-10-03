import type { CategoryKind } from '../data/types'

export type PaceLevel = 'ok' | 'warn' | 'over'
export type PaceReason = 'pace' | 'low' | 'exceeded' | 'no-plan' | null

export type PaceJudgement = {
  level: PaceLevel
  reason: PaceReason
  /** Сколько осталось или на сколько превышен лимит. */
  amount: number
  /** Дней месяца после сегодняшнего. */
  daysLeft: number
}

/**
 * Повседневные: сравниваем % потраченного с % прошедшего месяца.
 * До 15 п.п. — тихо. Дальше оранжевое «выше плана».
 * От 90% при живом месяце — красное «осталось на N дней».
 * Выше 100% — красное «превышен на сумму».
 * Регулярные краснеют только когда сумма выше лимита.
 */
export function judgePace(input: {
  kind: CategoryKind
  spent: number
  planned: number
  day: number
  daysInMonth: number
}): PaceJudgement {
  const spent = Math.round(input.spent * 100)
  const planned = Math.round(input.planned * 100)
  const days = Math.max(1, input.daysInMonth)
  const day = Math.min(Math.max(1, input.day), days)
  const daysLeft = Math.max(0, days - day)
  const calm: PaceJudgement = { level: 'ok', reason: null, amount: 0, daysLeft }

  if (planned <= 0) {
    return spent > 0 ? { level: 'over', reason: 'no-plan', amount: spent / 100, daysLeft } : calm
  }

  if (spent > planned) {
    return { level: 'over', reason: 'exceeded', amount: (spent - planned) / 100, daysLeft }
  }

  if (input.kind === 'fixed') return calm

  const spentPercent = (spent / planned) * 100
  const monthPercent = (day / days) * 100
  if (spentPercent >= 90 && daysLeft > 0) {
    return { level: 'over', reason: 'low', amount: (planned - spent) / 100, daysLeft }
  }
  if (spentPercent > monthPercent + 15) {
    return { level: 'warn', reason: 'pace', amount: 0, daysLeft }
  }
  return calm
}

/** Цвет полоски повторяет подпись. Оранжевый темп можно выключить в настройках. */
export function spendTone(input: {
  percent: number
  judgement: PaceJudgement
  paceEnabled: boolean
  kind: CategoryKind
}): PaceLevel {
  if (input.kind === 'fixed') {
    return input.judgement.level === 'over' || input.percent > 100 ? 'over' : 'ok'
  }
  if (input.judgement.level === 'over') return 'over'
  if (input.paceEnabled && input.judgement.level === 'warn') return 'warn'
  return 'ok'
}
