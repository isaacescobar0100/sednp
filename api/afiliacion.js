// Función serverless (Vercel): página de "aterrizaje" del link de auto-afiliación
// que se comparte por WhatsApp/redes. Genera la VISTA PREVIA (Open Graph) con el
// logo del sindicato (o el de Sindika si no tiene) y redirige a la persona al
// formulario público real (/?afiliacion=<slug>).
//
// Uso del link: https://<dominio>/api/afiliacion?org=<slug>

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export default async function handler(req, res) {
  const slug = (req.query && req.query.org ? String(req.query.org) : '').trim()
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0]
  const host = req.headers['x-forwarded-host'] || req.headers.host || ''
  const origin = `${proto}://${host}`
  const formUrl = `${origin}/?afiliacion=${encodeURIComponent(slug)}`

  // Marca por defecto (Sindika).
  let nombre = 'Afíliate al sindicato'
  let imagen = `${origin}/sindika.png`

  // Buscar marca del sindicato (nombre + logo) en Supabase.
  try {
    const supaUrl = process.env.VITE_SUPABASE_URL
    const supaKey = process.env.VITE_SUPABASE_ANON_KEY
    if (slug && supaUrl && supaKey) {
      const r = await fetch(`${supaUrl}/rest/v1/rpc/org_publica`, {
        method: 'POST',
        headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_slug: slug }),
      })
      const rows = await r.json().catch(() => [])
      const row = Array.isArray(rows) ? rows[0] : rows
      if (row && row.nombre) {
        nombre = `Afíliate a ${row.nombre}`
        const logo = row.logo_url
        if (logo) imagen = /^https?:\/\//.test(logo) ? logo : `${origin}${logo.startsWith('/') ? '' : '/'}${logo}`
      }
    }
  } catch {
    // si falla, se usa la marca por defecto
  }

  const titulo = esc(nombre)
  const descripcion = 'Completa tu solicitud de afiliación en línea. Tu solicitud pasará a revisión de la Junta Directiva.'
  const img = esc(imagen)
  const url = esc(formUrl)

  const html = `<!doctype html><html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<meta name="description" content="${descripcion}">
<meta property="og:type" content="website">
<meta property="og:title" content="${titulo}">
<meta property="og:description" content="${descripcion}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="512">
<meta property="og:image:height" content="512">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${titulo}">
<meta name="twitter:description" content="${descripcion}">
<meta name="twitter:image" content="${img}">
<meta http-equiv="refresh" content="0; url=${url}">
<script>window.location.replace(${JSON.stringify(formUrl)})</script>
<style>body{font-family:Segoe UI,Arial,sans-serif;background:#0F1B3D;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}a{color:#C9973B}</style>
</head><body>
<p>Abriendo el formulario de afiliación… Si no avanza, <a href="${url}">haz clic aquí</a>.</p>
</body></html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=300')
  res.status(200).send(html)
}
