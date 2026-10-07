import { MAIL, MAIL_LABEL, piecesFor, SITE_HREF, SITE_LABEL, type LegalId, type Piece } from './ui/legalCopy'
import { chooseLang, isLang, LANGS, langMeta, TEXT, writeLang, type TextKey } from './ui/locales'

const page: LegalId = document.body.dataset.page === 'support' ? 'support' : 'privacy'

function phoneTags(): string[] {
  if (navigator.languages?.length) return [...navigator.languages]
  return navigator.language ? [navigator.language] : []
}

function savedLang(): string | null {
  try {
    return localStorage.getItem('vmeste.lang')
  } catch {
    return null
  }
}

function render() {
  const lang = chooseLang(savedLang(), phoneTags())
  const meta = langMeta(lang)
  document.documentElement.lang = meta.locale
  document.documentElement.dir = meta.dir
  const t = (key: TextKey) => TEXT[lang][key]
  document.title = `${t(page)} — Vmeste`

  const back = document.querySelector<HTMLButtonElement>('#back')
  const backLabel = document.querySelector('#back-label')
  const arrow = document.querySelector('#back-arrow')
  if (back && backLabel && arrow) {
    back.setAttribute('aria-label', t('back'))
    backLabel.textContent = t('back')
    arrow.textContent = meta.dir === 'rtl' ? '→' : '←'
    back.onclick = () => {
      let fromHere = false
      try {
        fromHere = Boolean(document.referrer) && new URL(document.referrer).origin === window.location.origin
      } catch {
        fromHere = false
      }
      if (fromHere && history.length > 1) history.back()
      else window.location.href = import.meta.env.BASE_URL || './'
    }
  }

  const select = document.querySelector<HTMLSelectElement>('#lang')
  if (select) {
    select.setAttribute('aria-label', t('language'))
    select.replaceChildren(
      ...LANGS.map((item) => {
        const option = document.createElement('option')
        option.value = item.id
        option.textContent = item.label
        return option
      }),
    )
    select.value = lang
    select.onchange = () => {
      const next = select.value
      if (!isLang(next)) return
      writeLang(next)
      render()
    }
  }

  const root = document.querySelector('#doc')
  if (!root) return
  root.replaceChildren(...piecesFor(page).map((piece) => nodeFor(piece, t)))
}

function nodeFor(piece: Piece, t: (key: TextKey) => string): HTMLElement {
  if (piece.kind === 'sub') return el('p', t(piece.key), 'sub')
  if (piece.kind === 'h2') return el('h2', t(piece.key))
  if (piece.kind === 'p') return el('p', t(piece.key))
  if (piece.kind === 'ul') {
    const list = document.createElement('ul')
    for (const key of piece.keys) list.append(el('li', t(key)))
    return list
  }
  if (piece.kind === 'mail') return linkParagraph(MAIL, MAIL_LABEL)
  if (piece.kind === 'site') return linkParagraph(SITE_HREF, SITE_LABEL)
  return linkParagraph(`${piece.page}.html`, t(piece.page))
}

function el(tag: string, text: string, className?: string) {
  const node = document.createElement(tag)
  if (className) node.className = className
  node.textContent = text
  return node
}

function linkParagraph(href: string, label: string) {
  const paragraph = document.createElement('p')
  const link = document.createElement('a')
  link.href = href
  link.textContent = label
  paragraph.append(link)
  return paragraph
}

render()
