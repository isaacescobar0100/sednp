-- Bucket de Storage para soportes (facturas/recibos de caja menor, etc.).
-- Privado: solo usuarios autenticados suben y leen. Ejecutar en el SQL Editor.

insert into storage.buckets (id, name, public)
values ('soportes', 'soportes', false)
on conflict (id) do nothing;

-- Los usuarios autenticados pueden subir a este bucket.
drop policy if exists "soportes_insert" on storage.objects;
create policy "soportes_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'soportes');

-- Los usuarios autenticados pueden leer/descargar del bucket.
drop policy if exists "soportes_select" on storage.objects;
create policy "soportes_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'soportes');
