import assert from "node:assert/strict";
import test from "node:test";
import { areaOf, windowsReason } from "./ci-scope.mjs";

for (const file of ["electron-builder.base.yml", "electron-builder.config.cjs", "scripts/desktop-build-config.cjs"]) {
  test(`${file} alone selects desktop and Windows checks`, () => {
    assert.equal(areaOf(file), "desktop");
    assert.equal(windowsReason({ files: [file] }), file);
  });
}
