import { expect, it, vi } from "vitest";
import { SHARED_LOCAL_VM_TARGET, type ContainerComputerStatus } from "./container-computer.ts";
import { localDesktopTarget } from "./desktop-viewer-targets.ts";

const status = async () => ({
  managed: true, imageMatches: true, network: "loopback", container: "running", viewer_port: 49152,
  viewer_url: "http://127.0.0.1:49152/vnc.html#password=container-secret",
}) as ContainerComputerStatus;

it.each([undefined, () => null])("does not use the container password when a screen password is absent (%s)", async screenPassword => {
  const deps = { status, touch: vi.fn(), screenPassword };
  for (const screen of [1, 2, 3, 4]) {
    const target = { ...SHARED_LOCAL_VM_TARGET, key: `shared:s${screen}` };
    expect(await localDesktopTarget(target, deps).resolve()).toMatchObject({
      password: null, path: `/websockify?token=s${screen}`,
    });
  }
  expect(await localDesktopTarget(SHARED_LOCAL_VM_TARGET, deps).resolve()).toMatchObject({ password: "container-secret" });
});

it.each([1, 2, 3, 4])("resolves screen s%i with its injected password and token", async screen => {
  const target = { ...SHARED_LOCAL_VM_TARGET, key: `shared:s${screen}` };
  const screenPassword = vi.fn((n: number) => `screen-secret-${n}`);
  const touch = vi.fn();
  const connection = await localDesktopTarget(target, { status, touch, screenPassword }).resolve();
  expect(connection).toMatchObject({ port: 49152, password: `screen-secret-${screen}`, path: `/websockify?token=s${screen}` });
  expect(screenPassword).toHaveBeenCalledExactlyOnceWith(screen);
  connection.touch?.();
  expect(touch).toHaveBeenCalledExactlyOnceWith(target);
});
