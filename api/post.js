// Función serverless (Vercel): página de "aterrizaje" al compartir un artículo.
// Genera la vista previa (Open Graph) con la imagen del artículo y redirige a la
// dirección limpia del artículo en el sitio.
// Uso: https://<dominio>/api/post?id=<id>&org=<slug>

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'p'
}

export default async function handler(req, res) {
  const id = (req.query && req.query.id ? String(req.query.id) : '').trim()
  const slug = (req.query && req.query.org ? String(req.query.org) : '').trim()
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0]
  const host = req.headers['x-forwarded-host'] || req.headers.host || ''
  const origin = `${proto}://${host}`

  let post = null
  try {
    const supaUrl = process.env.VITE_SUPABASE_URL
    const supaKey = process.env.VITE_SUPABASE_ANON_KEY
    if (id && supaUrl && supaKey) {
      const r = await fetch(`${supaUrl}/rest/v1/rpc/posts_publicos`, {
        method: 'POST',
        headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_slug: slug, p_tipo: null }),
      })
      const rows = await r.json().catch(() => [])
      if (Array.isArray(rows)) post = rows.find((p) => p.id === id) || null
    }
  } catch { /* usa valores por defecto */ }

  // Destino limpio del artículo (o el blog si no se encontró).
  const destino = post
    ? `${origin}/${post.tipo === 'anuncio' ? 'anuncio' : 'articulo'}/${slugify(post.titulo)}-${String(post.id).slice(0, 8)}`
    : `${origin}/blog`

  const titulo = esc(post ? post.titulo : 'Publicación')
  const desc = esc(post ? (post.resumen || 'Lee la publicación en nuestro sitio.') : 'Nuestro sitio de noticias y anuncios.')
  let imagen = `${origin}/sindika.png`
  if (post && post.imagenUrl) imagen = /^https?:\/\//.test(post.imagenUrl) ? post.imagenUrl : `${origin}${post.imagenUrl.startsWith('/') ? '' : '/'}${post.imagenUrl}`
  const img = esc(imagen)
  const url = esc(destino)

  const html = `<!doctype html><html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<meta name="description" content="${desc}">
<meta property="og:type" content="article">
<meta property="og:title" content="${titulo}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${img}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${titulo}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${img}">
<meta http-equiv="refresh" content="0; url=${url}">
<script>window.location.replace(${JSON.stringify(destino)})</script>
<style>body{font-family:Segoe UI,Arial,sans-serif;background:#0F1B3D;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}a{color:#C9973B}</style>
</head><body>
<p>Abriendo la publicación… Si no avanza, <a href="${url}">haz clic aquí</a>.</p>
</body></html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=300')
  res.status(200).send(html)
}
