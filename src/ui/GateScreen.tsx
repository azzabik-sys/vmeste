import { useState } from 'react'
import type { SignInProvider } from '../data/api'
import { useBudget } from './budget'
import { LanguageSwitch, useI18n } from './i18n'
import { LegalScreen } from './LegalScreen'
import type { LegalId } from './legalCopy'

function AppleMark() {
  return (
    <svg className="auth-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.37 1.43c0 1.14-.42 2.2-1.13 3.02-.79.9-2.08 1.6-3.16 1.5-.12-1.12.42-2.28 1.12-3.06.78-.88 2.12-1.55 3.17-1.46zM20.5 17.1c-.55 1.27-.82 1.84-1.53 2.96-.99 1.56-2.39 3.5-4.12 3.52-1.54.02-1.94-1-4.03-.99-2.09.02-2.53 1.01-4.07.99-1.73-.02-3.05-1.78-4.04-3.34-2.76-4.35-3.05-9.45-1.35-12.15 1.21-1.92 3.12-3.05 4.91-3.05 1.83 0 2.98 1.01 4.49 1.01 1.47 0 2.37-1.01 4.49-1.01 1.6 0 3.29.87 4.5 2.37-3.95 2.16-3.31 7.79.75 9.69z"
      />
    </svg>
  )
}

function GoogleMark() {
  return (
    <svg className="auth-mark" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  )
}

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
  const { error, signIn, signInWithProvider, signUp, requestPasswordReset, confirmPasswordReset, dismissError } = useBudget()
  const { t } = useI18n()
  const [step, setStep] = useState<'login' | 'forgot' | 'code'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [legal, setLegal] = useState<LegalId | null>(null)
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim())
  const loginOk = emailOk && password.length >= 6
  const codeOk = emailOk && code.replace(/\s+/g, '').length >= 6 && password.length >= 6

  function go(next: 'login' | 'forgot' | 'code') {
    dismissError()
    setStep(next)
  }

  function startProvider(provider: SignInProvider) {
    setPending(true)
    void signInWithProvider(provider).finally(() => setPending(false))
  }

  if (legal) {
    return (
      <main className="shell">
        <LegalScreen page={legal} inset="page" onBack={() => setLegal(null)} onOpen={setLegal} />
      </main>
    )
  }

  return (
    <main className="shell onboard">
      <div className="onboard-body">
        <LanguageSwitch />
        <h1>{step === 'login' ? t('signIn') : t('forgotTitle')}</h1>
        <p className="sub">{step === 'login' ? t('signInSub') : step === 'forgot' ? t('forgotSub') : t('codeSent', { email: email.trim() })}</p>
        {error ? (
          <p className="banner" role="alert">
            {error}
          </p>
        ) : null}
        {step === 'login' ? (
          <>
            <div className="auth-providers">
              <button className="btn-secondary auth-apple" type="button" disabled={pending} onClick={() => startProvider('apple')}>
                <AppleMark />
                {t('continueApple')}
              </button>
              <button className="btn-secondary auth-google" type="button" disabled={pending} onClick={() => startProvider('google')}>
                <GoogleMark />
                {t('continueGoogle')}
              </button>
            </div>
            <p className="auth-or">{t('orEmail')}</p>
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
          </>
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
          <button type="button" onClick={() => setLegal('privacy')}>
            {t('privacy')}
          </button>
          <button type="button" onClick={() => setLegal('support')}>
            {t('support')}
          </button>
        </p>
      </div>
    </main>
  )
}
