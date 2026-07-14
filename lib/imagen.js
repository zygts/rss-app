// Intenta sacar una imagen destacada de un item de RSS, probando varias
// formas habituales en las que los feeds la incluyen, de más a menos fiable.
function extraerImagen(item) {
  // 1) <enclosure> de tipo imagen (el más explícito y fiable)
  if (item.enclosure && item.enclosure.url) {
    const tipo = item.enclosure.type || '';
    if (!tipo || tipo.startsWith('image/')) {
      return item.enclosure.url;
    }
  }

  // 2) <media:content> o <media:thumbnail> (habitual en feeds más elaborados)
  const media = item.mediaContent || item.mediaThumbnail;
  if (media && media.$ && media.$.url) {
    return media.$.url;
  }

  // 3) Primera <img> dentro del contenido completo del post, si lo trae
  const contenido = item['content:encoded'] || item.content || item.summary || '';
  const match = contenido.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) return match[1];

  return null;
}

module.exports = { extraerImagen };
