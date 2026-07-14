const { Pool } = require('@neondatabase/serverless');
const { limpiarResumen } = require('../lib/sanitize');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = async (req, res) => {
  try {
    const { fuente_id, no_leidos, offset, limit } = req.query || {};

    const limiteNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offsetNum = parseInt(offset, 10) || 0;

    const condiciones = [];
    const valores = [];

    if (fuente_id) {
      valores.push(fuente_id);
      condiciones.push(`posts.fuente_id = $${valores.length}`);
    }

    if (no_leidos === 'true') {
      condiciones.push('posts.leido = false');
    }

    const whereSql = condiciones.length ? `where ${condiciones.join(' and ')}` : '';

    valores.push(limiteNum, offsetNum);

    const { rows } = await pool.query(
      `select
        posts.id,
        posts.titulo,
        posts.url,
        posts.fecha_publicacion,
        posts.resumen,
        posts.leido,
        fuentes.nombre as fuente_nombre
      from posts
      join fuentes on fuentes.id = posts.fuente_id
      ${whereSql}
      order by posts.fecha_publicacion desc nulls last
      limit $${valores.length - 1} offset $${valores.length}`,
      valores
    );

    const posts = rows.map((row) => ({
      id: row.id,
      titulo: row.titulo,
      url: row.url,
      fecha_publicacion: row.fecha_publicacion,
      resumen: limpiarResumen(row.resumen),
      leido: row.leido,
      fuentes: { nombre: row.fuente_nombre },
    }));

    res.status(200).json({
      posts,
      hay_mas: posts.length === limiteNum,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
