// --- FUNCIÓN AUXILIAR DE EXTRACCIÓN ---
// Recorta los cuadros de películas de cualquier código HTML de Pelispop
function extractItems(html) {
  const results = [];
  const articleRegex = /<article\s+class="post[^>]*>([\s\S]*?)<\/article>/gi;
  let match;

  while ((match = articleRegex.exec(html)) !== null) {
    const block = match[1];
    const linkMatch = block.match(/href="([^"]+)"/);
    if (!linkMatch) continue; 
    const link = linkMatch[1];

    const isSerie = link.includes('/serie/');
    const idMatch = link.match(/\/(serie|pelicula)\/([^/]+)/);
    const id = idMatch ? idMatch[2] : link.replace(/[^a-zA-Z0-9-]/g, '');

    const imgMatch = block.match(/src="([^"]+)"/);
    const titleMatch = block.match(/alt="([^"]+)"/) || block.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/);
    let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : id;

    const yearMatch = block.match(/>(\d{4})</);

    results.push({
      id: id,
      ref: link,
      title: title,
      kind: isSerie ? 'series' : 'movie',
      poster: imgMatch ? imgMatch[1] : null,
      year: yearMatch ? yearMatch[1] : null
    });
  }
  return results;
}

// --- BUSCADOR ---
export async function search(query) {
  if (!query.q) return [];
  const url = `https://pelispop.mov/search?s=${encodeURIComponent(query.q)}`;
  const r = await kino.fetch(url);
  if (!r.ok) return [];
  return extractItems(await r.text());
}

// --- PANTALLA PRINCIPAL (INICIO) ---
export async function home() {
  const r = await kino.fetch("https://pelispop.mov/");
  if (!r.ok) throw kino.error("unavailable", "No se pudo cargar Pelispop");
  const html = await r.text();
  const items = extractItems(html);

  return [
    { 
      id: "novedades", 
      title: "Agregados Recientemente", 
      ref: "browse:novedades", // El ref le dice a la app qué cargar si presionan "Ver más"
      genre: "peliculas", 
      items: items.slice(0, 30) // Mostramos los primeros 30 en la fila principal
    },
    { id: "peliculas", title: "Películas", ref: "browse:peliculas", genre: "peliculas", items: [] },
    { id: "series", title: "Series", ref: "browse:series", genre: "series", items: [] }
  ];
}

