const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const { fuente_id } = req.body || {};

  try {
    if (fuente_id) {
      await pool.query(
        'update posts set leido = true where leido = false and fuente_id = $1',
        [fuente_id]
      );
    } else {
      await pool.query('update posts set leido = true where leido = false');
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
