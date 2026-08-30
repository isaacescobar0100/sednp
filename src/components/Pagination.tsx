import React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

// Divide una lista en la página actual y expone el total de páginas.
export function paginate<T>(items: T[], page: number, size: number): T[] {
  const start = (page - 1) * size
  return items.slice(start, start + size)
}

export function totalPages(count: number, size: number): number {
  return Math.max(1, Math.ceil(count / size))
}

// Barra de paginación: "X–Y de Z" + anterior/siguiente. Se oculta si hay una sola página.
export function Pagination({ page, size, total, onPage }: { page: number; size: number; total: number; onPage: (p: number) => void }) {
  const pages = totalPages(total, size)
  if (total <= size) return null
  const from = (page - 1) * size + 1
  const to = Math.min(page * size, total)
  return (
    <div className="flex items-center justify-between gap-3 border-t border-ink/[0.07] px-5 py-3 text-xs text-ink/55">
      <span>{from}–{to} de {total}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-ink/12 px-2.5 py-1.5 font-semibold text-night transition hover:bg-canvas disabled:opacity-40"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />Anterior
        </button>
        <span className="px-2 font-medium text-ink/60">{page} / {pages}</span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="inline-flex items-center gap-1 rounded-lg border border-ink/12 px-2.5 py-1.5 font-semibold text-night transition hover:bg-canvas disabled:opacity-40"
        >
          Siguiente<ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
