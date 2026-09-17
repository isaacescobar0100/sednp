# Pendientes — Sindika (plataforma SaaS de sindicatos)

> Última actualización: 2026-09-16
> Estado general: módulo de pagos completo · auditoría de seguridad con los 6 hallazgos resueltos · plataforma funcionando en dominio de prueba.

---

## 🔴 Antes de cobrar plata REAL (producción de pagos)

- [ ] **Webhooks de Wompi.** Hoy la confirmación de pago consulta el `transactionId` que devuelve el navegador. Para producción real hay que validar el pago con el **evento firmado de Wompi** (`events secret`, cabecera `X-Event-Checksum`). Endpoint nuevo `/api/wompi-webhook`. *(En sandbox/demo lo actual está bien.)*
- [ ] Cada sindicato conecta **su propia cuenta Wompi** (ya soportado): llave pública + secreto de integridad en Parámetros → Recaudo. La plata cae en la cuenta del sindicato.

## 🔑 "Olvidé mi contraseña"

- [x] Código listo (link en login → correo → pantalla nueva clave).
- [x] **Redirect URLs** configuradas en Supabase (ya no abre localhost).
- [ ] (Opcional) **SMTP de Resend en Supabase** — solo si el correo de recuperación llega a spam. *En prueba llegó bien, así que queda para hacerlo junto con el dominio real, sin prisa.*

## 📧 Correo (producción) — modelo: UNA sola cuenta Resend (opción A, ya elegida)

- [~] **Verificar el dominio en Resend** — **en verificación** (esperando propagación de DNS). Cuando quede "verified", los correos salen por tu dominio.
- [ ] **DMARC** en el DNS del dominio de correo.
- [ ] Setear `EMAIL_FROM` en Vercel con la dirección oficial (ej. `Sindika <notificaciones@tudominio.com>`).
- [ ] (Opcional, hoy) **Rotar la llave de Resend** si en algún momento estuvo expuesta.
- [ ] (Solo si un sindicato grande lo exige) Opción B: llave de Resend **por sindicato** (columna `resend_api_key`, patrón igual a Wompi). ~30 min cuando se necesite.

## 🏷️ Marca (decidido)

- **Empresa (razón social):** GRUPO ISDA S.A.S
- **Corporativo / paraguas:** `idhetech.co` (casa de varios productos)
- **Producto Sindika:** `sindikasoft.co` → los sindicatos viven en `<slug>.sindikasoft.co`
- [ ] Verificar disponibilidad y **comprar** `idhetech.co` y `sindikasoft.co`.

## 🌐 Dominio definitivo — migración a `sindikasoft.co`

- [ ] Migración cuando estén los dominios (hacerlo todo junto):
  - [ ] Vercel env: `PLATFORM_BASE_DOMAIN=sindikasoft.co`, `VITE_PLATFORM_HOSTS` (host de plataforma, ej. `sindika.sindikasoft.co` o `admin.sindikasoft.co`), `PUBLIC_BASE_URL`.
  - [ ] DNS: subdominio comodín `*.sindikasoft.co` → Vercel (para `<slug>.sindikasoft.co`).
  - [ ] Supabase: **Redirect URLs** `https://*.sindikasoft.co/**` + **Site URL** con el host de plataforma.
  - [ ] (Opcional) idhetech.co como sitio corporativo/portafolio de la empresa.
  - [ ] Revisar textos/imágenes que mencionen `acordemusic.com` (dominio de prueba).

## 🛡️ Seguridad — hecho y por reforzar

**Hecho (desplegado + SQL corridos):**
- [x] C2 — escalada a admin vía `profiles` (stage25).
- [x] C1 — solo Tesorería/pasarela marca aportes pagados (stage26).
- [x] C3 — binding de ambiente/moneda en confirmación Wompi.
- [x] H1/H2 — validación UUID + anti-IDOR en endpoints de pago.
- [x] M1 — remitente de correo fijado en servidor (no suplantable).
- [x] M2 — allowlist de host en la redirección post-pago (configurable por env).

