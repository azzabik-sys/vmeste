import { useState } from 'react'
import { useBudget } from './budget'
import { useI18n } from './i18n'

export function LoadingScreen() {
  const { t } = useI18n()
  return (
    <main className="shell center-screen">
      <p>{t('opening')}</p>
    </main>
  )
}

export function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useI18n()
  return (
    <main className="shell center-screen">
      <h1>{t('openFailed')}</h1>
      <p className="sub">{message}</p>
      <button className="btn-primary" type="button" onClick={onRetry}>
        {t('retry')}
      </button>
    </main>
  )
}

export function GateScreen() {
  const { error, signIn } = useBudget()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const valid = /^\S+@\S+\.\S+$/.test(email.trim())

  return (
    <main className="shell onboard">
      <div className="onboard-body">
        <h1>{t('signIn')}</h1>
        <p className="sub">{t('signInSub')}</p>
        {error ? (
          <p className="banner" role="alert">
            {error}
          </p>
        ) : null}
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (!valid) return
            setPending(true)
            void signIn(email.trim()).then((ok) => {
              setPending(false)
              if (ok) setSentTo(email.trim())
            })
          }}
        >
          <label className="field">
            <span>{t('email')}</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              placeholder={t('emailPlaceholder')}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button className="btn-primary" type="submit" disabled={pending || !valid}>
            {t('sendLink')}
          </button>
        </form>
        {sentTo ? <p className="help">{t('mailSent', { email: sentTo })}</p> : null}
      </div>
    </main>
  )
}
