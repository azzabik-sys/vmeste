import { MAIL, MAIL_LABEL, piecesFor, SITE_HREF, SITE_LABEL, type LegalId, type Piece } from './legalCopy'
import { LanguageSwitch, useI18n } from './i18n'
import { Icon } from './icons'
import type { TextKey } from './locales'

export function LegalScreen({
  page,
  inset,
  onBack,
  onOpen,
}: {
  page: LegalId
  inset: 'tabs' | 'page'
  onBack: () => void
  onOpen: (page: LegalId) => void
}) {
  const { t } = useI18n()
  return (
    <section className={inset === 'tabs' ? 'screen screen-plain' : 'legal-gate'}>
      <header className="push-top">
        <button className="icon-btn" type="button" aria-label={t('back')} onClick={onBack}>
          <Icon name="back" size={22} />
        </button>
        <h1 className="push-title">{t(page)}</h1>
        <span className="push-side" />
      </header>
      <LanguageSwitch />
      <article className="legal-doc">
        {piecesFor(page).map((piece, index) => (
          <LegalPiece key={`${piece.kind}-${index}`} piece={piece} t={t} onOpen={onOpen} />
        ))}
      </article>
    </section>
  )
}

function LegalPiece({
  piece,
  t,
  onOpen,
}: {
  piece: Piece
  t: (key: TextKey) => string
  onOpen: (page: LegalId) => void
}) {
  if (piece.kind === 'sub') return <p className="sub">{t(piece.key)}</p>
  if (piece.kind === 'h2') return <h2>{t(piece.key)}</h2>
  if (piece.kind === 'p') return <p>{t(piece.key)}</p>
  if (piece.kind === 'ul') {
    return (
      <ul>
        {piece.keys.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
    )
  }
  if (piece.kind === 'mail') {
    return (
      <p>
        <a href={MAIL}>{MAIL_LABEL}</a>
      </p>
    )
  }
  if (piece.kind === 'site') {
    return (
      <p>
        <a href={SITE_HREF}>{SITE_LABEL}</a>
      </p>
    )
  }
  return (
    <p>
      <button className="text-link" type="button" onClick={() => onOpen(piece.page)}>
        {t(piece.page)}
      </button>
    </p>
  )
}
