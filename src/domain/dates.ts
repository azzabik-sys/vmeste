import { formatLocale } from './formatLocale'

const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

export type MonthInfo = {
  year: number
  month: number
  day: number
  days: number
  start: string
  end: string
}

export function todayISO(now = new Date(), timeZone?: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    ...(timeZone ? { timeZone } : {}),
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

export function dayLabel(iso: string): string {
  const { month, day } = parseISODate(iso)
  return `${day} ${MONTHS_GENITIVE[month - 1]}`
}

export function dayHeading(iso: string, today: string): string {
  const label = dayLabel(iso)
  return iso === today ? `Сегодня, ${label}` : label
}

export function formatTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(formatLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(iso))
}

export function inMonth(iso: string, month: MonthInfo): boolean {
  return iso >= month.start && iso <= month.end
}

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

export function shiftISO(iso: string, days: number): string {
  const { year, month, day } = parseISODate(iso)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const RELATIVE: Record<string, { today: string; yesterday: string }> = {
  'ru-RU': { today: 'Сегодня', yesterday: 'Вчера' },
  'en-US': { today: 'Today', yesterday: 'Yesterday' },
  'vi-VN': { today: 'Hôm nay', yesterday: 'Hôm qua' },
}

export function formatDayCount(count: number, locale = formatLocale()): string {
  const n = Math.abs(Math.trunc(count))
  if (locale.startsWith('vi')) return `${n} ngày`
  if (locale.startsWith('en')) return n === 1 ? '1 day' : `${n} days`
  const mod100 = n % 100
  const mod10 = n % 10
  if (mod100 > 10 && mod100 < 20) return `${n} дней`
  if (mod10 === 1) return `${n} день`
  if (mod10 >= 2 && mod10 <= 4) return `${n} дня`
  return `${n} дней`
}

export function shortDate(iso: string): string {
  const { year, month, day } = parseISODate(iso)
  if (formatLocale() === 'ru-RU') return `${day} ${MONTHS_SHORT[month - 1]}. ${year}`
  return new Intl.DateTimeFormat(formatLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function historyHeading(iso: string, today: string): string {
  const label = shortDate(iso)
  const words = RELATIVE[formatLocale()] ?? RELATIVE['ru-RU']
  if (iso === today) return `${words.today}, ${label}`
  if (iso === shiftISO(today, -1)) return `${words.yesterday}, ${label}`
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
