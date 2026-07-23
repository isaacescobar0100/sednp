import React from 'react'

type StatusBadgeProps = {
  children: React.ReactNode
  tone?: 'positive' | 'warning' | 'negative' | 'neutral' | 'night'
}

const styles = {
  positive: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  negative: 'bg-red-50 text-brick ring-brick/15',
  neutral: 'bg-ink/5 text-ink/60 ring-ink/10',
  night: 'bg-night/8 text-night ring-night/10',
}

export function StatusBadge({ children, tone = 'neutral' }: StatusBadgeProps) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${styles[tone]}`}>{children}</span>
}
