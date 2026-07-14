const lista = document.getElementById('lista-posts');
const btnRefrescar = document.getElementById('btn-refrescar');

function formateaFecha(fechaIso) {
  if (!fechaIso) return '';
  const f = new Date(fechaIso);
  return f.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function pintarPosts(posts) {
  if (!posts || posts.length === 0) {
    lista.innerHTML = '<p class="vacio">Todavía no hay posts. Espera al primer cron o pulsa Actualizar.</p>';
    return;
  }

  lista.innerHTML = posts.map((post) => `
    <article class="post ${post.leido ? 'leido' : ''}" data-id="${post.id}">
      <div class="post-meta">
        <span>${post.fuentes?.nombre || 'Fuente desconocida'}</span>
        <span>${formateaFecha(post.fecha_publicacion)}</span>
      </div>
      <h2><a href="${post.url}" target="_blank" rel="noopener">${post.titulo}</a></h2>
      ${post.resumen ? `<p>${post.resumen}</p>` : ''}
      <div class="post-acciones">
        ${!post.leido ? `<button class="marcar-leido" data-id="${post.id}">Marcar como leído</button>` : ''}
      </div>
    </article>
  `).join('');

  document.querySelectorAll('.marcar-leido').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      await fetch('/api/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      cargarPosts();
    });
  });
}

async function cargarPosts() {
  const res = await fetch('/api/get-posts');
  const posts = await res.json();
  pintarPosts(posts);
}

btnRefrescar.addEventListener('click', cargarPosts);

cargarPosts();
