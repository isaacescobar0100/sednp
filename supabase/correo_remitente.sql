-- Correo remitente propio por sindicato (multi-sindicato / plan Pro).
--
-- Qué es: la DIRECCIÓN desde la que salen los correos de ESE sindicato
-- (ej. notificaciones@sudominio.com). El NOMBRE del remitente siempre es el
-- nombre del sindicato (automático); esto solo cambia la @dirección.
--
-- Si queda vacío (NULL): el sindicato envía con la dirección global del sistema
-- (variable EMAIL_FROM en Vercel) pero con SU nombre. No hace falta comprar nada.
--
-- Si se llena: el sindicato compró su dominio y lo verificó en Resend. Desde ese
-- momento sus correos salen con su propia dirección. NO hay que tocar código:
-- solo verificar el dominio en Resend y pegar aquí la dirección desde el panel.
--
-- Requisito (siempre, para cualquier dominio propio): ese dominio debe estar
-- VERIFICADO en Resend (registros DNS). Sin eso, Resend rechaza el envío.

alter table public.organizations
  add column if not exists correo_remitente text;

comment on column public.organizations.correo_remitente is
  'Direccion de correo remitente propia del sindicato (dominio verificado en Resend). Si es NULL usa EMAIL_FROM global con el nombre del sindicato.';
