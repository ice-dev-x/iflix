import { test } from "node:test";
import assert from "node:assert/strict";
import { busyPage, checked, fakeArchive, plugin, rejection } from "./harness.mjs";
import { doc } from "./fixtures.mjs";

// Answers by the collection the query names, like archive.org.
function bySearch(map) {
  return (q) => {
    for (const [needle, answer] of Object.entries(map)) if (q.includes(needle)) return typeof answer === "function" ? answer() : answer;
    return [];
  };
}
const netlabels = [doc("NS050", "Another Day, Another Way", "No-Source Netlabel", ["netlabels"])];
const books = [doc("alice_in_wonderland_librivox", "Alice", "Lewis Carroll", ["librivoxaudio"])];
const radio = [doc("Dragnet_OTR", "Dragnet", "NBC", ["oldtimeradio"])];

test("Home has the netlabel, audiobook and radio rows, each with Ver más", async () => {
  const { fetchImpl } = fakeArchive({ search: bySearch({ "collection:(netlabels)": netlabels, "collection:(librivoxaudio)": books, "collection:(oldtimeradio)": radio }) });
  const rows = await checked("home", [], { fetchImpl });
  assert.deepEqual(rows.map((r) => [r.id, r.title, r.ref]), [
    ["netlabels", "Discos de netlabels", "netlabels:top"],
    ["books", "Audiolibros", "books:top"],
    ["radio", "Radio clásica", "radio:top"],
  ]);
  assert.equal(rows[0].genre, "musica");
  assert.equal(rows[1].items[0].kind, "podcast");
});

test("a row archive.org fails to answer is left out and the others stay", async () => {
  const { fetchImpl } = fakeArchive({ search: bySearch({ "collection:(netlabels)": () => busyPage(), "collection:(librivoxaudio)": books, "collection:(oldtimeradio)": radio }) });
  const rows = await checked("home", [], { fetchImpl });
  assert.deepEqual(rows.map((r) => r.id), ["books", "radio"]);
});

test("Ver más pages 50 at a time with the page number as cursor, and an unknown row is not_found", async () => {
  const fifty = Array.from({ length: 50 }, (_, i) => doc(`n${i}`, `Album ${i}`, "Band", ["netlabels"]));
  const { fetchImpl, asked } = fakeArchive({ search: () => fifty });
  const first = await checked("browse", ["netlabels:top"], { fetchImpl });
  assert.equal(first.next, "2");
  await checked("browse", ["netlabels:top", "2"], { fetchImpl });
  assert.equal(new URL(asked.at(-1)).searchParams.get("page"), "2");
  const p = await plugin({ fetchImpl });
  assert.equal((await rejection(p.browse("nope:top", null))).code, "not_found");
  const off = await plugin({ fetchImpl, config: { liveShows: false } });
  assert.equal((await rejection(off.browse("live:top", null))).code, "not_found");
});

test("an extra collection becomes the first row, newest first, from its identifier or its address", async () => {
  const mine = [doc("my-item", "Mine", "Me", ["my-collection"])];
  for (const value of ["my-collection", "https://archive.org/details/my-collection"]) {
    const { fetchImpl, asked } = fakeArchive({ search: bySearch({ "collection:(my-collection)": mine, "collection:(netlabels)": netlabels, "collection:(librivoxaudio)": books, "collection:(oldtimeradio)": radio }) });
    await checked("home", [], { fetchImpl, config: { extraCollection: value } });
    const p = await plugin({ fetchImpl, config: { extraCollection: value } });
    const rows = await p.home();
    assert.deepEqual(rows[0], { id: "extra", title: "Tu colección: my-collection", ref: "extra:new", items: mine.map((d) => ({ id: d.identifier, ref: "item:my-item", title: "Mine", kind: "music", poster: "https://archive.org/services/img/my-item", artist: "Me", year: "2010" })) });
    const extraUrl = asked.find((u) => u.includes("my-collection"));
    assert.equal(new URL(extraUrl).searchParams.get("sort[]"), "addeddate desc");
  }
});

test("validateSettings refuses a bad or empty collection under its field and accepts a real one", async () => {
  const { fetchImpl } = fakeArchive({ search: bySearch({ "collection:(real-one)": [doc("x", "X", "Y", ["real-one"])] }) });
  const p = await plugin({ fetchImpl });
  assert.equal(await p.validateSettings({ extraCollection: "" }), null);
  assert.equal(await p.validateSettings({ extraCollection: "real-one" }), null);
  assert.deepEqual(await p.validateSettings({ extraCollection: "no such/thing" }), { extraCollection: "Escribe el identificador de una colección (por ejemplo, librivoxaudio) o su dirección en archive.org" });
  assert.deepEqual(await p.validateSettings({ extraCollection: "empty-one" }), { extraCollection: "Esa colección no existe o no tiene audio" });
  await checked("validateSettings", ['{"extraCollection":"real-one"}'], { fetchImpl });
});
