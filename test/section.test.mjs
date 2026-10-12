import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { busyPage, checked, fakeArchive, plugin, resolvePalette, root } from "./harness.mjs";
import { doc } from "./fixtures.mjs";

const some = (prefix, collection) => Array.from({ length: 5 }, (_, i) => doc(`${prefix}${i}`, `${prefix} ${i}`, "Artist", [collection]));
const everything = (q) => {
  if (q.includes("collection:(etree)")) return some("live", "etree");
  if (q.includes("collection:(librivoxaudio)")) return some("book", "librivoxaudio");
  if (q.includes("collection:(oldtimeradio)")) return some("radio", "oldtimeradio");
  return some("album", "netlabels");
};

test("the section opens on Música with three rows and today's pick from the first", async () => {
  const { fetchImpl } = fakeArchive({ search: everything });
  const out = await checked("section", [], { fetchImpl });
  assert.deepEqual(out.tabs.map((x) => x.id), ["music", "live", "books", "radio"]);
  assert.equal(out.tab, "music");
  assert.deepEqual(out.rows.map((r) => [r.title, r.ref]), [["Más escuchados", "music:top"], ["Recién agregados", "music:new"], ["Discos de 78 rpm", "78rpm:top"]]);
  assert.ok(out.rows[0].items.some((i) => i.title === out.hero.title));
  assert.equal(out.hero.text, "De Artist. El destacado de hoy.");
});

test("concerts off removes their tab, and asking for it falls back to Música", async () => {
  const { fetchImpl } = fakeArchive({ search: everything });
  const out = await checked("section", ["live"], { fetchImpl, config: { liveShows: false } });
  assert.deepEqual(out.tabs.map((x) => x.id), ["music", "books", "radio"]);
  assert.equal(out.tab, "music");
});

test("a tab whose rows all fail answers no rows, not an error", async () => {
  const { fetchImpl } = fakeArchive({ search: () => busyPage() });
  const p = await plugin({ fetchImpl });
  const out = await p.section({ tab: "books" });
  assert.equal(out.tab, "books");
  assert.deepEqual(out.rows, []);
  assert.equal(out.hero, undefined);
});

test("genre tiles open their list; empty, failing or switched-off genres are left out", async () => {
  const { fetchImpl } = fakeArchive({
    search: (q) => (q.includes("subject:(mystery)") ? busyPage() : q.includes("subject:(children)") ? [] : everything(q)),
  });
  const tiles = await checked("categories", [], { fetchImpl, config: { liveShows: false } });
  assert.deepEqual(tiles.map((x) => x.id), ["jazz", "classical", "electronic", "blues", "scifi", "poetry"]);
  assert.deepEqual(tiles[0], { id: "jazz", title: "Jazz", ref: "genre-jazz:top", art: "https://archive.org/services/img/album0" });
  await checked("browse", ["genre-jazz:top"], { fetchImpl });
});

test("the theme passes every readability check (no color falls back)", () => {
  const { theme } = JSON.parse(readFileSync(join(root, "kino-plugin.json"), "utf8"));
  const r = resolvePalette(theme);
  assert.deepEqual(r.warnings, []);
  assert.deepEqual([...r.kept].sort(), ["accent", "background", "highlight", "onAccent", "surface"]);
});
