import { useState } from 'react'
import { formatLocale } from '../domain/formatLocale'
import { currencyMeta, formatAmount, sumRub } from '../domain/money'
import { useBudget } from './budget'
import { CategoriesScreen } from './CategoriesScreen'
import { useI18n } from './i18n'
import { Icon } from './icons'
import { AmountField } from './widgets'

export function PlanScreen() {
  const { snap, updateHouseholdSettings } = useBudget()
  const { t } = useI18n()
  const [editingBudget, setEditingBudget] = useState(false)
  if (snap.status !== 'ready') return null
  const { household } = snap
  const symbol = currencyMeta(household.currency).symbol
  const plannedSum = sumRub(snap.categories.map((category) => category.plannedAmount))
  const gapCents = Math.round(plannedSum * 100) - Math.round(household.monthlyBudget * 100)

  return (
    <section className="screen screen-plain">
      <header className="push-top">
        <span className="push-side" />
        <h1 className="push-title">{t('planTitle')}</h1>
        <span className="push-side" />
      </header>

      <label className="set-label">{t('totalBudget', { symbol })}</label>
      <div className="set-card budget-line">
        {editingBudget ? (
          <AmountField
            className="budget-input"
            ariaLabel={t('totalBudget', { symbol })}
            autoFocus
            value={household.monthlyBudget}
            onFinished={() => setEditingBudget(false)}
            onCommit={(monthlyBudget) => {
              if (monthlyBudget > 0) void updateHouseholdSettings({ monthlyBudget })
            }}
          />
        ) : (
          <strong>{new Intl.NumberFormat(formatLocale()).format(household.monthlyBudget)}</strong>
        )}
        <button className="icon-btn" type="button" aria-label={t('editBudget')} onClick={() => setEditingBudget(true)}>
          <Icon name="pencil" size={18} />
        </button>
      </div>
      {gapCents !== 0 ? (
        <>
          <p className={`alloc-hint${gapCents > 0 ? ' tone-over' : ''}`}>
            {gapCents > 0
              ? t('overBy', { amount: formatAmount(plannedSum - household.monthlyBudget, household.currency) })
              : t('leftToAllocate', { amount: formatAmount(household.monthlyBudget - plannedSum, household.currency) })}
          </p>
          <button
            className="btn-secondary plan-match"
            type="button"
            onClick={() => void updateHouseholdSettings({ monthlyBudget: plannedSum })}
          >
            {t('matchBudget')}
          </button>
        </>
      ) : null}

      <CategoriesScreen embedded />
    </section>
  )
}
