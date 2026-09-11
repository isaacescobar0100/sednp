import React, { useEffect, useState } from 'react'
import { UsersIcon } from 'lucide-react'
import { AndesRange } from './AndesRange'
import { supabase } from '../lib/supabase'

export function BrandPanel() {
  // Conteo público de afiliados activos (RPC), visible sin iniciar sesión.
  const [activos, setActivos] = useState(0)
  // Logo del sindicato del dominio actual (co-marca con Sindika). Si el sindicato
  // no tiene logo, se muestra SOLO Sindika.
  const [tenantLogo, setTenantLogo] = useState('')
  const [tenantNombre, setTenantNombre] = useState('')
  useEffect(() => {
    let on = true
    supabase.rpc('contar_afiliados_activos').then(({ data, error }) => {
      if (on && !error && typeof data === 'number') setActivos(data)
    })
    // En un host de plataforma se muestra SOLO Sindika (no un sindicato).
    const platformHosts = (((import.meta.env.VITE_PLATFORM_HOSTS as string | undefined) || 'sindika.acordemusic.com')
      .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))
    if (!platformHosts.includes(window.location.hostname.toLowerCase())) {
      const paramOrg = new URLSearchParams(window.location.search).get('org') || null
      supabase.rpc('sitio_publico', { p_host: window.location.hostname, p_slug: paramOrg }).then(({ data }) => {
        if (!on) return
        const d = (data || {}) as { nombre?: string; logoUrl?: string }
        setTenantLogo(d.logoUrl || '')
        setTenantNombre(d.nombre || '')
      })
    }
    return () => { on = false }
  }, [])
  return (
    <section className="relative hidden overflow-hidden bg-night text-white lg:flex lg:w-[46%] xl:w-[42%]">
      <div
        aria-hidden="true"
        className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/10 blur-3xl"
      />

      <AndesRange />

      <div className="relative z-10 flex w-full flex-col justify-between px-10 py-12 xl:px-14">
        <div>
          <div className="flex items-center gap-5">
            {tenantLogo ? (
              <>
                <img src={tenantLogo} alt={tenantNombre || 'Sindicato'} className="h-16 w-auto drop-shadow-xl" />
                <span className="h-12 w-px bg-white/20" />
              </>
            ) : null}
            <img src="/sindika-dark.png" alt="Sindika" className="h-16 w-auto drop-shadow-xl" />
          </div>

          <div className="mt-5 flex h-1 w-36 overflow-hidden rounded-full">
            <span className="h-full flex-1 bg-gold" />
            <span className="h-full flex-1 bg-[#3D5AAE]" />
            <span className="h-full flex-1 bg-brick" />
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="font-display text-3xl font-600 leading-tight text-white xl:text-4xl">
            La plataforma para tu sindicato
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Afiliados, finanzas, gobernanza y disciplina — en un solo lugar, seguro y fácil de usar.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 backdrop-blur-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15">
            <UsersIcon className="h-4.5 w-4.5 text-gold" strokeWidth={2} />
          </div>
          <p className="text-sm text-white/85">
            <span className="font-display font-600 text-gold">{activos.toLocaleString('es-CO')} afiliado{activos === 1 ? '' : 's'}</span>{' '}
            gestionado{activos === 1 ? '' : 's'} en Sindika
          </p>
        </div>
      </div>
    </section>
  )
}
