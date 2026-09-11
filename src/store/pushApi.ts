// Notificaciones push (Web Push). Activa/desactiva la suscripción del dispositivo
// y dispara envíos (para la directiva) a través de /api/push-send.
import { supabase } from '../lib/supabase'

// Clave pública VAPID (es pública por diseño). La privada vive en Vercel.
export const VAPID_PUBLIC_KEY = 'BFXJ0q6YKT9lOp8xoYS9PZljcSCRk1GQVOh68rj65dYsSrQe87Tu5WCKDYLvVvJiarXjn4MNpL9JQxIVsgJyrCI'

export function pushSoportado(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window
}

function urlB64ToUint8(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i)
  return arr
}
function bufToB64Url(buf: ArrayBuffer | null): string {
  if (!buf) return ''
  const bytes = new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function pushActivo(): Promise<boolean> {
  try {
    if (!pushSoportado() || Notification.permission !== 'granted') return false
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return Boolean(sub)
  } catch { return false }
}

export async function activarPush(): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!pushSoportado()) return { ok: false, error: 'Tu dispositivo o navegador no admite notificaciones. En iPhone, primero instala la app en la pantalla de inicio.' }
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return { ok: false, error: 'No diste permiso para notificaciones.' }
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(VAPID_PUBLIC_KEY) })
    const p256dh = bufToB64Url(sub.getKey('p256dh'))
    const auth = bufToB64Url(sub.getKey('auth'))
    const { error } = await supabase.from('push_subscriptions').upsert({ endpoint: sub.endpoint, p256dh, auth }, { onConflict: 'endpoint' })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo activar.' }
  }
}

export async function desactivarPush(): Promise<{ ok: boolean }> {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
    }
    return { ok: true }
  } catch { return { ok: false } }
}

// Envío (directiva): manda una notificación a los dispositivos suscritos del sindicato.
export async function enviarPush(title: string, body: string, url = '/?app=1'): Promise<{ ok: boolean; sent: number; total: number; error?: string }> {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return { ok: false, sent: 0, total: 0, error: 'Sin sesión' }
    const res = await fetch('/api/push-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, body, url }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, sent: 0, total: 0, error: payload.error || `Error ${res.status}` }
    return { ok: true, sent: payload.sent || 0, total: payload.total || 0 }
  } catch (e) {
    return { ok: false, sent: 0, total: 0, error: e instanceof Error ? e.message : 'Fallo de red' }
  }
}
