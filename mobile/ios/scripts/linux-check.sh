#!/usr/bin/env bash
set -euo pipefail

source "$(dirname -- "${BASH_SOURCE[0]}")/linux-test.sh"
linux_setup
cd -- "$linux_root"
for tool in swiftc node; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf '%s:1: error: %s is missing from PATH.\n' "${BASH_SOURCE[0]}" "$tool" >&2
    exit 2
  fi
done

failures=0
parse_count=0
logic_count=0
logic_files=0
check_step() {
  local location=$1
  shift
  if linux_env "$@"; then
    return 0
  else
    local status=$?
    printf '%s:1: error: check failed (exit %s): %s\n' "$location" "$status" "$*" >&2
    failures=$((failures + 1))
    return 1
  fi
}

printf '\n== Swift syntax ==\n'
find mobile/ios \( -type d \( -name .linux-build -o -name .linux-cache -o -name .build -o -name DerivedData -o -name SourcePackages \) -prune \) \
  -o \( -type f -name '*.swift' -print0 \) | sort -z > "$linux_cache/swift-files"
while IFS= read -r -d '' file; do
  parse_count=$((parse_count + 1))
  check_step "$file" swiftc -swift-version 5 -parse "$file" || :
done < "$linux_cache/swift-files"
if (( parse_count == 0 )); then
  printf 'mobile/ios:1: error: no Swift source files found\n' >&2
  failures=$((failures + 1))
fi

printf '\n== CryCore module and feature logic ==\n'
if check_step mobile/ios/Packages/CryKit/Package.swift swift build "${linux_package_args[@]}" --target CryCore --jobs "${CRY_SWIFT_JOBS:-2}"; then
  if bin_path=$(linux_env swift build "${linux_package_args[@]}" --show-bin-path); then
    if [[ -f "$bin_path/Modules/CryCore.swiftmodule" || -d "$bin_path/Modules/CryCore.swiftmodule" ]]; then
      shopt -s nullglob
      for directory in mobile/ios/CryBot/Features/*/Logic; do
        [[ -d "$directory" ]] || continue
        find "$directory" -type f -name '*.swift' -print0 | sort -z > "$linux_cache/logic-files"
        mapfile -d '' -t files < "$linux_cache/logic-files"
        (( ${#files[@]} > 0 )) || continue
        logic_count=$((logic_count + 1))
        logic_files=$((logic_files + ${#files[@]}))
        printf 'Typecheck %s (%s files)\n' "$directory" "${#files[@]}"
        check_step "${files[0]}" swiftc -swift-version 5 -typecheck -I "$bin_path/Modules" "${files[@]}" || :
      done
    else
      printf '%s:1: error: CryCore module is missing\n' "$bin_path/Modules/CryCore.swiftmodule" >&2
      failures=$((failures + 1))
    fi
  else
    printf 'mobile/ios/Packages/CryKit/Package.swift:1: error: cannot locate CryCore module directory\n' >&2
    failures=$((failures + 1))
  fi
fi

printf '\n== Type names and imports ==\n'
check_step mobile/ios/scripts/check-type-names.mjs node mobile/ios/scripts/check-type-names.mjs || :
printf '\n== Generated strings ==\n'
check_step mobile/ios/scripts/gen-strings.mjs node mobile/ios/scripts/gen-strings.mjs --check || :

printf '\nSummary: %s Swift files parsed; %s Logic directories (%s files) typechecked; %s failed checks.\n' \
  "$parse_count" "$logic_count" "$logic_files" "$failures"
(( failures == 0 ))
