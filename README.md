# Mi RSS — agregador personalizado

Agregador de RSS a medida: comprueba cada hora una lista de feeds RSS y
guarda los posts nuevos en Neon (Postgres). Un panel web sencillo los muestra.

## 1. Crear la base de datos en Neon

1. Ve a https://neon.tech y crea un proyecto nuevo (plan gratuito).
2. En el **SQL Editor** de tu proyecto, pega y ejecuta el contenido de
   `schema.sql` (crea las tablas `fuentes` y `posts`).
3. En **Connection Details / Dashboard**, copia el *connection string*
   (`postgres://usuario:contraseña@host/basededatos?sslmode=require`) →
   será tu variable `DATABASE_URL`.

## 2. Añadir tus fuentes RSS

Edita la tabla `fuentes` desde el **Table Editor** de Neon (o el SQL Editor,
repitiendo un `insert` como el de `schema.sql`) con tus 10-20 webs. Necesitas
la URL directa del feed (normalmente `https://tudominio.com/feed/`).

Puedes seguir añadiendo fuentes nuevas en cualquier momento, sin tocar código.

## 3. Desplegar en Vercel

1. Sube esta carpeta a un repositorio de GitHub.
2. En https://vercel.com, importa el repositorio ("Add New... > Project").
3. En **Environment Variables**, añade:
   - `DATABASE_URL` (el connection string de Neon)
   - `CRON_SECRET` (opcional pero recomendado): cualquier cadena aleatoria
     larga, por ejemplo generada con `openssl rand -hex 32`. Protege el
     endpoint de cron para que nadie más pueda dispararlo.
4. Despliega. Vercel detectará automáticamente `vercel.json` y programará
   el cron para ejecutarse cada hora (`0 * * * *`).

## 4. Comprobarlo

- Visita `https://tu-proyecto.vercel.app` → verás el panel (vacío al
  principio).
- Para forzar la primera comprobación sin esperar a la hora en punto, entra
  en **Vercel > tu proyecto > Cron Jobs** y pulsa "Run" manualmente, o visita
  `https://tu-proyecto.vercel.app/api/check-feeds` en el navegador (si
  pusiste `CRON_SECRET`, esa llamada manual dará 401 — es normal, solo el
  cron interno de Vercel puede llamarla con el secreto).

## Estructura del proyecto

```
api/
  check-feeds.js   → cron: recorre las fuentes, detecta posts nuevos, los guarda
  get-posts.js     → sirve los posts guardados al panel
  mark-read.js     → marca un post como leído
public/
  index.html       → panel visual
  style.css
  app.js
schema.sql          → esquema de la base de datos (Postgres, para Neon)
vercel.json         → configuración del cron (cada hora)
```

## Ajustar la frecuencia

En `vercel.json`, cambia `"schedule": "0 * * * *"` por la expresión cron
que prefieras (por ejemplo `"*/30 * * * *"` para cada 30 min). En el plan
gratuito de Vercel, los cron jobs no pueden dispararse con más frecuencia
que una vez al día en algunos casos de proyectos antiguos — comprueba en tu
panel de Vercel qué frecuencia mínima permite tu plan actual.

## Fuentes que fallan

Si una fuente deja de funcionar (cambia de URL, quita el feed, etc.), no
rompe el resto: `check-feeds.js` sigue con las demás y devuelve, en la
respuesta JSON del endpoint, qué fuentes fallaron y por qué. Si quieres,
más adelante podemos añadir un aviso visual en el panel para las fuentes
que llevan varios días sin traer nada nuevo.

## Sobre Neon y el free tier

El free tier de Neon incluye 0,5 GB de almacenamiento por proyecto (hasta
5 GB repartidos en varios proyectos) y 100 horas de cómputo al mes, más que
suficiente para 10-20 fuentes RSS personales. Las bases de datos inactivas
"escalan a cero" tras un rato sin uso, así que la primera consulta tras
un periodo de inactividad puede tardar un poco más (medio segundo o así)
en responder — algo normal y sin impacto real en este proyecto.

## Connection string
postgresql://neondb_owner:npg_HGsYT4Ib2jOJ@ep-solitary-violet-abi1q8ab.eu-west-2.aws.neon.tech/neondb?sslmode=require# rss-app
# rss-app
