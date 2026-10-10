import { useState } from 'react'
import type { Expense } from '../data/types'
import { monthOf, paceDateForMonth, todayISO } from '../domain/dates'
import { useBudget } from './budget'
import { useI18n } from './i18n'
import { ErrorScreen, GateScreen, LoadingScreen } from './GateScreen'
import { ExpenseSheet } from './ExpenseSheet'
import { HistoryScreen } from './HistoryScreen'
import { HomeScreen } from './HomeScreen'
import { Icon } from './icons'
import { Onboarding } from './Onboarding'
import { PeopleSheet } from './PeopleSheet'
import { PlanScreen } from './PlanScreen'
import { Notices } from './notices'
import { SettingsScreen } from './SettingsScreen'

type Tab = 'home' | 'history' | 'plan' | 'settings'

const TABS: { id: Tab; label: Tab; icon: string }[] = [
  { id: 'home', label: 'home', icon: 'navHome' },
  { id: 'history', label: 'history', icon: 'history' },
  { id: 'plan', label: 'plan', icon: 'plan' },
  { id: 'settings', label: 'settings', icon: 'gear' },
]

export function App() {
  const { snap, error, refresh } = useBudget()
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('home')
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [peopleOpen, setPeopleOpen] = useState(false)
  const [monthStart, setMonthStart] = useState(() => monthOf(todayISO()).start)
  const [categoryFocus, setCategoryFocus] = useState<string | null>(null)
  const [seenStatus, setSeenStatus] = useState(snap.status)
  if (snap.status !== seenStatus) {
    const previous = seenStatus
    setSeenStatus(snap.status)
    if ((previous === 'onboarding' || previous === 'needs_household') && snap.status === 'ready') {
      if (tab !== 'home') setTab('home')
      if (expenseOpen) setExpenseOpen(false)
      if (editing) setEditing(null)
      if (peopleOpen) setPeopleOpen(false)
      if (categoryFocus) setCategoryFocus(null)
    }
  }

  if (snap.status === 'loading') return <LoadingScreen />
  if (snap.status === 'error') return <ErrorScreen message={snap.message} onRetry={() => void refresh()} />
  if (snap.status === 'signed_out') return <GateScreen />
  if (snap.status === 'onboarding' || snap.status === 'needs_household') return <Onboarding />

  const today = todayISO()
  const activeDate = paceDateForMonth(monthStart, today)

  if (categoryFocus) {
    return (
      <div className="shell">
        {error ? (
          <p className="banner" role="alert">
            {error}
          </p>
        ) : null}
        <Notices />
        <HistoryScreen
          focusCategoryId={categoryFocus}
          onBack={() => setCategoryFocus(null)}
          onEdit={(expense) => {
            setEditing(expense)
            setExpenseOpen(true)
          }}
        />
        {expenseOpen ? (
          <ExpenseSheet
            expense={editing}
            onClose={() => {
              setExpenseOpen(false)
              setEditing(null)
            }}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className="shell">
      {error ? (
        <p className="banner" role="alert">
          {error}
        </p>
      ) : null}
      <Notices />
      {tab === 'home' ? (
        <HomeScreen
          date={activeDate}
          monthStart={monthStart}
          today={today}
          onMonth={setMonthStart}
          onOpenPeople={() => setPeopleOpen(true)}
          onOpenSettings={() => setTab('settings')}
          onOpenCategory={setCategoryFocus}
        />
      ) : null}
      {tab === 'history' ? (
        <HistoryScreen
          onEdit={(expense) => {
            setEditing(expense)
            setExpenseOpen(true)
          }}
        />
      ) : null}
      {tab === 'plan' ? <PlanScreen /> : null}
      {tab === 'settings' ? (
        <SettingsScreen
          monthStart={monthStart}
          today={today}
          onMonth={setMonthStart}
          onBack={() => setTab('home')}
        />
      ) : null}
      {tab === 'home' ? (
        <button
          className="add-expense"
          type="button"
          onClick={() => {
            setEditing(null)
            setExpenseOpen(true)
          }}
        >
          <Icon name="plus" size={18} /> {t('addExpense')}
        </button>
      ) : null}
      <nav className="tabbar" aria-label={t('sections')}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => setTab(item.id)}
          >
            <Icon name={item.icon} size={22} />
            {t(item.label)}
          </button>
        ))}
      </nav>
      {expenseOpen ? (
        <ExpenseSheet
          expense={editing}
          onClose={() => {
            setExpenseOpen(false)
            setEditing(null)
          }}
        />
      ) : null}
      <PeopleSheet open={peopleOpen} onClose={() => setPeopleOpen(false)} />
    </div>
  )
}
