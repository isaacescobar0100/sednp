import React from 'react'
import { UsersIcon } from 'lucide-react'
import { AndesRange } from './AndesRange'

export function BrandPanel() {
  return (
    <section className="relative hidden overflow-hidden bg-night text-white lg:flex lg:w-[46%] xl:w-[42%]">
      <div
        aria-hidden="true"
        className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/10 blur-3xl"
      />

      <AndesRange />

      <div className="relative z-10 flex w-full flex-col justify-between px-10 py-12 xl:px-14">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold shadow-lg shadow-black/30">
              <span className="font-display text-2xl font-700 leading-none text-night">S</span>
            </div>
            <span className="font-display text-2xl font-600 tracking-[0.18em] text-white">
              SERDNP
            </span>
          </div>

          <div className="mt-4 flex h-1 w-36 overflow-hidden rounded-full">
            <span className="h-full flex-1 bg-gold" />
            <span className="h-full flex-1 bg-[#3D5AAE]" />
            <span className="h-full flex-1 bg-brick" />
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="font-display text-3xl font-600 leading-tight text-white xl:text-4xl">
            Sistema Integral de Gestión
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Organización Sindical de Servidores Públicos del Departamento Nacional de
            Planeación
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 backdrop-blur-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15">
            <UsersIcon className="h-4.5 w-4.5 text-gold" strokeWidth={2} />
          </div>
          <p className="text-sm text-white/85">
            <span className="font-display font-600 text-gold">312 afiliados activos</span>{' '}
            en todo el país
          </p>
        </div>
      </div>
    </section>
  )
}
