// Real archive.org shapes, trimmed. Each one is a lesson the plugin handles; the comment says which.

// netlabels compilation: VBR MP3 originals with Ogg derivatives, track "n/15", a different artist per track.
export const NS050 = {
  metadata: {
    identifier: "NS050", title: "Another Day, Another Way", creator: "No-Source Netlabel", date: "2012",
    collection: ["no-source", "netlabels"], description: "<p>A compilation of <b>acoustic</b> and electronic music.</p>",
  },
  files: [
    { name: "03-NS050-Cocolixe_Swing-Low.mp3", format: "VBR MP3", source: "original", title: "Swing Low", track: "3/15", length: "200.43", artist: "Cocolixe" },
    { name: "01-NS050-Multi-Panel_Christmas-With-Mr-Rice.mp3", format: "VBR MP3", source: "original", title: "Christmas with Mr. Rice", track: "1/15", length: "240.9", artist: "Multi-Panel" },
    { name: "01-NS050-Multi-Panel_Christmas-With-Mr-Rice.ogg", format: "Ogg Vorbis", source: "derivative", original: "01-NS050-Multi-Panel_Christmas-With-Mr-Rice.mp3", length: "240.95" },
    { name: "01-NS050-Multi-Panel_Christmas-With-Mr-Rice.png", format: "PNG", source: "derivative", original: "01-NS050-Multi-Panel_Christmas-With-Mr-Rice.mp3" },
    { name: "02-NS050-Full-Source_Prior-To-alt-ver.mp3", format: "VBR MP3", source: "original", title: "Prior To (alt. ver.)", track: "2/15", length: "167.97", artist: "Full-Source" },
    { name: "02-NS050-Full-Source_Prior-To-alt-ver.ogg", format: "Ogg Vorbis", source: "derivative", original: "02-NS050-Full-Source_Prior-To-alt-ver.mp3" },
    { name: "NS050_cover.jpg", format: "JPEG", source: "original" },
  ],
};

// LibriVox: file-stem titles ("wonderland_ch_01"), a 64 kbps derivative whose length is "mm:ss" while the original has none.
export const ALICE = {
  metadata: {
    identifier: "alice_in_wonderland_librivox", title: "Alice's Adventures in Wonderland, by Lewis Carroll",
    creator: "Lewis Carroll", date: "2006-01-11", language: "eng", collection: ["librivoxaudio", "audio_bookspoetry"],
  },
  files: [
    { name: "wonderland_ch_02.mp3", format: "VBR MP3", source: "original", title: "wonderland_ch_02", track: "2/12", artist: "Lewis Carroll" },
    { name: "wonderland_ch_02_64kb.mp3", format: "64Kbps MP3", source: "derivative", original: "wonderland_ch_02.mp3", title: "wonderland_ch_02", track: "2/12", length: "12:15" },
    { name: "wonderland_ch_01.mp3", format: "VBR MP3", source: "original", title: "wonderland_ch_01", track: "1/12", artist: "Lewis Carroll" },
    { name: "wonderland_ch_01_64kb.mp3", format: "64Kbps MP3", source: "derivative", original: "wonderland_ch_01.mp3", title: "wonderland_ch_01", track: "1/12", length: "10:40" },
    { name: "alice_in_wonderland_librivox_files.xml", format: "Metadata", source: "original" },
  ],
};

