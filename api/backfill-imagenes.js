const { Pool } = require('@neondatabase/serverless');
const Parser = require('rss-parser');
const { extraerImagen } = require('../lib/imagen');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const parser = new Parser({
  timeout: 8000,
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
    ],
  },
});

// Endpoint de UN SOLO USO (lo llamas tú a mano, no forma parte del cron):
// vuelve a leer cada feed y, para los posts que ya tenías guardados sin
// imagen_url, intenta rellenarla si el post todavía aparece en el feed
// actual de esa fuente. Los posts que ya hayan "salido" del feed (porque
// se han publicado cosas más nuevas después) se quedan sin imagen, porque
// esa información ya no está disponible en ningún sitio.
module.exports = async (req, res) => {
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

  const resultados = await Promise.allSettled(
    fuentes.map(async (fuente) => {
      const feed = await parser.parseURL(fuente.url_feed);
      let actualizados = 0;

      for (const item of feed.items || []) {
        if (!item.link) continue;

        const imagen = extraerImagen(item);
        if (!imagen) continue;

        const { rowCount } = await pool.query(
          `update posts
           set imagen_url = $1
           where fuente_id = $2 and url = $3 and imagen_url is null`,
          [imagen, fuente.id, item.link]
        );

        actualizados += rowCount;
      }

      return { fuente: fuente.nombre, posts_actualizados: actualizados, ok: true };
    })
  );

  const resumen = resultados.map((resultado, i) => {
    if (resultado.status === 'fulfilled') return resultado.value;
    return { fuente: fuentes[i].nombre, ok: false, error: resultado.reason.message };
  });

  res.status(200).json({ hecho_en: new Date().toISOString(), resultados: resumen });
};
