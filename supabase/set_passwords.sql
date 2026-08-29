-- Fija / resetea la contraseña de cuentas que YA existen en auth.users.
-- Requiere la extensión pgcrypto (ya activada en schema.sql).
-- Cambia los correos y las claves por los reales. Usa claves fuertes y
-- cámbialas luego; NO compartas este archivo con las claves reales.

update auth.users set
  encrypted_password = crypt('Presidencia#2026', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now())
where lower(email) = lower('presidencia@dnp.gov.co');

update auth.users set
  encrypted_password = crypt('Vicepresidencia#2026', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now())
where lower(email) = lower('vicepresidencia@dnp.gov.co');

update auth.users set
  encrypted_password = crypt('Secretaria#2026', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now())
where lower(email) = lower('secretaria@dnp.gov.co');

update auth.users set
  encrypted_password = crypt('Tesoreria#2026', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now())
where lower(email) = lower('tesoreria@dnp.gov.co');

update auth.users set
  encrypted_password = crypt('Fiscal#2026', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now())
where lower(email) = lower('fiscal@dnp.gov.co');
