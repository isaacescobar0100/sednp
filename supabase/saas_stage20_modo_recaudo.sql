-- =============================================================================
-- SaaS · Etapa 20 — MODO DE RECAUDO POR SINDICATO (nómina / transferencia / PSE)
-- -----------------------------------------------------------------------------
-- Cada sindicato define cómo cobra la cuota:
--   - 'nomina'        → descuento automático por la pagaduría. El afiliado NO paga
--                       desde la app; solo ve su estado de cuenta. Tesorería concilia.
--   - 'transferencia' → el afiliado paga por transferencia a la cuenta del sindicato
--                       y registra su pago. Se muestran las instrucciones de pago.
--   - 'pse'           → pago en línea (requiere pasarela; por ahora igual que
--                       transferencia con instrucciones/enlace).
-- Idempotente. Ejecutar una vez en el SQL Editor de Supabase.
-- =============================================================================

alter table public.organizations add column if not exists modo_recaudo text not null default 'nomina';
alter table public.organizations add column if not exists instrucciones_pago text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'organizations_modo_recaudo_chk') then
    alter table public.organizations
      add constraint organizations_modo_recaudo_chk
      check (modo_recaudo in ('nomina','transferencia','pse'));
  end if;
end $$;

-- SERDNP cobra por nómina (queda explícito).
update public.organizations set modo_recaudo = 'nomina' where slug = 'serdnp' and modo_recaudo is null;

-- La directiva del sindicato ajusta su modo de recaudo e instrucciones (Parámetros).
create or replace function public.set_recaudo(p_modo text, p_instrucciones text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.app_role() not in ('presidencia','secretaria','tesoreria') then
    raise exception 'Solo la directiva puede cambiar el modo de recaudo';
  end if;
  if public.current_org() is null then
    raise exception 'No hay organización en la sesión';
  end if;
  if coalesce(p_modo,'') not in ('nomina','transferencia','pse') then
    raise exception 'Modo de recaudo no válido';
  end if;
  update public.organizations
     set modo_recaudo = p_modo,
         instrucciones_pago = nullif(trim(coalesce(p_instrucciones,'')), '')
   where id = public.current_org();
end $$;

grant execute on function public.set_recaudo(text, text) to authenticated;

select 'listo: modo de recaudo' as estado;
