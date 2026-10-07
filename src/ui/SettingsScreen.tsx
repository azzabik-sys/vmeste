import { useState } from 'react'
import type { CurrencyCode } from '../data/types'
import { CURRENCIES } from '../domain/money'
import { useBudget } from './budget'
import { LanguageSwitch, useI18n } from './i18n'
import { Icon } from './icons'
import { LegalScreen } from './LegalScreen'
import type { LegalId } from './legalCopy'
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
  const { snap, updateHouseholdSettings, deleteBudget, deleteAccount } = useBudget()
  const { t } = useI18n()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmAccount, setConfirmAccount] = useState(false)
  const [legal, setLegal] = useState<LegalId | null>(null)
  if (snap.status !== 'ready') return null
  if (legal) return <LegalScreen page={legal} inset="tabs" onBack={() => setLegal(null)} onOpen={setLegal} />
  const { household } = snap

  return (
    <section className="screen screen-plain">
      <header className="push-top">
        <button className="icon-btn" type="button" aria-label={t('back')} onClick={onBack}>
          <Icon name="back" size={22} />
        </button>
        <h1 className="push-title">{t('settings')}</h1>
        <span className="push-side" />
      </header>

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
