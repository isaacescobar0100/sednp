-- =============================================================================
-- SaaS · Etapa 9 — COBROS Y SUSCRIPCIÓN POR SINDICATO (+ resumen de plataforma)
-- -----------------------------------------------------------------------------
-- Convierte el panel de administración de "alta de sindicatos" en un centro de
-- control del negocio: cada sindicato tiene plan, precio anual y fecha de
-- próximo pago; el estado (al día / por vencer / vencido) se DERIVA de la fecha.
-- Correr una sola vez en el editor SQL de Supabase.
-- =============================================================================

-- 1) Campos de suscripción en organizations ----------------------------------
alter table public.organizations add column if not exists plan text not null default 'basico';
alter table public.organizations add column if not exists precio_anual bigint not null default 0;      -- COP que se cobra al año (soporte + infra)
alter table public.organizations add column if not exists fecha_proximo_pago date;                     -- próximo vencimiento
alter table public.organizations add column if not exists afiliados_max int;                           -- límite del plan (null = sin límite)
alter table public.organizations add column if not exists notas_cobro text;                            -- nota interna de cobro

-- Restringe los valores de plan a los del tarifario (idempotente).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'organizations_plan_chk') then
    alter table public.organizations
      add constraint organizations_plan_chk
      check (plan in ('basico','profesional','empresarial','corporativo'));
  end if;
end $$;

-- 2) Resumen de plataforma: conteo de afiliados por sindicato -----------------
-- SECURITY DEFINER para poder contar a través de todos los sindicatos, pero
-- SOLO si quien llama es administrador de la plataforma.
create or replace function public.resumen_plataforma()
returns table (org_id uuid, afiliados bigint, afiliados_activos bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'No autorizado';
  end if;
  return query
    select o.id,
           count(a.id),
           count(a.id) filter (where a.status = 'Activo')
    from public.organizations o
    left join public.affiliates a on a.org_id = o.id
    group by o.id;
end;
$$;

grant execute on function public.resumen_plataforma() to authenticated;

-- 3) (Opcional) Valores sugeridos del plan por defecto para SERDNP ------------
-- Ajusta a mano en el panel; esto solo deja un punto de partida coherente.
update public.organizations
   set plan = coalesce(plan,'basico')
 where plan is null;
