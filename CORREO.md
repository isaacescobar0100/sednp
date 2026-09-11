# Correo saliente (Resend + función serverless en Vercel)

La app envía correos a través de `api/send-email.js` (función serverless en
Vercel) usando **Resend**. Sigue estos pasos para dejarlo funcionando.

## 1. Crear cuenta en Resend
1. Entra a https://resend.com y crea una cuenta (con tu correo, p. ej.
   `rafa19882@gmail.com`).
2. Ve a **API Keys → Create API Key**. Copia la clave (empieza por `re_...`).

> **Modo prueba (sin dominio propio):** Resend deja enviar **desde**
> `onboarding@resend.dev` y **solo hacia el correo con el que te registraste**.
> Por eso, para probar, usa un afiliado cuyo correo sea el tuyo.
> Cuando compres el dominio, se verifica en Resend y podrás enviar a cualquiera
> desde `no-responder@tudominio.com`.

## 2. Configurar variables en Vercel
En el proyecto en Vercel → **Settings → Environment Variables**, agrega:

| Nombre | Valor | Entornos |
|--------|-------|----------|
| `RESEND_API_KEY` | la clave `re_...` de Resend | Production (y Preview) |
| `EMAIL_FROM` | *(opcional)* `SERDNP <onboarding@resend.dev>` | Production |

> `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` ya existen (las usa la app); la
> función las reutiliza para validar la sesión de quien envía.

## 3. Redesplegar
Guarda las variables y haz un **Redeploy** en Vercel (o espera al próximo push).

## 4. Probar
- Entra como un **afiliado cuyo correo sea el de tu cuenta Resend**.
- En **Portal del afiliado → Mis aportes**, paga un aporte pendiente
  (o, como Tesorería, márcalo como pagado).
- Debe llegar el correo **"Confirmación de aporte sindical — SERDNP"**.

Si no llega: revisa en Resend → **Logs** el estado del envío, y en Vercel →
**Functions logs** por si falta `RESEND_API_KEY`.

## Notas
- Es **fire-and-forget**: si el correo falla o no está configurado, el pago se
  registra igual (no rompe el flujo).
- En desarrollo local (`npm run dev`) la ruta `/api` **no** se ejecuta; para
  probar localmente usa `vercel dev`. En producción (Vercel) funciona directo.
- Cuando haya dominio propio, este mismo montaje sirve para los demás correos
  pendientes: notificar el acto de afiliación, link de auto-registro, etc.
