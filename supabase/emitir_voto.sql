-- Voto atómico: registra el voto del usuario (una vez por votación) y actualiza
-- el conteo de la votación. Devuelve true si se contabilizó, false si ya había
-- votado o la votación está cerrada. Ejecutar en el SQL Editor.
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
  -- Solo si la votación está en curso.
  if not exists (select 1 from public.ballots where id = p_ballot and status = 'En curso') then
    return false;
  end if;
  -- Un voto por usuario y votación.
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
