import { tActive, type TextKey } from '../ui/locales'

const KNOWN: Record<string, TextKey> = {
  'Нужно войти': 'errNeedSignIn',
  'Вы уже в бюджете': 'errAlreadyIn',
  'Введите имя': 'errEnterName',
  'Не получилось создать код. Попробуйте ещё раз': 'errCreateCode',
  'Код не найден': 'errCodeMissing',
  'Введите название': 'errEnterTitle',
  'Введите название категории': 'errEnterCategory',
  'Категория не из этого бюджета': 'errCategoryOther',
  'Чужая трата': 'errOtherExpense',
  'Вход не открылся. Нажмите «Войти» с этой же почтой и паролем.': 'errSession',
  'Вставьте ссылку или код из письма.': 'errPasteLink',
  'Пароль должен быть не короче 6 символов.': 'errShortPassword',
  'Бюджет ещё не открыт': 'errNotOpen',
  'Это не ваш бюджет': 'errNotYourBudget',
  'Проверьте сумму бюджета': 'errCheckBudget',
  'Проверьте сумму плана': 'errCheckPlan',
  'Введите сумму': 'errEnterAmount',
  'Выберите категорию': 'errPickCategory',
  'Не получилось перенести бюджет': 'errMoveFailed',
  'Бюджет уже есть.': 'errBudgetExists',
  'Бюджет ещё не создан': 'errNotCreated',
  'Не получилось': 'errGeneric',
  'Общий вход включается после подключения Supabase.': 'errLocalSignIn',
  'Этот вход ещё не подключён. Пока войдите почтой.': 'errProvider',
  'Новый пароль включается на общем сайте.': 'errLocalPassword',
  'Удаление аккаунта включается на общем сайте.': 'errLocalDelete',
  'Бюджет на этом телефоне уже есть.': 'errPhoneBudget',
  'Приглашение заработает, когда подключим общий вход.': 'errInviteLater',
}

function match(message: string): TextKey | null {
  if (KNOWN[message]) return KNOWN[message]
  if (/invalid email/i.test(message)) return 'errNotEmail'
  if (/invalid login credentials/i.test(message)) return 'errBadLogin'
  if (/provider is not enabled|unsupported provider/i.test(message)) return 'errProvider'
  if (/already registered|already exists/i.test(message)) return 'errExists'
  if (/password/i.test(message) && /at least|short|weak/i.test(message)) return 'errShortPassword'
  if (/email not confirmed/i.test(message)) return 'errUnconfirmed'
  if (/otp|token/i.test(message) && /expired|invalid/i.test(message)) return 'errBadCode'
  if (/rate limit|too many/i.test(message)) return 'errRate'
  if (/relation .* does not exist|schema cache|PGRST205/i.test(message)) return 'errEmptyDb'
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) return 'errNetwork'
  if (/[А-Яа-яЁё]/.test(message)) return null
  return 'errGeneric'
}

export function humanError(error: unknown): string {
  const message = (error instanceof Error ? error.message : String(error)).trim()
  const key = match(message)
  if (!key) return message
  return tActive(key)
}
