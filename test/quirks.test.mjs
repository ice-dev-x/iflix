// archive.org shapes found by the final review on real items (2026-10-06): bitrate-labelled MP3s, private originals,
// radio episodes named in their files, and what the person actually reads when a call fails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { busyPage, fakeArchive, plugin, rejection, shownSentence } from "./harness.mjs";
import { NO_AUDIO, NS050 } from "./fixtures.mjs";

// Like Dragnet_OTR: 32Kbps/24Kbps MP3 originals and nothing else.
const DRAGNET = {
  metadata: { identifier: "Dragnet_OTR", title: "Dragnet the 50's radio show", collection: ["oldtimeradio"] },
  files: [
    { name: "Dragnet 49-06-03 001 Production 1.mp3", format: "32Kbps MP3", source: "original", length: "1712.3" },
    { name: "Dragnet 49-06-10 002 Production 2.mp3", format: "24Kbps MP3", source: "original", length: "1690" },
  ],
};

// Like nt096: a netlabel album whose only audio is 192Kbps MP3 originals.
const NT096 = {
  metadata: { identifier: "nt096", title: "Some Album", creator: "Some Artist", collection: ["netlabels"] },
  files: [{ name: "01 Song.mp3", format: "192Kbps MP3", source: "original", title: "Song", track: "1", length: "200" }],
};

// Like Grateful Dead soundboards: a private FLAC original with public MP3 and Ogg derivatives.
const GD = {
  metadata: { identifier: "gd77-sbd", title: "Grateful Dead Live", creator: "Grateful Dead", mediatype: "etree", collection: ["GratefulDead", "etree"] },
  files: [
    { name: "gd77d1t01.flac", format: "Flac", source: "original", private: "true", title: "Promised Land", track: "1", length: "300" },
    { name: "gd77d1t01.mp3", format: "VBR MP3", source: "derivative", original: "gd77d1t01.flac", length: "05:00" },
    { name: "gd77d1t01.ogg", format: "Ogg Vorbis", source: "derivative", original: "gd77d1t01.flac" },
  ],
};

// Like OTRR_Suspense_Singles / X Minus One: no titles, the episode is named in the file.
const SUSPENSE = {
  metadata: { identifier: "OTRR_Suspense_Singles", title: "Suspense - Single Episodes", creator: "Old Time Radio Researchers Group", collection: ["oldtimeradio"] },
  files: [
    { name: "Forecast 400722 The Lodger (audition).mp3", format: "VBR MP3", source: "original", track: "1", length: "1800" },
    { name: "XMinusOne55-04-24001NoContact.mp3", format: "VBR MP3", source: "original", track: "2", length: "1800" },
    { name: "0003.mp3", format: "VBR MP3", source: "original", track: "3", length: "1800" },
  ],
};

const items = { Dragnet_OTR: DRAGNET, nt096: NT096, "gd77-sbd": GD, OTRR_Suspense_Singles: SUSPENSE, NS050, "scans-only": NO_AUDIO };

test("bitrate-labelled MP3 originals play as the MP3, without a fallback report", async () => {
  const { fetchImpl } = fakeArchive({ items });
  const p = await plugin({ fetchImpl });
  const reports = [];
  globalThis.kino = { ...p.kino, log: Object.assign((...a) => p.kino.log(...a), { report: (...a) => reports.push(a) }) };
  try {
    assert.equal((await p.episodes("item:Dragnet_OTR")).episodes.length, 2);
    const low = await p.resolve("track:Dragnet_OTR/Dragnet 49-06-03 001 Production 1.mp3");
    assert.equal(low.mime, "audio/mpeg");
    assert.match(low.url, /Production%201\.mp3$/);
    const high = await p.resolve("track:nt096/01 Song.mp3");
    assert.match(high.url, /01%20Song\.mp3$/);
  } finally {
    globalThis.kino = p.kino;
  }
  assert.deepEqual(reports, []);
});

test("a private original is never offered: no FLAC copy, and lossless falls back to a public file", async () => {
  const { fetchImpl } = fakeArchive({ items });
  const p = await plugin({ fetchImpl, config: { quality: "lossless" } });
  const out = await p.resolve("track:gd77-sbd/gd77d1t01.flac");
  assert.match(out.url, /gd77d1t01\.mp3$/);
  assert.deepEqual(out.alternatives.map((a) => a.ref), ["track:gd77-sbd/gd77d1t01.flac|ogg"]);
  assert.equal((await rejection(p.resolve("track:gd77-sbd/gd77d1t01.flac|flac"))).code, "not_found");
});

test("radio episodes keep the title in their file name; only a bare number becomes Episodio N", async () => {
  const { fetchImpl } = fakeArchive({ items });
  const es = await plugin({ fetchImpl });
  assert.deepEqual((await es.episodes("item:OTRR_Suspense_Singles")).episodes.map((e) => e.title), [
    "Forecast 400722 The Lodger (audition)",
    "X Minus One55-04-24001 No Contact",
    "Episodio 3",
  ]);
  const en = await plugin({ fetchImpl, lang: "en-US" });
  assert.equal((await en.episodes("item:OTRR_Suspense_Singles")).episodes[2].title, "Episode 3");
});

test("Kino shows the plugin's own sentences (no domain, no app name), in both languages", async () => {
  for (const lang of ["es-CO", "en-US"]) {
    const busy = await plugin({ fetchImpl: fakeArchive({ items: { NS050: busyPage() } }).fetchImpl, lang });
    const errors = [
      await rejection(busy.episodes("item:NS050")),
      await rejection((await plugin({ fetchImpl: fakeArchive({ items }).fetchImpl, lang })).episodes("item:scans-only")),
      await rejection((await plugin({ fetchImpl: fakeArchive({ items }).fetchImpl, lang })).resolve("track:NS050/99-gone.mp3")),
    ];
    for (const e of errors) assert.ok(shownSentence(e), `${lang}: Kino would hide "${e.userMessage}"`);
  }
});

test("a fallback report names the qualities only, never what the person plays", async () => {
  const { fetchImpl } = fakeArchive({ items });
  const p = await plugin({ fetchImpl, config: { quality: "light" } });
  const reports = [];
  globalThis.kino = { ...p.kino, log: Object.assign((...a) => p.kino.log(...a), { report: (...a) => reports.push(a.join(" ")) }) };
  try {
    await p.resolve("track:NS050/01-NS050-Multi-Panel_Christmas-With-Mr-Rice.mp3");
  } finally {
    globalThis.kino = p.kino;
  }
  assert.deepEqual(reports, ["quality_fallback light mp3"]);
});
