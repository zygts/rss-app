const { Pool } = require('@neondatabase/serverless');
const Parser = require('rss-parser');
const { limpiarResumen } = require('../lib/sanitize');
const { extraerImagen } = require('../lib/imagen');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const parser = new Parser({
  timeout: 8000, // no dejar que una fuente lenta bloquee a las demás
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
    ],
  },
});

async function comprobarFuente(fuente) {
  const feed = await parser.parseURL(fuente.url_feed);

  const posts = (feed.items || [])
    .map((item) => ({
      titulo: item.title || '(sin título)',
      url: item.link,
      fecha_publicacion: item.isoDate || item.pubDate || null,
      resumen: limpiarResumen((item.contentSnippet || item.summary || '').slice(0, 500)),
      imagen_url: extraerImagen(item),
    }))
    .filter((p) => !!p.url);

  for (const post of posts) {
    await pool.query(
      `insert into posts (fuente_id, titulo, url, fecha_publicacion, resumen, imagen_url)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (fuente_id, url) do nothing`,
      [fuente.id, post.titulo, post.url, post.fecha_publicacion, post.resumen, post.imagen_url]
    );
  }

  await pool.query(
    'update fuentes set ultima_comprobacion = now() where id = $1',
    [fuente.id]
  );

  return { fuente: fuente.nombre, posts_encontrados: posts.length, ok: true };
}

module.exports = async (req, res) => {
  // Protege el endpoint: si defines CRON_SECRET en Vercel, solo el propio
  // cron de Vercel (o alguien con el secreto) puede disparar esta función.
  if (process.env.CRON_SECRET) {
    const auth = req.headers['authorization'];
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }
  }

  const { rows: fuentes } = await pool.query(
    'select id, nombre, url_feed from fuentes where activa = true'
  );

  // Se comprueban todas las fuentes EN PARALELO (no una detrás de otra),
  // para que el tiempo total no dependa de cuántas fuentes tengas.
  // Si una falla, no afecta a las demás (Promise.allSettled, no Promise.all).
  const resultados = await Promise.allSettled(
    fuentes.map((fuente) => comprobarFuente(fuente))
  );

  const resumen = resultados.map((resultado, i) => {
    if (resultado.status === 'fulfilled') return resultado.value;
    // Fallo silencioso hacia el usuario, pero lo dejamos registrado en la
    // respuesta para poder detectar "esta fuente lleva tiempo sin funcionar"
    return { fuente: fuentes[i].nombre, ok: false, error: resultado.reason.message };
  });

  res.status(200).json({ comprobado_en: new Date().toISOString(), resultados: resumen });
};
