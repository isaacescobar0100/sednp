# Pendientes — Sindika (plataforma SaaS de sindicatos)

> Última actualización: 2026-09-16
> Estado general: módulo de pagos completo · auditoría de seguridad con los 6 hallazgos resueltos · plataforma funcionando en dominio de prueba.

---

## 🔴 Antes de cobrar plata REAL (producción de pagos)

- [ ] **Webhooks de Wompi.** Hoy la confirmación de pago consulta el `transactionId` que devuelve el navegador. Para producción real hay que validar el pago con el **evento firmado de Wompi** (`events secret`, cabecera `X-Event-Checksum`). Endpoint nuevo `/api/wompi-webhook`. *(En sandbox/demo lo actual está bien.)*
- [ ] Cada sindicato conecta **su propia cuenta Wompi** (ya soportado): llave pública + secreto de integridad en Parámetros → Recaudo. La plata cae en la cuenta del sindicato.

## 📧 Correo (producción) — modelo: UNA sola cuenta Resend (opción A, ya elegida)

- [ ] **Verificar el dominio real en Resend** (registros SPF + DKIM en el DNS).
- [ ] **DMARC** en el DNS del dominio de correo.
- [ ] Setear `EMAIL_FROM` en Vercel con la dirección oficial (ej. `Sindika <notificaciones@tudominio.com>`).
- [ ] (Opcional, hoy) **Rotar la llave de Resend** si en algún momento estuvo expuesta.
- [ ] (Solo si un sindicato grande lo exige) Opción B: llave de Resend **por sindicato** (columna `resend_api_key`, patrón igual a Wompi). ~30 min cuando se necesite.

## 🌐 Dominio definitivo

- [ ] Adquirir el **dominio real** (hoy `acordemusic.com` es de prueba/genérico).
- [ ] Definir el **nombre definitivo** de la plataforma (corto, tipo tech, "paraguas" para varios proyectos).
- [ ] Migración cuando esté el dominio (hacerlo todo junto):
  - [ ] Vercel env: `PLATFORM_BASE_DOMAIN`, `VITE_PLATFORM_HOSTS`, `PUBLIC_BASE_URL`.
  - [ ] DNS: subdominio comodín `*.tudominio.com` → Vercel (para `<slug>.tudominio.com`).
  - [ ] Supabase: **Redirect URLs / Site URL** de Auth con el dominio nuevo.
  - [ ] Revisar textos/imágenes que mencionen el dominio viejo.

## 🛡️ Seguridad — hecho y por reforzar

**Hecho (desplegado + SQL corridos):**
- [x] C2 — escalada a admin vía `profiles` (stage25).
- [x] C1 — solo Tesorería/pasarela marca aportes pagados (stage26).
- [x] C3 — binding de ambiente/moneda en confirmación Wompi.
- [x] H1/H2 — validación UUID + anti-IDOR en endpoints de pago.
- [x] M1 — remitente de correo fijado en servidor (no suplantable).
- [x] M2 — allowlist de host en la redirección post-pago (configurable por env).

**Por reforzar (no urgente):**
- [ ] **Rate-limit compartido** (ej. Upstash) para `/api` sensibles. Hoy es en-memoria por instancia (best-effort).
- [ ] Webhooks de Wompi (ver sección de pagos).
- [ ] **Pentest externo antes del lanzamiento grande.** Contratar una empresa/profesional de seguridad que intente "hackear" la plataforma de forma controlada y autorizada, para encontrar fallos que una auditoría interna pudo no ver. Recomendado antes de manejar dinero real de varios sindicatos. (La auditoría interna 2026-09-16 ya cerró los 6 hallazgos encontrados; el pentest es la validación externa e independiente.)

## 💼 Comercial / crecimiento

- [ ] Buscar sindicatos en **Bogotá** para ofrecer la plataforma.
- [ ] Definir plan de **soporte recurrente** (además del pago único de implementación).

## 🧰 Operación / calidad (opcional)

- [ ] Bulk "conciliar nómina" ya está hecho ✅ (solo se anota por historial).
- [ ] Monitoreo: Sentry activo; CI en verde. Revisar alertas cuando lleguen.
- [ ] Chequeo de salud de BD (query de huérfanos) cuando se hagan borrados/migraciones grandes.

---

### Referencia rápida — SQL ya corridos
stage20 (modo_recaudo) · stage21 (Wompi keys) · stage22 (comprobante) · stage23 (wompi_ref) · stage24 (borrado en cascada) · stage25 (fix profiles) · stage26 (fix marcar pagado) · eliminar_sindicato (con protección a admins) · reset total + admin nuevo.
