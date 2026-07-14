const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Umbrales para el aviso de "esta fuente puede tener un problema":
// - Si hace más de 2 días que no se comprueba con éxito, probablemente el
//   feed está fallando (recuerda: ultima_comprobacion solo se actualiza
//   cuando la comprobación de ESA fuente concreta tiene éxito).
// - Si hace más de 21 días que no aparece un post nuevo (pero sí se sigue
//   comprobando bien), simplemente es un aviso informativo: puede que ese
//   sitio publique poco, no tiene por qué estar roto.
const DIAS_AVISO_FALLO = 2;
const DIAS_AVISO_SIN_NOVEDADES = 21;

module.exports = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      select
        fuentes.id,
        fuentes.nombre,
        fuentes.ultima_comprobacion,
        max(posts.creado_en) as ultimo_post_guardado
      from fuentes
      left join posts on posts.fuente_id = fuentes.id
      where fuentes.activa = true
      group by fuentes.id
      order by fuentes.nombre asc
    `);

    const ahora = Date.now();
    const unDiaMs = 1000 * 60 * 60 * 24;

    const fuentes = rows.map((f) => {
      const diasSinComprobar = f.ultima_comprobacion
        ? Math.floor((ahora - new Date(f.ultima_comprobacion).getTime()) / unDiaMs)
        : null;

      const diasSinPosts = f.ultimo_post_guardado
        ? Math.floor((ahora - new Date(f.ultimo_post_guardado).getTime()) / unDiaMs)
        : null;

      let aviso = null;
      if (diasSinComprobar === null || diasSinComprobar > DIAS_AVISO_FALLO) {
        aviso = 'posible_fallo'; // no se ha comprobado con éxito recientemente
      } else if (diasSinPosts !== null && diasSinPosts > DIAS_AVISO_SIN_NOVEDADES) {
        aviso = 'sin_novedades'; // se comprueba bien, pero no trae nada nuevo desde hace tiempo
      }

      return {
        id: f.id,
        nombre: f.nombre,
        dias_sin_comprobar: diasSinComprobar,
        dias_sin_posts: diasSinPosts,
        aviso,
      };
    });

    res.status(200).json(fuentes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
