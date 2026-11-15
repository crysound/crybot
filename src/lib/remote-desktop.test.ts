import { expect, it } from "vitest";
import { isRemoteScreenshotContention } from "./remote-desktop";

it("recognizes the server's account-transition protocol message only on conflict", () => {
  const message = "Boat account settings are being updated — wait for them to finish";
  expect(isRemoteScreenshotContention({ status: 409, message })).toBe(true);
  expect(isRemoteScreenshotContention({ status: 502, message })).toBe(false);
  expect(isRemoteScreenshotContention({ status: 409, message: "another error" })).toBe(false);
});
