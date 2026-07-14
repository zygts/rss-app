const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      select
        posts.id,
        posts.titulo,
        posts.url,
        posts.fecha_publicacion,
        posts.resumen,
        posts.leido,
        fuentes.nombre as fuente_nombre
      from posts
      join fuentes on fuentes.id = posts.fuente_id
      order by posts.fecha_publicacion desc nulls last
      limit 100
    `);

    // Se devuelve con la misma forma anidada que usaba el frontend
    // (post.fuentes.nombre) para no tener que tocar app.js
    const posts = rows.map((row) => ({
      id: row.id,
      titulo: row.titulo,
      url: row.url,
      fecha_publicacion: row.fecha_publicacion,
      resumen: row.resumen,
      leido: row.leido,
      fuentes: { nombre: row.fuente_nombre },
    }));

    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
