# Sindika — Plataforma de gestión sindical

**Sindika** es una plataforma **SaaS multi-tenant** para la gestión integral de
sindicatos en Colombia: afiliación, finanzas, gobernanza, disciplina, comunicación
y sitio web, en un solo sistema, seguro y en la nube. Cada sindicato es un *tenant*
aislado; **SERDNP** (Organización Sindical de Servidores Públicos del DNP) es el
sindicato piloto.

> Las reglas de negocio se **configuran** contra los estatutos de cada sindicato
> (cuota, firmas por monto, quórum, flujo de afiliación, disciplinario, recursos…).

## Arquitectura

- **Frontend:** React 18 + TypeScript + **Vite** + Tailwind CSS.
- **Backend:** **Supabase** — Postgres, Auth, **RLS** (aislamiento por sindicato) y
  Storage. La lógica sensible vive en funciones `SECURITY DEFINER` (RPCs).
- **Funciones serverless** (`api/`, Vercel): checkout de pagos Wompi, confirmación de
  transacciones, envío de correos/boletín y tareas programadas (cron de cobros).
- **Despliegue:** Vercel, deploy automático desde la rama `main`.
- **Pagos:** Wompi (PSE y tarjeta) con firma de integridad del lado del servidor.

### Multi-tenant y seguridad
- Todo dato lleva `org_id`; una política RLS *restrictiva* (`org_isolation`) impide
  que un sindicato vea datos de otro.
- Autenticación real con Supabase Auth: login por correo + contraseña, **hCaptcha**
  contra bots, **2FA (TOTP)** y recuperación de contraseña.
- **Roles:** Presidencia, Vicepresidencia, Secretaría, Tesorería, Fiscalía y Afiliado,
  más un **superadmin de plataforma** que administra los sindicatos, cobros y accesos.
- Auditoría de cada acción, *column guards* por columna, respaldos y aislamiento del
  Storage por carpeta de organización.

## Puesta en marcha

```bash
npm install
npm run dev     # desarrollo (http://localhost:5173)
npm run build   # compilar para producción
npm test        # pruebas (Vitest)
```

Variables de entorno (ver [`.env.example`](.env.example)):

```
VITE_SUPABASE_URL=...        # URL del proyecto Supabase
VITE_SUPABASE_ANON_KEY=...   # clave pública (anon/publishable)
VITE_HCAPTCHA_SITEKEY=...    # sitekey pública de hCaptcha (opcional)
```

## Módulos

| Módulo | Qué hace | Rol operador |
|---|---|---|
| **Dashboard** | KPIs y actividad en vivo (según el rol) | Todos |
| **Afiliación** | Registro → concepto del Fiscal → aprobación de la Junta con acta → Activo | Secretaría / Fiscalía / Presidencia |
| **Financiero** | Recaudo (nómina / PSE / transferencia), corte de aportes, aprobación de gastos por monto (SMMLV) con firmas, presupuesto y export a contabilidad (SIIGO CSV) | Tesorería / Presidencia / Fiscalía |
| **Gobernanza** | Sesiones con quórum y acta, votaciones (incluso secretas) con resultados en vivo | Secretaría / Presidencia |
| **Disciplinario** | Expedientes por etapas con términos, fallo, multa → Financiero, recursos (reposición/apelación), bitácora inalterable | Fiscalía / Presidencia |
| **Comités** | Comités temáticos y órganos estatutarios | Secretaría |
| **Comunicaciones** | Comunicados y notificaciones a toda la base, con historial | Secretaría / Presidencia |
| **Documental** | Repositorio de actas, resoluciones e informes | Secretaría |
| **Libro de Actas** | Registro inmutable de conceptos, resoluciones y actas | Todos (lectura) |
| **Página web** | Sitio público del sindicato, administrado por la directiva (CMS) | Secretaría / Presidencia |
| **Reportes** | Indicadores consolidados en tiempo real + export CSV | Todos (lectura) |
| **Parámetros** | Catálogos (cargos, dependencias, escalas), cuota %, SMMLV, modo de recaudo y referencias al estatuto | Secretaría / Presidencia |
| **Portal del afiliado** | Consulta de aportes, votaciones y comunicados | Afiliado |
| **Superadmin** | Alta de sindicatos, cobros/suscripción y accesos de la plataforma | Plataforma |

**Separación de funciones:** quien **registra** no es quien **aprueba**. Cada rol ve
solo los módulos que le competen; donde no puede actuar, aparece un candado 🔒.

## Base de datos

Sin herramienta de migraciones formal: el esquema y su evolución viven como SQL en
`supabase/`, aplicados en el SQL Editor de Supabase.

- `supabase/schema.sql` — esquema base.
- `supabase/saas_stage1…N.sql` y `patch_*.sql` — migraciones incrementales (features,
  endurecimiento de seguridad, multi-tenant, pagos…). **Son el historial de la BD.**
- `supabase/dev/` — scripts de un solo uso (semillas, diagnóstico, credenciales,
  reset). **Locales, no se versionan.**

## Estructura del código

- `src/App.tsx` — enrutamiento (web pública → login → app de la directiva o portal).
- `src/lib/supabase.ts` — cliente único de Supabase.
- `src/store/*` — estado y reglas por dominio (afiliados, finanzas, gobernanza,
  disciplina, comunicaciones, catálogos, auth/roles, plataforma).
- `src/pages/` — una página por módulo. `src/components/` — layout, header, tarjetas,
  diálogos y paneles (login, directiva, superadmin).
- `api/` — funciones serverless (pagos, correos, cron).

## Estado del proyecto

**En producción**, desplegado en Vercel sobre Supabase. Backlog y pasos manuales
pendientes en [`PENDIENTES.md`](PENDIENTES.md); guion de pruebas por rol en
[`GUIA-PRUEBAS.md`](GUIA-PRUEBAS.md).

---

Un producto de **Grupo ISDA S.A.S**.
