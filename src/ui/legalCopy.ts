import type { TextKey } from './locales/en'

export const MAIL = 'mailto:azzabik@yandex.ru'
export const MAIL_LABEL = 'azzabik@yandex.ru'
export const SITE_HREF = 'https://azzabik-sys.github.io/vmeste/'
export const SITE_LABEL = 'azzabik-sys.github.io/vmeste'

export type LegalId = 'privacy' | 'support'

export type Piece =
  | { kind: 'sub'; key: TextKey }
  | { kind: 'h2'; key: TextKey }
  | { kind: 'p'; key: TextKey }
  | { kind: 'ul'; keys: TextKey[] }
  | { kind: 'mail' }
  | { kind: 'site' }
  | { kind: 'jump'; page: LegalId }

export const PRIVACY: Piece[] = [
  { kind: 'sub', key: 'privacyUpdated' },
  { kind: 'p', key: 'privacyIntro' },
  { kind: 'h2', key: 'privacyDataTitle' },
  { kind: 'ul', keys: ['privacyDataEmail', 'privacyDataName', 'privacyDataBudget', 'privacyDataExpenses'] },
  { kind: 'h2', key: 'privacyWhoTitle' },
  { kind: 'p', key: 'privacyWho' },
  { kind: 'h2', key: 'privacyWhereTitle' },
  { kind: 'p', key: 'privacyWhere' },
  { kind: 'site' },
  { kind: 'h2', key: 'privacyDeleteTitle' },
  { kind: 'p', key: 'privacyDelete' },
  { kind: 'h2', key: 'privacyKidsTitle' },
  { kind: 'p', key: 'privacyKids' },
  { kind: 'h2', key: 'privacyContactTitle' },
  { kind: 'mail' },
  { kind: 'jump', page: 'support' },
]

export const SUPPORT: Piece[] = [
  { kind: 'sub', key: 'supportLead' },
  { kind: 'mail' },
  { kind: 'h2', key: 'supportForgotTitle' },
  { kind: 'p', key: 'supportForgot' },
  { kind: 'h2', key: 'supportDeleteTitle' },
  { kind: 'p', key: 'supportDelete' },
  { kind: 'jump', page: 'privacy' },
]

export function piecesFor(page: LegalId): Piece[] {
  return page === 'privacy' ? PRIVACY : SUPPORT
}
