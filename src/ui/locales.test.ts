import { afterEach, describe, expect, it } from 'vitest'
import { formatDayCount, historyHeading } from '../domain/dates'
import { setFormatLocale } from '../domain/formatLocale'
import { humanError } from '../domain/errors'
import { en } from './locales/en'
import { chooseLang, LANGS, setActiveLang, TEXT, type TextKey } from './locales'

const placeholders = /\{[a-z]+\}/g

describe('languages', () => {
  afterEach(() => {
    setFormatLocale('ru-RU')
    setActiveLang('en')
  })

  it('каждый язык содержит те же фразы и те же подстановки', () => {
    const keys = Object.keys(en) as TextKey[]
    expect(LANGS).toHaveLength(36)
    for (const item of LANGS) {
      const catalog = TEXT[item.id]
      expect(Object.keys(catalog).sort(), item.id).toEqual([...keys].sort())
      for (const key of keys) {
        expect(catalog[key].trim().length, `${item.id}.${key}`).toBeGreaterThan(0)
        const expected = (en[key].match(placeholders) ?? []).slice().sort()
        const actual = (catalog[key].match(placeholders) ?? []).slice().sort()
        expect(actual, `${item.id}.${key}`).toEqual(expected)
      }
    }
  })

  it('берёт язык телефона, пока человек сам ничего не выбрал', () => {
    expect(chooseLang(null, ['fil-PH', 'en-US'])).toBe('fil')
    expect(chooseLang(null, ['tl'])).toBe('fil')
    expect(chooseLang(null, ['zh-TW', 'en'])).toBe('zh-Hant')
    expect(chooseLang(null, ['zh-HK'])).toBe('zh-Hant')
    expect(chooseLang(null, ['zh-CN'])).toBe('zh-Hans')
    expect(chooseLang(null, ['zh-Hans'])).toBe('zh-Hans')
    expect(chooseLang(null, ['nb-NO'])).toBe('nb')
    expect(chooseLang(null, ['nn-NO'])).toBe('nb')
    expect(chooseLang(null, ['no'])).toBe('nb')
    expect(chooseLang(null, ['pt-BR'])).toBe('pt')
    expect(chooseLang(null, ['iw'])).toBe('he')
    expect(chooseLang(null, ['in-ID'])).toBe('id')
    expect(chooseLang(null, ['xx-YY'])).toBe('en')
    expect(chooseLang('ru', ['en-US'])).toBe('ru')
    expect(chooseLang('vi', ['de-DE'])).toBe('vi')
    expect(chooseLang('nope', ['de-DE'])).toBe('de')
  })

  it('заголовки истории и число дней идут за языком', () => {
    setFormatLocale('de-DE')
    expect(historyHeading('2026-10-07', '2026-10-07').toLowerCase()).toContain('heute')
    expect(historyHeading('2026-10-06', '2026-10-07').toLowerCase()).toContain('gestern')
    expect(historyHeading('2026-10-07', '2026-10-07')).not.toContain('Сегодня')
    setFormatLocale('ru-RU')
    expect(historyHeading('2026-10-07', '2026-10-07').toLowerCase()).toContain('сегодня')
    expect(formatDayCount(16).toLowerCase()).toContain('дн')
  })

  it('известная ошибка переводится на выбранный язык', () => {
    setActiveLang('en')
    expect(humanError(new Error('Код не найден'))).toBe('Code not found')
    setActiveLang('ru')
    expect(humanError(new Error('invalid login credentials'))).toBe('Неверная почта или пароль.')
  })
})
