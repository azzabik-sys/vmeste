import { useEffect, useRef, useState } from 'react'
import { dayLabel, todayISO } from '../domain/dates'
import { formatAmount } from '../domain/money'
import { useBudget } from './budget'
import { categoryTitle, useI18n } from './i18n'

type Row = {
  id: string
  name: string
  amount: string
  category: string
  note: string
  date: string
}

const MONTH_KEY = 'vmeste.monthSeen'
const ACK_KEY = 'vmeste.partnerAck'

function readAck(houseId: string): { known: boolean; ids: Set<string> } {
  try {
    const raw = localStorage.getItem(`${ACK_KEY}:${houseId}`)
    if (raw === null) return { known: false, ids: new Set() }
    const parsed = JSON.parse(raw) as unknown
    const ids = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
    return { known: true, ids: new Set(ids) }
  } catch {
    return { known: false, ids: new Set() }
  }
}

function writeAck(houseId: string, ids: Set<string>) {
  localStorage.setItem(`${ACK_KEY}:${houseId}`, JSON.stringify([...ids]))
}

export function Notices() {
  const { snap } = useBudget()
  const { t } = useI18n()
  const [monthNote, setMonthNote] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const acked = useRef<Set<string>>(new Set())
  const houseId = useRef<string | null>(null)
  const shown = useRef('')
  const notified = useRef<Set<string>>(new Set())
  const okRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (snap.status !== 'ready') {
      houseId.current = null
      return
    }
    const id = snap.household.id
    if (houseId.current !== id) {
      houseId.current = id
      shown.current = ''
      const stored = readAck(id)
      acked.current = stored.ids
      if (!stored.known) {
        for (const expense of snap.expenses) acked.current.add(expense.id)
        try {
          writeAck(id, acked.current)
        } catch {
          // Без записи окно может появиться снова при следующем открытии.
        }
      }
      const month = todayISO().slice(0, 7)
      const key = `${MONTH_KEY}:${id}`
      let previous: string | null = null
      try {
        previous = localStorage.getItem(key)
        if (previous !== month) localStorage.setItem(key, month)
      } catch {
        previous = month
      }
      setMonthNote(previous && previous !== month ? t('monthKept') : null)
      setRows([])
    }

    const incoming = snap.expenses
      .filter((expense) => expense.createdBy && expense.createdBy !== snap.userId && !acked.current.has(expense.id))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    const signature = incoming.map((expense) => expense.id).join('\n')
    if (signature === shown.current) return
    const previous = new Set(shown.current.split('\n').filter(Boolean))
    shown.current = signature
    if (incoming.length === 0) {
      setRows([])
      return
    }

    const members = new Map(snap.members.map((member) => [member.userId, member.displayName]))
    const categories = new Map(snap.categories.map((category) => [category.id, category]))
    const next = incoming.map((expense) => {
      const person = (members.get(expense.createdBy) || expense.createdByName || '').trim() || t('participants')
      const category = categories.get(expense.categoryId)
      return {
        id: expense.id,
        name: person,
        amount: formatAmount(expense.amount, snap.household.currency),
        category: category ? categoryTitle(category.icon, category.name, t) : '',
        note: expense.note.trim(),
        date: dayLabel(expense.spentOn),
      }
    })
    setRows(next)

    const fresh = incoming.filter((expense) => !previous.has(expense.id) && !notified.current.has(expense.id))
    if (fresh.length === 0) return
    for (const expense of fresh) notified.current.add(expense.id)
    try {
      navigator.vibrate?.(40)
    } catch {
      // Вибрация не везде доступна.
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const body = fresh
        .slice(0, 4)
        .map((expense) => {
          const row = next.find((item) => item.id === expense.id)
          return row ? `${row.amount} · ${row.category}` : ''
        })
        .filter(Boolean)
        .join('\n')
      try {
        new Notification('Вместе', { body })
      } catch {
        // Системное уведомление в этом окне недоступно. Окно в приложении уже показано.
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

  useEffect(() => {
    if (rows.length > 0 && !wasOpen.current) okRef.current?.focus()
    wasOpen.current = rows.length > 0
  }, [rows.length])

  function acknowledge() {
    if (snap.status !== 'ready') return
    for (const row of rows) acked.current.add(row.id)
    try {
      writeAck(snap.household.id, acked.current)
    } catch {
      // Окно закроется до конца этого визита. При следующем открытии список может вернуться.
    }
    shown.current = ''
    setRows([])
  }

  const names = [...new Set(rows.map((row) => row.name))]

  return (
    <>
      {monthNote ? (
        <div className="notice-stack">
          <p className="notice" role="status">
            <span>{monthNote}</span>
            <button type="button" aria-label={t('close')} onClick={() => setMonthNote(null)}>
              ×
            </button>
          </p>
        </div>
      ) : null}
      {rows.length === 0 ? null : (
        <div className="overlay partner-overlay">
          <div
            className="partner-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="partner-expenses-title"
            data-testid="partner-expenses"
          >
            <h2 id="partner-expenses-title">{t('partnerExpenses')}</h2>
            <p className="sub">{names.join(', ')}</p>
            <ul className="partner-list">
              {rows.map((row) => (
                <li key={row.id}>
                  <span>
                    <strong>{row.category}</strong>
                    <em>
                      {row.date}
                      {row.note ? ` · ${row.note}` : ''}
                    </em>
                  </span>
                  <b>{row.amount}</b>
                </li>
              ))}
            </ul>
            <button ref={okRef} className="btn-primary" type="button" onClick={acknowledge}>
              {t('ok')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
