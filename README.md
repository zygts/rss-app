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

## Rellenar imágenes de posts ya guardados

Si ya tenías posts guardados antes de añadir la columna `imagen_url`, puedes
rellenarla para los que **todavía sigan apareciendo en el feed actual** de su
fuente (los más antiguos, que ya hayan "salido" del feed, se quedarán sin
imagen — esa información ya no está en ningún sitio).

1. Despliega los cambios primero (asegúrate de haber ejecutado el `alter table`
   de la sección anterior).
2. Visita `https://tu-proyecto.vercel.app/api/backfill-imagenes` en el
   navegador (si tienes `CRON_SECRET` puesto, tendrás que llamarlo con esa
   cabecera en vez de desde el navegador directamente — por ejemplo con
   `curl -H "Authorization: Bearer TU_CRON_SECRET" https://tu-proyecto.vercel.app/api/backfill-imagenes`).
3. La respuesta te dice, fuente por fuente, cuántos posts se han actualizado.
4. Es un endpoint de un solo uso — puedes volver a llamarlo cuando quieras
   (no hace daño, simplemente no encontrará nada nuevo que rellenar salvo
   que hayas añadido fuentes nuevas), pero no forma parte del cron diario.

## Imágenes de los posts

`check-feeds.js` intenta extraer una imagen destacada de cada post (mirando
primero el `<enclosure>` del feed, luego `<media:content>`/`<media:thumbnail>`,
y como último recurso la primera `<img>` dentro del contenido del post). No
todos los feeds la traen — cuando no hay imagen, la tarjeta se muestra igual,
simplemente sin foto.

**Si ya tenías el proyecto desplegado de antes**, la tabla `posts` no tiene
la columna `imagen_url` todavía. Antes de volver a desplegar, ejecuta esto una
vez en el SQL Editor de Neon:

```sql
alter table posts add column if not exists imagen_url text;
```

Los posts que ya tenías guardados se quedarán sin imagen (no se puede sacar
a posteriori sin volver a leer el feed), pero los que se guarden a partir de
ahora ya la traerán si el feed la ofrece.

## Estructura del proyecto

```
api/
  check-feeds.js    → cron: recorre las fuentes (en paralelo), detecta posts nuevos, los guarda
  get-posts.js      → sirve los posts guardados al panel (con filtro por fuente, no-leídos y paginación)
  get-fuentes.js    → lista las fuentes para el desplegable de filtro + detecta fuentes con problemas
  mark-read.js      → marca un post como leído
  mark-all-read.js  → marca todos los posts (o los de una fuente) como leídos
  backfill-imagenes.js → de un solo uso: rellena imagen_url en posts ya guardados que aún no la tengan
lib/
  sanitize.js       → limpia HTML suelto de los resúmenes de los feeds
  imagen.js         → extrae la imagen destacada de cada post del feed
public/
  index.html        → panel visual (filtros, aviso de fuentes, lista, cargar más)
  style.css
  app.js
schema.sql          → esquema de la base de datos (Postgres, para Neon)
vercel.json         → configuración del cron (una vez al día)
```

## Funcionalidades del panel

- **Filtro por fuente**: desplegable con todas tus fuentes activas.
- **"Solo no leídos"**: casilla para ocultar lo ya leído.
- **"Marcar todos como leídos"**: aplica al filtro de fuente activo en ese momento (si no hay ninguna fuente seleccionada, marca todos).
- **Cargar más**: pagina de 20 en 20 en vez de traer todo de golpe.
- **Aviso de fuentes con problemas**: aparece automáticamente encima de la lista cuando:
  - Una fuente lleva más de 2 días sin comprobarse con éxito (probable URL de feed rota o caída) — esto es posible porque `ultima_comprobacion` solo se actualiza cuando esa fuente en concreto se procesa sin error, así que un fallo silencioso queda reflejado aquí.
  - Una fuente se comprueba bien pero lleva más de 21 días sin traer ningún post nuevo (aviso solo informativo, puede que ese sitio simplemente publique poco).

## Sobre los resúmenes con HTML suelto

Algunos feeds incluyen HTML dentro del resumen del post (negritas, enlaces,
incluso etiquetas sueltas). `check-feeds.js` limpia esto antes de guardarlo,
y `get-posts.js` lo vuelve a limpiar por si acaso al servirlo — además, el
panel nunca inserta el resumen como HTML, siempre como texto plano. Si ya
tenías posts guardados de antes con HTML suelto en el resumen, se limpiarán
solos la próxima vez que `get-posts.js` los sirva (no hace falta borrar nada
a mano).


## Ajustar la frecuencia

`vercel.json` está configurado con `"schedule": "0 8 * * *"` — una comprobación
al día, a las 8:00 (hora UTC). Esto es porque el plan gratuito (Hobby) de
Vercel limita los cron jobs a una ejecución diaria como máximo. Si en algún
momento pasas a un plan de pago de Vercel, puedes cambiarlo a algo como
`"0 * * * *"` (cada hora) sin tocar nada más del código — la función
`check-feeds.js` ya comprueba todas las fuentes en paralelo, así que aguanta
bien una frecuencia más alta.

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
