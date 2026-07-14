const lista = document.getElementById('lista-posts');
const btnRefrescar = document.getElementById('btn-refrescar');
const selectFuente = document.getElementById('filtro-fuente');
const checkNoLeidos = document.getElementById('filtro-no-leidos');
const btnMarcarTodos = document.getElementById('btn-marcar-todos');
const btnDesmarcarTodos = document.getElementById('btn-desmarcar-todos');
const btnCargarMas = document.getElementById('btn-cargar-mas');
const avisoFuentes = document.getElementById('aviso-fuentes');

const LIMITE_POR_PAGINA = 20;

let offsetActual = 0;
let postsAcumulados = [];

function formateaFecha(fechaIso) {
  if (!fechaIso) return '';
  const f = new Date(fechaIso);
  return f.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Defensa extra además de la limpieza que ya hace el backend: nunca se
// inserta el resumen como HTML, siempre como texto plano.
function escaparTexto(texto) {
  const div = document.createElement('div');
  div.textContent = texto || '';
  return div.innerHTML;
}

function pintarPosts(posts, { reemplazar }) {
  if (reemplazar) postsAcumulados = posts;
  else postsAcumulados = postsAcumulados.concat(posts);

  if (postsAcumulados.length === 0) {
    lista.innerHTML = '<p class="vacio">No hay posts con este filtro.</p>';
    return;
  }

  lista.innerHTML = postsAcumulados.map((post) => `
    <article class="post ${post.leido ? 'leido' : ''}" data-id="${post.id}">
      <div class="post-meta">
        <span>${escaparTexto(post.fuentes?.nombre || 'Fuente desconocida')}</span>
        <span>${formateaFecha(post.fecha_publicacion)}</span>
      </div>
      <h2><a href="${post.url}" target="_blank" rel="noopener">${escaparTexto(post.titulo)}</a></h2>
      ${post.resumen ? `<p>${escaparTexto(post.resumen)}</p>` : ''}
      <div class="post-acciones">
        ${!post.leido
          ? `<button class="marcar-leido" data-id="${post.id}">Marcar como leído</button>`
          : `<button class="marcar-no-leido" data-id="${post.id}">Marcar como no leído</button>`}
      </div>
    </article>
  `).join('');

  document.querySelectorAll('.marcar-leido').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      await fetch('/api/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, leido: true }),
      });
      cargarPosts({ reiniciar: true });
    });
  });

  document.querySelectorAll('.marcar-no-leido').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      await fetch('/api/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, leido: false }),
      });
      cargarPosts({ reiniciar: true });
    });
  });
}

function construirQuery(offset) {
  const params = new URLSearchParams();
  if (selectFuente.value) params.set('fuente_id', selectFuente.value);
  if (checkNoLeidos.checked) params.set('no_leidos', 'true');
  params.set('limit', LIMITE_POR_PAGINA);
  params.set('offset', offset);
  return params.toString();
}

async function cargarPosts({ reiniciar }) {
  if (reiniciar) {
    offsetActual = 0;
    lista.innerHTML = '<p class="cargando">Cargando novedades…</p>';
  }

  const res = await fetch(`/api/get-posts?${construirQuery(offsetActual)}`);
  const data = await res.json();

  pintarPosts(data.posts, { reemplazar: reiniciar });
  offsetActual += data.posts.length;
  btnCargarMas.style.display = data.hay_mas ? 'inline-block' : 'none';
}

async function cargarFuentes() {
  const res = await fetch('/api/get-fuentes');
  const fuentes = await res.json();

  selectFuente.innerHTML =
    '<option value="">Todas las fuentes</option>' +
    fuentes.map((f) => `<option value="${f.id}">${escaparTexto(f.nombre)}</option>`).join('');

  const conAviso = fuentes.filter((f) => f.aviso);

  if (conAviso.length === 0) {
    avisoFuentes.innerHTML = '';
    return;
  }

  avisoFuentes.innerHTML = conAviso.map((f) => {
    if (f.aviso === 'posible_fallo') {
      const detalle = f.dias_sin_comprobar === null
        ? 'nunca se ha comprobado con éxito'
        : `lleva ${f.dias_sin_comprobar} días sin comprobarse con éxito`;
      return `<div class="aviso"><strong>${escaparTexto(f.nombre)}</strong>: ${detalle}. Puede que la URL del feed haya cambiado o esté rota — merece la pena revisarla.</div>`;
    }
    return `<div class="aviso"><strong>${escaparTexto(f.nombre)}</strong>: sin posts nuevos desde hace ${f.dias_sin_posts} días. Puede que ese sitio simplemente publique poco.</div>`;
  }).join('');
}

btnRefrescar.addEventListener('click', () => {
  cargarPosts({ reiniciar: true });
  cargarFuentes();
});

selectFuente.addEventListener('change', () => cargarPosts({ reiniciar: true }));
checkNoLeidos.addEventListener('change', () => cargarPosts({ reiniciar: true }));

btnCargarMas.addEventListener('click', () => cargarPosts({ reiniciar: false }));

btnMarcarTodos.addEventListener('click', async () => {
  const body = selectFuente.value ? { fuente_id: selectFuente.value, leido: true } : { leido: true };
  await fetch('/api/mark-all-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  cargarPosts({ reiniciar: true });
});

btnDesmarcarTodos.addEventListener('click', async () => {
  const body = selectFuente.value ? { fuente_id: selectFuente.value, leido: false } : { leido: false };
  await fetch('/api/mark-all-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  cargarPosts({ reiniciar: true });
});

cargarFuentes();
cargarPosts({ reiniciar: true });
