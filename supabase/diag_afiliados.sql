-- =============================================================================
-- DIAGNÓSTICO: por qué un afiliado "se crea y desaparece".
-- Casi siempre es que el org_id del afiliado no coincide con el del usuario
-- (directiva) que lo crea, o que ese usuario no tiene org_id en su perfil.
-- =============================================================================

-- 1) Perfiles de directiva / admin y SU org_id (¿tienen sindicato asignado?)
select u.email,
       p.role,
       p.platform_admin,
       p.org_id                as org_del_perfil,
       o.slug                  as sindicato_del_perfil
from public.profiles p
join auth.users u          on u.id = p.id
left join public.organizations o on o.id = p.org_id
where p.platform_admin = true
   or p.role::text <> 'afiliado'   -- toda la directiva, sin nombrar roles (evita el enum)
order by p.role::text;

-- 2) Últimos afiliados y su org_id (¿coincide con el del presidente de arriba?)
select a.name,
       a.status,
       a.org_id                as org_del_afiliado,
       o.slug                  as sindicato_del_afiliado,
       a.created_at
from public.affiliates a
left join public.organizations o on o.id = a.org_id
order by a.created_at desc nulls last
limit 20;

-- 3) Afiliados SIN org_id o con org_id "huérfano" (esos son los que desaparecen)
select count(*) filter (where a.org_id is null)                     as sin_org,
       count(*) filter (where o.id is null and a.org_id is not null) as org_inexistente,
       count(*)                                                     as total
from public.affiliates a
left join public.organizations o on o.id = a.org_id;
