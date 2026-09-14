import React from 'react'

// Marca genérica de la plataforma (Sindika). Se usa en pantallas previas al
// login/2FA donde aún no se conoce el sindicato. `size` es el lado en px.
export function Logo({ size = 36, rounded = 'rounded-lg', className = '' }: { size?: number; rounded?: string; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-white ${rounded} ${className}`}
      style={{ width: size, height: size }}
    >
      <img src="/sindika.png" alt="Sindika" className="h-full w-full object-contain" />
    </span>
  )
}
