const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const { id } = req.body || {};
  if (!id) {
    res.status(400).json({ error: 'Falta el id del post' });
    return;
  }

  try {
    await pool.query('update posts set leido = true where id = $1', [id]);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
