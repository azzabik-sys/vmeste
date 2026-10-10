import { useEffect, useRef, useState } from 'react'
import { todayISO } from '../domain/dates'
import { formatAmount } from '../domain/money'
import { useBudget } from './budget'
import { categoryTitle, useI18n } from './i18n'

type Notice = { id: string; text: string }

const MONTH_KEY = 'vmeste.monthSeen'

export function Notices() {
  const { snap } = useBudget()
  const { t } = useI18n()
  const [items, setItems] = useState<Notice[]>([])
  const seen = useRef<Set<string>>(new Set())
  const primed = useRef<string | null>(null)

  useEffect(() => {
    if (snap.status !== 'ready') {
      primed.current = null
      return
    }
    const houseId = snap.household.id
    if (primed.current !== houseId) {
      primed.current = houseId
      seen.current = new Set(snap.expenses.map((expense) => expense.id))
      const month = todayISO().slice(0, 7)
      const key = `${MONTH_KEY}:${houseId}`
      let previous: string | null = null
      try {
        previous = localStorage.getItem(key)
        if (previous !== month) localStorage.setItem(key, month)
      } catch {
        previous = month
      }
      if (previous && previous !== month) {
        setItems((list) => [{ id: `month-${houseId}-${month}`, text: t('monthKept') }, ...list].slice(0, 4))
      }
      return
    }

    const fresh = snap.expenses.filter((expense) => !seen.current.has(expense.id))
    for (const expense of fresh) seen.current.add(expense.id)
    const fromOthers = fresh.filter((expense) => expense.createdBy && expense.createdBy !== snap.userId)
    if (fromOthers.length === 0) return

    const members = new Map(snap.members.map((member) => [member.userId, member.displayName]))
    const categories = new Map(snap.categories.map((category) => [category.id, category]))
    const notices = fromOthers.map((expense) => {
      const person = (members.get(expense.createdBy) || expense.createdByName || '').trim() || t('participants')
      const category = categories.get(expense.categoryId)
      const label = category ? categoryTitle(category.icon, category.name, t) : ''
      const amount = formatAmount(expense.amount, snap.household.currency)
      const text = label
        ? `${t('partnerSpent', { name: person, amount })} · ${label}`
        : t('partnerSpent', { name: person, amount })
      return { id: expense.id, text }
    })
    setItems((list) => [...notices, ...list].slice(0, 4))
    try {
      navigator.vibrate?.(40)
    } catch {
      // Вибрация не везде доступна.
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      for (const notice of notices) {
        try {
          new Notification('Вместе', { body: notice.text })
        } catch {
          // Системное уведомление в этом окне недоступно. Баннер уже показан.
        }
      }
    }
  }, [snap, t])

  useEffect(() => {
    if (snap.status !== 'ready') return
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return
    const ask = () => {
      void Notification.requestPermission().catch(() => undefined)
    }
    const timer = window.setTimeout(ask, 1200)
    return () => window.clearTimeout(timer)
  }, [snap.status])

  if (items.length === 0) return null

  return (
    <div className="notice-stack">
      {items.map((notice) => (
        <p className="notice" key={notice.id} role="status">
          <span>{notice.text}</span>
          <button type="button" aria-label={t('close')} onClick={() => setItems((list) => list.filter((item) => item.id !== notice.id))}>
            ×
          </button>
        </p>
      ))}
    </div>
  )
}
