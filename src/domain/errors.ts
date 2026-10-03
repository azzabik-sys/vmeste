export function humanError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/[А-Яа-яЁё]/.test(message)) return message
  if (/invalid email/i.test(message)) return 'Похоже, это не почта.'
  if (/rate limit|too many/i.test(message)) return 'Слишком много писем. Подождите пару минут.'
  if (/relation .* does not exist|schema cache|PGRST205/i.test(message)) {
    return 'База ещё пустая. Нужно выполнить supabase/schema.sql в SQL Editor.'
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return 'Нет сети. Проверьте подключение и попробуйте ещё раз.'
  }
  return 'Не получилось. Попробуйте ещё раз.'
}
