// Quita etiquetas HTML y decodifica las entidades más habituales que traen
// los feeds RSS en sus resúmenes (algunos incluyen <select>, <b>, etc. sin
// que lo pidamos). No es un sanitizador completo de seguridad, pero es
// suficiente para texto de solo lectura que nunca se inserta como HTML.
function limpiarResumen(texto) {
  if (!texto) return '';

  return texto
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { limpiarResumen };
