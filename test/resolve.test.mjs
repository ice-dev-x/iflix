import { test } from "node:test";
import assert from "node:assert/strict";
import { checked, fakeArchive, plugin, rejection } from "./harness.mjs";
import { ALICE, NS050, OAR } from "./fixtures.mjs";

const items = { NS050, alice_in_wonderland_librivox: ALICE, "oar2006-01-14.mix.flac16": OAR };
const archive = () => fakeArchive({ items });
const CH1 = "track:alice_in_wonderland_librivox/wonderland_ch_01.mp3";
const SET1 = "track:oar2006-01-14.mix.flac16/oar2006-01-14d1t02.mix.flac";

test("standard quality plays the MP3 and offers every other rendition as a lazy labelled copy", async () => {
  const out = await checked("resolve", [SET1], archive());
  assert.equal(out.url, "https://archive.org/download/oar2006-01-14.mix.flac16/oar2006-01-14d1t02.mix.mp3");
  assert.equal(out.label, "Normal (MP3)");
  assert.deepEqual(out.alternatives, [
    { label: "Ogg Vorbis", ref: `${SET1}|ogg` },
    { label: "Sin pérdida (FLAC)", ref: `${SET1}|flac` },
  ]);
});

test("a copy's ref resolves exactly that rendition, with its own mime and no copies of its own", async () => {
  const out = await checked("resolve", [`${SET1}|flac`], archive());
  assert.equal(out.url, "https://archive.org/download/oar2006-01-14.mix.flac16/oar2006-01-14d1t02.mix.flac");
  assert.equal(out.mime, "audio/flac");
  assert.equal(out.alternatives, undefined);
});

test("light quality plays the 64 kbps derivative when there is one", async () => {
  const out = await checked("resolve", [CH1], { ...archive(), config: { quality: "light" } });
  assert.equal(out.url, "https://archive.org/download/alice_in_wonderland_librivox/wonderland_ch_01_64kb.mp3");
  assert.equal(out.label, "Liviana (64 kbps)");
  assert.equal(out.durationMs, 640000);
});

test("light quality without a 64 kbps copy falls back to the MP3 and reports the degraded result once", async () => {
  const { fetchImpl } = archive();
  const p = await plugin({ fetchImpl, config: { quality: "light" } });
  const reports = [];
  globalThis.kino = { ...p.kino, log: Object.assign((...a) => p.kino.log(...a), { report: (...a) => reports.push(a.join(" ")) }) };
  try {
    const out = await p.resolve("track:NS050/01-NS050-Multi-Panel_Christmas-With-Mr-Rice.mp3");
    assert.equal(out.url, "https://archive.org/download/NS050/01-NS050-Multi-Panel_Christmas-With-Mr-Rice.mp3");
  } finally {
    globalThis.kino = p.kino;
  }
  assert.equal(reports.length, 1);
  assert.match(reports[0], /^quality_fallback /);
});

test("lossless plays the FLAC where there is one, and a copy that does not exist is not_found", async () => {
  const out = await checked("resolve", [SET1], { ...archive(), config: { quality: "lossless" } });
  assert.equal(out.mime, "audio/flac");
  const { fetchImpl } = archive();
  const p = await plugin({ fetchImpl });
  const e = await rejection(p.resolve(`${CH1}|flac`));
  assert.equal(e.code, "not_found");
});

test("the manifest declares download, telemetry and the quality setting", async () => {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { root } = await import("./harness.mjs");
  const m = JSON.parse(readFileSync(join(root, "kino-plugin.json"), "utf8"));
  assert.ok(m.capabilities.includes("download"));
  assert.equal(m.telemetry, true);
  assert.deepEqual(m.settings.find((s) => s.key === "quality").options.map((o) => o.value), ["standard", "light", "lossless"]);
});
