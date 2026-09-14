-- =============================================================================
-- SaaS · Etapa 10 — RESETEAR CONTRASEÑA DE PRESIDENCIA (soporte)
-- -----------------------------------------------------------------------------
-- Permite al administrador de la plataforma regenerar la contraseña de la cuenta
-- de PRESIDENCIA de un sindicato cuando la pierden. Devuelve el correo afectado
-- para poder entregar de nuevo las credenciales.
-- Correr una sola vez en el editor SQL de Supabase.
-- =============================================================================

create extension if not exists pgcrypto;

create or replace function public.resetear_password(
  p_org   uuid,   -- sindicato
  p_nueva text    -- nueva contraseña
) returns text     -- correo de la cuenta actualizada
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  uid    uuid;
  v_mail text;
begin
  -- Solo el administrador de la plataforma (o ejecución directa en SQL Editor).
  if auth.uid() is not null and not public.is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede resetear contraseñas';
  end if;

  if p_nueva is null or length(p_nueva) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres';
  end if;

  -- Cuenta de presidencia de ese sindicato.
  select id into uid from public.profiles
   where org_id = p_org and role = 'presidencia'
   order by created_at nulls last
   limit 1;
  if uid is null then
    raise exception 'Ese sindicato no tiene cuenta de presidencia';
  end if;

  update auth.users set
    encrypted_password = crypt(p_nueva, gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
  where id = uid
  returning email into v_mail;

  return v_mail;
end $$;

grant execute on function public.resetear_password(uuid, text) to authenticated;
