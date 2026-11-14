#!/usr/bin/env bash
set -euo pipefail

# Usage: ui-test-selection.sh [changed-file ...]
# With no arguments, changed paths are read one per line from stdin. The first
# output line is the snapshot feature list; the second is xcodebuild's
# -only-testing list.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  sed -n '3,6p' "${BASH_SOURCE[0]}"
  exit 0
fi
paths=()
if (($#)); then
  paths=("$@")
else
  while IFS= read -r path; do [[ -n "$path" ]] && paths+=("$path"); done
fi
features=()
all=false
ios_change=false
for path in "${paths[@]}"; do
  path="${path#./}"
  [[ "$path" == mobile/ios/* || "$path" == mobile/ios ]] || continue
  ios_change=true
  case "$path" in
    mobile/ios/CryBot/App/*|mobile/ios/CryBot/Store/*|mobile/ios/CryBot/Design/*|mobile/ios/CryBot/Strings/*|mobile/ios/CryBotTests/Support/*|mobile/ios/CryBotUITests/Support/*|mobile/ios/project.yml|mobile/ios/Packages/*|mobile/ios/Package.resolved) all=true ;;
    mobile/ios/CryBot/Features/*/*)
      name="${path#mobile/ios/CryBot/Features/}"; name="${name%%/*}"; [[ "$name" != Support && "$name" != Shell ]] && features+=("$name") ;;
    mobile/ios/CryBotTests/*/*)
      name="${path#mobile/ios/CryBotTests/}"; name="${name%%/*}"; [[ "$name" != Support && "$name" != Shell ]] && features+=("$name") ;;
    mobile/ios/CryBotUITests/*/*)
      name="${path#mobile/ios/CryBotUITests/}"; name="${name%%/*}"; [[ "$name" != Support && "$name" != Shell ]] && features+=("$name") ;;
  esac
done
if ! $ios_change; then
  features_line=""
elif $all; then
  features_line="all"
else
  mapfile -t features < <(printf '%s\n' "${features[@]}" | awk 'NF && !seen[tolower($0)]++ {print $0}' | sort -f)
  features_line="$(IFS=,; echo "${features[*]}")"
fi
flow_args=()
if $ios_change && ! $all; then
  mapfile -t flow_features < <(printf '%s\n' "${features[@]}" | awk 'NF && !seen[tolower($0)]++ {print $0}' | sort -f)
  for name in "${flow_features[@]}"; do
    [[ -d "$ROOT/mobile/ios/CryBotUITests/$name" ]] && flow_args+=("-only-testing:CryBotUITests/${name}FlowTests")
  done
fi
echo "$features_line"
printf '%s' "${flow_args[*]}"
echo
