import type { ReactNode } from 'react'

const PATHS: Record<string, ReactNode> = {
  food: (
    <>
      <path d="M8 3v8" />
      <path d="M8 3c-2.2 0-3.2 2-3.2 4.2S6 11 8 11" />
      <path d="M8 11v10" />
      <path d="M16 3v18" />
    </>
  ),
  car: (
    <>
      <path d="M4 15h16" />
      <path d="M6 15l1.4-4.2A2 2 0 0 1 9.3 9.4h5.4a2 2 0 0 1 1.9 1.4L18 15" />
      <path d="M5 15v2.2A1.3 1.3 0 0 0 6.3 18.5H7.5" />
      <path d="M16.5 18.5h1.2A1.3 1.3 0 0 0 19 17.2V15" />
      <circle cx="8" cy="16.2" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16.2" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  home: (
    <>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M7 10.5V20h10v-9.5" />
    </>
  ),
  bill: (
    <>
      <path d="M7 3.5h10v17l-2.2-1.3L12 21l-2.8-1.8L7 20.5z" />
      <path d="M9.5 8h5M9.5 12h5M9.5 16h3" />
    </>
  ),
  shop: (
    <>
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V6.5A3 3 0 0 1 12 3.5 3 3 0 0 1 15 6.5V8" />
    </>
  ),
  game: (
    <>
      <path d="M7 8h10a4 4 0 0 1 3.8 5.2l-.8 2.6a2.5 2.5 0 0 1-4.2 1.1L14.5 15h-5l-1.3 1.9a2.5 2.5 0 0 1-4.2-1.1l-.8-2.6A4 4 0 0 1 7 8z" />
      <path d="M8.5 12.5h2.5M9.75 11.25v2.5" />
      <circle cx="15.2" cy="11.6" r=".7" fill="currentColor" stroke="none" />
      <circle cx="16.8" cy="13.2" r=".7" fill="currentColor" stroke="none" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  heart: <path d="M12 19s-7-4.4-7-8.2A3.6 3.6 0 0 1 12 8a3.6 3.6 0 0 1 7 2.8C19 14.6 12 19 12 19z" />,
  coffee: (
    <>
      <path d="M5 8h11v5.5A4.5 4.5 0 0 1 11.5 18h-2A4.5 4.5 0 0 1 5 13.5V8z" />
      <path d="M16 9h1.5A2.5 2.5 0 0 1 20 11.5 2.5 2.5 0 0 1 17.5 14H16" />
      <path d="M8 4.5c.6.7.6 1.3 0 2M11 4.5c.6.7.6 1.3 0 2" />
    </>
  ),
  navHome: (
    <>
      <path d="M4 11.2 12 4l8 7.2" />
      <path d="M7 10.2V20h10v-9.8" />
    </>
  ),
  history: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 2" />
    </>
  ),
  stats: (
    <>
      <path d="M5 19V10" />
      <path d="M12 19V5" />
      <path d="M19 19v-7" />
    </>
  ),
  gear: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  plan: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="8" cy="7" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="10" cy="17" r="1.7" fill="currentColor" stroke="none" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  back: <path d="M15 5 8 12l7 7" />,
  close: (
    <>
      <path d="M6 6l12 12M18 6 6 18" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M7.5 7l.7 12h7.6l.7-12" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </>
  ),
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3.5V7M16 3.5V7M4 10h16" />
    </>
  ),
  note: (
    <>
      <path d="M7 4h8l4 4v12H7z" />
      <path d="M15 4v4h4M9 13h6M9 16h4" />
    </>
  ),
  pencil: (
    <>
      <path d="M14 5.5 18.5 10 9 19.5H4.5V15z" />
      <path d="M12.5 7 17 11.5" />
    </>
  ),
  check: <path d="m5 12.5 4.2 4.2L19 7.5" />,
  grip: (
    <>
      <circle cx="9" cy="7" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15" cy="7" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="9" cy="17" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15" cy="17" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
}

export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.shop}
    </svg>
  )
}

const LOOK: Record<string, { bg: string; fg: string }> = {
  food: { bg: '#E7F6EE', fg: '#18A85B' },
  car: { bg: '#E7F0FC', fg: '#3B82F6' },
  home: { bg: '#FDECEC', fg: '#EF4444' },
  bill: { bg: '#E8F6F4', fg: '#0F9F8A' },
  shop: { bg: '#F4E9FB', fg: '#A855F7' },
  game: { bg: '#EEEFFE', fg: '#6366F1' },
  card: { bg: '#FFF3E4', fg: '#F59E0B' },
  heart: { bg: '#FDE8EF', fg: '#EC4899' },
  coffee: { bg: '#F8F1E6', fg: '#C2762A' },
}

export function CategoryMark({ icon, size = 34 }: { icon: string; size?: number }) {
  const look = LOOK[icon] ?? LOOK.shop
  return (
    <span className="mark" style={{ width: size, height: size, background: look.bg, color: look.fg }}>
      <Icon name={icon} size={Math.round(size * 0.56)} />
    </span>
  )
}
