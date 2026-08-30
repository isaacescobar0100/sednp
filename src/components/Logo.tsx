import React from 'react'

// Logo institucional. Usa /logo.png (servido desde public/).
// `size` es el lado en px del cuadro; la imagen se ajusta dentro.
export function Logo({ size = 36, rounded = 'rounded-lg', className = '' }: { size?: number; rounded?: string; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-white ${rounded} ${className}`}
      style={{ width: size, height: size }}
    >
      <img src="/logo.png" alt="SERDNP" className="h-full w-full object-contain" />
    </span>
  )
}
