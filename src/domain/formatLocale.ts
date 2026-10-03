let current = 'ru-RU'

export function formatLocale(): string {
  return current
}

export function setFormatLocale(locale: string) {
  current = locale
}
