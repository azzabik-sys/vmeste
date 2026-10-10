import { useRef, useState } from 'react'
import type { CurrencyCode } from '../data/types'
import { CURRENCIES } from '../domain/money'
import { useBudget } from './budget'
import { LanguageSwitch, useI18n } from './i18n'
import { Icon } from './icons'
import { useLook } from './look'
import { LegalScreen } from './LegalScreen'
import type { LegalId } from './legalCopy'
import { Onboarding } from './Onboarding'
import { MonthPicker } from './widgets'

export function SettingsScreen({
  monthStart,
  today,
  onMonth,
  onBack,
}: {
  monthStart: string
  today: string
  onMonth: (monthStart: string) => void
  onBack: () => void
}) {
  const { snap, updateHouseholdSettings, deleteBudget, deleteAccount, switchHousehold, removeMember, joinHousehold } =
    useBudget()
  const { t } = useI18n()
  const { look, setLook } = useLook()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmAccount, setConfirmAccount] = useState(false)
  const [legal, setLegal] = useState<LegalId | null>(null)
  const [creating, setCreating] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const originId = useRef<string | null>(null)
  if (snap.status !== 'ready') return null
  if (creating && originId.current && snap.household.id !== originId.current) setCreating(false)
  if (legal) return <LegalScreen page={legal} inset="tabs" onBack={() => setLegal(null)} onOpen={setLegal} />
  if (creating) return <Onboarding extra onCancel={() => setCreating(false)} />
  const { household } = snap
  const me = snap.members.find((member) => member.userId === snap.userId)

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(t('copied'))
    } catch {
      setCopied(t('copyManual'))
    }
  }

  return (
    <section className="screen screen-plain">
      <header className="push-top">
        <button className="icon-btn" type="button" aria-label={t('back')} onClick={onBack}>
          <Icon name="back" size={22} />
        </button>
        <h1 className="push-title">{t('settings')}</h1>
        <span className="push-side" />
      </header>

      <label className="set-label">{t('budgets')}</label>
      <div className="set-card">
        <div className="budget-list">
          {snap.households.map((item) => (
            <button
              key={item.id}
              className="budget-pick"
              type="button"
              aria-pressed={item.id === household.id}
              onClick={() => {
                if (item.id !== household.id) void switchHousehold(item.id)
              }}
            >
              <span>{item.name}</span>
              {item.id === household.id ? <em>{t('activeBudget')}</em> : null}
            </button>
          ))}
        </div>
      </div>
      {snap.mode === 'remote' ? (
        <button
          className="btn-secondary"
          type="button"
          onClick={() => {
            originId.current = household.id
            setCreating(true)
          }}
        >
          {t('newBudget')}
        </button>
      ) : null}

      <label className="set-label">{t('membersHere')}</label>
      <div className="set-card">
        <ul className="member-list">
          {snap.members.map((member) => (
            <li className="member-row" key={member.userId}>
              <span>
                {member.displayName}
                {member.userId === snap.userId ? <em> · {t('thisIsYou')}</em> : null}
              </span>
              {member.userId !== snap.userId ? (
                <button
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
            </li>
          ))}
        </ul>
      </div>

      {snap.mode === 'remote' && household.inviteCode ? (
        <>
          <label className="set-label">{t('inviteHere')}</label>
          <div className="set-card invite-card">
            <p className="code">{household.inviteCode}</p>
            <button className="btn-secondary" type="button" onClick={() => void copy(household.inviteCode)}>
              {t('copyCode')}
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => {
                const homeUrl = new URL(import.meta.env.BASE_URL, window.location.origin)
                void copy(`${homeUrl.href}?join=${household.inviteCode}`)
              }}
            >
              {t('copyLink')}
            </button>
            {copied ? <p className="help">{copied}</p> : null}
          </div>
          <label className="set-label">{t('joinAnother')}</label>
          <form
            className="set-card invite-card"
            onSubmit={(event) => {
              event.preventDefault()
              const code = joinCode.trim()
              if (code.length < 4 || joining) return
              setJoining(true)
              void joinHousehold(code, me?.displayName || t('me')).finally(() => setJoining(false))
            }}
          >
            <input
              aria-label={t('code')}
              autoCapitalize="characters"
              maxLength={8}
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            />
            <button className="btn-secondary" type="submit" disabled={joining || joinCode.trim().length < 4}>
              {t('joinBudget')}
            </button>
          </form>
        </>
      ) : null}

      <label className="set-label">{t('period')}</label>
      <div className="set-card">
        <MonthPicker variant="field" value={monthStart} today={today} onChange={onMonth} />
      </div>

      <label className="set-label">{t('currency')}</label>
      <div className="set-card">
        <span className="select-shell plain">
          <select
            aria-label={t('currency')}
            value={household.currency}
            onChange={(event) => void updateHouseholdSettings({ currency: event.target.value as CurrencyCode })}
          >
            {CURRENCIES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={16} />
        </span>
      </div>

      <label className="set-label">{t('language')}</label>
      <div className="set-card">
        <LanguageSwitch />
      </div>

      <div className="set-card toggle-row">
        <div>
          <p className="toggle-title">{t('pace')}</p>
          <p className="toggle-sub">{t('paceHint')}</p>
        </div>
        <button
          className="switch"
          type="button"
          role="switch"
          aria-checked={household.paceEnabled}
          aria-label={t('pace')}
          onClick={() => void updateHouseholdSettings({ paceEnabled: !household.paceEnabled })}
        >
          <i />
        </button>
      </div>

      <div className="set-card look-card">
        <p className="toggle-title">{t('previewLook')}</p>
        <p className="toggle-sub">{t('previewLookHint')}</p>
        <div className="look-choice" role="radiogroup" aria-label={t('previewLook')}>
          {(
            [
              ['new', 'previewNew'],
              ['classic', 'previewClassic'],
              ['card', 'previewCard'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={look === id}
              onClick={() => {
                setLook(id)
                onBack()
              }}
            >
              {t(label)}
            </button>
          ))}
        </div>
      </div>

      <button
        className="btn-danger"
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
        {confirmDelete ? t('deleteSure') : t('deleteBudget')}
      </button>
      {snap.mode === 'remote' ? (
        <>
          <p className="delete-note">{t('deleteAccountNote')}</p>
          <button
            className="btn-danger"
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
            {confirmAccount ? t('deleteAccountSure') : t('deleteAccount')}
          </button>
        </>
      ) : null}
      <p className="legal-links">
        <button type="button" onClick={() => setLegal('privacy')}>
          {t('privacy')}
        </button>
        <button type="button" onClick={() => setLegal('support')}>
          {t('support')}
        </button>
      </p>
    </section>
  )
}
