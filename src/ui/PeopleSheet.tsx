import { useState } from 'react'
import { useBudget } from './budget'
import { useI18n } from './i18n'

export function PeopleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { snap, updateDisplayName, signOut, leaveHousehold } = useBudget()
  const { t } = useI18n()
  const [notice, setNotice] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  if (!open || snap.status !== 'ready') return null

  const me = snap.members.find((member) => member.userId === snap.userId)
  const link = snap.household.inviteCode ? `${window.location.origin}/?join=${snap.household.inviteCode}` : ''

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setNotice(t('copied'))
    } catch {
      setNotice(t('copyManual'))
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="popup" role="dialog" aria-label={t('participants')} onClick={(event) => event.stopPropagation()}>
        <header className="popup-top">
          <h2>{t('participants')}</h2>
          <button className="quiet-link" type="button" onClick={onClose}>
            {t('close')}
          </button>
        </header>
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
        {snap.mode === 'remote' ? (
          <>
            <p className="code" data-testid="invite-code">
              {snap.household.inviteCode}
            </p>
            <button className="btn-secondary" type="button" onClick={() => void copy(snap.household.inviteCode)}>
              {t('copyCode')}
            </button>
            <button className="btn-secondary" type="button" onClick={() => void copy(link)}>
              {t('copyLink')}
            </button>
          </>
        ) : snap.household.inviteCode ? (
          <>
            <p className="help">{t('shareHint')}</p>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => void copy(`${window.location.origin}${window.location.pathname}`)}
            >
              {t('copyLink')}
            </button>
          </>
        ) : (
          <p className="help">{t('localNote')}</p>
        )}
        {notice ? <p className="help">{notice}</p> : null}
        {snap.mode === 'remote' || snap.household.inviteCode ? (
          <ul className="member-list">
            {snap.members.map((member) => (
              <li key={member.userId}>
                <span>{member.displayName}</span>
                <em>{member.userId === snap.userId ? t('thisIsYou') : t('inBudget')}</em>
              </li>
            ))}
          </ul>
        ) : null}
        {snap.mode === 'remote' ? (
          <>
            {leaving ? (
              <button className="btn-danger" type="button" onClick={() => void leaveHousehold()}>
                {t('leave')}
              </button>
            ) : (
              <button className="quiet-link danger" type="button" onClick={() => setLeaving(true)}>
                {t('leaveBudget')}
              </button>
            )}
            <button className="quiet-link" type="button" onClick={() => void signOut()}>
              {t('signOut')}
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
