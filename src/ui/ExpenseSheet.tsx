import { useState } from 'react'
import type { CurrencyCode, Expense } from '../data/types'
import { shortDate, todayISO } from '../domain/dates'
import { createId } from '../domain/id'
import { CURRENCIES, currencyMeta, formatAmount, parseAmount } from '../domain/money'
import { useBudget } from './budget'
import { categoryTitle, useI18n } from './i18n'
import { CategoryMark, Icon } from './icons'

export function ExpenseSheet({ onClose }: { onClose: () => void }) {
  const { snap, saveExpense, updateHouseholdSettings } = useBudget()
  const { t } = useI18n()
  const [amountText, setAmountText] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [date, setDate] = useState(() => todayISO())
  const [note, setNote] = useState('')
  const [phase, setPhase] = useState<'form' | 'done'>('form')
  const [saved, setSaved] = useState<{ amount: number; categoryName: string; icon: string } | null>(null)
  const [pending, setPending] = useState(false)

  if (snap.status !== 'ready') return null
  const currency = snap.household.currency
  const symbol = currencyMeta(currency).symbol
  const amount = parseAmount(amountText)
  const canSave = amount !== null && categoryId !== null && !pending
  const today = todayISO()

  async function save() {
    if (amount === null || !categoryId) return
    const category = snap.status === 'ready' ? snap.categories.find((item) => item.id === categoryId) : undefined
    if (!category || snap.status !== 'ready') return
    const expense: Expense = {
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
    const ok = await saveExpense(expense)
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
      <div className="sheet success" role="dialog" aria-label={t('expenseAdded')}>
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
          <p className="success-title">{t('expenseAdded')}</p>
          <p className="success-amount">{formatAmount(saved.amount, currency)}</p>
          <p className="success-cat">
            <CategoryMark icon={saved.icon} size={28} />
            {saved.categoryName}
            {note.trim() ? <em>«{note.trim()}»</em> : null}
          </p>
          <button className="btn-mint" type="button" onClick={another}>
            {t('addAnother')}
          </button>
          <button className="btn-mint ghost" type="button" onClick={onClose}>
            {t('close')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="sheet" role="dialog" aria-label={t('newExpense')}>
      <div className="sheet-inner">
        <header className="sheet-top">
          <button className="icon-btn" type="button" aria-label={t('close')} onClick={onClose}>
            <Icon name="close" size={22} />
          </button>
          <h1>{t('newExpense')}</h1>
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