// etree concert: mediatype "etree", FLAC originals, discs in the name ("d1t01"), one artist for the whole set.
export const OAR = {
  metadata: {
    identifier: "oar2006-01-14.mix.flac16", title: "Of A Revolution Live at Madison Square Garden on 2006-01-14",
    creator: "Of A Revolution", mediatype: "etree", date: "2006-01-14", collection: ["OfARevolution", "etree"],
  },
  files: [
    { name: "oar2006-01-14d2t01.mix.flac", format: "Flac", source: "original", title: "Encore", track: "1", length: "300.5", artist: "O.A.R. (... Of A Revolution)" },
    { name: "oar2006-01-14d2t01.mix.mp3", format: "VBR MP3", source: "derivative", original: "oar2006-01-14d2t01.mix.flac", title: "Encore", track: "1", length: "05:00" },
    { name: "oar2006-01-14d1t02.mix.flac", format: "Flac", source: "original", title: "52-50", track: "2", length: "541.53", artist: "O.A.R. (... Of A Revolution)" },
    { name: "oar2006-01-14d1t02.mix.mp3", format: "VBR MP3", source: "derivative", original: "oar2006-01-14d1t02.mix.flac", title: "52-50", track: "2", length: "09:01" },
    { name: "oar2006-01-14d1t02.mix.ogg", format: "Ogg Vorbis", source: "derivative", original: "oar2006-01-14d1t02.mix.flac", length: "541.53" },
    { name: "oar2006-01-14d1t01.mix.flac", format: "Flac", source: "original", title: "Introduction", track: "1", length: "96.98", artist: "O.A.R. (... Of A Revolution)" },
    { name: "oar2006-01-14d1t01.mix.mp3", format: "VBR MP3", source: "derivative", original: "oar2006-01-14d1t01.mix.flac", title: "Introduction", track: "1", length: "01:37" },
  ],
};

// 78rpm bundle: 128Kbps MP3 originals with no title and no track, names "<creator>-CamelCase".
export const CARUSO = {
  metadata: { identifier: "Caruso_part1", title: "Collected Works of Caruso part 1", creator: "Caruso", collection: ["78rpm", "audio_music"] },
  files: [
    { name: "Caruso-AhLaPaternaMano.mp3", format: "128Kbps MP3", source: "original", length: "205.79" },
    { name: "Caruso-AhLaPaternaMano.ogg", format: "Ogg Vorbis", source: "derivative", original: "Caruso-AhLaPaternaMano.mp3", length: "205.79" },
    { name: "Caruso-AddioAllaMadre.mp3", format: "128Kbps MP3", source: "original", length: "243.62" },
    { name: "Caruso-AddioAllaMadre.ogg", format: "Ogg Vorbis", source: "derivative", original: "Caruso-AddioAllaMadre.mp3", length: "243.62" },
  ],
};

// Two discs kept in folders.
export const TWO_DISCS = {
  metadata: { identifier: "two-discs-album", title: "Two Discs", creator: "Some Band", collection: ["netlabels"] },
  files: [
    { name: "CD2/01 Outro.mp3", format: "VBR MP3", source: "original", title: "Outro", track: "1", length: "60" },
    { name: "CD1/02 Middle.mp3", format: "VBR MP3", source: "original", title: "Middle", track: "2", length: "60" },
    { name: "CD1/01 Intro.mp3", format: "VBR MP3", source: "original", title: "Intro", track: "1", length: "60" },
  ],
};

// An audio-mediatype item with nothing playable in it.
export const NO_AUDIO = {
  metadata: { identifier: "scans-only", title: "Liner notes", creator: "Nobody", collection: ["netlabels"] },
  files: [
    { name: "notes.pdf", format: "Text PDF", source: "original" },
    { name: "cover.jpg", format: "JPEG", source: "original" },
  ],
};

// A long radio show (like OTRR_Gunsmoke_Singles, 487 episodes): too big to cache.
export function bigShow(count = 600) {
  const files = [];
  for (let i = 1; i <= count; i++) {
    const name = `Gunsmoke 52-04-26 (${String(i).padStart(3, "0")}) Episode number ${i} with a long title.mp3`;
    files.push({ name, format: "VBR MP3", source: "original", title: `Episode number ${i}`, track: String(i), length: "1740.04", artist: "Gunsmoke" });
    files.push({ name: name.replace(/\.mp3$/, ".ogg"), format: "Ogg Vorbis", source: "derivative", original: name });
  }
  return { metadata: { identifier: "OTRR_Gunsmoke_Singles", title: "Gunsmoke - Single Episodes", creator: "Old Time Radio Researchers Group", collection: ["oldtimeradio"] }, files };
}

/** An advancedsearch doc, as archive.org lists it. */
export function doc(identifier, title, creator, collection, extra = {}) {
  return { identifier, title, creator, collection, mediatype: "audio", year: 2010, ...extra };
}
