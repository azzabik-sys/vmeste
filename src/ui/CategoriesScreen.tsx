import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CATEGORY_ICONS, type CategoryIcon, type CategoryKind } from '../data/types'
import { currencyMeta, formatAmount } from '../domain/money'
import { useBudget } from './budget'
import { categoryTitle, useI18n } from './i18n'
import { CategoryMark, Icon } from './icons'
import { useLook } from './look'
import { AmountField } from './widgets'

type Row = { id: string; kind: CategoryKind }

function signatureOf(categories: { id: string; kind: CategoryKind; sortOrder: number }[]) {
  return [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    .map((category) => `${category.id}:${category.kind}`)
    .join('|')
}

function rowsFrom(signature: string): Row[] {
  return signature
    .split('|')
    .filter(Boolean)
    .map((part) => {
      const split = part.indexOf(':')
      const id = part.slice(0, split)
      const kind = part.slice(split + 1) === 'fixed' ? 'fixed' : 'pace'
      return { id, kind }
    })
}

function placeRow(rows: Row[], id: string, kind: CategoryKind, index: number): Row[] {
  const rest = rows.filter((row) => row.id !== id)
  const fixed = rest.filter((row) => row.kind === 'fixed')
  const pace = rest.filter((row) => row.kind === 'pace')
  const bucket = kind === 'fixed' ? fixed : pace
  bucket.splice(Math.max(0, Math.min(index, bucket.length)), 0, { id, kind })
  return [...fixed, ...pace]
}

function sameRows(left: Row[], right: Row[]) {
  return left.length === right.length && left.every((row, index) => row.id === right[index]?.id && row.kind === right[index]?.kind)
}

export function CategoriesScreen({ onBack, embedded = false }: { onBack?: () => void; embedded?: boolean }) {
  const { snap, updateCategory, deleteCategory, addCategory, reorderCategories } = useBudget()
  const { t, lang } = useI18n()
  const { look } = useLook()
  const signature = snap.status === 'ready' ? signatureOf(snap.categories) : ''
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(signature))
  const [adding, setAdding] = useState<CategoryKind | null>(null)
  const [draftName, setDraftName] = useState('')
  const [lifted, setLifted] = useState<string | null>(null)
  const dragId = useRef<string | null>(null)
  const rowsRef = useRef<Row[]>(rows)
  const serverRef = useRef(signature)
  const rowRefs = useRef(new Map<string, HTMLLIElement>())
  const sectionRefs = useRef(new Map<CategoryKind, HTMLElement>())
  const ghostRef = useRef<HTMLDivElement>(null)
  const pointRef = useRef({ x: 0, y: 0, dx: 0, dy: 0, width: 0, height: 0 })

  useEffect(() => {
    if (dragId.current) return
    serverRef.current = signature
    const next = rowsFrom(signature)
    rowsRef.current = next
    setRows(next)
  }, [signature])

  function paintGhost(x: number, y: number) {
    pointRef.current.x = x
    pointRef.current.y = y
    const ghost = ghostRef.current
    if (!ghost) return
    const { dx, dy } = pointRef.current
    ghost.style.transform = `translate3d(${x - dx}px, ${y - dy}px, 0)`
  }

  function sectionKind(clientY: number): CategoryKind {
    const boxes = (['pace', 'fixed'] as const)
      .flatMap((kind) => {
        const rect = sectionRefs.current.get(kind)?.getBoundingClientRect()
        return rect ? [{ kind, rect }] : []
      })
      .sort((a, b) => a.rect.top - b.rect.top)
    if (boxes.length === 0) return 'pace'
    for (let index = 0; index < boxes.length; index += 1) {
      const next = boxes[index + 1]
      if (!next) return boxes[index].kind
      const split = (boxes[index].rect.bottom + next.rect.top) / 2
      if (clientY < split) return boxes[index].kind
    }
    return boxes[boxes.length - 1].kind
  }

  function relocate(clientY: number) {
    const id = dragId.current
    if (!id) return
    const kind = sectionKind(clientY)
    const list = rowsRef.current.filter((row) => row.kind === kind && row.id !== id)
    let index = list.length
    for (let item = 0; item < list.length; item += 1) {
      const element = rowRefs.current.get(list[item].id)
      if (!element) continue
      const rect = element.getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) {
        index = item
        break
      }
    }
    const next = placeRow(rowsRef.current, id, kind, index)
    if (sameRows(next, rowsRef.current)) return
    rowsRef.current = next
    setRows(next)
  }

  function finish() {
    const id = dragId.current
    dragId.current = null
    document.body.style.overflow = ''
    const items = rowsRef.current
    const changed = items.map((row) => `${row.id}:${row.kind}`).join('|') !== serverRef.current
    const ghost = ghostRef.current
    const row = id ? rowRefs.current.get(id) : null
    const commit = () => {
      setLifted(null)
      if (changed) void reorderCategories(items.map((row) => row.id), items.map((row) => row.kind))
    }
    if (!ghost || !row) {
      commit()
      return
    }
    const rect = row.getBoundingClientRect()
    const animation = ghost.animate(
      [{ transform: ghost.style.transform }, { transform: `translate3d(${rect.left}px, ${rect.top}px, 0)` }],
      { duration: 180, easing: 'ease-out', fill: 'forwards' },
    )
    const done = () => commit()
    animation.onfinish = done
    animation.oncancel = done
  }

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>, id: string) {
    if (event.button !== 0) return
    const row = rowRefs.current.get(id)
    if (!row) return
    event.preventDefault()
    const rect = row.getBoundingClientRect()
    dragId.current = id
    pointRef.current = {
      x: event.clientX,
      y: event.clientY,
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    }
    setLifted(id)
    document.body.style.overflow = 'hidden'
    const pointerId = event.pointerId
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      paintGhost(ev.clientX, ev.clientY)
      relocate(ev.clientY)
    }
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      finish()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  useEffect(() => {
    if (!lifted) return
    paintGhost(pointRef.current.x, pointRef.current.y)
  }, [lifted])

  if (snap.status !== 'ready') return null
  const byId = new Map(snap.categories.map((category) => [category.id, category]))
  const symbol = currencyMeta(snap.household.currency).symbol
  const liftedCategory = lifted ? byId.get(lifted) : undefined
  const liftedLabel = liftedCategory ? categoryTitle(liftedCategory.icon, liftedCategory.name, t) : ''

  function rowsFor(kind: CategoryKind) {
    return rows.filter((row) => row.kind === kind)
  }

  const groups = (['pace', 'fixed'] as const).map((kind) => (
    <section
      className={`kind-block${lifted && rows.find((row) => row.id === lifted)?.kind === kind ? ' is-target' : ''}`}
      key={kind}
      ref={(node) => {
        if (node) sectionRefs.current.set(kind, node)
        else sectionRefs.current.delete(kind)
      }}
    >
      <h2>{t(kind === 'fixed' ? 'regularTitle' : 'dailyTitle')}</h2>
      {look === 'classic' ? <p className="kind-hint">{t(kind === 'fixed' ? 'regularHint' : 'dailyHint')}</p> : null}
      <ul className="manage-list">
        {rowsFor(kind).map((row) => {
          const category = byId.get(row.id)
          if (!category) return null
          const label = categoryTitle(category.icon, category.name, t)
          return (
            <li
              key={row.id}
              className={lifted === row.id ? 'is-lifted' : undefined}
              ref={(node) => {
                if (node) rowRefs.current.set(row.id, node)
                else rowRefs.current.delete(row.id)
              }}
            >
              <button
                className="grip"
                type="button"
                aria-label={t('orderOf', { name: label })}
                onPointerDown={(event) => startDrag(event, row.id)}
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

  const ghost = lifted && liftedCategory ? (
    <div
      className="drag-ghost"
      ref={ghostRef}
      style={{ width: pointRef.current.width || undefined, height: pointRef.current.height || undefined }}
    >
      <Icon name="grip" size={16} />
      <CategoryMark icon={liftedCategory.icon} size={32} />
      <span>{liftedLabel}</span>
      <strong>{formatAmount(liftedCategory.plannedAmount, snap.household.currency)}</strong>
    </div>
  ) : null

  if (embedded) {
    return (
      <>
        {groups}
        {ghost}
      </>
    )
  }

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
      {ghost}
    </section>
  )
}
