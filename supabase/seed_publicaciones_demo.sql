-- =============================================================================
-- Contenido de DEMO para la página web de SERDNP (para llenar las vistas).
-- Inserta artículos, anuncios y páginas fijas PUBLICADAS. Requiere publicaciones.sql.
-- Idempotente: borra el contenido de demo anterior (autor 'Redacción SERDNP')
-- y lo vuelve a cargar. No toca lo que publique la directiva con otro autor.
-- Ejecutar en el SQL Editor de Supabase.
-- =============================================================================
do $$
declare v_org uuid := '11111111-1111-1111-1111-111111111111';
begin
  delete from public.publicaciones where org_id = v_org and autor = 'Redacción SERDNP';

  -- PÁGINAS FIJAS ------------------------------------------------------------
  insert into public.publicaciones (org_id, tipo, clave, titulo, contenido, estado, fecha_pub, autor) values
  (v_org, 'pagina', 'quienes-somos', 'Quiénes somos',
   'La Organización Sindical de Servidores Públicos del Departamento Nacional de Planeación (SERDNP) agrupa y representa a las y los servidores del DNP.' || chr(10) || chr(10) ||
   'Nuestra misión es defender los derechos laborales, promover el bienestar y fortalecer la participación de nuestros afiliados, con transparencia y sentido de lo público.' || chr(10) || chr(10) ||
   'Visión: ser una organización sindical moderna, cercana y confiable, referente en la gestión y el bienestar de los servidores públicos.',
   'publicado', now(), 'Redacción SERDNP'),

  (v_org, 'pagina', 'servicios', 'Nuestros servicios',
   'Ofrecemos a nuestros afiliados un portafolio de servicios y programas:' || chr(10) || chr(10) ||
   'Bienestar y calidad de vida: actividades culturales, deportivas y de integración familiar.' || chr(10) || chr(10) ||
   'Asesoría jurídica laboral: acompañamiento en trámites y situaciones administrativas.' || chr(10) || chr(10) ||
   'Formación y capacitación: talleres, cursos y espacios de crecimiento profesional.' || chr(10) || chr(10) ||
   'Representación: interlocución con la administración en defensa de los derechos colectivos.',
   'publicado', now(), 'Redacción SERDNP'),

  (v_org, 'pagina', 'contacto', 'Contacto',
   'Estamos para acompañarte.' || chr(10) || chr(10) ||
   'Correo: contacto@serdnp.org.co' || chr(10) ||
   'Sede: Departamento Nacional de Planeación — Bogotá D.C.' || chr(10) ||
   'Horario de atención: lunes a viernes, 8:00 a. m. a 5:00 p. m.' || chr(10) || chr(10) ||
   'Si deseas afiliarte, usa el botón “Afíliate en línea”.',
   'publicado', now(), 'Redacción SERDNP');

  -- ANUNCIOS -----------------------------------------------------------------
  insert into public.publicaciones (org_id, tipo, titulo, resumen, contenido, estado, fecha_pub, autor) values
  (v_org, 'anuncio', 'Convocatoria a Asamblea General Ordinaria',
   'Se convoca a todos los afiliados a la Asamblea General Ordinaria.',
   'La Junta Directiva convoca a la Asamblea General Ordinaria para tratar el informe de gestión, el estado financiero y la elección de comités.' || chr(10) || chr(10) ||
   'Fecha y lugar se comunicarán oportunamente por los canales oficiales. La participación de todos es fundamental.',
   'publicado', now() - interval '2 days', 'Redacción SERDNP'),

  (v_org, 'anuncio', 'Actualización de datos de afiliados',
   'Solicitamos a los afiliados mantener sus datos al día.',
   'Con el fin de mejorar nuestra comunicación y la prestación de servicios, invitamos a los afiliados a verificar y actualizar sus datos de contacto en el portal.',
   'publicado', now() - interval '6 days', 'Redacción SERDNP');

  -- ARTÍCULOS (BLOG) ---------------------------------------------------------
  insert into public.publicaciones (org_id, tipo, titulo, resumen, contenido, categoria, estado, fecha_pub, autor) values
  (v_org, 'articulo', 'Programa de bienestar 2026: más y mejores actividades',
   'Presentamos el plan de bienestar para este año, con actividades para toda la familia.',
   'Este año fortalecemos nuestro programa de bienestar con jornadas deportivas, actividades culturales y espacios de integración para los afiliados y sus familias.' || chr(10) || chr(10) ||
   'Creemos que el bienestar es un derecho y una inversión en el clima laboral. Te invitamos a participar activamente y a proponer nuevas iniciativas a través de los comités.',
   'Bienestar', 'publicado', now() - interval '1 day', 'Redacción SERDNP'),

  (v_org, 'articulo', 'Tus derechos laborales: lo que debes saber',
   'Un resumen práctico de derechos y garantías del servidor público.',
   'Conocer nuestros derechos es el primer paso para defenderlos. En esta entrega repasamos aspectos clave sobre garantías laborales, permisos y el debido proceso.' || chr(10) || chr(10) ||
   'El área jurídica del sindicato está disponible para orientarte. No dudes en acercarte cuando tengas dudas sobre tu situación.',
   'Jurídico', 'publicado', now() - interval '4 days', 'Redacción SERDNP'),

  (v_org, 'articulo', 'Abrimos inscripciones para talleres de formación',
   'Nuevos cursos y talleres para el crecimiento profesional de los afiliados.',
   'La formación continua es una de nuestras apuestas. Este semestre abrimos inscripciones para talleres de habilidades digitales, liderazgo y gestión pública.' || chr(10) || chr(10) ||
   'Los cupos son limitados. Mantente atento a los anuncios para conocer fechas e inscripciones.',
   'Formación', 'publicado', now() - interval '9 days', 'Redacción SERDNP'),

  (v_org, 'articulo', 'Un año de logros para nuestra organización',
   'Hacemos un balance de los avances alcanzados con el respaldo de los afiliados.',
   'Gracias al compromiso de nuestros afiliados, este ha sido un año de crecimiento y consolidación. Modernizamos nuestra gestión, ampliamos servicios y fortalecimos la participación.' || chr(10) || chr(10) ||
   'Seguiremos trabajando por una organización cada vez más cercana, transparente y útil para todos.',
   'Noticias', 'publicado', now() - interval '14 days', 'Redacción SERDNP');
end $$;

select tipo, count(*) from public.publicaciones
where org_id = '11111111-1111-1111-1111-111111111111' and autor = 'Redacción SERDNP'
group by tipo;
