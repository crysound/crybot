#!/usr/bin/env bash
set -euo pipefail
output=${1:?output directory required}
features=${2?selection required}
shift 2
status=0
snapshot_output="$output/CryBotTests"
for result in "$@"; do
  [[ -d "$result" ]] || continue
  name=$(basename "$result" .xcresult)
  destination="$output/$name"
  case "$name" in CryBotTests|iOS18-CryBotTests) snapshot_output="$destination" ;; esac
  mkdir -p "$destination"
  xcrun xcresulttool export attachments --path "$result" --output-path "$destination" || status=1
done
python3 "$(dirname "$0")/assert-screenshots.py" "$snapshot_output" "$features" || status=1
exit "$status"
