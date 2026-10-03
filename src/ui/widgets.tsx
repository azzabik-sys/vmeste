import { useState } from 'react'
import type { PaceLevel } from '../domain/pace'
import { monthOf, monthTitle, recentMonths } from '../domain/dates'
import { formatGroupedInput, parsePlan } from '../domain/money'
import { Icon } from './icons'

export function AmountField({
  value,
  onCommit,
  ariaLabel,
  className,
  placeholder = '0',
  autoFocus = false,
  commitOnChange = false,
  onFinished,
}: {
  value: number
  onCommit: (value: number) => void
  ariaLabel: string
  className?: string
  placeholder?: string
  autoFocus?: boolean
  commitOnChange?: boolean
  onFinished?: () => void
}) {
  const [text, setText] = useState<string | null>(null)
  const shown = text ?? formatGroupedInput(value)
  return (
    <input
      className={className}
      inputMode="decimal"
      aria-label={ariaLabel}
      placeholder={placeholder}
      autoFocus={autoFocus}
      value={shown}
      onFocus={(event) => {
        setText(formatGroupedInput(value))
        event.currentTarget.select()
      }}
      onChange={(event) => {
        const next = event.target.value
        setText(next)
        if (!commitOnChange) return
        const parsed = parsePlan(next)
        if (parsed !== null && parsed !== value) onCommit(parsed)
      }}
      onBlur={() => {
        const parsed = parsePlan(text ?? '')
        setText(null)
        if (parsed !== null && parsed !== value) onCommit(parsed)
        onFinished?.()
      }}
    />
  )
}

export function Bar({ percent, tone }: { percent: number; tone: PaceLevel }) {
  const width = Math.max(0, Math.min(percent, 100))
  return (
    <span className="bar" data-tone={tone}>
      <span style={{ width: `${width}%` }} />
    </span>
  )
}

export function Ring({ percent, tone }: { percent: number; tone: PaceLevel }) {
  const size = 72
  const stroke = 7
  const radius = (size - stroke) / 2
  const length = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(percent, 100))
  const dash = (clamped / 100) * length
  const color = tone === 'over' ? '#EF4444' : tone === 'warn' ? '#F59E0B' : '#18A85B'
  return (
    <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E9E9E7" strokeWidth={stroke} />
      {clamped > 0 ? (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${length - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ) : null}
      <text
        x="50%"
        y="52%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#171714"
        fontSize="13"
        fontWeight="700"
        fontFamily="-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif"
      >
        {percent}%
      </text>
    </svg>
  )
}

export function MonthPicker({
  value,
  today,
  onChange,
  variant = 'title',
}: {
  value: string
  today: string
  onChange: (monthStart: string) => void
  variant?: 'title' | 'field'
}) {
  const [open, setOpen] = useState(false)
  const months = recentMonths(today)
  const current = monthOf(value).start
  return (
    <div className={`month-picker ${variant}`}>
      <button
        type="button"
        className={variant === 'field' ? 'month-field' : 'month-btn'}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((next) => !next)}
      >
        {variant === 'field' ? <Icon name="calendar" size={18} /> : null}
        <span>{monthTitle(value)}</span>
        <Icon name="chevronDown" size={16} />
      </button>
      {open ? (
        <ul className="month-menu" role="listbox">
          {months.map((month) => (
            <li key={month}>
              <button
                type="button"
                role="option"
                aria-selected={month === current}
                onClick={() => {
                  onChange(month)
                  setOpen(false)
                }}
              >
                {monthTitle(month)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
