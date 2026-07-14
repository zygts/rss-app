const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const { fuente_id, leido } = req.body || {};

  // Por defecto marca todos como leídos (comportamiento anterior); si se
  // pasa leido: false, marca todos como no leídos.
  const nuevoValor = leido === false ? false : true;
  const valorActual = !nuevoValor; // busca los que están en el estado contrario

  try {
    if (fuente_id) {
      await pool.query(
        'update posts set leido = $2 where leido = $3 and fuente_id = $1',
        [fuente_id, nuevoValor, valorActual]
      );
    } else {
      await pool.query('update posts set leido = $1 where leido = $2', [nuevoValor, valorActual]);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
