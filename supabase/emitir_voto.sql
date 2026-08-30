-- Votación con hora de cierre real. Ejecutar en el SQL Editor.

-- 1) Guardar la hora de cierre como timestamp (además del texto para mostrar).
alter table public.ballots add column if not exists closes_at_ts timestamptz;

-- 2) Voto atómico: una vez por usuario, solo si está EN CURSO y NO ha vencido.
create or replace function public.emitir_voto(p_ballot uuid, p_choice text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare rc int;
begin
  if p_choice not in ('favor', 'contra', 'abstencion') then
    return false;
  end if;
  -- En curso y dentro del plazo (si tiene hora de cierre).
  if not exists (
    select 1 from public.ballots
    where id = p_ballot and status = 'En curso'
      and (closes_at_ts is null or now() <= closes_at_ts)
  ) then
    return false;
  end if;
  insert into public.votes (ballot_id, voter_id, choice)
  values (p_ballot, auth.uid(), p_choice)
  on conflict (ballot_id, voter_id) do nothing;
  get diagnostics rc = row_count;
  if rc = 0 then
    return false; -- ya había votado
  end if;
  update public.ballots set
    favor      = favor      + (case when p_choice = 'favor' then 1 else 0 end),
    contra     = contra     + (case when p_choice = 'contra' then 1 else 0 end),
    abstencion = abstencion + (case when p_choice = 'abstencion' then 1 else 0 end)
  where id = p_ballot;
  return true;
end $$;

grant execute on function public.emitir_voto(uuid, text) to authenticated;

-- 3) Cierra automáticamente las votaciones cuya hora ya pasó, con su resultado.
create or replace function public.cerrar_votaciones_vencidas()
returns void
language sql
security definer
set search_path = public
as $$
  update public.ballots
  set status  = 'Cerrada',
      outcome = case when favor > contra then 'Aprobada' else 'Rechazada' end
  where status = 'En curso'
    and closes_at_ts is not null
    and now() > closes_at_ts;
$$;

grant execute on function public.cerrar_votaciones_vencidas() to authenticated;
