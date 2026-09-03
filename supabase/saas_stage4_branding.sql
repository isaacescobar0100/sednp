-- =============================================================================
-- SIG-SERDNP (Sindika) · SaaS ETAPA 4 — Marca por sindicato + panel super-admin
-- Agrega el logo por organizacion y habilita que el panel de super-admin cree
-- sindicatos. Requiere stage1, stage2 y stage3. Idempotente. Ejecutar en SQL Editor.
--
-- IMPORTANTE: primero despliega el frontend actualizado (Vercel), luego corre esto.
-- =============================================================================

-- 1) Logo por organizacion (URL). Si esta vacio, la app usa el logo de Sindika.
alter table public.organizations add column if not exists logo_url text;

-- SERDNP conserva su logo actual.
update public.organizations
   set logo_url = '/logo.png'
 where slug = 'serdnp' and (logo_url is null or logo_url = '');

-- 2) Permite que el panel del super-admin llame a crear_sindicato.
--    La funcion internamente valida is_platform_admin(), asi que solo el
--    administrador de la plataforma puede usarla.
grant execute on function public.crear_sindicato(text,text,text,text) to authenticated;

-- Verificacion:
select nombre, slug, coalesce(logo_url,'(Sindika por defecto)') as logo
from public.organizations order by created_at;
