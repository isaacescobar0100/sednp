-- =============================================================================
-- SaaS · Etapa 24 — BORRADO EN CASCADA DE UN SINDICATO
-- -----------------------------------------------------------------------------
-- Al eliminar una organización, sus datos en las tablas hijas la referencian por
-- org_id y bloquean el borrado (ej. "audit_log_org_id_fkey"). Esto recorre TODAS
-- las llaves foráneas que apuntan a public.organizations y las vuelve a crear con
-- ON DELETE CASCADE, para que borrar el sindicato borre también todos sus datos.
-- Idempotente. Ejecutar una vez en el SQL Editor de Supabase.
-- =============================================================================

do $$
declare r record;
begin
  for r in
    select c.relname as tabla, con.conname as restriccion,
           a.attname as columna
    from pg_constraint con
    join pg_class c  on c.oid = con.conrelid
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = con.conkey[1]
    where con.contype = 'f'
      and con.confrelid = 'public.organizations'::regclass
      and con.confdeltype <> 'c'              -- las que aún NO son cascade
  loop
    execute format('alter table public.%I drop constraint %I', r.tabla, r.restriccion);
    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references public.organizations(id) on delete cascade',
      r.tabla, r.restriccion, r.columna
    );
    raise notice 'cascade -> %.%', r.tabla, r.restriccion;
  end loop;
end $$;

select 'listo: borrado de sindicato en cascada' as estado;
