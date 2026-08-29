-- Asigna rol y nombre a las cuentas de la Junta Directiva Nacional.
-- Versión robusta: CREA el perfil si no existe (por si el trigger no lo generó)
-- y lo actualiza si ya existe. Usa UPSERT contra profiles.
--
-- REQUISITO: la cuenta debe existir en auth.users (creada en
--   Authentication -> Users -> Add user, con "Auto Confirm User" marcado,
--   o registrada en el login). Reemplaza los correos por los reales.
-- Si un bloque no afecta filas, ese correo aún no tiene cuenta.

insert into public.profiles (id, full_name, role)
select u.id, 'Heisson G. Cifuentes Meneses', 'presidencia'
from auth.users u where lower(u.email) = lower('presidencia@dnp.gov.co')
on conflict (id) do update set role = excluded.role, full_name = excluded.full_name;

insert into public.profiles (id, full_name, role)
select u.id, 'Zulay Olarte Bermúdez', 'vicepresidencia'
from auth.users u where lower(u.email) = lower('vicepresidencia@dnp.gov.co')
on conflict (id) do update set role = excluded.role, full_name = excluded.full_name;

insert into public.profiles (id, full_name, role)
select u.id, 'Ludy Maritza Montoya Roberto', 'secretaria'
from auth.users u where lower(u.email) = lower('secretaria@dnp.gov.co')
on conflict (id) do update set role = excluded.role, full_name = excluded.full_name;

insert into public.profiles (id, full_name, role)
select u.id, 'Lina María Ocampo Palacio', 'tesoreria'
from auth.users u where lower(u.email) = lower('tesoreria@dnp.gov.co')
on conflict (id) do update set role = excluded.role, full_name = excluded.full_name;

insert into public.profiles (id, full_name, role)
select u.id, 'Nini Dahyana Idarraga Garay', 'fiscal'
from auth.users u where lower(u.email) = lower('fiscal@dnp.gov.co')
on conflict (id) do update set role = excluded.role, full_name = excluded.full_name;

-- Verificación:
select u.email, p.full_name, p.role
from public.profiles p
join auth.users u on u.id = p.id
order by p.role;
