import { daysUntilMonthEnd, formatDayCount, monthOf, monthSpan } from '../domain/dates'
import { formatLocale } from '../domain/formatLocale'
import type { PaceJudgement, PaceLevel } from '../domain/pace'
import { spendTone } from '../domain/pace'
import { formatAmount, formatPercent } from '../domain/money'
import { summarizeMonth } from '../domain/summary'
import { useBudget } from './budget'
import { categoryTitle, useI18n, type TextKey } from './i18n'
import { CategoryMark, categoryLook, Icon } from './icons'
import { useLook } from './look'
import { Bar, Gauge, MonthPicker, Ring } from './widgets'

const AVATARS = [
  { bg: '#1F8A4C', fg: '#fff' },
  { bg: '#F3E2C4', fg: '#171714' },
  { bg: '#3B82F6', fg: '#fff' },
  { bg: '#7C6BF2', fg: '#fff' },
]

function daysLeftPhrase(
  count: number,
  t: (key: TextKey, vars?: Record<string, string | number>) => string,
) {
  const rule = new Intl.PluralRules(formatLocale()).select(count)
  const key: TextKey =
    rule === 'one' ? 'daysLeftOne' : rule === 'few' || rule === 'two' ? 'daysLeftFew' : rule === 'many' ? 'daysLeftMany' : 'daysLeftOther'
  return t(key, { count })
}

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
  const { look } = useLook()
  const classic = look === 'classic'
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
                style={
                  classic
                    ? { background: ['#3B82F6', '#7C6BF2', '#18A85B', '#F59E0B'][index % 4] }
                    : { background: AVATARS[index % AVATARS.length].bg, color: AVATARS[index % AVATARS.length].fg }
                }
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
        {classic ? (
          <>
            <div className="spent-top">
              <div>
                <p className="spent-kicker">{over ? t('overBudget') : t('budgetLeft')}</p>
                <p className={`spent-value${over ? ' tone-over' : ''}`} data-testid="left">
                  {formatAmount(Math.abs(leftCents) / 100, currency)}
                </p>
                <p className="spent-of">{t('spentOf', { amount: formatAmount(budget, currency) })}</p>
              </div>
              <Ring percent={totalPercent} tone={totalTone} />
            </div>
            <div className="spent-foot">
              <p data-testid="spent">{t('spentAmount', { amount: formatAmount(summary.spentTotal, currency) })}</p>
              {daysLeft === null ? null : (
                <p className="spent-days">
                  <Icon name="calendar" size={15} />
                  {daysLeft === 0 ? t('monthLastDay') : daysLeftPhrase(daysLeft, t)}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="spent-main">
              <Gauge percent={totalPercent} tone={totalTone} caption={t('spent')} />
              <span className="spent-rule" />
              <div>
                <p className="spent-kicker">
                  {over ? t('overBudget') : t('budgetLeft')}
                  <Icon name="chevron" size={16} />
                </p>
                <p className={`spent-value${over ? ' tone-over' : ''}`} data-testid="left">
                  {formatAmount(Math.abs(leftCents) / 100, currency)}
                </p>
                <p className="spent-of">{t('spentOf', { amount: formatAmount(budget, currency) })}</p>
              </div>
            </div>
            <div className="spent-foot">
              <p className="spent-stat" data-testid="spent">
                <span className="spent-ico">
                  <Icon name="card" size={16} />
                </span>
                <span>
                  <em>{t('spent')}</em>
                  <strong>{formatAmount(summary.spentTotal, currency)}</strong>
                </span>
              </p>
              <p className="spent-stat">
                <span className="spent-ico">
                  <Icon name="calendar" size={16} />
                </span>
                <span>
                  {daysLeft === null ? (
                    <strong>{monthSpan(monthStart)}</strong>
                  ) : (
                    <>
                      <strong>{daysLeft === 0 ? t('monthLastDay') : daysLeftPhrase(daysLeft, t)}</strong>
                      <em>{monthSpan(monthStart)}</em>
                    </>
                  )}
                </span>
              </p>
            </div>
          </>
        )}
      </article>

      {(['pace', 'fixed'] as const).map((kind) => {
        const rows = summary.rows.filter((row) => row.category.kind === kind)
        if (rows.length === 0) return null
        return (
          <section className="cat-group" key={kind}>
            <h2>{t(kind === 'pace' ? 'dailyTitle' : 'regularTitle')}</h2>
            {classic ? <p className="kind-hint">{t(kind === 'pace' ? 'dailyHint' : 'regularHint')}</p> : null}
            <ul className="cat-list">
              {rows.map((row) => {
                const tone = spendTone({
                  percent: row.percent,
                  judgement: row.judgement,
                  paceEnabled: snap.household.paceEnabled,
                  kind: row.category.kind,
                })
                const accent = tone === 'over' || row.percent > 100 ? '#EF4444' : categoryLook(row.category.icon).fg
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
                      <CategoryMark icon={row.category.icon} size={classic ? 34 : 44} />
                      <span className="cat-copy">
                        <span className="cat-name">{label}</span>
                        <span className="cat-meta">
                          {formatAmount(row.spent, currency)} / {formatAmount(row.category.plannedAmount, currency)}
                        </span>
                        {note ? <span className={`cat-note tone-${note.tone}`}>{note.text}</span> : null}
                        {classic ? <Bar percent={row.percent} tone={tone} /> : null}
                      </span>
                      <span className={`cat-side ${row.percent > 0 ? (classic ? `tone-${tone}` : '') : 'tone-zero'}`}>
                        {classic ? (
                          <>
                            {row.percent}%
                            <Icon name="chevron" size={16} />
                          </>
                        ) : (
                          <>
                            <span style={row.percent > 0 ? { color: accent } : undefined}>{row.percent}%</span>
                            <Icon name="chevron" size={16} />
                          </>
                        )}
                      </span>
                      {classic ? null : <Bar percent={row.percent} tone={tone} color={accent} />}
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
