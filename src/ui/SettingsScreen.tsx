import { useRef, useState } from 'react'
import { formatLocale } from '../domain/formatLocale'
import { CURRENCIES, currencyMeta } from '../domain/money'
import { useBudget } from './budget'
import { LANGS, useI18n, type TextKey } from './i18n'
import { Icon } from './icons'
import { LegalScreen } from './LegalScreen'
import type { LegalId } from './legalCopy'
import { Onboarding } from './Onboarding'

type Page = 'main' | 'invite' | 'currency' | 'language' | 'account'

const PERSON_TINTS = [
  { bg: '#d9f5e6', fg: '#14824a' },
  { bg: '#ece8ff', fg: '#7c6bf2' },
  { bg: '#e7f1ff', fg: '#3b82f6' },
  { bg: '#fff3e0', fg: '#d97706' },
]

function peoplePhrase(count: number, t: (key: TextKey, vars?: Record<string, string | number>) => string) {
  const rule = new Intl.PluralRules(formatLocale()).select(count)
  const key: TextKey =
    rule === 'one' ? 'peopleOne' : rule === 'few' || rule === 'two' ? 'peopleFew' : rule === 'many' ? 'peopleMany' : 'peopleOther'
  return t(key, { count })
}

function readJoinCode(raw: string) {
  const text = raw.trim()
  try {
    const url = new URL(text)
    const join = url.searchParams.get('join')
    if (join) return join.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
  } catch {
    // Вставлена не ссылка, а сам код.
  }
  const query = text.match(/[?&]join=([A-Za-z0-9]+)/)
  if (query) return query[1].toUpperCase()
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
}

function ShareMark() {
  return (
    <div className="invite-mark" aria-hidden="true">
      <svg width="72" height="52" viewBox="0 0 72 52" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="20" cy="16" r="7" />
        <circle cx="52" cy="16" r="7" />
        <path d="M6 44c1.4-8 6-12 14-12s12.6 4 14 12" />
        <path d="M38 44c1.4-8 6-12 14-12s12.6 4 14 12" />
        <path
          d="M36 8.5c1-2.6 3-4 5.2-3.8 2 .2 3.2 1.7 3.2 3.4 0 2.8-3.4 4.3-5.2 6.2-1.8-1.9-5.2-3.4-5.2-6.2 0-1.7 1.2-3.2 3.2-3.4 2.2-.2 4.2 1.2 5.2 3.8z"
          fill="currentColor"
          stroke="none"
        />
      </svg>
    </div>
  )
}

