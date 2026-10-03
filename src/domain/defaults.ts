import type { CategoryKind } from '../data/types'

export type DefaultCategory = {
  name: string
  kind: CategoryKind
  icon: string
}

/** Держать в одном порядке с supabase/schema.sql (create_household). */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Жильё', kind: 'fixed', icon: 'home' },
  { name: 'Коммунальные', kind: 'fixed', icon: 'bill' },
  { name: 'Подписки', kind: 'fixed', icon: 'card' },
  { name: 'Еда', kind: 'pace', icon: 'food' },
  { name: 'Транспорт', kind: 'pace', icon: 'car' },
  { name: 'Покупки', kind: 'pace', icon: 'shop' },
  { name: 'Развлечения', kind: 'pace', icon: 'game' },
  { name: 'Здоровье', kind: 'pace', icon: 'heart' },
  { name: 'Кафе', kind: 'pace', icon: 'coffee' },
]

const ICON_BY_NAME: Record<string, string> = {
  Еда: 'food',
  Продукты: 'food',
  Транспорт: 'car',
  Жильё: 'home',
  Коммунальные: 'bill',
  Покупки: 'shop',
  Одежда: 'shop',
  Развлечения: 'game',
  Подписки: 'card',
  Связь: 'card',
  Здоровье: 'heart',
  Кафе: 'coffee',
  Прочее: 'shop',
}

export function iconForName(name: string): string {
  return ICON_BY_NAME[name.trim()] ?? 'shop'
}
