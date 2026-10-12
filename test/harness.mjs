// How these tests reach the plugin: a fake archive.org (fetchImpl), the kit's `kino` (createKino), and either a direct
// call of the exports (several calls sharing one kino.storage) or one call checked with the app's rules (validate).
import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
export const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Kino's kit: `sdk/` inside the plugin's own repository (as published), or next to the plugin folder (as in Kino's
// repository, plugins/sdk beside plugins/archive-audio).
export const SDK = existsSync(join(root, "sdk", "run.mjs")) ? join(root, "sdk") : join(root, "..", "sdk");
const kit = (file) => import(pathToFileURL(join(SDK, file)).href);
const { validateManifest } = await kit("contract.mjs");
const { createKino, shownSentence } = await kit("kino-shim.mjs");
const { validate } = await kit("validate.mjs");
const { resolvePalette } = await kit("palette.mjs");
export { shownSentence, validate, resolvePalette };

const json = (body) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

/** archive.org's "busy" answer: 200 with an HTML page, which is not JSON. */
export const busyPage = () => new Response("<html><body>Too many requests</body></html>", { status: 200, headers: { "content-type": "text/html" } });

/**
 * A fake archive.org. `search(q, params)` answers advancedsearch with docs (or a Response, for a failure); `items` maps
 * an identifier to its /metadata answer (or a Response). Unknown identifiers answer `{}`, as archive.org does.
 */
export function fakeArchive({ search = () => [], items = {} } = {}) {
  const asked = [];
  const fetchImpl = async (url) => {
    asked.push(String(url));
    const u = new URL(url);
    if (u.pathname === "/advancedsearch.php") {
      const answer = search(u.searchParams.get("q"), u.searchParams);
      return answer instanceof Response ? answer : json({ response: { docs: answer } });
    }
    const m = /^\/metadata\/([^/]+)$/.exec(u.pathname);
    if (m) {
      const v = items[decodeURIComponent(m[1])];
      return v instanceof Response ? v : json(v || {});
    }
    return new Response("not found", { status: 404 });
  };
  return { fetchImpl, asked };
}

// Node only treats a .mjs (or a "type": "module" package) as an ES module, so the plugin is loaded from a copy, as the
// kit's runner does. Loaded once: `kino` is a global the plugin reads at call time, so each plugin() swaps it.
let loaded = null;
async function exportsOf() {
  if (!loaded) {
    const copy = join(mkdtempSync(join(tmpdir(), "archive-audio-")), "plugin.mjs");
    copyFileSync(join(root, "plugin.js"), copy);
    loaded = await import(pathToFileURL(copy).href);
  }
  return loaded;
}

/** The plugin's exports with a fresh `kino` (its own empty storage), to call directly and in sequence. */
export async function plugin({ config = {}, lang = "es-CO", fetchImpl } = {}) {
  const manifest = validateManifest(readFileSync(join(root, "kino-plugin.json"), "utf8"));
  assert.ok(manifest.ok, manifest.message);
  const { kino, resetBudget } = createKino(manifest.manifest, { config, lang, fetchImpl });
  globalThis.kino = kino;
  // Each export call is a call of its own in Kino, with its own budget (60 requests): reset it as the app does.
  const calls = {};
  for (const [name, fn] of Object.entries(await exportsOf())) {
    calls[name] = typeof fn === "function" ? (...args) => (resetBudget(), fn(...args)) : fn;
  }
  return { ...calls, kino };
}

/** One call the way Kino makes it, checked with the app's rules: nothing refused, nothing dropped. */
export async function checked(fn, args, { config = {}, fetchImpl } = {}) {
  const r = await validate(root, { run: fn, args, config, fetchImpl });
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.drops, []);
  return r.output;
}

/** The error a call rejects with (the test fails if it resolves). */
export async function rejection(promise) {
  try {
    await promise;
  } catch (e) {
    return e;
  }
  assert.fail("expected the call to fail");
}
