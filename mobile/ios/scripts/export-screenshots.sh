#!/usr/bin/env bash
set -euo pipefail
output=${1:?output directory required}
features=${2?selection required}
shift 2
status=0
snapshot_output="$output/CryBotTests"
results=()
for result in "$@"; do
  [[ -d "$result" && "$result" == *.xcresult ]] || continue
  results+=("$result")
done

if ((${#results[@]} == 0)); then
  echo '测试未运行（编译或启动失败），见上一步日志' >&2
  exit 1
fi

tests_ran=0
for result in "${results[@]}"; do
  summary=$(mktemp)
  if xcrun xcresulttool get test-results summary --path "$result" >"$summary" 2>/dev/null \
    && python3 - "$summary" <<'PY'
import json
import sys

try:
    summary = json.load(open(sys.argv[1]))
except (OSError, ValueError):
    raise SystemExit(1)

def count(key):
    value = summary.get(key, 0)
    return value if type(value) is int and value >= 0 else 0

raise SystemExit(0 if sum(count(key) for key in ('passedTests', 'failedTests', 'expectedFailures')) > 0 else 1)
PY
  then
    tests_ran=1
  fi
  rm -f "$summary"
done

if ((tests_ran == 0)); then
  echo '测试未运行（编译或启动失败），见上一步日志' >&2
  exit 1
fi

for result in "${results[@]}"; do
  name=$(basename "$result" .xcresult)
  destination="$output/$name"
  case "$name" in CryBotTests|iOS18-CryBotTests) snapshot_output="$destination" ;; esac
  mkdir -p "$destination"
  xcrun xcresulttool export attachments --path "$result" --output-path "$destination" || status=1
done
python3 "$(dirname "$0")/assert-screenshots.py" "$snapshot_output" "$features" \
  --tests-directory "$(dirname "$0")/../CryBotTests" || status=1
exit "$status"
