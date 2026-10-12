import { test } from "node:test";
import assert from "node:assert/strict";
import { checked, fakeArchive, plugin } from "./harness.mjs";
import { ALICE, NS050, bigShow } from "./fixtures.mjs";

test("opening an album and then playing it asks archive.org for its metadata once", async () => {
  const { fetchImpl, asked } = fakeArchive({ items: { NS050 } });
  const p = await plugin({ fetchImpl });
  await p.episodes("item:NS050");
  await p.resolve("track:NS050/01-NS050-Multi-Panel_Christmas-With-Mr-Rice.mp3");
  assert.equal(asked.filter((u) => u.includes("/metadata/NS050")).length, 1);
  assert.deepEqual(p.kino.storage.keys(), ["meta1:NS050"]);
});

test("a cached audiobook follows a change of Kino's language: titles are never cached", async () => {
  const { fetchImpl } = fakeArchive({ items: { alice_in_wonderland_librivox: ALICE } });
  const es = await plugin({ fetchImpl });
  await es.episodes("item:alice_in_wonderland_librivox");
  const stored = es.kino.storage.get("meta1:alice_in_wonderland_librivox");
  globalThis.kino = { ...es.kino, lang: "en-US" };
  try {
    assert.deepEqual((await es.episodes("item:alice_in_wonderland_librivox")).episodes.map((e) => e.title), ["Chapter 1", "Chapter 2"]);
  } finally {
    globalThis.kino = es.kino;
  }
  assert.doesNotMatch(stored, /Capítulo/);
});

test("a 600-episode show is listed and played but not cached, and storage never fails the call", async () => {
  const show = bigShow(600);
  const { fetchImpl } = fakeArchive({ items: { OTRR_Gunsmoke_Singles: show } });
  const p = await plugin({ fetchImpl });
  const out = await p.episodes("item:OTRR_Gunsmoke_Singles");
  assert.equal(out.episodes.length, 600);
  assert.equal(p.kino.storage.get("meta1:OTRR_Gunsmoke_Singles"), null);
});

test("when storage is full the oldest album is evicted to make room", async () => {
  const items = {};
  for (let i = 0; i < 120; i++) items[`album-${i}`] = { ...NS050, metadata: { ...NS050.metadata, identifier: `album-${i}`, description: "x".repeat(7000) } };
  const { fetchImpl } = fakeArchive({ items });
  const p = await plugin({ fetchImpl });
  for (let i = 0; i < 120; i++) await p.episodes(`item:album-${i}`);
  const keys = p.kino.storage.keys();
  assert.ok(keys.includes("meta1:album-119"), "the newest album is cached");
  assert.ok(!keys.includes("meta1:album-0"), "the oldest album was evicted");
});

test("the status line counts the cached albums, and Vaciar caché empties only the cache", async () => {
  const { fetchImpl } = fakeArchive({ items: { NS050 } });
  const p = await plugin({ fetchImpl });
  await p.episodes("item:NS050");
  p.kino.storage.set("unrelated", "keep me");
  assert.match((await p.settingsStatus()).cache, /^Caché: 1 álbumes, \d+ KB$/);
  assert.deepEqual(await p.action("clearCache"), { message: "Listo: se vació la caché" });
  assert.deepEqual(p.kino.storage.keys(), ["unrelated"]);
  assert.deepEqual(await checked("settingsStatus", [], { fetchImpl }), { cache: "Caché: 0 álbumes, 0 KB" });
  await checked("action", ["clearCache"], { fetchImpl });
});
