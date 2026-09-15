-- =============================================================================
-- SaaS · Etapa 21 — PASARELA WOMPI POR SINDICATO (PSE / tarjeta)
-- -----------------------------------------------------------------------------
-- Cada sindicato conecta SU propia cuenta Wompi (la plata va a su cuenta, no a la
-- de la plataforma). Guarda su llave pública y su secreto de integridad. El
-- secreto NUNCA se envía al navegador: solo lo leen los endpoints del servidor.
-- Idempotente. Ejecutar una vez en el SQL Editor de Supabase.
-- =============================================================================

alter table public.organizations add column if not exists wompi_public_key text;
alter table public.organizations add column if not exists wompi_integrity  text;

-- La directiva configura la pasarela (Parámetros → Recaudo). El secreto de
-- integridad se conserva si se manda vacío (para no borrarlo sin querer).
create or replace function public.set_wompi(p_public text, p_integrity text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.app_role() not in ('presidencia','secretaria','tesoreria') then
    raise exception 'Solo la directiva puede configurar la pasarela de pago';
  end if;
  if public.current_org() is null then
    raise exception 'No hay organización en la sesión';
  end if;
  update public.organizations
     set wompi_public_key = nullif(trim(coalesce(p_public, '')), ''),
         wompi_integrity  = case when coalesce(trim(p_integrity), '') = ''
                                 then wompi_integrity            -- vacío = conservar
                                 else trim(p_integrity) end
   where id = public.current_org();
end $$;

grant execute on function public.set_wompi(text, text) to authenticated;

select 'listo: pasarela Wompi por sindicato' as estado;
