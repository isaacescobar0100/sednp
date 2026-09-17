import React, { createContext, useCallback, useContext, useState } from 'react'

// Modal de confirmación reutilizable (reemplaza window.confirm por una UI propia).
// Uso:  const confirmar = useConfirm();  if (await confirmar({ message: '…' })) { … }
type ConfirmOpts = {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  tone?: 'peligro' | 'normal'
}
type Pending = ConfirmOpts & { resolve: (v: boolean) => void }

const Ctx = createContext<((o: ConfirmOpts | string) => Promise<boolean>) | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)

  const confirmar = useCallback((o: ConfirmOpts | string) => {
    const opts = typeof o === 'string' ? { message: o } : o
    return new Promise<boolean>((resolve) => setPending({ ...opts, resolve }))
  }, [])

  const cerrar = (v: boolean) => {
    setPending((p) => { p?.resolve(v); return null })
  }

  return (
    <Ctx.Provider value={confirmar}>
      {children}
      {pending ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4" onClick={() => cerrar(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            {pending.title ? <h3 className="font-display text-base font-semibold text-ink">{pending.title}</h3> : null}
            <p className={`text-sm text-ink/70 whitespace-pre-line ${pending.title ? 'mt-1' : ''}`}>{pending.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => cerrar(false)} className="rounded-xl border border-ink/12 px-4 py-2 text-sm font-semibold text-ink/60 transition hover:border-ink/30">{pending.cancelText || 'Cancelar'}</button>
              <button onClick={() => cerrar(true)} className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${pending.tone === 'peligro' ? 'bg-brick hover:bg-brick/90' : 'bg-night hover:bg-night-deep'}`}>{pending.confirmText || 'Confirmar'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </Ctx.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>')
  return ctx
}
