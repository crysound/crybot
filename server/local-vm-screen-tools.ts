import { containerExec, installScreenPackages, isScreenTarget, screenIdentityArgs, screenWorkdir, sh, type LocalVmTarget, type Runtime } from "./container-computer.ts";

export async function prepareScreenProfiles(runtime: Runtime, target: LocalVmTarget): Promise<void> {
  if (!isScreenTarget(target)) return;
  await sh(runtime, screenIdentityArgs(target, ["sh", "-c", `set -eu
profiles="$PWD/.browser-profiles"
mkdir -p "$profiles" "$HOME/.config"
chmod 0700 "$profiles"
link_profile() {
  source="$1"
  durable="$profiles/$2"
  if [ -L "$source" ]; then
    [ "$(readlink "$source")" = "$durable" ] || exit 1
    return
  fi
  if [ -e "$source" ]; then
    [ ! -e "$durable" ] || rmdir "$durable"
    mv "$source" "$durable"
  fi
  mkdir -p "$durable"
  chmod 0700 "$durable"
  ln -s "$durable" "$source"
}
link_profile "$HOME/.mozilla" mozilla
link_profile "$HOME/.config/google-chrome" google-chrome
link_profile "$HOME/.config/chromium" chromium`], { workdir: screenWorkdir(target.screen) }), 30_000);
}

export async function localVmExec(target: LocalVmTarget, command: string, options: { runtime: Runtime; timeoutSeconds?: number }) {
  if (isScreenTarget(target) && /^crybot-pkg(?:\s|$)/.test(command.trim())) {
    await installScreenPackages(target, command.trim().split(/\s+/).slice(1), { runtime: options.runtime });
    return { exitCode: 0, stdout: "Packages installed", stderr: "", timedOut: false };
  }
  return containerExec(target, command, options);
}
