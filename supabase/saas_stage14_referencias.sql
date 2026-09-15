-- =============================================================================
-- SaaS · Etapa 14 — REFERENCIAS NORMATIVAS CONFIGURABLES POR SINDICATO
-- -----------------------------------------------------------------------------
-- Cada sindicato define sus propios números de artículo de estatuto. Los módulos
-- muestran la cita configurada (o ninguna, si el sindicato la deja vacía).
-- Los sindicatos NUEVOS arrancan sin citas ('{}'); SERDNP conserva las suyas.
-- Correr una vez en el SQL Editor de Supabase.
-- =============================================================================

alter table public.organizations
  add column if not exists referencias jsonb not null default '{}'::jsonb;

-- Semilla SOLO para SERDNP (sus artículos actuales); los demás quedan en '{}'.
update public.organizations set referencias = '{
  "cuota":"Art. 32",
  "recaudo":"Art. 32",
  "vacaciones":"Parágrafo Art. 32",
  "cuota_extra":"Art. 33",
  "gasto_asamblea":"Art. 34",
  "firmas_pago":"Art. 35",
  "caucion":"Art. 26",
  "caja_menor":"Art. 26e",
  "junta":"Art. 13",
  "asamblea_delegados":"Art. 9",
  "voto_secreto":"Art. 12b",
  "comite_tematico":"Art. 27",
  "afiliacion":"Art. 5",
  "afiliacion_aprobacion":"Art. 5d",
  "disc_fallo":"Art. 45",
  "disc_multa":"Art. 48",
  "disc_prescripcion":"Art. 56",
  "disc_recursos":"Art. 57"
}'::jsonb
where slug = 'serdnp';

-- Guarda las referencias del sindicato de la sesión (lo usa Parámetros).
create or replace function public.set_referencias(p_refs jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_org() is null then
    raise exception 'No hay organización en la sesión';
  end if;
  update public.organizations
     set referencias = coalesce(p_refs, '{}'::jsonb)
   where id = public.current_org();
end $$;

grant execute on function public.set_referencias(jsonb) to authenticated;

select 'listo: referencias configurables' as estado;
