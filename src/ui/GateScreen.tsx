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
  const { error, signIn, signUp, requestPasswordReset, confirmPasswordReset, dismissError } = useBudget()
  const { t } = useI18n()
  const [step, setStep] = useState<'login' | 'forgot' | 'code'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim())
  const loginOk = emailOk && password.length >= 6
  const codeOk = emailOk && code.replace(/\s+/g, '').length >= 6 && password.length >= 6
  const pages = `${import.meta.env.BASE_URL}`

  function go(next: 'login' | 'forgot' | 'code') {
    dismissError()
    setStep(next)
  }

  return (
    <main className="shell onboard">
      <div className="onboard-body">
        <h1>{step === 'login' ? t('signIn') : t('forgotTitle')}</h1>
        <p className="sub">{step === 'login' ? t('signInSub') : step === 'forgot' ? t('forgotSub') : t('codeSent', { email: email.trim() })}</p>
        {error ? (
          <p className="banner" role="alert">
            {error}
          </p>
        ) : null}
        {step === 'login' ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!loginOk) return
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
            <button className="btn-primary" type="submit" disabled={pending || !loginOk}>
              {t('signIn')}
            </button>
            <button
              className="btn-secondary"
              type="button"
              disabled={pending || !loginOk}
              onClick={() => {
                setPending(true)
                void signUp(email.trim(), password).finally(() => setPending(false))
              }}
            >
              {t('createLogin')}
            </button>
            <button className="quiet-link" type="button" onClick={() => go('forgot')}>
              {t('forgot')}
            </button>
          </form>
        ) : null}
        {step === 'forgot' ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!emailOk) return
              setPending(true)
              void requestPasswordReset(email.trim()).then((ok) => {
                if (ok) {
                  setPassword('')
                  setCode('')
                  setStep('code')
                }
              }).finally(() => setPending(false))
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
            <button className="btn-primary" type="submit" disabled={pending || !emailOk}>
              {t('sendCode')}
            </button>
            <button className="quiet-link" type="button" onClick={() => go('login')}>
              {t('backToSignIn')}
            </button>
          </form>
        ) : null}
        {step === 'code' ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!codeOk) return
              setPending(true)
              void confirmPasswordReset(email.trim(), code, password).finally(() => setPending(false))
            }}
          >
            <label className="field">
              <span>{t('mailCode')}</span>
              <input
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={code}
                aria-label={t('mailCode')}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
            <label className="field">
              <span>{t('newPassword')}</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                aria-label={t('newPassword')}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <p className="help">{t('passwordHint')}</p>
            <button className="btn-primary" type="submit" disabled={pending || !codeOk}>
              {t('savePassword')}
            </button>
            <button className="quiet-link" type="button" onClick={() => go('forgot')}>
              {t('sendCode')}
            </button>
          </form>
        ) : null}
        <p className="legal-links">
          <a href={`${pages}privacy.html`}>{t('privacy')}</a>
          <a href={`${pages}support.html`}>{t('support')}</a>
        </p>
      </div>
    </main>
  )
}
