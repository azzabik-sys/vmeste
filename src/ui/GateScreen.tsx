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
  const { error, signIn, signUp } = useBudget()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const valid = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= 6

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
            void signIn(email.trim(), password).finally(() => setPending(false))
          }}
        >
          <label className="field">
            <span>{t('email')}</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="username"
              value={email}
              placeholder={t('emailPlaceholder')}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t('password')}</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              aria-label={t('password')}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <p className="help">{t('passwordHint')}</p>
          <button className="btn-primary" type="submit" disabled={pending || !valid}>
            {t('signIn')}
          </button>
          <button
            className="btn-secondary"
            type="button"
            disabled={pending || !valid}
            onClick={() => {
              setPending(true)
              void signUp(email.trim(), password).finally(() => setPending(false))
            }}
          >
            {t('createLogin')}
          </button>
        </form>
      </div>
    </main>
  )
}
