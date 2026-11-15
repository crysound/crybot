#!/usr/bin/env bash
set -euo pipefail

linux_setup() {
  if ! command -v swift >/dev/null 2>&1; then
    printf '%s:1: error: Swift is missing from PATH. Ask the coordinator to provide the Linux Swift 6 toolchain; no download is attempted.\n' "${BASH_SOURCE[0]}" >&2
    return 2
  fi
  linux_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)
  linux_cache="$linux_root/mobile/ios/.linux-cache"
  linux_scratch="$linux_root/mobile/ios/.linux-build"
  mkdir -p "$linux_cache"/{home,xdg,clang,modules,swiftpm,config,security,tmp}
  linux_package_args=(
    --package-path "$linux_root/mobile/ios/Packages/CryKit"
    --scratch-path "$linux_scratch"
    --cache-path "$linux_cache/swiftpm"
    --config-path "$linux_cache/config"
    --security-path "$linux_cache/security"
    --disable-sandbox
    --build-system native
  )
}

linux_env() {
  env HOME="$linux_cache/home" \
    XDG_CACHE_HOME="$linux_cache/xdg" \
    CLANG_MODULE_CACHE_PATH="$linux_cache/clang" \
    SWIFTPM_MODULECACHE_OVERRIDE="$linux_cache/modules" \
    TMPDIR="$linux_cache/tmp" "$@"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  linux_setup
  cd -- "$linux_root"
  linux_env swift test "${linux_package_args[@]}" --jobs "${CRY_SWIFT_JOBS:-2}"
fi
