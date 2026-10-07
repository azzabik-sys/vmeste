import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { setFormatLocale } from '../domain/formatLocale'
import { Icon } from './icons'
import {
  fill,
  LANGS,
  langMeta,
  readLang,
  setActiveLang,
  TEXT,
  writeLang,
  type Lang,
  type TextKey,
} from './locales'

export type { Lang, TextKey }
export { LANGS }

type I18nValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TextKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang)
  const meta = langMeta(lang)
  setFormatLocale(meta.locale)
  setActiveLang(lang)
  if (typeof document !== 'undefined') {
    document.documentElement.lang = meta.locale
    document.documentElement.dir = meta.dir
    document.querySelector('meta[name="description"]')?.setAttribute('content', TEXT[lang].appDescription)
  }

  useEffect(() => {
    function onShow(event: PageTransitionEvent) {
      if (!event.persisted) return
      const next = readLang()
      setLangState((current) => (current === next ? current : next))
    }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  function setLang(next: Lang) {
    setLangState(next)
    writeLang(next)
  }

  const value: I18nValue = {
    lang,
    setLang,
    t: (key, vars) => fill(TEXT[lang][key], vars),
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n вызван вне I18nProvider')
  return value
}

const PRESET_BY_ICON: Record<string, TextKey> = {
  food: 'catFood',
  car: 'catTransport',
  home: 'catHome',
  shop: 'catShop',
  game: 'catGame',
  card: 'catCard',
  heart: 'catHeart',
  coffee: 'catCoffee',
  bill: 'catUtilities',
}

export function categoryKey(icon: string): TextKey {
  return PRESET_BY_ICON[icon] ?? 'catShop'
}

export function categoryLabel(icon: string, t: I18nValue['t']): string {
  return t(categoryKey(icon))
}

export function categoryTitle(icon: string, storedName: string, t: I18nValue['t']): string {
  const key = PRESET_BY_ICON[icon]
  const trimmed = storedName.trim()
  if (!key || !trimmed) return storedName
  const known = (Object.keys(TEXT) as Lang[]).some((lang) => TEXT[lang][key] === trimmed)
  return known ? t(key) : storedName
}

export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n()
  return (
    <span className="select-shell">
      <select aria-label={t('language')} value={lang} onChange={(event) => setLang(event.target.value as Lang)}>
        {LANGS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={16} />
    </span>
  )
}
