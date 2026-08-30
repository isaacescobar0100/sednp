-- Habilita Realtime (actualizaciones en vivo) en las tablas clave.
-- Con esto, cuando alguien cambia datos, las demás sesiones se actualizan solas
-- (votaciones, dashboard, padrón…). Ejecutar en el SQL Editor. Idempotente.
do $$
declare t text;
begin
  foreach t in array array[
    'affiliates','aportes','movements','cases','ballots',
    'sessions','comunicados','committees','docs'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;  -- ya estaba habilitada
    end;
  end loop;
end $$;
