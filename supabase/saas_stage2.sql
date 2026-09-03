-- =============================================================================
-- SIG-SERDNP · SaaS ETAPA 2 — Configuraci&oacute;n POR SINDICATO
-- Hace que cada sindicato tenga su propia cuota %, escalas salariales, presupuesto,
-- cat&aacute;logo de cuentas, cargos, dependencias y tipos de vinculaci&oacute;n.
-- Los datos actuales quedan en SERDNP (sigue funcionando igual).
--
-- Requiere haber corrido antes saas_stage1.sql (usa current_org, is_platform_admin,
-- set_org_id). Idempotente. Ejecutar en el SQL Editor.
--
-- IMPORTANTE: primero despliega el frontend actualizado (Vercel) y LUEGO corre esto.
-- =============================================================================

-- 1) Agrega el sindicato + aislamiento a las tablas de configuraci&oacute;n ---------
do $$
declare t text;
begin
  foreach t in array array[
    'params','presupuestos','cuentas','cargos','dependencias','vinculaciones','escalas'
  ]
  loop
    execute format('alter table public.%I add column if not exists org_id uuid references public.organizations(id);', t);
    execute format('update public.%I set org_id = %L where org_id is null;', t, '11111111-1111-1111-1111-111111111111');
    execute format('create index if not exists %I_org_idx on public.%I(org_id);', t, t);
    execute format('drop trigger if exists set_org_%1$s on public.%1$s;', t);
    execute format('create trigger set_org_%1$s before insert on public.%1$s for each row execute function public.set_org_id();', t);
    execute format('drop policy if exists org_isolation on public.%I;', t);
    execute format($p$create policy org_isolation on public.%I as restrictive for all
      using (org_id = public.current_org() or public.is_platform_admin())
      with check (org_id = public.current_org() or public.is_platform_admin());$p$, t);
  end loop;
end $$;

-- 2) Cambia las LLAVES para permitir el mismo valor en varios sindicatos ---------
-- (Ninguna de estas tablas es referenciada por llaves for&aacute;neas, es seguro.)

-- params: una fila por sindicato (antes era fila &uacute;nica id=1).
alter table public.params alter column org_id set not null;
alter table public.params drop constraint if exists params_pkey;
alter table public.params add constraint params_pkey primary key (org_id);

-- presupuestos: mismo rubro puede existir en cada sindicato.
alter table public.presupuestos alter column org_id set not null;
alter table public.presupuestos drop constraint if exists presupuestos_pkey;
alter table public.presupuestos add constraint presupuestos_pkey primary key (org_id, category);

-- cuentas (PUC): mismo c&oacute;digo por sindicato.
alter table public.cuentas alter column org_id set not null;
alter table public.cuentas drop constraint if exists cuentas_pkey;
alter table public.cuentas add constraint cuentas_pkey primary key (org_id, codigo);

-- cargos: mismo cargo por sindicato.
alter table public.cargos alter column org_id set not null;
alter table public.cargos drop constraint if exists cargos_pkey;
alter table public.cargos add constraint cargos_pkey primary key (org_id, name);

-- dependencias: misma dependencia por sindicato.
alter table public.dependencias alter column org_id set not null;
alter table public.dependencias drop constraint if exists dependencias_pkey;
alter table public.dependencias add constraint dependencias_pkey primary key (org_id, name);

-- vinculaciones: llave uuid propia, no cambia; solo se exige el sindicato.
alter table public.vinculaciones alter column org_id set not null;

-- escalas: mismo nivel/grado por sindicato (id uuid sigue siendo la llave).
alter table public.escalas alter column org_id set not null;
alter table public.escalas drop constraint if exists escalas_nivel_grado_key;
do $$ begin
  alter table public.escalas add constraint escalas_org_nivel_grado_key unique (org_id, nivel, grado);
exception when duplicate_object then null; end $$;

-- =============================================================================
-- Verificaci&oacute;n: ninguna fila de configuraci&oacute;n debe quedar sin sindicato.
-- =============================================================================
select 'params' as tabla, count(*) as sin_org from public.params where org_id is null
union all select 'presupuestos', count(*) from public.presupuestos where org_id is null
union all select 'cuentas', count(*) from public.cuentas where org_id is null
union all select 'cargos', count(*) from public.cargos where org_id is null
union all select 'dependencias', count(*) from public.dependencias where org_id is null
union all select 'vinculaciones', count(*) from public.vinculaciones where org_id is null
union all select 'escalas', count(*) from public.escalas where org_id is null;
-- (Todos deben dar 0.)
