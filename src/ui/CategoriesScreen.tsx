import { useEffect, useRef, useState } from 'react'
import { CATEGORY_ICONS, type CategoryIcon, type CategoryKind } from '../data/types'
import { currencyMeta } from '../domain/money'
import { useBudget } from './budget'
import { categoryTitle, useI18n } from './i18n'
import { CategoryMark, Icon } from './icons'
import { AmountField } from './widgets'

export function CategoriesScreen({ onBack, embedded = false }: { onBack?: () => void; embedded?: boolean }) {
  const { snap, updateCategory, deleteCategory, addCategory, reorderCategories } = useBudget()
  const { t, lang } = useI18n()
  const idKey =
    snap.status === 'ready'
      ? [...snap.categories]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((category) => category.id)
          .join('|')
      : ''
  const [order, setOrder] = useState<string[]>(() => idKey.split('|').filter(Boolean))
  const [adding, setAdding] = useState<CategoryKind | null>(null)
  const [draftName, setDraftName] = useState('')
  const dragId = useRef<string | null>(null)
  const orderRef = useRef<string[]>(order)
  const rowRefs = useRef(new Map<string, HTMLLIElement>())

  useEffect(() => {
    const next = idKey.split('|').filter(Boolean)
    orderRef.current = next
    setOrder(next)
  }, [idKey])

  if (snap.status !== 'ready') return null
  const byId = new Map(snap.categories.map((category) => [category.id, category]))
  const symbol = currencyMeta(snap.household.currency).symbol

  function move(clientY: number) {
    const id = dragId.current
    if (!id) return
    let target: string | null = null
    for (const [rowId, element] of rowRefs.current) {
      const rect = element.getBoundingClientRect()
      if (clientY >= rect.top && clientY <= rect.bottom) target = rowId
    }
    if (!target || target === id) return
    if (byId.get(target)?.kind !== byId.get(id)?.kind) return
    const next = [...orderRef.current]
    const from = next.indexOf(id)
    const to = next.indexOf(target)
    if (from < 0 || to < 0) return
    next.splice(from, 1)
    next.splice(to, 0, id)
    orderRef.current = next
    setOrder(next)
  }

  function rowsFor(kind: CategoryKind) {
    return order.filter((id) => byId.get(id)?.kind === kind)
  }

  const groups = (['fixed', 'pace'] as const).map((kind) => (
    <section className="kind-block" key={kind}>
      <h2>{t(kind === 'fixed' ? 'regularTitle' : 'dailyTitle')}</h2>
      <p className="kind-hint">{t(kind === 'fixed' ? 'regularHint' : 'dailyHint')}</p>
      <ul className="manage-list">
        {rowsFor(kind).map((id) => {
          const category = byId.get(id)
          if (!category) return null
          const label = categoryTitle(category.icon, category.name, t)
          return (
            <li
              key={id}
              ref={(node) => {
                if (node) rowRefs.current.set(id, node)
                else rowRefs.current.delete(id)
              }}
            >
              <button
                className="grip"
                type="button"
                aria-label={t('orderOf', { name: label })}
                onPointerDown={(event) => {
                  dragId.current = id
                  event.currentTarget.setPointerCapture(event.pointerId)
                }}
                onPointerMove={(event) => {
                  if (dragId.current) move(event.clientY)
                }}
                onPointerUp={() => {
                  if (!dragId.current) return
                  dragId.current = null
                  void reorderCategories(orderRef.current)
                }}
              >
                <Icon name="grip" size={16} />
              </button>
              <button
                className="mark-btn"
                type="button"
                aria-label={t('iconOf', { name: label || t('categoryFallback') })}
                onClick={() => {
                  const index = CATEGORY_ICONS.indexOf(category.icon as CategoryIcon)
                  const next = CATEGORY_ICONS[(index + 1) % CATEGORY_ICONS.length]
                  void updateCategory(category.id, { icon: next })
                }}
              >
                <CategoryMark icon={category.icon} size={32} />
              </button>
              <input
                className="manage-name"
                aria-label={t('categoryNameOf', { name: label })}
                defaultValue={label}
                key={`${category.id}-${category.name}-${lang}`}
                maxLength={40}
                onBlur={(event) => {
                  const next = event.target.value.trim()
                  if (!next || next === label || next === category.name) return
                  void updateCategory(category.id, { name: next })
                }}
              />
              <span className="manage-amount">
                <span className="limit-symbol">{symbol}</span>
                <AmountField
                  ariaLabel={t('limitFor', { name: label })}
                  value={category.plannedAmount}
                  onCommit={(plannedAmount) => void updateCategory(category.id, { plannedAmount })}
                />
                <Icon name="chevron" size={16} />
              </span>
              <button
                className="trash"
                type="button"
                aria-label={t('deleteCategory', { name: label || t('categoryFallback') })}
                onClick={() => void deleteCategory(category.id)}
              >
                <Icon name="trash" size={16} />
              </button>
            </li>
          )
        })}
      </ul>
      {adding === kind ? (
        <form
          className="add-row"
          onSubmit={(event) => {
            event.preventDefault()
            const name = draftName.trim()
            if (!name) return
            void addCategory({ name, plannedAmount: 0, kind, icon: kind === 'fixed' ? 'card' : 'shop' })
            setAdding(null)
            setDraftName('')
          }}
        >
          <input
            autoFocus
            aria-label={t('newCategory')}
            placeholder={t('namePlaceholder')}
            value={draftName}
            maxLength={40}
            onChange={(event) => setDraftName(event.target.value)}
          />
          <button className="btn-primary slim" type="submit">
            {t('add')}
          </button>
        </form>
      ) : (
        <button
          className="kind-add"
          type="button"
          onClick={() => {
            setAdding(kind)
            setDraftName('')
          }}
        >
          <Icon name="plus" size={16} /> {t('add')}
        </button>
      )}
    </section>
  ))

  if (embedded) return <>{groups}</>

  return (
    <section className="screen screen-plain">
      <header className="push-top">
        <button className="icon-btn" type="button" aria-label={t('back')} onClick={onBack}>
          <Icon name="back" size={22} />
        </button>
        <h1 className="push-title">{t('categories')}</h1>
        <span className="push-side" />
      </header>
      {groups}
    </section>
  )
}
