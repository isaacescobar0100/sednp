import { describe, it, expect } from 'vitest'
import { esHostPlataforma, esEntradaAdmin, baseDominioTenants, hostPerteneceASindicato, urlDeSindicato } from './platform'

// Simula el host/ruta del navegador (VITE_PLATFORM_HOSTS por defecto = sindika.acordemusic.com).
function setLoc(hostname: string, pathname = '/', search = '') {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { hostname, pathname, search, origin: `https://${hostname}` },
  })
}

describe('baseDominioTenants', () => {
  it('deriva el dominio base del host de plataforma', () => {
    expect(baseDominioTenants()).toBe('acordemusic.com')
  })
})

describe('esHostPlataforma / esEntradaAdmin', () => {
  it('reconoce el host de plataforma', () => {
    setLoc('sindika.acordemusic.com')
    expect(esHostPlataforma()).toBe(true)
    setLoc('qq.acordemusic.com')
    expect(esHostPlataforma()).toBe(false)
  })
  it('/admin cuenta como entrada de admin en cualquier host', () => {
    setLoc('qq.acordemusic.com', '/admin')
    expect(esEntradaAdmin()).toBe(true)
    setLoc('qq.acordemusic.com', '/ingresar')
    expect(esEntradaAdmin()).toBe(false)
    setLoc('sindika.acordemusic.com', '/')
    expect(esEntradaAdmin()).toBe(true)
  })
})

describe('hostPerteneceASindicato (aislamiento: una cuenta solo entra por su URL)', () => {
  it('permite al sindicato entrar por su propio subdominio', () => {
    setLoc('qq.acordemusic.com')
    expect(hostPerteneceASindicato('qq', null)).toBe(true)
  })
  it('BLOQUEA a un sindicato distinto en un subdominio ajeno', () => {
    setLoc('qq.acordemusic.com')
    expect(hostPerteneceASindicato('serdnp', null)).toBe(false)
  })
  it('permite por dominio propio exacto', () => {
    setLoc('misindicato.org')
    expect(hostPerteneceASindicato('x', 'misindicato.org')).toBe(true)
  })
  it('no restringe en el host de plataforma', () => {
    setLoc('sindika.acordemusic.com')
    expect(hostPerteneceASindicato('serdnp', null)).toBe(true)
  })
  it('no restringe en hosts genéricos (ej. vercel.app)', () => {
    setLoc('sednp.vercel.app')
    expect(hostPerteneceASindicato('qq', null)).toBe(true)
  })
})

describe('urlDeSindicato', () => {
  it('usa el dominio propio si existe', () => {
    setLoc('sindika.acordemusic.com')
    expect(urlDeSindicato('x', 'midominio.org')).toBe('https://midominio.org')
  })
  it('usa el subdominio si no hay dominio propio', () => {
    setLoc('sindika.acordemusic.com')
    expect(urlDeSindicato('qq', null)).toBe('https://qq.acordemusic.com')
  })
})
