import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, it } from "vitest";
import { compareDirectories } from "./compare.ts";

it("lists added, missing and changed files, including empty files", async () => {
  const dir = await mkdtemp("/tmp/ios-contract-compare-");
  try {
    const left = join(dir, "left"), right = join(dir, "right");
    await mkdir(left); await mkdir(right);
    await writeFile(join(left, "same.json"), '{"field":1}\n');
    await writeFile(join(right, "same.json"), '{"field":1}\n');
    expect(await compareDirectories(left, right)).toEqual([]);
    await writeFile(join(right, "same.json"), '{"field":2}\n');
    await writeFile(join(right, "added.json"), "");
    await writeFile(join(left, "missing.json"), "");
    expect(await compareDirectories(left, right)).toEqual(["added.json", "missing.json", "same.json"]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

it("compares the typed subset of a full contract without hiding typed drift", async () => {
  const dir = await mkdtemp("/tmp/ios-contract-compare-");
  try {
    const left = join(dir, "full"), right = join(dir, "typed");
    await mkdir(join(left, "frames"), { recursive: true });
    await mkdir(join(right, "frames"), { recursive: true });
    const typed = { file: "frames/message.json", swiftType: "ServerFrame" };
    const live = { file: "frames/live-message.json", swiftType: "ServerFrame" };
    await writeFile(join(left, "index.json"), JSON.stringify([live, typed]));
    await writeFile(join(right, "index.json"), JSON.stringify([typed]));
    await writeFile(join(left, typed.file), '{"kind":"message"}\n');
    await writeFile(join(right, typed.file), '{"kind":"message"}\n');
    await writeFile(join(left, live.file), '{"kind":"message"}\n');
    expect(await compareDirectories(left, right)).toEqual([live.file, "index.json"]);
    expect(await compareDirectories(left, right, { typedOnly: true })).toEqual([]);
    await writeFile(join(right, typed.file), '{"kind":"ping"}\n');
    expect(await compareDirectories(left, right, { typedOnly: true })).toEqual([typed.file]);
    await rm(join(right, typed.file));
    expect(await compareDirectories(left, right, { typedOnly: true })).toEqual([typed.file]);
    await writeFile(join(right, "index.json"), JSON.stringify([{ ...typed, swiftType: "WireMessage" }]));
    expect(await compareDirectories(left, right, { typedOnly: true })).toEqual([typed.file, "index.json"]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
