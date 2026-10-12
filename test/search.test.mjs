import { test } from "node:test";
import assert from "node:assert/strict";
import { busyPage, checked, fakeArchive, plugin, rejection } from "./harness.mjs";
import { doc } from "./fixtures.mjs";

const docs = [
  doc("alice_in_wonderland_librivox", "Alice's Adventures in Wonderland", "Lewis Carroll", ["librivoxaudio", "audio_bookspoetry"]),
  doc("alice-netlabel", "Alice in Wonderland (EP)", ["Wonder Band", "Guest"], ["netlabels"]),
  doc("unrelated", "Completely different", "Somebody", ["netlabels"]),
];

test("search asks every enabled collection by title and creator, audio and etree only", async () => {
  const { fetchImpl, asked } = fakeArchive({ search: () => docs });
  await checked("search", ["alice wonderland"], { fetchImpl });
  const q = new URL(asked[0]).searchParams.get("q");
  for (const c of ["netlabels", "78rpm", "etree", "librivoxaudio", "oldtimeradio"]) assert.ok(q.includes(`collection:(${c})`), c);
  assert.ok(q.includes("mediatype:(audio OR etree)"));
  assert.ok(q.includes("title:(alice wonderland) OR creator:(alice wonderland)"));
});

test("results are music and podcast items with artist, cover and year; near-misses are dropped", async () => {
  const { fetchImpl } = fakeArchive({ search: () => docs });
  // checked() proves Kino keeps every item (its output is Kino's normalized page); the exact items come from the plugin.
  assert.equal((await checked("search", ["alice wonderland"], { fetchImpl })).items.length, 2);
  const p = await plugin({ fetchImpl });
  const out = await p.search({ q: "alice wonderland", type: "any" });
  assert.deepEqual(out.map((i) => i.id).sort(), ["alice-netlabel", "alice_in_wonderland_librivox"]);
  const book = out.find((i) => i.id === "alice_in_wonderland_librivox");
  assert.deepEqual(book, {
    id: "alice_in_wonderland_librivox", ref: "item:alice_in_wonderland_librivox", title: "Alice's Adventures in Wonderland",
    kind: "podcast", poster: "https://archive.org/services/img/alice_in_wonderland_librivox", artist: "Lewis Carroll", year: "2010",
  });
  assert.equal(out.find((i) => i.id === "alice-netlabel").artist, "Wonder Band, Guest");
  assert.ok(!out.some((i) => i.id === "unrelated"));
});

test("type podcast puts podcasts first without dropping music", async () => {
  const { fetchImpl } = fakeArchive({ search: () => docs });
  const p = await plugin({ fetchImpl });
  const out = await p.search({ q: "alice wonderland", type: "podcast", altTitles: [] });
  assert.equal(out[0].kind, "podcast");
  assert.ok(out.some((i) => i.kind === "music"));
});

test("query syntax in what was typed is cleaned, and an empty search asks nothing", async () => {
  const { fetchImpl, asked } = fakeArchive({ search: () => [] });
  const p = await plugin({ fetchImpl });
  await p.search({ q: "rock/roll - AND jazz", type: "any" });
  assert.ok(new URL(asked[0]).searchParams.get("q").includes("title:(rock roll jazz)"));
  assert.deepEqual(await p.search({ q: "  AND  ", type: "any" }), []);
  assert.equal(asked.length, 1);
});

test("the audiobook language narrows only LibriVox, and concerts off leaves etree out", async () => {
  const { fetchImpl, asked } = fakeArchive({ search: () => [] });
  const p = await plugin({ fetchImpl, config: { bookLang: "spa", liveShows: false } });
  await p.search({ q: "quijote", type: "any" });
  const q = new URL(asked[0]).searchParams.get("q");
  assert.ok(q.includes("(collection:(librivoxaudio) AND language:(spa))"));
  assert.ok(!q.includes("collection:(etree)"));
  assert.ok(q.includes("collection:(netlabels)"));
});

test("archive.org busy during a search is unavailable", async () => {
  const { fetchImpl } = fakeArchive({ search: () => busyPage() });
  const p = await plugin({ fetchImpl });
  assert.equal((await rejection(p.search({ q: "jazz", type: "any" }))).code, "unavailable");
});
