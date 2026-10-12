// Real archive.org answers (test/record.mjs) replayed offline: the plugin still reads them the way it did the day
// they were recorded, and Kino keeps everything. Re-record when archive.org changes shape.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { root, validate } from "./harness.mjs";
import { TAPES } from "./tapes.mjs";

for (const { file, fn, args } of TAPES) {
  test(`recorded ${file}: Kino keeps everything`, async () => {
    const r = await validate(root, { run: fn, args, replay: join(root, "test", "tapes", file) });
    assert.deepEqual(r.problems, []);
    assert.deepEqual(r.drops, []);
    assert.ok(r.output, "an answer");
  });
}