// --- VER MÁS (PAGINACIÓN) ---
export async function browse(ref, cursor) {
  const page = parseInt(cursor, 10) || 1;
  let url = "https://pelispop.mov/";

  // Dependiendo del 'ref' que mandó la fila de Home, construimos la URL
  if (ref === "browse:peliculas") {
    url = `https://pelispop.mov/peliculas/page/${page}`;
  } else if (ref === "browse:series") {
    url = `https://pelispop.mov/series/page/${page}`;
  } else {
    url = `https://pelispop.mov/page/${page}`; // Novedades
  }

  const r = await kino.fetch(url);
  if (!r.ok) return { items: [] };
  
  const items = extractItems(await r.text());

  return {
    items: items,
    // Si encontramos elementos, le decimos a Kino que la siguiente página es la actual + 1
    next: items.length > 0 ? String(page + 1) : null 
  };
}
// --- LISTA DE CAPÍTULOS (SOLO PARA SERIES) ---
export async function episodes(ref) {
  // Truco: Si el ref viene de la página de inicio y apunta a un capítulo específico,
  // lo cortamos para obtener la URL principal de la serie.
  const seriesUrl = ref.split('/temporada/')[0];

  const r = await kino.fetch(seriesUrl);
  if (!r.ok) throw new Error(`unavailable: Error al cargar la serie: ${r.status}`);
  const html = await r.text();

  const episodesList = [];
  const seen = new Set(); // Para evitar capítulos duplicados

  // Buscamos enlaces que tengan el formato exacto de los capítulos en Pelispop
  // Ejemplo: href="https://pelispop.mov/serie/batman/temporada/1/capitulo/5"
  const epRegex = /href="([^"]+\/temporada\/(\d+)\/capitulo\/(\d+)[^"]*)"/gi;
  let match;

  while ((match = epRegex.exec(html)) !== null) {
    let epUrl = match[1];
    const season = parseInt(match[2], 10);
    const episode = parseInt(match[3], 10);
    
    // Si el enlace es relativo, le agregamos el dominio base
    if (epUrl.startsWith('/')) {
      epUrl = "https://pelispop.mov" + epUrl;
    }

    const key = `${season}x${episode}`;
    if (!seen.has(key)) {
      seen.add(key);
      episodesList.push({
        season: season,
        number: episode,
        ref: epUrl 
      });
    }
  }

  // Ordenamos la lista por temporada y luego por número de capítulo
  episodesList.sort((a, b) => a.season - b.season || a.number - b.number);

  return {
    episodes: episodesList
  };
}
export async function resolve(ref) {
  // --- FASE 1: COPIA PEREZOSA (El usuario eligió un servidor del menú) ---
  // Si el ref trae un "|", significa que ya desencriptamos antes y solo queremos atrapar el video
  if (ref.includes("|")) {
    const embedUrl = ref.split("|")[1];
    const page = await kino.browser.capture(embedUrl, { timeoutMs: 20000 });
    if (!page || !page.media || !page.media.length) {
      throw kino.error("unavailable", "El servidor no respondió con un video");
    }
    return { url: page.media[0].url, headers: page.media[0].headers };
  }

  // --- FASE 2: DESENCRIPTAR SERVIDORES (Primera vez que se abre la película) ---
  const r1 = await kino.fetch(ref);
  if (!r1.ok) throw new Error(`unavailable: Error al cargar Pelispop: ${r1.status}`);
  const html1 = await r1.text();

  let iframeUrl = null;
  const iframeMatch = html1.match(/<iframe[^>]+src="([^"]+)"/i);
  const dataSrcMatch = html1.match(/data-src="([^"]+)"/i);
  if (iframeMatch) iframeUrl = iframeMatch[1];
  else if (dataSrcMatch) iframeUrl = dataSrcMatch[1];

  if (!iframeUrl) throw new Error("not_found: No se encontró el iframe del reproductor");
  if (iframeUrl.startsWith("//")) {
    iframeUrl = "https:" + iframeUrl;
  } else if (iframeUrl.startsWith("/")) {
    iframeUrl = new URL(ref).origin + iframeUrl;
  }

  const r2 = await kino.fetch(iframeUrl, { headers: { "Referer": ref } });
  if (!r2.ok) throw new Error(`unavailable: Error al cargar el reproductor: ${r2.status}`);
  const html = await r2.text();

  const challengeMatch = html.match(/POW_CHALLENGE\s*=\s*'([^']+)'/);
  const difficultyMatch = html.match(/POW_DIFFICULTY\s*=\s*(\d+)/);
  const saltMatch = html.match(/POW_SALT\s*=\s*'([^']+)'/);
  const dataLinkMatch = html.match(/let\s+dataLink\s*=\s*(\[\{.*\}\]);/);

  if (!challengeMatch || !dataLinkMatch) throw new Error("not_found: No se encontró el sistema de encriptación");

  const challenge = challengeMatch[1];
  const difficulty = parseInt(difficultyMatch[1], 10);
  const salt = saltMatch[1];
  const dataLink = JSON.parse(dataLinkMatch[1]);

  let nonce = 0;
  const prefix = '0'.repeat(difficulty);
  let keyHex = "";
  while (nonce < 1000000) {
    const hash = kino.crypto.hash("sha256", challenge + nonce);
    if (hash.startsWith(prefix)) {
      keyHex = kino.crypto.hash("sha256", challenge + nonce + salt);
      break;
    }
    nonce++;
  }

  function decryptLink(encryptedBase64) {
    try {
      const rawStr = atob(encryptedBase64);
      let ivHex = "";
      for (let i = 0; i < 16; i++) {
        ivHex += rawStr.charCodeAt(i).toString(16).padStart(2, '0');
      }
      return kino.crypto.decrypt("aes-256-cbc", {
        key: keyHex, keyEncoding: "hex", iv: ivHex, ivEncoding: "hex",
        data: btoa(rawStr.slice(16)), inputEncoding: "base64", outputEncoding: "utf8"
      });
    } catch (e) { return null; }
  }

  const embeds = [];
  for (const file of dataLink) {
    const idioma = file.video_language || "LAT"; 
    for (const embed of (file.sortedEmbeds || [])) {
      if (embed.link) {
        const urlReal = decryptLink(embed.link);
        if (urlReal) {
          embeds.push({
            label: `${idioma} -${embed.servername}`,
            url: urlReal.replace(/`/g, '').trim()
          });
        }
      }
    }
  }

  if (embeds.length === 0) throw new Error("not_found: No se encontraron servidores descifrados");

  // --- FASE 3: ATRAPAR EL VIDEO REAL Y PREPARAR ALTERNATIVAS PEREZOSAS ---
  let lastErr = null;
  for (let i = 0; i < embeds.length; i++) {
    const e = embeds[i];
    try {
      // Capturamos el primer servidor que responda
      const page = await kino.browser.capture(e.url, { timeoutMs: 20000 });
      if (!page || !page.media || !page.media.length) throw new Error("No hay video en este servidor");

      const stream = {
        url: page.media[0].url,
        label: e.label
      };
      if (page.media[0].headers) stream.headers = page.media[0].headers;

      // Armamos las copias perezosas (lazy copies) para los demás servidores
      const alts = [];
      for (let j = 0; j < embeds.length; j++) {
        if (j === i) continue;
        alts.push({
          label: embeds[j].label,
          ref: `${ref}|${embeds[j].url}`
        });
      }
      if (alts.length) stream.alternatives = alts;

      return stream;
    } catch (err) {
      lastErr = err; // Si Voe falla, el bucle intenta con el siguiente (ej. Vidhide)
    }
  }
  
  throw lastErr || kino.error("unavailable", "Ningún servidor respondió con video");
}