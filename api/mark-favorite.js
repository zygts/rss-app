const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const { id, favorito } = req.body || {};
  if (!id) {
    res.status(400).json({ error: 'Falta el id del post' });
    return;
  }

  // Por defecto lo marca como favorito; si se pasa favorito: false, lo quita.
  const nuevoValor = favorito === false ? false : true;

  try {
    await pool.query('update posts set favorito = $2 where id = $1', [id, nuevoValor]);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
