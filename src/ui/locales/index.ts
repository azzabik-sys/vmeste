import { de, es, fr, it, nl, pl, pt, uk } from './group-a'
import { cs, da, fi, hu, nb, ro, sk, sv } from './group-b'
import { ar, bg, ca, el, he, hi, hr, tr } from './group-c'
import { bn, fil, id, ja, ko, ms, th, zhHans, zhHant } from './group-d'
import { en, type Catalog, type TextKey } from './en'
import { ru } from './ru'
import { vi } from './vi'

export type { Catalog, TextKey }

export const LANGS = [
  { id: 'ar', label: 'العربية', locale: 'ar-SA', dir: 'rtl' },
  { id: 'bg', label: 'Български', locale: 'bg-BG', dir: 'ltr' },
  { id: 'bn', label: 'বাংলা', locale: 'bn-BD', dir: 'ltr' },
  { id: 'ca', label: 'Català', locale: 'ca-ES', dir: 'ltr' },
  { id: 'cs', label: 'Čeština', locale: 'cs-CZ', dir: 'ltr' },
  { id: 'da', label: 'Dansk', locale: 'da-DK', dir: 'ltr' },
  { id: 'de', label: 'Deutsch', locale: 'de-DE', dir: 'ltr' },
  { id: 'el', label: 'Ελληνικά', locale: 'el-GR', dir: 'ltr' },
  { id: 'en', label: 'English', locale: 'en-US', dir: 'ltr' },
  { id: 'es', label: 'Español', locale: 'es-ES', dir: 'ltr' },
  { id: 'fi', label: 'Suomi', locale: 'fi-FI', dir: 'ltr' },
  { id: 'fil', label: 'Filipino', locale: 'fil-PH', dir: 'ltr' },
  { id: 'fr', label: 'Français', locale: 'fr-FR', dir: 'ltr' },
  { id: 'he', label: 'עברית', locale: 'he-IL', dir: 'rtl' },
  { id: 'hi', label: 'हिन्दी', locale: 'hi-IN', dir: 'ltr' },
  { id: 'hr', label: 'Hrvatski', locale: 'hr-HR', dir: 'ltr' },
  { id: 'hu', label: 'Magyar', locale: 'hu-HU', dir: 'ltr' },
  { id: 'id', label: 'Bahasa Indonesia', locale: 'id-ID', dir: 'ltr' },
  { id: 'it', label: 'Italiano', locale: 'it-IT', dir: 'ltr' },
  { id: 'ja', label: '日本語', locale: 'ja-JP', dir: 'ltr' },
  { id: 'ko', label: '한국어', locale: 'ko-KR', dir: 'ltr' },
  { id: 'ms', label: 'Bahasa Melayu', locale: 'ms-MY', dir: 'ltr' },
  { id: 'nb', label: 'Norsk bokmål', locale: 'nb-NO', dir: 'ltr' },
  { id: 'nl', label: 'Nederlands', locale: 'nl-NL', dir: 'ltr' },
  { id: 'pl', label: 'Polski', locale: 'pl-PL', dir: 'ltr' },
  { id: 'pt', label: 'Português', locale: 'pt-BR', dir: 'ltr' },
  { id: 'ro', label: 'Română', locale: 'ro-RO', dir: 'ltr' },
  { id: 'ru', label: 'Русский', locale: 'ru-RU', dir: 'ltr' },
  { id: 'sk', label: 'Slovenčina', locale: 'sk-SK', dir: 'ltr' },
  { id: 'sv', label: 'Svenska', locale: 'sv-SE', dir: 'ltr' },
  { id: 'th', label: 'ไทย', locale: 'th-TH', dir: 'ltr' },
  { id: 'tr', label: 'Türkçe', locale: 'tr-TR', dir: 'ltr' },
  { id: 'uk', label: 'Українська', locale: 'uk-UA', dir: 'ltr' },
  { id: 'vi', label: 'Tiếng Việt', locale: 'vi-VN', dir: 'ltr' },
  { id: 'zh-Hans', label: '简体中文', locale: 'zh-Hans', dir: 'ltr' },
  { id: 'zh-Hant', label: '繁體中文', locale: 'zh-Hant', dir: 'ltr' },
] as const

export type Lang = (typeof LANGS)[number]['id']

export const TEXT: Record<Lang, Catalog> = {
  ar,
  bg,
  bn,
  ca,
  cs,
  da,
  de,
  el,
  en,
  es,
  fi,
  fil,
  fr,
  he,
  hi,
  hr,
  hu,
  id,
  it,
  ja,
  ko,
  ms,
  nb,
  nl,
  pl,
  pt,
  ro,
  ru,
  sk,
  sv,
  th,
  tr,
  uk,
  vi,
  'zh-Hans': zhHans,
  'zh-Hant': zhHant,
}

const STORAGE_KEY = 'vmeste.lang'

const ALIAS: Record<string, Lang> = {
  tl: 'fil',
  fil: 'fil',
  no: 'nb',
  nb: 'nb',
  nn: 'nb',
  iw: 'he',
  he: 'he',
  in: 'id',
  id: 'id',
}

const ID_SET = new Set<string>(LANGS.map((item) => item.id))

export function isLang(value: string): value is Lang {
  return ID_SET.has(value)
}

export function langMeta(lang: Lang) {
  return LANGS.find((item) => item.id === lang) ?? LANGS.find((item) => item.id === 'en')!
}

export function matchLang(tag: string): Lang | null {
  const lower = tag.trim().toLowerCase().replace(/_/g, '-')
  if (!lower) return null
  if (lower === 'zh-tw' || lower === 'zh-hk' || lower === 'zh-mo' || lower.startsWith('zh-hant')) return 'zh-Hant'
  if (lower === 'zh-cn' || lower === 'zh-sg' || lower === 'zh-hans' || lower.startsWith('zh-hans')) return 'zh-Hans'
  const exact = LANGS.find((item) => item.id.toLowerCase() === lower)
  if (exact) return exact.id
  const base = lower.split('-')[0]
  if (base === 'zh') return 'zh-Hans'
  if (ALIAS[base]) return ALIAS[base]
  const byBase = LANGS.find((item) => item.id.toLowerCase() === base)
  return byBase ? byBase.id : null
}

export function chooseLang(saved: string | null, tags: readonly string[]): Lang {
  if (saved && isLang(saved)) return saved
  for (const tag of tags) {
    const hit = matchLang(tag)
    if (hit) return hit
  }
  return 'en'
}

export function readLang(): Lang {
  let saved: string | null = null
  try {
    saved = localStorage.getItem(STORAGE_KEY)
  } catch {
    saved = null
  }
  const tags =
    typeof navigator === 'undefined'
      ? []
      : navigator.languages?.length
        ? navigator.languages
        : [navigator.language]
  return chooseLang(saved, tags.filter((tag): tag is string => Boolean(tag)))
}

export function writeLang(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // Язык останется до закрытия вкладки.
  }
}

export function fill(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''))
}

let active: Lang = 'en'

export function setActiveLang(lang: Lang) {
  active = lang
}

export function tActive(key: TextKey, vars?: Record<string, string | number>) {
  return fill(TEXT[active][key], vars)
}