**Por reforzar (no urgente):**
- [x] Rate-limit **básico** ya implementado en los endpoints sensibles (correo/boletín/push).
- [ ] (Opcional) **Rate-limit compartido** (ej. Upstash) para que el límite sea global entre instancias. El básico actual sirve para el piloto.
- [ ] Webhooks de Wompi (ver sección de pagos).
- [ ] **Pentest externo antes del lanzamiento grande.** Contratar una empresa/profesional de seguridad que intente "hackear" la plataforma de forma controlada y autorizada, para encontrar fallos que una auditoría interna pudo no ver. Recomendado antes de manejar dinero real de varios sindicatos. (La auditoría interna 2026-09-16 ya cerró los 6 hallazgos encontrados; el pentest es la validación externa e independiente.)

## 💡 Funciones futuras (solo si un cliente lo pide)

- [ ] **Referencias normativas personalizadas.** Hoy las citas de estatutos son una lista FIJA de ~18 puntos (anclados a reglas que la app ya muestra). Si un sindicato necesita citar reglas adicionales fuera de esas 18, agregar una sección de pares libres *(nombre de la regla → artículo)* que se muestren en una lista genérica de su módulo. No urgente — los 18 cubren lo estándar. (Nota: las **actas/documentos** ya son ilimitadas y viven en Gobernanza/Documental, esto NO son actas.)
- [ ] Opción B de Resend (llave por sindicato) — ya anotada arriba en la sección de correo.

## 💼 Comercial / crecimiento

- [ ] Buscar sindicatos en **Bogotá** para ofrecer la plataforma.
- [ ] Definir plan de **soporte recurrente** (además del pago único de implementación).

## ⚡ Optimización para escalar (cuando entren sindicatos grandes)

> Hoy la app carga TODO al iniciar sesión (~15 consultas con `select('*')`, todas las filas por tabla) en el store en memoria. Funciona bien con pocos datos (piloto); no escala a miles de afiliados/aportes. No es N+1 (no consulta fila por fila). Ver `src/store/DemoStore.tsx` (efecto de carga inicial).

Por impacto/esfuerzo:
- [ ] **#1 Paginación en servidor** (`.range()` 20-50) en tablas grandes (aportes, movimientos, comunicados) + `select` de **columnas específicas** en vez de `*`. *(Alto impacto, bajo esfuerzo.)*
- [ ] **#2 Eager loading / JOIN embebido** de PostgREST: `select('*, affiliates(name)')` para traer relaciones en una sola query (evita cruzar en memoria / N+1). *(Alto, bajo.)*
- [ ] **#3 RPC de agregados** para Dashboard/Reportes: función SQL que devuelve conteos/sumas, en vez de traer todo y contar en el cliente. *(Medio, bajo.)*
- [ ] **#4 Caché real con TanStack Query (React Query)**: dedupe, stale-while-revalidate, carga lazy por módulo. Es el salto grande (refactor del store). *(Alto, medio-alto.)*
- [ ] **#5 Realtime incremental**: aplicar solo la fila cambiada (viene en el payload) en vez de refrescar la tabla entera. *(Medio, medio.)*
- [ ] **#6 Índices** en `org_id` + columnas de orden/filtro (ya hay varios `_org_idx`; revisar los que falten).

Orden sugerido cuando toque: #1 y #2 primero (rápidos), luego #3, y #4 al escalar de verdad. Nota: caché HTTP/CDN NO aplica bien por el RLS (datos por usuario); la caché va en el cliente.

## 🧰 Operación / calidad (opcional)

- [ ] Bulk "conciliar nómina" ya está hecho ✅ (solo se anota por historial).
- [ ] Monitoreo: Sentry activo; CI en verde. Revisar alertas cuando lleguen.
- [ ] Chequeo de salud de BD (query de huérfanos) cuando se hagan borrados/migraciones grandes.

---

### Referencia rápida — SQL ya corridos
stage20 (modo_recaudo) · stage21 (Wompi keys) · stage22 (comprobante) · stage23 (wompi_ref) · stage24 (borrado en cascada) · stage25 (fix profiles) · stage26 (fix marcar pagado) · eliminar_sindicato (con protección a admins) · reset total + admin nuevo.
