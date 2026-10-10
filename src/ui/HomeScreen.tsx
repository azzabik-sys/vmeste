import { daysUntilMonthEnd, formatDayCount, monthOf } from '../domain/dates'
import type { PaceJudgement, PaceLevel } from '../domain/pace'
import { spendTone } from '../domain/pace'
import { formatAmount, formatPercent } from '../domain/money'
import { summarizeMonth } from '../domain/summary'
import { useBudget } from './budget'
import { categoryTitle, useI18n, type TextKey } from './i18n'
import { CategoryMark, Icon } from './icons'
import { Bar, MonthPicker, Ring } from './widgets'

const AVATAR_COLORS = ['#3B82F6', '#7C6BF2', '#18A85B', '#F59E0B']

function paceNote(
  judgement: PaceJudgement,
  paceEnabled: boolean,
  t: (key: TextKey, vars?: Record<string, string | number>) => string,
  currency: string,
): { text: string; tone: 'warn' | 'over' } | null {
  if (judgement.reason === 'pace') {
    if (!paceEnabled) return null
    return { text: t('paceAbove'), tone: 'warn' }
  }
  if (judgement.reason === 'low') {
    return {
      text: t('paceLeft', { amount: formatAmount(judgement.amount, currency), days: formatDayCount(judgement.daysLeft) }),
      tone: 'over',
    }
  }
  if (judgement.reason === 'exceeded' || judgement.reason === 'no-plan') {
    return { text: t('paceOver', { amount: formatAmount(judgement.amount, currency) }), tone: 'over' }
  }
  return null
}

export function HomeScreen({
  date,
  monthStart,
  today,
  onMonth,
  onOpenPeople,
  onOpenSettings,
  onOpenCategory,
}: {
  date: string
  monthStart: string
  today: string
  onMonth: (monthStart: string) => void
  onOpenPeople: () => void
  onOpenSettings: () => void
  onOpenCategory: (categoryId: string) => void
}) {
  const { snap } = useBudget()
  const { t } = useI18n()
  if (snap.status !== 'ready') return null

  const summary = summarizeMonth(snap.categories, snap.expenses, date)
  const budget = snap.household.monthlyBudget
  const totalPercent = formatPercent(summary.spentTotal, budget)
  const totalTone: PaceLevel = totalPercent >= 100 ? 'over' : totalPercent >= 80 ? 'warn' : 'ok'
  const currency = snap.household.currency
  const leftCents = Math.round(budget * 100) - Math.round(summary.spentTotal * 100)
  const over = leftCents < 0
  const viewingNow = monthOf(monthStart).start === monthOf(today).start
  const daysLeft = viewingNow ? daysUntilMonthEnd(today) : null

  return (
    <section className="screen">
      <header className="topbar">
        <MonthPicker value={monthStart} today={today} onChange={onMonth} />
        <div className="top-actions">
          <div className="avatars">
            {snap.members.slice(0, 3).map((member, index) => (
              <button
                key={member.userId}
                type="button"
                style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
                aria-label={t('participants')}
                onClick={onOpenPeople}
              >
                {(member.displayName.trim()[0] || '?').toUpperCase()}
              </button>
            ))}
          </div>
          <button className="icon-btn" type="button" aria-label={t('settings')} onClick={onOpenSettings}>
            <Icon name="gear" size={22} />
          </button>
        </div>
      </header>

      <article className="spent-card">
        <div>
          <p className="spent-kicker">{over ? t('overBudget') : t('budgetLeft')}</p>
          <p className={`spent-value${over ? ' tone-over' : ''}`} data-testid="left">
            {formatAmount(Math.abs(leftCents) / 100, currency)}
          </p>
          <p className="spent-of">
            {t('spentOf', { amount: formatAmount(budget, currency) })}
            {daysLeft === null ? null : (
              <span className="spent-days">
                {daysLeft === 0 ? t('monthLastDay') : t('monthDaysLeft', { days: formatDayCount(daysLeft) })}
              </span>
            )}
          </p>
          <p className="spent-of" data-testid="spent">
            {t('spentAmount', { amount: formatAmount(summary.spentTotal, currency) })}
          </p>
        </div>
        <Ring percent={totalPercent} tone={totalTone} />
      </article>

      {(['pace', 'fixed'] as const).map((kind) => {
        const rows = summary.rows.filter((row) => row.category.kind === kind)
        if (rows.length === 0) return null
        return (
          <section className="cat-group" key={kind}>
            <h2>{t(kind === 'pace' ? 'dailyTitle' : 'regularTitle')}</h2>
            <p className="kind-hint">{t(kind === 'pace' ? 'dailyHint' : 'regularHint')}</p>
            <ul className="cat-list">
              {rows.map((row) => {
                const tone = spendTone({
                  percent: row.percent,
                  judgement: row.judgement,
                  paceEnabled: snap.household.paceEnabled,
                  kind: row.category.kind,
                })
                const label = categoryTitle(row.category.icon, row.category.name, t)
                const note = row.category.kind === 'pace' ? paceNote(row.judgement, snap.household.paceEnabled, t, currency) : null
                return (
                  <li key={row.category.id}>
                    <button
                      className="cat"
                      type="button"
                      data-testid={`row-${row.category.name}`}
                      data-tone={tone}
                      onClick={() => onOpenCategory(row.category.id)}
                    >
                      <CategoryMark icon={row.category.icon} />
                      <span className="cat-copy">
                        <span className="cat-name">{label}</span>
                        <span className="cat-meta">
                          {formatAmount(row.spent, currency)} / {formatAmount(row.category.plannedAmount, currency)}
                        </span>
                        {note ? <span className={`cat-note tone-${note.tone}`}>{note.text}</span> : null}
                        <Bar percent={row.percent} tone={tone} />
                      </span>
                      <span className={`cat-side ${row.percent > 0 ? `tone-${tone}` : 'tone-zero'}`}>
                        {row.percent}%
                        <Icon name="chevron" size={16} />
                      </span>
                    </button>
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
