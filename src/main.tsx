import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { rememberJoinCode } from './data/joinCode'
import { App } from './ui/App'
import { BudgetProvider } from './ui/budget'
import { I18nProvider } from './ui/i18n'
import './styles.css'

const join = new URLSearchParams(window.location.search).get('join')
if (join) {
  rememberJoinCode(join)
  const url = new URL(window.location.href)
  url.searchParams.delete('join')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

const root = document.getElementById('root')
if (!root) throw new Error('Нет корневого элемента')

createRoot(root).render(
  <StrictMode>
    <I18nProvider>
      <BudgetProvider>
        <App />
      </BudgetProvider>
    </I18nProvider>
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}
