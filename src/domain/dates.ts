import { formatLocale } from './formatLocale'

/** Филиппины, UTC+8. На 5 часов позже Москвы, без перехода на летнее время. */
export const TIME_ZONE = 'Asia/Manila'

export type MonthInfo = {
  year: number
  month: number
  day: number
  days: number
  start: string
  end: string
}

export function todayISO(now = new Date(), timeZone = TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function parseISODate(iso: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) throw new Error(`Некорректная дата: ${iso}`)
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

export function monthOf(iso: string): MonthInfo {
  const { year, month, day } = parseISODate(iso)
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const mm = String(month).padStart(2, '0')
  return {
    year,
    month,
    day,
    days,
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(days).padStart(2, '0')}`,
  }
}

export function monthTitle(iso: string): string {
  const { year, month } = parseISODate(iso)
  const name = new Intl.DateTimeFormat(formatLocale(), {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`
}

function utcDate(iso: string): Date {
  const { year, month, day } = parseISODate(iso)
  return new Date(Date.UTC(year, month - 1, day))
}

function capitalize(value: string, locale: string): string {
  if (!value) return value
  return value.charAt(0).toLocaleUpperCase(locale) + value.slice(1)
}

function relativeDay(offset: -1 | 0): string {
  const locale = formatLocale()
  const word = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(offset, 'day')
  return capitalize(word, locale)
}

export function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat(formatLocale(), {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(utcDate(iso))
}

export function dayHeading(iso: string, today: string): string {
  const label = dayLabel(iso)
  return iso === today ? `${relativeDay(0)}, ${label}` : label
}

export function formatTime(iso: string, timeZone = TIME_ZONE): string {
  return new Intl.DateTimeFormat(formatLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(iso))
}

export function inMonth(iso: string, month: MonthInfo): boolean {
  return iso >= month.start && iso <= month.end
}

export function shiftISO(iso: string, days: number): string {
  const { year, month, day } = parseISODate(iso)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDayCount(count: number, locale = formatLocale()): string {
  const n = Math.abs(Math.trunc(count))
  return new Intl.NumberFormat(locale, { style: 'unit', unit: 'day', unitDisplay: 'long' }).format(n)
}

export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat(formatLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utcDate(iso))
}

export function historyHeading(iso: string, today: string): string {
  const label = shortDate(iso)
  if (iso === today) return `${relativeDay(0)}, ${label}`
  if (iso === shiftISO(today, -1)) return `${relativeDay(-1)}, ${label}`
  return label
}

export function recentMonths(today: string, count = 8): string[] {
  const { year, month } = parseISODate(today)
  const months: string[] = []
  for (let index = 0; index < count; index += 1) {
    const date = new Date(Date.UTC(year, month - 1 - index, 1))
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    months.push(`${y}-${m}-01`)
  }
  return months
}

/** Для прошлого месяца темп считается на последний день, для текущего — на сегодня. */
export function paceDateForMonth(monthStart: string, today: string): string {
  const selected = monthOf(monthStart)
  const current = monthOf(today)
  const selectedKey = selected.year * 12 + selected.month
  const currentKey = current.year * 12 + current.month
  if (selectedKey === currentKey) return today
  if (selectedKey < currentKey) return selected.end
  return selected.start
}
