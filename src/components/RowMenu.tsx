import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreVerticalIcon } from 'lucide-react'

export type RowAction = {
  label: string
  danger?: boolean
  onClick: () => void
}

const MENU_WIDTH = 192 // w-48

// Menú de acciones por fila. Se renderiza en un portal con posición fija sobre el
// botón, para que NO lo recorte el contenedor con overflow de la tabla.
export function RowMenu({ label, actions }: { label: string; actions: RowAction[] }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) {
      const estHeight = actions.length * 40 + 8
      const openUp = rect.bottom + estHeight > window.innerHeight
      setPos({
        top: openUp ? rect.top - estHeight - 6 : rect.bottom + 6,
        left: Math.max(8, rect.right - MENU_WIDTH),
      })
    }
    setOpen(true)
  }

  // Cerrar al hacer scroll o redimensionar (la posición fija quedaría desalineada).
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <>
      <button ref={btnRef} onClick={toggle} className="rounded-lg p-1.5 text-ink/50 transition hover:bg-canvas hover:text-night" aria-label={label} aria-haspopup="menu" aria-expanded={open}>
        <MoreVerticalIcon className="h-4 w-4" />
      </button>
      {open && pos
        ? createPortal(
            <>
              <button className="fixed inset-0 z-[55] cursor-default" aria-hidden="true" onClick={() => setOpen(false)} />
              <div role="menu" className="fixed z-[56] w-48 overflow-hidden rounded-xl border border-ink/10 bg-white py-1 shadow-xl shadow-night/10" style={{ top: pos.top, left: pos.left }}>
                {actions.map((action) => (
                  <button
                    key={action.label}
                    role="menuitem"
                    onClick={() => {
                      action.onClick()
                      setOpen(false)
                    }}
                    className={`block w-full px-4 py-2 text-left text-sm transition hover:bg-canvas ${action.danger ? 'text-brick' : 'text-ink/75'}`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  )
}
