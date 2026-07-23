import React from 'react'

type SectionTitleProps = {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function SectionTitle({ eyebrow, title, description, action }: SectionTitleProps) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-gold">{eyebrow}</p> : null}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 text-sm text-ink/55">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
