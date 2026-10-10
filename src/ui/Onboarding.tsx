import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORY_ICONS, type CategoryIcon, type CategoryKind, type CurrencyCode } from '../data/types'
import { DEFAULT_CATEGORIES } from '../domain/defaults'
import { createId } from '../domain/id'
import { CURRENCIES, currencyMeta, formatAmount, parsePlan, sumRub } from '../domain/money'
import { useBudget } from './budget'
import { categoryKey, LanguageSwitch, useI18n, type TextKey } from './i18n'
import { CategoryMark, Icon } from './icons'
import { AmountField, Bar } from './widgets'

type Draft = {
  key: string
  name: string
  preset: TextKey | null
  icon: string
  kind: CategoryKind
  plannedAmount: number
}

function initialDrafts(t: (key: TextKey) => string): Draft[] {
  return DEFAULT_CATEGORIES.map((category) => {
    const preset = categoryKey(category.icon)
    return {
      key: createId(),
      name: t(preset),
      preset,
      icon: category.icon,
      kind: category.kind,
      plannedAmount: 0,
    }
  })
}

export function Onboarding({ extra = false, onCancel }: { extra?: boolean; onCancel?: () => void } = {}) {
  const { snap, error, createHousehold, joinHousehold } = useBudget()
  const { t, lang } = useI18n()
  const [step, setStep] = useState<1 | 2>(1)
  const [nameEdited, setNameEdited] = useState(false)
  const [name, setName] = useState(() => t('defaultBudget'))
  const [currency, setCurrency] = useState<CurrencyCode>('RUB')
  const [budgetText, setBudgetText] = useState('')
  const [drafts, setDrafts] = useState<Draft[]>(() => initialDrafts(t))
  const [pending, setPending] = useState(false)
  const skipLang = useRef(true)

  useEffect(() => {
    if (skipLang.current) {
      skipLang.current = false
      return
    }
    setDrafts((list) => list.map((draft) => (draft.preset ? { ...draft, name: t(draft.preset) } : draft)))
    if (!nameEdited) setName(t('defaultBudget'))
    // Язык меняет только нетронутые названия. t берётся из этого же кадра.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])
  const [personName, setPersonName] = useState(() => {
    if (!extra || snap.status !== 'ready') return ''
    return snap.members.find((member) => member.userId === snap.userId)?.displayName ?? ''
  })
  const [code, setCode] = useState(snap.status === 'needs_household' ? (snap.pendingCode ?? '') : '')
  const [displayName, setDisplayName] = useState('')
  const [wantJoin, setWantJoin] = useState(
    snap.status === 'needs_household' && (snap.mode !== 'remote' || Boolean(snap.pendingCode)),
  )

  const monthlyBudget = parsePlan(budgetText) ?? 0
  const allocated = sumRub(drafts.map((draft) => draft.plannedAmount))
  const budgetCents = Math.round(monthlyBudget * 100)
  const allocatedCents = Math.round(allocated * 100)
  const allocatedPercent = budgetCents > 0 ? Math.round((allocatedCents / budgetCents) * 100) : 0
  const allocationComplete = budgetCents > 0 && allocatedCents === budgetCents
  const unnamedLimit = drafts.some((draft) => draft.plannedAmount > 0 && !draft.name.trim())
  const symbol = currencyMeta(currency).symbol
  const canContinue = name.trim().length > 0 && monthlyBudget > 0
  const canCreate = allocationComplete && !unnamedLimit

  const tone = allocatedCents > budgetCents ? 'over' : allocationComplete ? 'ok' : 'zero'

  const summary = useMemo(
    () => `${formatAmount(allocated, currency)} / ${formatAmount(monthlyBudget, currency)}`,
    [allocated, currency, monthlyBudget],
  )

  async function create() {
    if (!canCreate) return
    setPending(true)
    await createHousehold({
      name,
      displayName: personName.trim() || t('me'),
      currency,
      monthlyBudget,
      paceEnabled: true,
      categories: drafts
        .filter((draft) => draft.name.trim())
        .map((draft) => ({
          name: draft.name,
          plannedAmount: draft.plannedAmount,
          kind: draft.kind,
          icon: draft.icon,
        })),
    })
    setPending(false)
  }

  async function join() {
    setPending(true)
    await joinHousehold(code, displayName)
    setPending(false)
  }

  if (snap.status === 'needs_household' && wantJoin) {
    const canJoin = displayName.trim().length > 0 && (snap.mode !== 'remote' || code.trim().length >= 4)
    return (
      <main className="shell onboard">
        <header className="wizard-top">
          <span className="push-side" />
          <span className="wizard-track" aria-hidden="true">
            <span style={{ width: '100%' }} />
          </span>
          <span className="wizard-count" />
        </header>
        <div className="onboard-body">
          <LanguageSwitch />
          <h1>{t('joinTitle')}</h1>
          <p className="sub">
            {snap.householdName ? t('joinHave', { name: snap.householdName }) : t('joinHavePlain')}
          </p>
          {error ? (
            <p className="banner" role="alert">
              {error}
            </p>
          ) : null}
          <label className="field">
            <span>{t('yourName')}</span>
            <input
              aria-label={t('yourName')}
              value={displayName}
              maxLength={40}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
          {snap.mode === 'remote' ? (
            <label className="field">
              <span>{t('code')}</span>
              <input
                aria-label={t('code')}
                value={code}
                autoCapitalize="characters"
                onChange={(event) => setCode(event.target.value.toUpperCase())}
              />
            </label>
          ) : null}
        </div>
        <div className="onboard-actions">
          <button className="btn-primary" type="button" disabled={pending || !canJoin} onClick={() => void join()}>
            {t('joinBudget')}
          </button>
          {snap.mode === 'remote' ? (
            <button className="quiet-link" type="button" onClick={() => setWantJoin(false)}>
              {t('createBudget')}
            </button>
          ) : null}
        </div>
      </main>
    )
  }

  return (
    <main className="shell onboard">
      <header className="wizard-top">
        <button
          className="icon-btn"
          type="button"
          aria-label={t('back')}
          disabled={step === 1 && !extra}
          onClick={() => {
            if (step === 2) setStep(1)
            else onCancel?.()
          }}
        >
          <Icon name="back" size={22} />
        </button>
        <span className="wizard-track" aria-hidden="true">
          <span style={{ width: step === 1 ? '50%' : '100%' }} />
        </span>
        <span className="wizard-count">
          {step}/2
        </span>
      </header>

      {error ? (
        <p className="banner" role="alert">
          {error}
        </p>
      ) : null}

      {step === 1 ? (
        <div className="onboard-body">
          <LanguageSwitch />
          <h1>{t('createTitle')}</h1>
          <p className="sub">{t('createSub')}</p>
          <label className="field">
            <span>{t('name')}</span>
            <input
              value={name}
              maxLength={60}
              onChange={(event) => {
                setNameEdited(true)
                setName(event.target.value)
              }}
            />
          </label>
          <label className="field">
            <span>{t('yourName')}</span>
            <input
              aria-label={t('yourName')}
              value={personName}
              maxLength={40}
              onChange={(event) => setPersonName(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t('currency')}</span>
            <span className="select-shell">
              <select
                aria-label={t('currency')}
                value={currency}
                onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
              >
                {CURRENCIES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
              <Icon name="chevronDown" size={16} />
            </span>
          </label>
          <label className="field">
            <span>{t('monthly')}</span>
            <span className="input-shell">
              <input
                aria-label={t('monthly')}
                inputMode="decimal"
                placeholder="0"
                value={budgetText}
                onChange={(event) => setBudgetText(event.target.value)}
              />
              <em>{symbol}</em>
            </span>
          </label>
        </div>
      ) : (
        <div className="onboard-body">
          <h1>{t('limitsTitle')}</h1>
          <p className="sub">{t('limitsSub')}</p>
          <section className="alloc" aria-label={t('allocated')}>
            <p className="alloc-kicker">{t('allocated')}</p>
            <div className="alloc-row">
              <strong>{summary}</strong>
              <span className={`tone-${tone}`}>{allocatedPercent}%</span>
            </div>
            <Bar percent={allocatedPercent} tone={tone === 'over' ? 'over' : 'ok'} />
          </section>
          {(['fixed', 'pace'] as const).map((kind) => (
            <section className="kind-block" key={kind}>
              <h2>{t(kind === 'fixed' ? 'regularTitle' : 'dailyTitle')}</h2>
              <p className="kind-hint">{t(kind === 'fixed' ? 'regularHint' : 'dailyHint')}</p>
              <ul className="limit-list">
                {drafts
                  .filter((draft) => draft.kind === kind)
                  .map((draft) => (
                    <li key={draft.key}>
                      <button
                        className="mark-btn"
                        type="button"
                        aria-label={t('iconOf', { name: draft.name || t('categoryFallback') })}
                        onClick={() => {
                          const index = CATEGORY_ICONS.indexOf(draft.icon as CategoryIcon)
                          const next = CATEGORY_ICONS[(index + 1) % CATEGORY_ICONS.length]
                          setDrafts((list) => list.map((item) => (item.key === draft.key ? { ...item, icon: next } : item)))
                        }}
                      >
                        <CategoryMark icon={draft.icon} />
                      </button>
                      <input
                        className="limit-name"
                        aria-label={t('categoryName')}
                        value={draft.name}
                        maxLength={40}
                        onChange={(event) => {
                          const next = event.target.value
                          setDrafts((list) =>
                            list.map((item) => (item.key === draft.key ? { ...item, name: next, preset: null } : item)),
                          )
                        }}
                      />
                      <span className="limit-money">
                        <span className="limit-symbol">{symbol}</span>
                        <AmountField
                          className="limit-amount"
                          ariaLabel={t('limitFor', { name: draft.name || t('categoryFallback') })}
                          commitOnChange
                          value={draft.plannedAmount}
                          onCommit={(plannedAmount) => {
                            setDrafts((list) =>
                              list.map((item) => (item.key === draft.key ? { ...item, plannedAmount } : item)),
                            )
                          }}
                        />
                      </span>
                      <button
                        className="trash"
                        type="button"
                        aria-label={t('deleteCategory', { name: draft.name || t('categoryFallback') })}
                        onClick={() => setDrafts((list) => list.filter((item) => item.key !== draft.key))}
                      >
                        <Icon name="trash" size={18} />
                      </button>
                    </li>
                  ))}
              </ul>
              <button
                className="kind-add"
                type="button"
                onClick={() =>
                  setDrafts((list) => [
                    ...list,
                    {
                      key: createId(),
                      name: '',
                      preset: null,
                      icon: kind === 'fixed' ? 'card' : 'shop',
                      kind,
                      plannedAmount: 0,
                    },
                  ])
                }
              >
                <Icon name="plus" size={16} /> {t('add')}
              </button>
            </section>
          ))}
        </div>
      )}

      <div className="onboard-actions">
        {step === 1 ? (
          <>
            <button className="btn-primary" type="button" disabled={!canContinue} onClick={() => setStep(2)}>
              {t('next')}
            </button>
            {snap.status === 'needs_household' && snap.mode === 'remote' ? (
              <button className="quiet-link" type="button" onClick={() => setWantJoin(true)}>
                {t('joinCode')}
              </button>
            ) : null}
          </>
        ) : (
          <>
            {canCreate ? null : (
              <p className="alloc-hint">
                {unnamedLimit
                  ? t('nameCategory')
                  : tone === 'over'
                    ? t('overBy', { amount: formatAmount(Math.max(0, allocated - monthlyBudget), currency) })
                    : t('leftToAllocate', { amount: formatAmount(Math.max(0, monthlyBudget - allocated), currency) })}
              </p>
            )}
            <button className="btn-primary" type="button" disabled={pending || !canCreate} onClick={() => void create()}>
              {t('createBudget')}
            </button>
          </>
        )}
      </div>
    </main>
  )
}
