// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { openExternalLink } from "./app-links";

afterEach(() => { vi.restoreAllMocks(); });
it.each(["javascript:alert(1)", "data:text/html,hello", "file:///etc/passwd", "crybot://account", "invalid"])("does not open %s", async url => {
  const open = vi.spyOn(window, "open").mockReturnValue(null);
  await openExternalLink(url);
  expect(open).not.toHaveBeenCalled();
});
it.each(["https://example.test/", "http://localhost/", "mailto:owner@example.test"])("opens allowed protocol %s", async url => {
  const open = vi.spyOn(window, "open").mockReturnValue(null);
  await openExternalLink(url);
  expect(open).toHaveBeenCalledWith(url, "_blank", "noopener,noreferrer");
});
