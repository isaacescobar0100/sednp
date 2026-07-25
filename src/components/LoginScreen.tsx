import React from 'react'
import { BrandPanel } from './BrandPanel'
import { LoginForm } from './LoginForm'
import { Role } from '../store/session'

type LoginScreenProps = {
  onDirectivaLogin: (role: Role) => void
  onAfiliadoLogin: (id: string) => void
}

export function LoginScreen({ onDirectivaLogin, onAfiliadoLogin }: LoginScreenProps) {
  return (
    <main className="flex h-screen w-full overflow-hidden bg-canvas">
      <BrandPanel />

      <section className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-12 sm:px-10">
        <LoginForm onDirectivaLogin={onDirectivaLogin} onAfiliadoLogin={onAfiliadoLogin} />
      </section>
    </main>
  )
}
