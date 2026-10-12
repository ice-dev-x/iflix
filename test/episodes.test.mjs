import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { busyPage, checked, fakeArchive, plugin, rejection, root, validate } from "./harness.mjs";
import { ALICE, CARUSO, NO_AUDIO, NS050, OAR, TWO_DISCS } from "./fixtures.mjs";

const items = { NS050, alice_in_wonderland_librivox: ALICE, "oar2006-01-14.mix.flac16": OAR, Caruso_part1: CARUSO, "two-discs-album": TWO_DISCS, "scans-only": NO_AUDIO };
const archive = () => fakeArchive({ items });

test("Kino accepts the manifest at apiVersion 8 with archive.org and *.archive.org", async () => {
  const r = await validate(root);
  assert.deepEqual(r.problems, []);
  const m = JSON.parse(readFileSync(join(root, "kino-plugin.json"), "utf8"));
  assert.equal(m.apiVersion, 8);
  assert.deepEqual(m.hosts, ["archive.org", "*.archive.org"]);
});

test("a compilation lists its tracks in track order, each titled with its own artist", async () => {
  const out = await checked("episodes", ["item:NS050"], archive());
  assert.deepEqual(out.episodes.map((e) => [e.season, e.number, e.title, e.runtimeMinutes]), [
    [1, 1, "Multi-Panel — Christmas with Mr. Rice", 4],
    [1, 2, "Full-Source — Prior To (alt. ver.)", 3],
    [1, 3, "Cocolixe — Swing Low", 3],
  ]);
  assert.equal(out.episodes[0].ref, "track:NS050/01-NS050-Multi-Panel_Christmas-With-Mr-Rice.mp3");
  assert.equal(out.episodes[0].still, "https://archive.org/services/img/NS050");
  assert.equal(out.series.title, "Another Day, Another Way");
  assert.equal(out.series.overview, "A compilation of acoustic and electronic music.");
  assert.equal(out.series.year, "2012");
});

test("an audiobook's file-stem titles become numbered chapters in the person's language", async () => {
  const { fetchImpl } = archive();
  const es = await plugin({ fetchImpl });
  assert.deepEqual((await es.episodes("item:alice_in_wonderland_librivox")).episodes.map((e) => [e.title, e.runtimeMinutes]), [
    ["Capítulo 1", 11],
    ["Capítulo 2", 12],
  ]);
  const en = await plugin({ fetchImpl, lang: "en-US" });
  assert.deepEqual((await en.episodes("item:alice_in_wonderland_librivox")).episodes.map((e) => e.title), ["Chapter 1", "Chapter 2"]);
});

test("a concert's d1t01 names become discs, and one artist for the whole set adds no prefix", async () => {
  const out = await checked("episodes", ["item:oar2006-01-14.mix.flac16"], archive());
  assert.deepEqual(out.episodes.map((e) => [e.season, e.number, e.title]), [
    [1, 1, "Introduction"],
    [1, 2, "52-50"],
    [2, 1, "Encore"],
  ]);
});

test("disc folders become seasons; untitled 78 rpm sides take a title from the file name, in natural order", async () => {
  const discs = await checked("episodes", ["item:two-discs-album"], archive());
  assert.deepEqual(discs.episodes.map((e) => [e.season, e.number, e.title]), [[1, 1, "Intro"], [1, 2, "Middle"], [2, 1, "Outro"]]);
  const caruso = await checked("episodes", ["item:Caruso_part1"], archive());
  assert.deepEqual(caruso.episodes.map((e) => e.title), ["Addio Alla Madre", "Ah La Paterna Mano"]);
});

test("an item with nothing playable, or that does not exist, is not_found with a sentence for the person", async () => {
  const { fetchImpl } = archive();
  const p = await plugin({ fetchImpl });
  const empty = await rejection(p.episodes("item:scans-only"));
  assert.equal(empty.code, "not_found");
  assert.equal(empty.userMessage, "Este álbum no tiene audio que se pueda reproducir.");
  assert.equal((await rejection(p.episodes("item:does-not-exist"))).code, "not_found");
  assert.equal((await rejection(p.episodes("album:42"))).code, "not_found");
});

test("archive.org answering an HTML page instead of JSON is unavailable, with the plugin's sentence", async () => {
  const { fetchImpl } = fakeArchive({ items: { NS050: busyPage() } });
  const p = await plugin({ fetchImpl });
  const e = await rejection(p.episodes("item:NS050"));
  assert.equal(e.code, "unavailable");
  assert.equal(e.userMessage, "El archivo no responde ahora. Intenta de nuevo en un rato.");
});

test("resolve plays a track's MP3 from archive.org's download path, with its length", async () => {
  const out = await checked("resolve", ["track:NS050/01-NS050-Multi-Panel_Christmas-With-Mr-Rice.mp3"], archive());
  assert.equal(out.url, "https://archive.org/download/NS050/01-NS050-Multi-Panel_Christmas-With-Mr-Rice.mp3");
  assert.equal(out.mime, "audio/mpeg");
  assert.equal(out.durationMs, 240900);
  const disc = await checked("resolve", ["track:two-discs-album/CD1/01 Intro.mp3"], archive());
  assert.equal(disc.url, "https://archive.org/download/two-discs-album/CD1/01%20Intro.mp3");
});

test("a track ref whose file is gone is not_found with a sentence for the person", async () => {
  const { fetchImpl } = archive();
  const p = await plugin({ fetchImpl });
  const e = await rejection(p.resolve("track:NS050/99-gone.mp3"));
  assert.equal(e.code, "not_found");
  assert.equal(e.userMessage, "Esta pista ya no está disponible.");
});
