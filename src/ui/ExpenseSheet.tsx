import { useState } from 'react'
import type { CurrencyCode, Expense } from '../data/types'
import { shortDate, todayISO } from '../domain/dates'
import { sameExpenseOnDay } from '../domain/duplicate'
import { createId } from '../domain/id'
import { CURRENCIES, currencyMeta, formatAmount, parseAmount } from '../domain/money'
import { useBudget } from './budget'
import { categoryTitle, useI18n } from './i18n'
import { CategoryMark, Icon } from './icons'

function amountToText(amount: number): string {
  const cents = Math.round(amount * 100)
  const whole = Math.trunc(cents / 100)
  const fraction = Math.abs(cents % 100)
  return fraction === 0 ? String(whole) : `${whole}.${String(fraction).padStart(2, '0')}`
}

export function ExpenseSheet({ expense = null, onClose }: { expense?: Expense | null; onClose: () => void }) {
  const { snap, saveExpense, updateHouseholdSettings } = useBudget()
  const { t } = useI18n()
  const [amountText, setAmountText] = useState(expense ? amountToText(expense.amount) : '')
  const [categoryId, setCategoryId] = useState<string | null>(expense?.categoryId ?? null)
  const [date, setDate] = useState(() => expense?.spentOn ?? todayISO())
  const [note, setNote] = useState(expense?.note ?? '')
  const [phase, setPhase] = useState<'form' | 'done'>('form')
  const [saved, setSaved] = useState<{ amount: number; categoryName: string; icon: string } | null>(null)
  const [pending, setPending] = useState(false)

  if (snap.status !== 'ready') return null
  const currency = snap.household.currency
  const symbol = currencyMeta(currency).symbol
  const amount = parseAmount(amountText)
  const canSave = amount !== null && categoryId !== null && !pending
  const today = todayISO()
  const picked = categoryId ? snap.categories.find((item) => item.id === categoryId) : undefined
  const duplicate =
    amount !== null && categoryId !== null
      ? sameExpenseOnDay(snap.expenses, { id: expense?.id, categoryId, amount, spentOn: date })
      : false

  async function save() {
    if (amount === null || !categoryId) return
    const category = snap.status === 'ready' ? snap.categories.find((item) => item.id === categoryId) : undefined
    if (!category || snap.status !== 'ready') return
    const next: Expense = expense
      ? {
          ...expense,
          categoryId,
          amount,
          spentOn: date,
          note: note.trim(),
        }
      : {
          id: createId(),
          householdId: snap.household.id,
          categoryId,
          amount,
          spentOn: date,
          note: note.trim(),
          createdBy: snap.userId,
          createdAt: new Date().toISOString(),
        }
    setPending(true)
    const ok = await saveExpense(next)
    setPending(false)
    if (!ok) return
    setSaved({ amount, categoryName: categoryTitle(category.icon, category.name, t), icon: category.icon })
    setPhase('done')
  }

  function another() {
    setAmountText('')
    setNote('')
    setPhase('form')
    setSaved(null)
  }

  if (phase === 'done' && saved) {
    return (
      <div className="sheet success" role="dialog" aria-label={expense ? t('expenseUpdated') : t('expenseAdded')}>
        <div className="sheet-inner success-inner">
          <div className="success-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <i>
              <Icon name="check" size={28} />
            </i>
          </div>
          <p className="success-title">{expense ? t('expenseUpdated') : t('expenseAdded')}</p>
          <p className="success-amount">{formatAmount(saved.amount, currency)}</p>
          <p className="success-cat">
            <CategoryMark icon={saved.icon} size={28} />
            {saved.categoryName}
            {note.trim() ? <em>«{note.trim()}»</em> : null}
          </p>
          {expense ? null : (
            <button className="btn-mint" type="button" onClick={another}>
              {t('addAnother')}
            </button>
          )}
          <button className="btn-mint ghost" type="button" onClick={onClose}>
            {t('close')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="sheet" role="dialog" aria-label={expense ? t('editExpense') : t('newExpense')}>
      <div className="sheet-inner">
        <header className="sheet-top">
          <button className="icon-btn" type="button" aria-label={t('close')} onClick={onClose}>
            <Icon name="close" size={22} />
          </button>
          <h1>{expense ? t('editExpense') : t('newExpense')}</h1>
          <button className="save-link" type="button" disabled={!canSave} data-testid="save-expense" onClick={() => void save()}>
            {t('save')}
          </button>
        </header>
        <label className="amount-line">
          <span className="amount-symbol">{symbol}</span>
          <input
            data-testid="amount"
            inputMode="decimal"
            autoFocus
            placeholder="0"
            aria-label={t('amount')}
            value={amountText}
            onChange={(event) => setAmountText(event.target.value)}
          />
          <span className="select-shell tiny">
            <select
              aria-label={t('expenseCurrency')}
              value={currency}
              onChange={(event) => void updateHouseholdSettings({ currency: event.target.value as CurrencyCode })}
            >
              {CURRENCIES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" size={14} />
          </span>
        </label>
        {duplicate && picked ? (
          <p className="notice" role="status">
            {t('duplicateExpense', { name: categoryTitle(picked.icon, picked.name, t) })}
          </p>
        ) : null}
        <div className="tile-grid">
          {(['pace', 'fixed'] as const).map((kind) => {
            const items = [...snap.categories]
              .filter((category) => category.kind === kind)
              .sort((a, b) => a.sortOrder - b.sortOrder)
            if (items.length === 0) return null
            return (
              <div className="tile-span" key={kind}>
                <p className="tile-label">{t(kind === 'pace' ? 'dailyTitle' : 'regularTitle')}</p>
                {items.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className="tile"
                    aria-pressed={categoryId === category.id}
                    onClick={() => setCategoryId(category.id)}
                  >
                    <CategoryMark icon={category.icon} size={32} />
                    {categoryTitle(category.icon, category.name, t)}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
        <label className="meta-row">
          <Icon name="calendar" size={18} />
          <span>{date === today ? t('todayDate', { date: shortDate(date) }) : shortDate(date)}</span>
          <input
            type="date"
            aria-label={t('date')}
            value={date}
            onChange={(event) => {
              if (event.target.value) setDate(event.target.value)
            }}
          />
          <Icon name="chevron" size={16} />
        </label>
        <label className="meta-row">
          <Icon name="note" size={18} />
          <input
            aria-label={t('comment')}
            placeholder={t('commentPlaceholder')}
            value={note}
            maxLength={80}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      </div>
    </div>
  )
}
