import { CURRENCY_CODES, type CurrencyCode } from '../data/types'
import { formatLocale } from './formatLocale'

const CURRENCY_META: Record<CurrencyCode, { symbol: string; label: string }> = {
  RUB: { symbol: '₽', label: 'RUB (₽)' },
  USD: { symbol: '$', label: 'USD ($)' },
  EUR: { symbol: '€', label: 'EUR (€)' },
  KZT: { symbol: '₸', label: 'KZT (₸)' },
  PHP: { symbol: '₱', label: 'PHP (₱)' },
}

export const CURRENCIES = CURRENCY_CODES.map((code) => ({ code, ...CURRENCY_META[code] }))

export function currencyMeta(code: string) {
  if ((CURRENCY_CODES as readonly string[]).includes(code)) return CURRENCY_META[code as CurrencyCode]
  return CURRENCY_META.RUB
}

/** Рубли с копейками, без двоичного хвоста. */
export function rub(value: number): number {
  return Math.round(value * 100) / 100
}

export function sumRub(values: number[]): number {
  const cents = values.reduce((total, value) => total + Math.round(value * 100), 0)
  return cents / 100
}

export function formatMoney(value: number): string {
  const amount = rub(value)
  const hasCents = Math.round(amount * 100) % 100 !== 0
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(amount)
}

/** Символ перед суммой, как на макете: ₽ 73 450. Копейки только если они есть. */
export function formatAmount(value: number, currency: string = 'RUB'): string {
  const amount = rub(value)
  const hasCents = Math.round(amount * 100) % 100 !== 0
  const formatted = new Intl.NumberFormat(formatLocale(), {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(amount)
  return `${currencyMeta(currency).symbol}\u00A0${formatted}`
}

export function formatGroupedInput(value: number): string {
  if (!value) return ''
  const amount = rub(value)
  const text = Number.isInteger(amount) ? String(amount) : String(amount).replace('.', ',')
  const [whole, fraction] = text.split(',')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return fraction ? `${grouped},${fraction}` : grouped
}

export function formatPercent(spent: number, planned: number): number {
  if (planned <= 0) return spent > 0 ? 100 : 0
  return Math.round((spent / planned) * 100)
}

/** Пустая строка и 0 допустимы: план ещё не задан. */
export function parsePlan(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return 0
  return parseNonNegative(trimmed)
}

/** Сумма траты. Ноль и пустота не подходят. */
export function parseAmount(raw: string): number | null {
  const parsed = parseNonNegative(raw.trim())
  if (parsed === null || parsed <= 0) return null
  return parsed
}

function parseNonNegative(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0 || value >= 100_000_000) return null
  return rub(value)
}

export function formatPlanInput(value: number): string {
  if (!value) return ''
  const amount = rub(value)
  return Number.isInteger(amount) ? String(amount) : String(amount).replace('.', ',')
}