export function SettingsScreen() {
  const {
    snap,
    updateHouseholdSettings,
    updateDisplayName,
    deleteBudget,
    deleteAccount,
    switchHousehold,
    removeMember,
    joinHousehold,
    signOut,
  } = useBudget()
  const { t, lang, setLang } = useI18n()
  const [page, setPage] = useState<Page>('main')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmAccount, setConfirmAccount] = useState(false)
  const [legal, setLegal] = useState<LegalId | null>(null)
  const [creating, setCreating] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinOpen, setJoinOpen] = useState(false)
  const [joining, setJoining] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [currencyQuery, setCurrencyQuery] = useState('')
  const originId = useRef<string | null>(null)

  if (snap.status !== 'ready') return null
  if (creating && originId.current && snap.household.id !== originId.current) setCreating(false)
  if (legal) return <LegalScreen page={legal} inset="tabs" onBack={() => setLegal(null)} onOpen={setLegal} />
  if (creating) return <Onboarding extra onCancel={() => setCreating(false)} />

  const { household } = snap
  const me = snap.members.find((member) => member.userId === snap.userId)
  const letter = (me?.displayName.trim()[0] || '?').toUpperCase()
  const currency = currencyMeta(household.currency)
  const langLabel = LANGS.find((item) => item.id === lang)?.label ?? lang
  const remote = snap.mode === 'remote'
  const homeUrl = new URL(import.meta.env.BASE_URL, window.location.origin)
  const inviteLink = household.inviteCode ? `${homeUrl.href}?join=${household.inviteCode}` : ''
  const query = currencyQuery.trim().toLowerCase()
  const currencyRows = CURRENCIES.filter(
    (item) => !query || item.code.toLowerCase().includes(query) || item.symbol.toLowerCase().includes(query) || item.label.toLowerCase().includes(query),
  )
  const currentCurrency = currencyRows.find((item) => item.code === household.currency)
  const shownCurrencies = currentCurrency
    ? [currentCurrency, ...currencyRows.filter((item) => item.code !== household.currency)]
    : currencyRows

  function go(next: Page) {
    setPage(next)
    setCopied(null)
    setCurrencyQuery('')
    setJoinOpen(false)
    window.scrollTo(0, 0)
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(t('copied'))
    } catch {
      setCopied(t('copyManual'))
    }
  }

  function subHead(title: string) {
    return (
      <header className="push-top">
        <button className="icon-btn" type="button" aria-label={t('back')} onClick={() => go('main')}>
          <Icon name="back" size={22} />
        </button>
        <h1 className="push-title">{title}</h1>
        <span className="push-side" />
      </header>
    )
  }

  if (page === 'account') {
    return (
      <section className="screen screen-plain settings-screen">
        {subHead(t('account'))}
        <label className="field">
          <span>{t('personName')}</span>
          <input
            defaultValue={me?.displayName ?? ''}
            maxLength={40}
            aria-label={t('personName')}
            onBlur={(event) => {
              const next = event.target.value.trim()
              if (next && next !== me?.displayName) void updateDisplayName(next)
            }}
          />
        </label>
        {snap.email ? <p className="account-email">{snap.email}</p> : null}
        {remote ? (
          <button className="btn-secondary" type="button" onClick={() => void signOut()}>
            {t('signOut')}
          </button>
        ) : null}
      </section>
    )
  }

  if (page === 'currency') {
    return (
      <section className="screen screen-plain settings-screen">
        {subHead(t('currency'))}
        <input
          className="search-input"
          value={currencyQuery}
          aria-label={t('search')}
          placeholder={t('search')}
          onChange={(event) => setCurrencyQuery(event.target.value)}
        />
        <div className="set-card pick-list">
          {shownCurrencies.length === 0 ? <p className="pick-empty">{t('noMatches')}</p> : null}
          {shownCurrencies.map((item) => {
            const current = item.code === household.currency
            return (
              <button
                key={item.code}
                className="pick-row"
                type="button"
                aria-current={current ? 'true' : undefined}
                data-testid="currency-row"
                onClick={() => {
                  if (!current) void updateHouseholdSettings({ currency: item.code })
                }}
              >
                <span>{item.label}</span>
                {current ? <Icon name="check" size={18} /> : null}
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  if (page === 'language') {
    return (
      <section className="screen screen-plain settings-screen">
        {subHead(t('language'))}
        <div className="set-card pick-list">
          {LANGS.map((item) => {
            const current = item.id === lang
            return (
              <button
                key={item.id}
                className="pick-row"
                type="button"
                aria-current={current ? 'true' : undefined}
                onClick={() => setLang(item.id)}
              >
                <span>{item.label}</span>
                {current ? <Icon name="check" size={18} /> : null}
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  if (page === 'invite') {
    return (
      <section className="screen screen-plain settings-screen">
        {subHead(t('inviteOrJoin'))}
        <div className="invite-hero">
          <ShareMark />
          <h2>{t('shareBudget')}</h2>
          <p>{t('shareBudgetSub')}</p>
        </div>
        {household.inviteCode ? (
          <div className="set-card invite-block">
            <h3>{t('inviteThis')}</h3>
            <p>{t('inviteThisSub')}</p>
            <div className="invite-code">
              <strong data-testid="invite-code">{household.inviteCode}</strong>
              <button className="invite-copy" type="button" aria-label={t('copyCode')} onClick={() => void copy(household.inviteCode)}>
                <Icon name="copy" size={18} />
              </button>
            </div>
            <button className="link-row" type="button" onClick={() => void copy(inviteLink)}>
              <Icon name="link" size={18} />
              <span>{t('copyInviteLink')}</span>
              <Icon name="copy" size={18} />
            </button>
            {copied ? <p className="help">{copied}</p> : null}
          </div>
        ) : (
          <p className="help">{t('localNote')}</p>
        )}
        <div className="set-card people-card">
          <h3>{t('membersHere')}</h3>
          <ul className="people-list">
            {snap.members.map((member, index) => {
              const tint = PERSON_TINTS[index % PERSON_TINTS.length]
              const you = member.userId === snap.userId
              return (
                <li className="person-row" key={member.userId}>
                  <span className="account-avatar" style={{ background: tint.bg, color: tint.fg }}>
                    {(member.displayName.trim()[0] || '?').toUpperCase()}
                  </span>
                  <span className="person-copy">
                    <strong>
                      {member.displayName}
                      {you ? <em> · {t('thisIsYou')}</em> : null}
                    </strong>
                  </span>
                  {!you ? (
                    <button
                      className="member-remove"
                      type="button"
                      onClick={() => {
                        if (confirmRemove !== member.userId) {
                          setConfirmRemove(member.userId)
                          return
                        }
                        setConfirmRemove(null)
                        void removeMember(member.userId)
                      }}
                    >
                      {confirmRemove === member.userId
                        ? t('removeAsk', { name: member.displayName })
                        : t('removeMember', { name: member.displayName })}
                    </button>
                  ) : null}
                  <em className="person-role">{member.role === 'owner' ? t('ownerRole') : t('memberRole')}</em>
                </li>
              )
            })}
          </ul>
        </div>
        {remote ? (
          <>
            <button className="btn-primary" type="button" onClick={() => setJoinOpen((open) => !open)}>
              <Icon name="plus" size={18} /> {t('joinAnother')}
            </button>
            <p className="join-note">{t('joinAnotherSub')}</p>
            {joinOpen ? (
              <form
                className="join-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  const code = readJoinCode(joinCode)
                  if (code.length < 4 || joining) return
                  setJoining(true)
                  void joinHousehold(code, me?.displayName || t('me')).finally(() => setJoining(false))
                }}
              >
                <input
                  aria-label={t('code')}
                  autoCapitalize="characters"
                  value={joinCode}
                  placeholder={t('code')}
                  onChange={(event) => setJoinCode(event.target.value)}
                />
                <button className="btn-primary" type="submit" disabled={joining || readJoinCode(joinCode).length < 4}>
                  {t('joinBudget')}
                </button>
              </form>
            ) : null}
          </>
        ) : null}
      </section>
    )
  }

  return (
    <section className="screen screen-plain settings-screen">
      <h1 className="settings-head">{t('settings')}</h1>

      <label className="set-label">{t('account')}</label>
      <div className="set-rows">
        <button className="set-row" type="button" onClick={() => go('account')}>
          <span className="account-avatar">{letter}</span>
          <span className="set-row-copy">
            <strong>{me?.displayName || t('me')}</strong>
            {snap.email ? <em>{snap.email}</em> : null}
          </span>
          <Icon name="chevron" size={18} />
        </button>
      </div>

      <label className="set-label">{t('budgets')}</label>
      <div className="set-rows">
        {snap.households.map((item) => {
          const current = item.id === household.id
          return (
            <button
              key={item.id}
              className="set-row"
              type="button"
              aria-pressed={current}
              onClick={() => {
                if (!current) void switchHousehold(item.id)
              }}
            >
              <span className="set-ico mint">
                <Icon name="wallet" size={18} />
              </span>
              <span className="set-row-copy">
                <strong>{item.name}</strong>
              </span>
              {current ? <em className="set-pill">{t('activeBudget')}</em> : null}
              <Icon name="chevron" size={18} />
            </button>
          )
        })}
        <button className="set-row" type="button" onClick={() => go('invite')}>
          <span className="set-ico blue">
            <Icon name="users" size={18} />
          </span>
          <span className="set-row-copy">
            <strong>{t('members')}</strong>
          </span>
          <span className="set-row-side">{peoplePhrase(snap.members.length, t)}</span>
          <Icon name="chevron" size={18} />
        </button>
        {remote || household.inviteCode ? (
          <button className="set-row" type="button" onClick={() => go('invite')}>
            <span className="set-ico mint">
              <Icon name="plus" size={18} />
            </span>
            <span className="set-row-copy">
              <strong>{t('inviteOrJoin')}</strong>
            </span>
            <Icon name="chevron" size={18} />
          </button>
        ) : null}
        {remote ? (
          <button
            className="set-row"
            type="button"
            onClick={() => {
              originId.current = household.id
              setCreating(true)
            }}
          >
            <span className="set-ico mint">
              <Icon name="layers" size={18} />
            </span>
            <span className="set-row-copy">
              <strong>{t('newBudget')}</strong>
            </span>
            <Icon name="chevron" size={18} />
          </button>
        ) : null}
      </div>

      <label className="set-label">{t('preferences')}</label>
      <div className="set-rows">
        <button className="set-row" type="button" onClick={() => go('currency')}>
          <span className="set-ico gray">
            <Icon name="coin" size={18} />
          </span>
          <span className="set-row-copy">
            <strong>{t('currency')}</strong>
          </span>
          <span className="set-row-side">{currency.label}</span>
          <Icon name="chevron" size={18} />
        </button>
        <button className="set-row" type="button" onClick={() => go('language')}>
          <span className="set-ico sky">
            <Icon name="globe" size={18} />
          </span>
          <span className="set-row-copy">
            <strong>{t('language')}</strong>
          </span>
          <span className="set-row-side">{langLabel}</span>
          <Icon name="chevron" size={18} />
        </button>
        <div className="set-row">
          <span className="set-ico peach">
            <Icon name="bell" size={18} />
          </span>
          <span className="set-row-copy">
            <strong>{t('paceAlerts')}</strong>
          </span>
          <button
            className="switch"
            type="button"
            role="switch"
            aria-checked={household.paceEnabled}
            aria-label={t('paceAlerts')}
            onClick={() => void updateHouseholdSettings({ paceEnabled: !household.paceEnabled })}
          >
            <i />
          </button>
        </div>
      </div>

      <label className="set-label">{t('support')}</label>
      <div className="set-rows">
        <button className="set-row" type="button" onClick={() => setLegal('support')}>
          <span className="set-ico sky">
            <Icon name="help" size={18} />
          </span>
          <span className="set-row-copy">
            <strong>{t('helpSupport')}</strong>
          </span>
          <Icon name="chevron" size={18} />
        </button>
        <button className="set-row" type="button" onClick={() => setLegal('privacy')}>
          <span className="set-ico lilac">
            <Icon name="shield" size={18} />
          </span>
          <span className="set-row-copy">
            <strong>{t('privacy')}</strong>
          </span>
          <Icon name="chevron" size={18} />
        </button>
      </div>

      <label className="set-label">{t('dangerZone')}</label>
      {remote ? (
        <div className="danger-card">
          <button
            className="set-row danger-row"
            type="button"
            onClick={() => {
              if (!confirmAccount) {
                setConfirmAccount(true)
                return
              }
              void deleteAccount()
            }}
          >
            <Icon name="trash" size={18} />
            <span className="set-row-copy">
              <strong>{confirmAccount ? t('deleteAccountSure') : t('deleteAccount')}</strong>
            </span>
            <Icon name="chevron" size={18} />
          </button>
          <p className="danger-note">{t('deleteAccountNote')}</p>
        </div>
      ) : null}
      <div className="danger-card">
        <button
          className="set-row danger-row"
          type="button"
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true)
              return
            }
            void deleteBudget()
          }}
        >
          <Icon name="trash" size={18} />
          <span className="set-row-copy">
            <strong>{confirmDelete ? t('deleteSure') : t('deleteBudget')}</strong>
          </span>
          <Icon name="chevron" size={18} />
        </button>
      </div>
    </section>
  )
}
