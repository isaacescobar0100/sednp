import React from 'react'
import { BrandPanel } from './BrandPanel'
import { LoginForm } from './LoginForm'

type LoginScreenProps = {
  onLogin: () => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <main className="flex min-h-full w-full bg-canvas">
      <BrandPanel />

      <section className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
        <LoginForm onLogin={onLogin} />
      </section>
    </main>
  )
}
