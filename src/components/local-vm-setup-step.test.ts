import { afterEach, describe, expect, it } from "vitest";

import { setLocale, t } from "@/lib/i18n";
import { localVmSetupStep4Title } from "./local-vm-setup-step";

afterEach(() => setLocale("en"));

describe("local VM setup step 4 title", () => {
  it("calls a stopped resumable shared desktop Wake and a missing desktop Create", () => {
    expect(t(localVmSetupStep4Title({ mode: "shared", container: "stopped", resumable: true, needsRecreate: false })))
      .toBe("Wake the private desktop");
    expect(t(localVmSetupStep4Title({ mode: "shared", container: "missing", resumable: false, needsRecreate: false })))
      .toBe("Create and start the private desktop");
  });
});
