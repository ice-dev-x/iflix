// --- FUNCIÓN AUXILIAR DE EXTRACCIÓN ---
// Recorta los cuadros de películas de cualquier código HTML de Pelispop
// --- FUNCIÓN AUXILIAR PARA LIMPIAR TEXTO ---
function cleanText(text) {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&").replace(/&#039;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<[^>]*>/g, "")
    .trim();
}

// --- EXTRACCIÓN CON SOPORTE PARA VISTA DE TARJETAS ---
function extractItems(html) {
  const results = [];
  const articleRegex = /<article\s+class="post[^>]*>([\s\S]*?)<\/article>/gi;
  let match;

  while ((match = articleRegex.exec(html)) !== null) {
    const block = match[1];
    const linkMatch = block.match(/href="([^"]+)"/);
    if (!linkMatch) continue; 
    let link = linkMatch[1];
    if (!link.startsWith("http")) link = `https://pelispop.mov${link}`;

    const isSerie = link.includes('/serie/') || link.includes('/anime/') || link.includes('/animes/');
    const idMatch = link.match(/\/(serie|pelicula|anime|animes)\/([^/]+)/);
    const id = idMatch ? idMatch[2] : link.replace(/[^a-zA-Z0-9-]/g, '');

    const imgMatch = block.match(/src="([^"]+)"/) || block.match(/data-src="([^"]+)"/);
    const titleMatch = block.match(/alt="([^"]+)"/) || block.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/);
    
    let title = titleMatch ? titleMatch[1] : id;
    title = cleanText(title).replace(/^Ver\s+/i, '').replace(/\s+(online|latino|subtitulado|castellano|en hd).*$/i, '').trim();

    const yearMatch = block.match(/>(\d{4})</);
    let poster = imgMatch ? (imgMatch[1] || imgMatch[2]) : null;
    if (poster && poster.startsWith("//")) poster = "https:" + poster;

    results.push({
      id: id,
      ref: link,
      title: title,
      kind: isSerie ? 'series' : 'movie',
      poster: poster,
      backdrop: poster, // <- ESTA ES LA LÍNEA MÁGICA: Engaña a Kino para habilitar las tarjetas
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

// --- PANTALLA PRINCIPAL GLOBAL DE KINO (HOME ACTUALIZADO) ---
export async function home() {
  const fetchPage = async (path) => {
    try {
      const res = await kino.fetch(`https://pelispop.mov${path}`, { headers: { "User-Agent": "Mozilla/5.0" } });
      return res.ok ? await res.text() : "";
    } catch (e) { return ""; }
  };

  // Cargamos lo mejor de cada categoría para el Home
  const [htmlHome, htmlPelisPopulares, htmlSeriesPopulares, htmlAnimePopulares] = await Promise.all([
    fetchPage("/"),
    fetchPage("/peliculas/populares"),
    fetchPage("/series/populares"),
    fetchPage("/animes/populares")
  ]);

  const estrenos = extractItems(htmlHome).filter(i => i.kind === 'movie');
  const pelisPopulares = extractItems(htmlPelisPopulares);
  const seriesPopulares = extractItems(htmlSeriesPopulares);
  const animePopulares = extractItems(htmlAnimePopulares);

  const rows = [];

  // Usamos las rutas exactas en "ref" para que el botón "Ver más" funcione perfectamente
  if (estrenos.length > 0) {
    rows.push({ id: "h-estrenos", title: "Estrenos Destacados", ref: "/", items: estrenos.slice(0, 20) });
  }
  if (pelisPopulares.length > 0) {
    rows.push({ id: "h-pelis-pop", title: "Películas Populares", ref: "/peliculas/populares", items: pelisPopulares.slice(0, 20) });
  }
  if (seriesPopulares.length > 0) {
    rows.push({ id: "h-series-pop", title: "Series Populares", ref: "/series/populares", items: seriesPopulares.slice(0, 20) });
  }
  if (animePopulares.length > 0) {
    rows.push({ id: "h-anime-pop", title: "Animes Populares", ref: "/animes/populares", items: animePopulares.slice(0, 20) });
  }

  return rows;
}

// --- PESTAÑA NATIVA DE CATEGORÍAS (LISTA COMPLETA DE GÉNEROS) ---
export async function categories() {
  return [
    { id: "accion", title: "Acción", ref: "browse:genero:accion" },
    { id: "animacion", title: "Animación", ref: "browse:genero:animacion" },
    { id: "aventura", title: "Aventura", ref: "browse:genero:aventura" },
    { id: "belica", title: "Bélica", ref: "browse:genero:belica" },
    { id: "ciencia-ficcion", title: "Ciencia Ficción", ref: "browse:genero:ciencia-ficcion" },
    { id: "comedia", title: "Comedia", ref: "browse:genero:comedia" },
    { id: "crimen", title: "Crimen", ref: "browse:genero:crimen" },
    { id: "documental", title: "Documental", ref: "browse:genero:documental" },
    { id: "drama", title: "Drama", ref: "browse:genero:drama" },
    { id: "fantasia", title: "Fantasía", ref: "browse:genero:fantasia" },
    { id: "familia", title: "Familia", ref: "browse:genero:familia" },
    { id: "guerra", title: "Guerra", ref: "browse:genero:guerra" },
    { id: "historia", title: "Historia", ref: "browse:genero:historia" },
    { id: "romance", title: "Romance", ref: "browse:genero:romance" },
    { id: "suspense", title: "Suspense", ref: "browse:genero:suspense" },
    { id: "terror", title: "Terror", ref: "browse:genero:terror" },
    { id: "western", title: "Western", ref: "browse:genero:western" },
    { id: "misterio", title: "Misterio", ref: "browse:genero:misterio" }
  ];
}

// --- SISTEMA DE PESTAÑAS (INCLUYENDO "POPULARES" EN TODAS) ---
export async function section({ tab } = {}) {
  const tabs = [
    { id: "peliculas", label: "Películas" },
    { id: "series", label: "Series" },
    { id: "anime", label: "Anime" },
    { id: "doramas", label: "Doramas" },
    { id: "generos", label: "Géneros" } 
  ];

  const chosen = tabs.some((t) => t.id === tab) ? tab : "peliculas";
  const rows = [];
  let heroItem = null;

  const fetchPage = async (path) => {
    try {
      const res = await kino.fetch(`https://pelispop.mov${path}`, { headers: { "User-Agent": "Mozilla/5.0" } });
      return res.ok ? await res.text() : "";
    } catch (e) { return ""; }
  };

  if (chosen === "peliculas") {
    // Agregamos Populares en paralelo
    const [htmlHome, htmlPopulares, htmlPelis] = await Promise.all([
      fetchPage("/"), fetchPage("/peliculas/populares"), fetchPage("/peliculas")
    ]);

    const ultimas = extractItems(htmlHome).filter(i => i.kind === 'movie');
    const populares = extractItems(htmlPopulares);
    const peliculas = extractItems(htmlPelis);

    if (ultimas.length > 0) heroItem = ultimas[0];
    else if (populares.length > 0) heroItem = populares[0];

    // Ahora el "ref" es directamente la ruta de la web
    if (ultimas.length > 0) rows.push({ id: "estrenos", title: "Estrenos Destacados", ref: "/", items: ultimas.slice(0, 20) });
    if (populares.length > 0) rows.push({ id: "populares", title: "Películas Populares", ref: "/peliculas/populares", items: populares.slice(0, 20) });
    if (peliculas.length > 0) rows.push({ id: "catalogo", title: "Catálogo de Películas", ref: "/peliculas", items: peliculas.slice(0, 20) });

  } else if (chosen === "series") {
    const [htmlHome, htmlPopulares, htmlSeries] = await Promise.all([
      fetchPage("/"), fetchPage("/series/populares"), fetchPage("/series")
    ]);

    const recientes = extractItems(htmlHome).filter(i => i.kind === 'series');
    const populares = extractItems(htmlPopulares);
    const series = extractItems(htmlSeries);

    if (recientes.length > 0) heroItem = recientes[0];
    else if (populares.length > 0) heroItem = populares[0];

    if (recientes.length > 0) rows.push({ id: "series-recientes", title: "Capítulos Recientes", ref: "/", items: recientes.slice(0, 20) });
    if (populares.length > 0) rows.push({ id: "series-populares", title: "Series Populares", ref: "/series/populares", items: populares.slice(0, 20) });
    if (series.length > 0) rows.push({ id: "catalogo-series", title: "Catálogo de Series", ref: "/series", items: series.slice(0, 20) });

  } else if (chosen === "anime") {
    const [htmlPopulares, htmlAnime] = await Promise.all([
      fetchPage("/animes/populares"), fetchPage("/animes")
    ]);

    const populares = extractItems(htmlPopulares);
    const animeList = extractItems(htmlAnime);
    
    if (populares.length > 0) heroItem = populares[0];
    else if (animeList.length > 0) heroItem = animeList[0];

    if (populares.length > 0) rows.push({ id: "anime-populares", title: "Animes Populares", ref: "/animes/populares", items: populares.slice(0, 20) });
    if (animeList.length > 0) rows.push({ id: "anime", title: "Catálogo de Anime", ref: "/animes", items: animeList.slice(0, 20) });

  } else if (chosen === "doramas") {
    const htmlDoramas = await fetchPage("/generos/dorama");
    const doramasList = extractItems(htmlDoramas);
    
    if (doramasList.length > 0) heroItem = doramasList[0];
    if (doramasList.length > 0) rows.push({ id: "doramas", title: "Catálogo de Doramas", ref: "/generos/dorama", items: doramasList.slice(0, 20) });
  
  } else if (chosen === "generos") {
    const genrePaths = [
      { id: "accion", title: "Acción", path: "/generos/accion" },
      { id: "comedia", title: "Comedia", path: "/generos/comedia" },
      { id: "terror", title: "Terror", path: "/generos/terror" },
      { id: "ciencia-ficcion", title: "Ciencia Ficción", path: "/generos/ciencia-ficcion" },
      { id: "drama", title: "Drama", path: "/generos/drama" },
      { id: "animacion", title: "Animación", path: "/generos/animacion" },
      { id: "western", title: "Western", path: "/generos/western" },
    ];

    for (const g of genrePaths) {
      const html = await fetchPage(g.path);
      const items = extractItems(html);
      if (items.length > 0) {
        if (!heroItem) heroItem = items[0];
        rows.push({ id: g.id, title: g.title, ref: g.path, items: items.slice(0, 20) });
      }
    }
  }

  let hero = { title: "PelisPop", text: "Explora el mejor contenido." };
  if (heroItem) {
    hero = { title: heroItem.title, text: "Disfruta de este contenido destacado.", image: heroItem.poster };
  }

  return { tabs, tab: chosen, hero, rows };
}
// --- BROWSE (PAGINACIÓN EXACTA Y SCROLL INFINITO) ---
export async function browse(ref, cursor) {
  const page = parseInt(cursor, 10) || 1;
  
  if (!ref) return { items: [] };

  let url = `https://pelispop.mov${ref}`;

  // Usamos la estructura de Cuevana que descubriste (?page=2)
  if (page > 1) {
    url += url.includes("?") ? `&page=${page}` : `?page=${page}`;
  }

  const r = await kino.fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) return { items: [] };
  
  const items = extractItems(await r.text());

  // Bloqueamos la paginación solo para la fila de inicio
  if (ref === "/" && page === 1) {
    return { items, next: null };
  }

  return {
    items: items,
    // Mientras la página devuelva resultados, Kino seguirá activando el scroll al bajar
    next: items.length >= 10 ? String(page + 1) : null 
  };
}
// --- LISTA DE CAPÍTULOS (SOLO PARA SERIES) ---
export async function episodes(ref) {
  // Obtenemos la URL principal si el enlace apunta a un capítulo
  const mainUrl = ref.includes('/temporada/') ? ref.split('/temporada/')[0] : ref;

  const r = await kino.fetch(mainUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error("No se pudo cargar la información");
  const html = await r.text();

  const metadata = {};

  // 1. Sinopsis
  const descMatch = html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || html.match(/<p[^>]*>\s*([^<]{40,})\s*<\/p>/i);
  if (descMatch) metadata.overview = cleanText(descMatch[1]);

  // 2. Calificación (TMDB)
  const voteMatch = html.match(/TMDB\s*<\/span>\s*([\d.]+)/i) || html.match(/class="[^"]*rating[^"]*"[^>]*>([\d.]+)/i) || html.match(/<span[^>]*class="Num"[^>]*>([\d.]+)<\/span>/i);
  if (voteMatch) metadata.rating = parseFloat(voteMatch[1]);

  // 3. Géneros
  const genres = [];
  const gRegex = /<a[^>]+href="[^"]*generos?\/[^"]*"[^>]*>\s*([^<]+)\s*<\/a>/gi;
  let gm;
  while ((gm = gRegex.exec(html)) !== null) {
    genres.push(cleanText(gm[1]));
  }
  if (genres.length > 0) metadata.genres = [...new Set(genres)];

  // 4. Año
  const yearMatch = html.match(/class="Date"[^>]*>\s*(\d{4})\s*</i) || html.match(/>(19\d{2}|20\d{2})<\/(?:span|p|a)>/i);
  if (yearMatch) metadata.year = parseInt(yearMatch[1], 10);

  // 5. TMDB ID (Para que Kino auto-complete el resto de información si falta algo)
  const tmdbIdMatch = html.match(/tmdb[=&_]*(\d{3,})/i) || html.match(/data-id="(\d{3,})"/i) || html.match(/"tmdb_id"\s*:\s*"?(\d+)"?/i);
  if (tmdbIdMatch) metadata.ids = { tmdb: parseInt(tmdbIdMatch[1], 10) };

  // 6. Fondo / Backdrop
  const bgMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i) || html.match(/background-image:\s*url\((['"]?)([^)'"d]+)\1\)/i);
  if (bgMatch) {
    let bUrl = bgMatch[1] || bgMatch[2];
    if (bUrl && !bUrl.startsWith('data:')) {
      metadata.backdrop = bUrl.startsWith('//') ? 'https:' + bUrl : bUrl;
    }
  }

  const episodesList = [];

  // Extracción de capítulos para Series y Animes
  if (mainUrl.includes('/serie/') || mainUrl.includes('/anime/')) {
    const seen = new Set();
    const epRegex = /href="([^"]+\/temporada\/(\d+)\/capitulo\/(\d+)[^"]*)"/gi;
    let match;

    while ((match = epRegex.exec(html)) !== null) {
      let epUrl = match[1];
      const season = parseInt(match[2], 10);
      const episode = parseInt(match[3], 10);
      
      if (epUrl.startsWith('/')) epUrl = "https://pelispop.mov" + epUrl;

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
    episodesList.sort((a, b) => a.season - b.season || a.number - b.number);
  }

  // Si no hay episodios, devolvemos un único botón para la película
  if (episodesList.length === 0) {
    episodesList.push({ season: 1, number: 1, ref: mainUrl, title: "Reproducir" });
  }

  const result = { episodes: episodesList };
  
  // Inyectamos la metadata para que Kino la dibuje en la interfaz
  if (Object.keys(metadata).length > 0) {
    result.series = metadata; 
  }

  return result;
}
export async function resolve(ref) {
  // Función interna para aplicar el mismo filtro a todos los servidores
  async function extractVideo(url, label) {
    let streamUrl = null;
    let streamHeaders = { "Referer": url };

    // 1. Camino Rápido: Buscar patrones
    try {
      const rPage = await kino.fetch(url, { headers: { "Referer": "https://pelispop.mov/" } });
      if (rPage.ok) {
        const text = (await rPage.text()).replace(/\\\//g, "/");
        let m = null;
        if (url.includes("voe.sx")) {
          m = text.match(/'hls':\s*'([^']+)'/) || text.match(/"file":\s*"([^"]+)"/) || text.match(/https?:\/\/[^\s"'\\<>]+?\.(?:m3u8|mp4)/i);
        } else if (url.includes("hglink.to") || url.includes("streamwish")) {
          m = text.match(/file:\s*"([^"]+\.m3u8[^"]*)"/) || text.match(/https?:\/\/[^\s"'\\<>]+?\.(?:m3u8|mp4)/i);
        } else {
          m = text.match(/https?:\/\/[^\s"'\\<>]+?\.(?:m3u8|mp4)(?:\?[^\s"'\\<>]*)?/i);
        }
        if (m) streamUrl = m[1] || m[0];
      }
    } catch (err) {}

    // 2. Plan B: Navegador oculto con 25 segundos (vital para Voe)
    if (!streamUrl) {
      const page = await kino.browser.capture(url, { 
        headers: { "Referer": "https://pelispop.mov/" },
        timeoutMs: 25000 
      });
      if (!page || !page.media || !page.media.length) throw new Error("No hay video en este servidor");
      
      const validMedia = page.media.find(m => m.url.includes('.m3u8') || m.url.includes('.mp4')) || page.media[0];
      streamUrl = validMedia.url;
      if (validMedia.headers) streamHeaders = validMedia.headers;
    }

    return { url: streamUrl, label: label, headers: streamHeaders };
  }

  // --- FASE 1: COPIA PEREZOSA (El usuario eligió un servidor del menú) ---
  if (ref.includes("|")) {
    const parts = ref.split("|");
    const embedUrl = parts[1];
    const stream = await extractVideo(embedUrl, "Seleccionado");
    return { url: stream.url, headers: stream.headers };
  }

  // --- FASE 2: DESENCRIPTAR SERVIDORES (Primera vez) ---
  const r1 = await kino.fetch(ref);
  if (!r1.ok) throw new Error(`unavailable: Error al cargar Pelispop: ${r1.status}`);
  const html1 = await r1.text();

  let iframeUrl = null;
  const iframeMatch = html1.match(/<iframe[^>]+src="([^"]+)"/i) || html1.match(/data-src="([^"]+)"/i);
  if (iframeMatch) iframeUrl = iframeMatch[1];

  if (!iframeUrl) throw new Error("not_found: No se encontró el iframe del reproductor");
  if (iframeUrl.startsWith("//")) iframeUrl = "https:" + iframeUrl;
  else if (iframeUrl.startsWith("/")) iframeUrl = new URL(ref).origin + iframeUrl;

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
    try {
      const stream = await extractVideo(embeds[i].url, embeds[i].label);

      // Armamos las alternativas perezosas (lazy copies)
      const alts = [];
      for (let j = 0; j < embeds.length; j++) {
        if (j === i) continue;
        alts.push({ label: embeds[j].label, ref: `${ref}|${embeds[j].url}` });
      }
      if (alts.length) stream.alternatives = alts;

      return stream;
    } catch (err) {
      lastErr = err;
    }
  }
  
  throw lastErr || kino.error("unavailable", "Ningún servidor respondió con video");
}