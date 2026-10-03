import { useState } from 'react'
import { formatTime, historyHeading, todayISO } from '../domain/dates'
import { formatLocale } from '../domain/formatLocale'
import { formatAmount, sumRub } from '../domain/money'
import { useBudget } from './budget'
import { categoryTitle, useI18n } from './i18n'
import { CategoryMark, Icon } from './icons'

export function HistoryScreen({
  focusCategoryId = null,
  onBack,
}: {
  focusCategoryId?: string | null
  onBack?: () => void
}) {
  const { snap, removeExpense } = useBudget()
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [pickedCategoryId, setPickedCategoryId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  if (snap.status !== 'ready') return null

  const categoryId = focusCategoryId ?? pickedCategoryId
  const focused = snap.categories.find((category) => category.id === focusCategoryId)
  const today = todayISO()
  const categories = new Map(snap.categories.map((category) => [category.id, category]))
  const members = new Map(snap.members.map((member) => [member.userId, member.displayName]))
  const needle = query.trim().toLocaleLowerCase(formatLocale())

  const expenses = snap.expenses
    .filter((expense) => (categoryId ? expense.categoryId === categoryId : true))
    .filter((expense) => {
      if (!needle || focusCategoryId) return true
      const category = categories.get(expense.categoryId)
      const label = category ? categoryTitle(category.icon, category.name, t) : ''
      const person = members.get(expense.createdBy) ?? ''
      const title = `${expense.note} ${category?.name ?? ''} ${label} ${person}`.toLocaleLowerCase(formatLocale())
      return title.includes(needle)
    })
    .sort((a, b) => (a.spentOn === b.spentOn ? b.createdAt.localeCompare(a.createdAt) : b.spentOn.localeCompare(a.spentOn)))

  const groups: [string, typeof expenses][] = []
  for (const expense of expenses) {
    const last = groups[groups.length - 1]
    if (last && last[0] === expense.spentOn) last[1].push(expense)
    else groups.push([expense.spentOn, [expense]])
  }

  return (
    <section className="screen screen-plain">
      <header className="push-top">
        {onBack ? (
          <button className="icon-btn" type="button" aria-label={t('back')} onClick={onBack}>
            <Icon name="back" size={22} />
          </button>
        ) : (
          <span className="push-side" />
        )}
        <h1 className="push-title">
          {focused ? categoryTitle(focused.icon, focused.name, t) : t('history')}
        </h1>
        {focusCategoryId ? (
          <span className="push-side" />
        ) : (
          <span className="push-tools">
            <button className="icon-btn" type="button" aria-label={t('search')} onClick={() => setSearchOpen((open) => !open)}>
              <Icon name="search" size={20} />
            </button>
            <button className="icon-btn" type="button" aria-label={t('filter')} onClick={() => setFilterOpen((open) => !open)}>
              <Icon name="filter" size={20} />
            </button>
          </span>
        )}
      </header>
      {searchOpen && !focusCategoryId ? (
        <input
          className="search-input"
          placeholder={t('search')}
          value={query}
          aria-label={t('search')}
          onChange={(event) => setQuery(event.target.value)}
        />
      ) : null}
      {filterOpen && !focusCategoryId ? (
        <div className="chips">
          <button type="button" aria-pressed={pickedCategoryId === null} onClick={() => setPickedCategoryId(null)}>
            {t('all')}
          </button>
          {snap.categories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={pickedCategoryId === category.id}
              onClick={() => setPickedCategoryId(category.id)}
            >
              {categoryTitle(category.icon, category.name, t)}
            </button>
          ))}
        </div>
      ) : null}

      {groups.length === 0 ? <p className="empty">{t('noExpenses')}</p> : null}
      {groups.map(([day, items]) => {
        const total = sumRub(items.map((expense) => expense.amount))
        return (
          <section key={day} className="day-group">
            <header>
              <h2>{historyHeading(day, today)}</h2>
              <strong>{formatAmount(total, snap.household.currency)}</strong>
            </header>
            <ul>
              {items.map((expense) => {
                const category = categories.get(expense.categoryId)
                const label = category ? categoryTitle(category.icon, category.name, t) : t('category')
                const title = expense.note.trim() || label || t('expense')
                const person = (members.get(expense.createdBy) || '').trim()
                const initial = person[0]?.toUpperCase() || '?'
                const subtitle = expense.note.trim() ? [label, person].filter(Boolean).join(' · ') : person
                return (
                  <li key={expense.id}>
                    <button className="hist" type="button" onClick={() => setOpenId(openId === expense.id ? null : expense.id)}>
                      <CategoryMark icon={category?.icon || 'shop'} size={32} />
                      <span className="hist-copy">
                        <span className="hist-title">{title}</span>
                        {subtitle ? <span className="hist-sub">{subtitle}</span> : null}
                      </span>
                      <span className="hist-time">{formatTime(expense.createdAt)}</span>
                      <span className="avatar sm">{initial}</span>
                      <span className="hist-amount">{formatAmount(expense.amount, snap.household.currency)}</span>
                    </button>
                    {openId === expense.id ? (
                      <button className="row-delete" type="button" onClick={() => void removeExpense(expense.id)}>
                        {t('delete')}
                      </button>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </section>
  )
}
