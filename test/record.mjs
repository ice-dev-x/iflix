// Re-records every tape from the real archive.org: node test/record.mjs (from the plugin folder). Network needed.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { root, SDK } from "./harness.mjs";
import { TAPES } from "./tapes.mjs";

mkdirSync(join(root, "test", "tapes"), { recursive: true });
for (const { file, fn, args } of TAPES) {
  const tape = join(root, "test", "tapes", file);
  // The kit keeps kino.storage in .kino-storage.json: a cached album would be answered without a fetch to record.
  rmSync(join(root, ".kino-storage.json"), { force: true });
  execFileSync(process.execPath, [join(SDK, "run.mjs"), root, fn, ...args, "--record", tape], { stdio: ["ignore", "ignore", "inherit"] });
  console.log("recorded", file);
}
